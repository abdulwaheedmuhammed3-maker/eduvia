const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workflow = fs.readFileSync('.github/workflows/build-android.yml', 'utf8');
const configScript = fs.readFileSync('scripts/configure-android-signing.mjs', 'utf8');
const capacitor = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
const scriptPath = path.resolve('scripts/configure-android-signing.mjs');
const envNames = [
  'EDUVIA_ANDROID_KEYSTORE_BASE64',
  'EDUVIA_ANDROID_KEYSTORE_PASSWORD',
  'EDUVIA_ANDROID_KEY_ALIAS',
  'EDUVIA_ANDROID_KEY_PASSWORD'
];

test('Eduvia retains the package ID and requires one persistent signing identity for published APKs', () => {
  assert.equal(capacitor.appId, 'com.eduvia.studyplanner');
  for (const name of envNames) {
    assert.ok(workflow.includes('secrets.' + name));
    assert.ok(configScript.includes(name));
  }
  assert.ok(workflow.includes('node scripts/configure-android-signing.mjs'));
  assert.ok(workflow.includes("if: github.event_name != 'pull_request'"));
  assert.ok(configScript.includes('signingConfigs'));
  assert.ok(configScript.includes('signingConfig signingConfigs.eduviaBeta'));
});

test('a pull request without signing secrets can compile but cannot upload a temporary-key APK', () => {
  const env = { ...process.env, GITHUB_EVENT_NAME: 'pull_request' };
  for (const name of envNames) delete env[name];
  const result = spawnSync(process.execPath, [scriptPath], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr + result.stdout, /temporary CI debug key/i);
  assert.ok(workflow.includes("if: github.event_name != 'pull_request'"));
});

test('a published build without the persistent key fails before producing an incompatible APK', () => {
  const env = { ...process.env, GITHUB_EVENT_NAME: 'push' };
  for (const name of envNames) delete env[name];
  const result = spawnSync(process.execPath, [scriptPath], { env, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /persistent signing secrets/i);
  assert.match(result.stderr, /docs\/android-beta-signing\.md/i);
});

test('signing script writes the supplied key locally and configures Gradle exactly once', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduvia-signing-test-'));
  try {
    const appDir = path.join(root, 'android', 'app');
    fs.mkdirSync(appDir, { recursive: true });
    const gradle = path.join(appDir, 'build.gradle');
    fs.writeFileSync(gradle, 'plugins { id "com.android.application" }\nandroid { namespace "com.eduvia.studyplanner" }\n');
    const bytes = Buffer.alloc(1024, 37);
    const env = {
      ...process.env,
      GITHUB_EVENT_NAME: 'push',
      EDUVIA_ANDROID_KEYSTORE_BASE64: bytes.toString('base64'),
      EDUVIA_ANDROID_KEYSTORE_PASSWORD: 'test-store-password',
      EDUVIA_ANDROID_KEY_ALIAS: 'eduvia-beta',
      EDUVIA_ANDROID_KEY_PASSWORD: 'test-key-password'
    };
    const run = () => spawnSync(process.execPath, [scriptPath], { cwd: root, env, encoding: 'utf8' });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.deepEqual(fs.readFileSync(path.join(appDir, 'eduvia-beta-signing.jks')), bytes);
    const configured = fs.readFileSync(gradle, 'utf8');
    assert.equal((configured.match(/EDUVIA_PERSISTENT_BETA_SIGNING/g) || []).length, 1);
    assert.ok(configured.includes('eduvia-beta-signing.jks'));
    assert.ok(configured.includes('System.getenv("EDUVIA_ANDROID_KEYSTORE_PASSWORD")'));
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.equal((fs.readFileSync(gradle, 'utf8').match(/EDUVIA_PERSISTENT_BETA_SIGNING/g) || []).length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the signing documentation warns against key regeneration and protects old install data', () => {
  const docs = fs.readFileSync('docs/android-beta-signing.md', 'utf8');
  assert.ok(docs.includes('EDUVIA_ANDROID_KEYSTORE_BASE64'));
  assert.ok(docs.includes('Never regenerate this key'));
  assert.ok(docs.includes('Download portable backup'));
  assert.ok(docs.includes('class voice recordings'));
});

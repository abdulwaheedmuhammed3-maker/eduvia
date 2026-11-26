const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workflow = fs.readFileSync('.github/workflows/build-android.yml', 'utf8');
const configScript = fs.readFileSync('scripts/configure-android-signing.mjs', 'utf8');
const capacitor = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
const docs = fs.readFileSync('docs/android-beta-signing.md', 'utf8');
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
  assert.ok(workflow.includes("if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'"));
  assert.ok(workflow.includes('signingConfigs'));
  assert.ok(configScript.includes('signingConfig signingConfigs.eduviaBeta'));
});

test('release write permission is isolated to the conditional publish job', () => {
  assert.match(workflow, /^permissions:\n  contents: read/m);
  assert.match(workflow, /publish:[\s\S]*?if: github\.event_name == 'push' \|\| \(github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'\)[\s\S]*?permissions:\n      contents: write/);
});

test('pull-request builds use a temporary debug key and do not receive signing secrets', () => {
  const signingStep = workflow.split('- name: Configure the persistent Eduvia beta signing key')[1].split('- name:')[0];
  const prBuildStep = workflow.split('- name: Build pull-request or non-main APK with an ephemeral debug key')[1].split('- name:')[0];
  assert.ok(signingStep.includes("if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'"));
  assert.doesNotMatch(prBuildStep, /EDUVIA_ANDROID_KEYSTORE/);
  assert.ok(workflow.includes("if: github.event_name == 'pull_request' || github.ref != 'refs/heads/main'"));
});

test('pull requests refuse persistent credentials even if they are present in the environment', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduvia-pr-signing-test-'));
  try {
    const env = {
      ...process.env,
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REF: 'refs/pull/123/merge',
      EDUVIA_ANDROID_KEYSTORE_BASE64: Buffer.alloc(1024, 37).toString('base64'),
      EDUVIA_ANDROID_KEYSTORE_PASSWORD: 'test-store-password',
      EDUVIA_ANDROID_KEY_ALIAS: 'eduvia-beta',
      EDUVIA_ANDROID_KEY_PASSWORD: 'test-key-password'
    };
    const result = spawnSync(process.execPath, [scriptPath], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr + result.stdout, /persistent Eduvia signing key is not used/i);
    assert.equal(fs.existsSync(path.join(root, 'android', 'app', 'eduvia-beta-signing.jks')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a published build without the persistent key fails before producing an incompatible APK', () => {
  const env = { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main' };
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
      GITHUB_REF: 'refs/heads/main',
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
  assert.ok(docs.includes('EDUVIA_ANDROID_KEYSTORE_BASE64'));
  assert.ok(docs.includes('Never regenerate this key'));
  assert.ok(docs.includes('Download portable backup'));
  assert.ok(docs.includes('class voice recordings'));
  assert.match(docs, /Pull-request builds always use an ephemeral runner-generated debug key/);
  assert.match(docs, /never receive the persistent signing secrets/);
});

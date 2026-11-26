import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const isPullRequest = process.env.GITHUB_EVENT_NAME === 'pull_request';
const isTrustedMainBuild = !isPullRequest && process.env.GITHUB_REF === 'refs/heads/main';

// Defense in depth: even if this script is invoked from a PR or another branch,
// never read or write the persistent production signing key.
if (!isTrustedMainBuild) {
  console.warn('Pull-request and non-main builds must use the runner-generated temporary debug key. The persistent Eduvia signing key is not used.');
  process.exit(0);
}

const secretNames = [
  'EDUVIA_ANDROID_KEYSTORE_BASE64',
  'EDUVIA_ANDROID_KEYSTORE_PASSWORD',
  'EDUVIA_ANDROID_KEY_ALIAS',
  'EDUVIA_ANDROID_KEY_PASSWORD'
];
const missing = secretNames.filter(name => !String(process.env[name] || '').trim());
if (missing.length) {
  throw new Error('Cannot publish an Eduvia Android APK without the persistent signing secrets: ' + missing.join(', ') + '. See docs/android-beta-signing.md.');
}

const encoded = String(process.env.EDUVIA_ANDROID_KEYSTORE_BASE64).replace(/\s+/g, '');
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('EDUVIA_ANDROID_KEYSTORE_BASE64 is not valid base64.');
const keystore = Buffer.from(encoded, 'base64');
if (keystore.length < 512 || keystore.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
  throw new Error('EDUVIA_ANDROID_KEYSTORE_BASE64 does not contain a valid-sized base64 keystore.');
}

const appDirectory = path.join('android', 'app');
const groovyFile = path.join(appDirectory, 'build.gradle');
const kotlinFile = path.join(appDirectory, 'build.gradle.kts');
const gradleFile = existsSync(groovyFile) ? groovyFile : existsSync(kotlinFile) ? kotlinFile : '';
if (!gradleFile) throw new Error('Capacitor did not generate android/app/build.gradle or build.gradle.kts. Run npm run android:prepare first.');

await mkdir(appDirectory, { recursive: true });
await writeFile(path.join(appDirectory, 'eduvia-beta-signing.jks'), keystore, { mode: 0o600 });
const marker = '// EDUVIA_PERSISTENT_BETA_SIGNING';
let gradle = await readFile(gradleFile, 'utf8');
if (!gradle.includes(marker)) {
  const block = gradleFile.endsWith('.kts') ? [
    '', marker, 'android {', '    signingConfigs {', '        create("eduviaBeta") {',
    '            storeFile = file("eduvia-beta-signing.jks")',
    '            storePassword = System.getenv("EDUVIA_ANDROID_KEYSTORE_PASSWORD")',
    '            keyAlias = System.getenv("EDUVIA_ANDROID_KEY_ALIAS")',
    '            keyPassword = System.getenv("EDUVIA_ANDROID_KEY_PASSWORD")',
    '        }', '    }', '    buildTypes {', '        getByName("debug") {',
    '            signingConfig = signingConfigs.getByName("eduviaBeta")',
    '        }', '    }', '}'
  ].join('\n') : [
    '', marker, 'android {', '    signingConfigs {', '        eduviaBeta {',
    '            storeFile file("eduvia-beta-signing.jks")',
    '            storePassword System.getenv("EDUVIA_ANDROID_KEYSTORE_PASSWORD")',
    '            keyAlias System.getenv("EDUVIA_ANDROID_KEY_ALIAS")',
    '            keyPassword System.getenv("EDUVIA_ANDROID_KEY_PASSWORD")',
    '        }', '    }', '    buildTypes {', '        debug {',
    '            signingConfig signingConfigs.eduviaBeta',
    '        }', '    }', '}'
  ].join('\n');
  gradle += '\n' + block + '\n';
  await writeFile(gradleFile, gradle);
}
console.log('Eduvia Android beta signing is configured with the persistent repository signing key.');

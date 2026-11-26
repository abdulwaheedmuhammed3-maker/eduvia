import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
if (!existsSync('android')) execFileSync(npx, ['cap', 'add', 'android'], { stdio: 'inherit' });
execFileSync(npx, ['cap', 'sync', 'android'], { stdio: 'inherit' });

// Install the Eduvia MediaStore exporter into the generated Capacitor Android project.
const config = JSON.parse(await readFile('capacitor.config.json', 'utf8'));
const appPackage = String(config.appId || 'com.eduvia.studyplanner');
if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(appPackage)) {
  throw new Error('capacitor.config.json contains an invalid Android appId.');
}
const javaDirectory = `android/app/src/main/java/${appPackage.replaceAll('.', '/')}`;
await mkdir(javaDirectory, { recursive: true });
await copyFile('scripts/android/EduviaFileExportPlugin.java', `${javaDirectory}/EduviaFileExportPlugin.java`);
const mainActivityPath = `${javaDirectory}/MainActivity.java`;
let mainActivity = await readFile(mainActivityPath, 'utf8');
if (!mainActivity.includes('registerPlugin(EduviaFileExportPlugin.class)')) {
  if (!mainActivity.includes('import com.getcapacitor.BridgeActivity;')) {
    throw new Error('Could not locate the generated Capacitor MainActivity import.');
  }
  mainActivity = mainActivity.replace(
    'import com.getcapacitor.BridgeActivity;',
    ['import android.os.Bundle;', 'import com.getcapacitor.BridgeActivity;'].join('\n')
  );
  const activityBody = [
    'public class MainActivity extends BridgeActivity {',
    '  @Override',
    '  public void onCreate(Bundle savedInstanceState) {',
    '    registerPlugin(EduviaFileExportPlugin.class);',
    '    super.onCreate(savedInstanceState);',
    '  }',
    '}'
  ].join('\n');
  mainActivity = mainActivity.replace(
    /public class MainActivity extends BridgeActivity\s*\{\s*\}/,
    activityBody
  );
  if (!mainActivity.includes('registerPlugin(EduviaFileExportPlugin.class)')) {
    throw new Error('Could not register the Eduvia file exporter in MainActivity.');
  }
  await writeFile(mainActivityPath, mainActivity);
}
execFileSync(npx, [
  'capacitor-assets', 'generate', '--android', '--assetPath', 'assets',
  '--iconBackgroundColor', '#655ee0', '--splashBackgroundColor', '#f7f8fd'
], { stdio: 'inherit' });

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');
const permissions = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS'
];
for (const permission of permissions) {
  const line = `    <uses-permission android:name="${permission}" />`;
  if (!manifest.includes(`android:name="${permission}"`)) manifest = manifest.replace(/(<manifest[^>]*>)/, `$1\n${line}`);
}
await writeFile(manifestPath, manifest);

const rawDirectory = 'android/app/src/main/res/raw';
await mkdir(rawDirectory, { recursive: true });
const sampleRate = 22050;
const pulseSeconds = 0.62;
const gapSeconds = 0.24;
const pulseCount = 6;
const durationSeconds = pulseCount * pulseSeconds + (pulseCount - 1) * gapSeconds;
const sampleCount = Math.floor(sampleRate * durationSeconds);
const pcm = Buffer.alloc(sampleCount * 2);
for (let i = 0; i < sampleCount; i++) {
  const time = i / sampleRate;
  const pulsePosition = time % (pulseSeconds + gapSeconds);
  const active = Math.floor(time / (pulseSeconds + gapSeconds)) < pulseCount && pulsePosition < pulseSeconds;
  if (!active) continue;
  const pulseIndex = Math.floor(time / (pulseSeconds + gapSeconds));
  const frequency = pulseIndex % 2 === 0 ? 880 : 660;
  const fadeIn = Math.min(1, pulsePosition / 0.025);
  const fadeOut = Math.min(1, (pulseSeconds - pulsePosition) / 0.08);
  const envelope = Math.min(fadeIn, fadeOut);
  const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.62 * envelope;
  pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
}
const wav = Buffer.alloc(44 + pcm.length);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
await writeFile(`${rawDirectory}/eduvia_alarm.wav`, wav);

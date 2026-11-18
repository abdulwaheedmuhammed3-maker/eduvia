import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
if (!existsSync('android')) execFileSync(npx, ['cap', 'add', 'android'], { stdio: 'inherit' });
execFileSync(npx, ['cap', 'sync', 'android'], { stdio: 'inherit' });
execFileSync(npx, [
  'capacitor-assets', 'generate', '--android', '--assetPath', 'assets',
  '--iconBackgroundColor', '#147e83', '--splashBackgroundColor', '#f3f6f8'
], { stdio: 'inherit' });

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');
const permissions = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.CAMERA'
];
for (const permission of permissions) {
  const line = `    <uses-permission android:name="${permission}" />`;
  if (!manifest.includes(`android:name="${permission}"`)) manifest = manifest.replace(/(<manifest[^>]*>)/, `$1\n${line}`);
}
await writeFile(manifestPath, manifest);

const rawDirectory = 'android/app/src/main/res/raw';
await mkdir(rawDirectory, { recursive: true });
const sampleRate = 22050;
const durationSeconds = 0.28;
const sampleCount = Math.floor(sampleRate * durationSeconds);
const pcm = Buffer.alloc(sampleCount * 2);
for (let i = 0; i < sampleCount; i++) {
  const fadeIn = Math.min(1, i / (sampleRate * 0.015));
  const fadeOut = Math.min(1, (sampleCount - i) / (sampleRate * 0.07));
  const sample = Math.sin((2 * Math.PI * 880 * i) / sampleRate) * 0.28 * fadeIn * fadeOut;
  pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
}
const wav = Buffer.alloc(44 + pcm.length);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
await writeFile(`${rawDirectory}/eduvia_beep.wav`, wav);

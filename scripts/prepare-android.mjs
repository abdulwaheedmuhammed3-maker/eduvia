import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
if (!existsSync('android')) execFileSync(npx, ['cap', 'add', 'android'], { stdio: 'inherit' });
execFileSync(npx, ['cap', 'sync', 'android'], { stdio: 'inherit' });
execFileSync(npx, [
  'capacitor-assets', 'generate', '--android', '--assetPath', 'assets',
  '--iconBackgroundColor', '#147e83', '--splashBackgroundColor', '#f8faff'
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

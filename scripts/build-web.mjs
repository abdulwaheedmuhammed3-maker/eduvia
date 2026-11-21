import { copyFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

const webFiles = [
  'index.html', 'app.js', 'study-studio.js', 'course-intelligence.js', 'feature-hub.js', 'styles.css', 'entry-flow.css', 'visual-refresh.css', 'experience.css', 'experience.js', 'entry-flow.js', 'manifest.json',
  'push-config.js', 'service-worker.js', 'icon.svg', 'icon-192.png',
  'icon-512.png', 'apple-touch-icon.png'
];

await mkdir('www', { recursive: true });
for (const file of webFiles) await copyFile(file, `www/${file}`);

await build({
  entryPoints: ['native-bridge-src.js'],
  outfile: 'www/native-bridge.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  legalComments: 'none'
});

import { copyFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

const webFiles = [
  'index.html', 'learner-profile.js', 'app.js', 'study-studio.js', 'course-intelligence.js', 'lecture-intelligence.js', 'feature-hub.js', 'styles.css', 'entry-flow.css', 'visual-refresh.css', 'experience.css', 'lecture-intelligence.css', 'experience.js', 'learning-expansions.js', 'icon-system.css', 'ui-polish.css', 'icon-system.js', 'recall-core.js', 'recall.js', 'recall.css', 'voice-reflection.js', 'voice-reflection.css', 'roadmap-core.js', 'roadmaps.js', 'roadmaps.css', 'entry-flow.js', 'manifest.json',
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

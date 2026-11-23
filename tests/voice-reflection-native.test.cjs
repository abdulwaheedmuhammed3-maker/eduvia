const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const bridge = read('native-bridge-src.js');
const voice = read('voice-reflection.js');
const studio = read('study-studio.js');

test('Capacitor builds include the Android-native speech recognition plugin', () => {
  assert.equal(packageJson.dependencies['@capgo/capacitor-speech-recognition'], '8.6.0');
  assert.ok(bridge.includes("import { SpeechRecognition } from '@capgo/capacitor-speech-recognition'"));
  assert.ok(bridge.includes("const isAndroid = Capacitor.getPlatform() === 'android'"));
  assert.ok(bridge.includes('window.EduviaNativeSpeechRecognition = SpeechRecognition'));
  assert.ok(bridge.includes('isAndroid,'));
});

test('Android voice reflection uses native partial transcription and preserves audio recording', () => {
  assert.ok(voice.includes('window.EduviaNativeSpeechRecognition'));
  assert.ok(voice.includes('speech.available()'));
  assert.ok(voice.includes('speech.requestPermissions()'));
  assert.ok(voice.includes("speech.addListener('partialResults'"));
  assert.ok(voice.includes('continuousPTT: true'));
  assert.ok(voice.includes('await speech.start('));
  assert.ok(voice.includes('await speech.forceStop({ timeout: 1200 })'));
  assert.ok(voice.includes('session.stopRecognition && !event?.forced'));
  assert.ok(voice.includes('new Blob(chunks'));
  assert.ok(voice.includes('Your audio recording will still be saved'));
});

test('browser speech recognition remains available outside the native Android app', () => {
  assert.ok(voice.includes('window.SpeechRecognition || window.webkitSpeechRecognition'));
  assert.ok(voice.includes('const Recognition = nativeAndroid ? null : recognitionConstructor'));
  assert.ok(voice.includes('recognition.interimResults = true'));
});

test('class and study reflections accept flexible keyword lists instead of requiring exactly five items', () => {
  assert.ok(studio.includes("field('Key words from the lecture','learned'"));
  assert.ok(studio.includes('Key words from the lecture or study'));
  assert.ok(studio.includes("field('Key words from your study','keyPoints'"));
  assert.ok(!studio.includes('learned.length!==5'));
  assert.ok(!studio.includes('keyPoints.length!==5'));
  assert.ok(studio.includes('Key words from the lecture'));
  assert.ok(studio.includes('Key words from your study'));
});

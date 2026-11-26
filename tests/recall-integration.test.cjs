const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app.js'), recall = read('recall.js'), core = read('recall-core.js'), studio = read('study-studio.js');
const index = read('index.html'), worker = read('notifications-worker/src/index.js');
const native = read('native-bridge-src.js'), serviceWorker = read('service-worker.js');
const build = read('scripts/build-web.mjs'), workflow = read('.github/workflows/validate.yml');
const migration = read('notifications-worker/migrations/0003_recall_notification_routes.sql');
const androidPrep = read('scripts/prepare-android.mjs');

test('Recall is registered as a valid deep-link route and a Play learning tool', () => {
  assert.ok(app.includes("'recall'"));
  assert.ok(app.includes("route.startsWith('recall/')"));
  assert.ok(recall.includes('window.eduPageRenderers.recall = renderRecall'));
  assert.ok(recall.includes('data-page="recall"'));
});
test('Recall rebinds its in-memory state after restore or clear replaces planner data', () => {
  assert.ok(recall.includes('function syncState()'));
  assert.ok(recall.includes('if (data.recallState !== state) {'));
  for (const entryPoint of [
    'async function buildQuestionBank(silent = false) {',
    'window.eduRecallBuildReminders = function (now) {',
    'function renderRecall() {',
    'function saveRecallSettings(form) {',
    'function rateQuestion(questionId, remembered) {',
    'window.eduPageRenderers.play = function () {'
  ]) {
    const start = recall.indexOf(entryPoint);
    assert.ok(start >= 0, 'missing Recall entry point: ' + entryPoint);
    assert.ok(recall.slice(start, start + 220).includes('syncState();'), 'entry point must sync replacement data: ' + entryPoint);
  }
});

test('Recall question bank is built from local course materials and flashcards', () => {
  assert.ok(recall.includes('loadCourseText(course.id)'));
  assert.ok(recall.includes('window.eduCourseIntelligence'));
  assert.ok(recall.includes('data.flashcards'));
  assert.ok(recall.includes('data.resources'));
  assert.ok(recall.includes('window.eduRecallBuildReminders'));
  assert.ok(recall.includes('Array.isArray(data.studyRecords) ? data.studyRecords : []'));
  assert.ok(recall.includes("question.kind === 'class-reflection'"));
  assert.ok(studio.includes('window.eduRecallRefreshQuestionBank?.()'));
  assert.ok(app.includes('window.eduRecallBuildReminders(now)'));
});
test('Recall schedules the selected hourly rate and never includes the saved answer in a notification', () => {
  assert.ok(core.includes("const LIMITS = { light: 1, balanced: 2, intensive: 3 }"));
  assert.ok(core.includes('function chooseSpaced(candidates, limit, random)'));
  assert.ok(core.includes('const hourlyLimit = LIMITS[frequency]'));
  assert.ok(recall.includes('Light · 1 per hour'));
  assert.ok(recall.includes('Balanced · 2 per hour'));
  assert.ok(recall.includes('Intensive · 3 per hour'));
  assert.ok(recall.includes('body: question.prompt'));
  assert.ok(recall.includes("url: './#recall/'"));
  assert.ok(!recall.includes('body: question.answer'));
});
test('web push validates and preserves the in-app Recall destination', () => {
  assert.ok(worker.includes("value.url === undefined ? './#today' : String(value.url)"));
  assert.ok(worker.includes("url !== './#today'"));
  assert.ok(worker.includes('[A-Za-z0-9_-]{1,64}'));
  assert.ok(worker.includes('r.url, d.subscription_json'));
  assert.ok(worker.includes("url: row.url || './#today'"));
  assert.ok(migration.includes("ADD COLUMN url TEXT NOT NULL DEFAULT './#today'"));
});
test('Android notification taps open the scheduled Recall question', () => {
  assert.ok(native.includes('localNotificationActionPerformed'));
  assert.ok(native.includes("window.location.hash = 'recall/'"));
});
test('Recall assets are loaded, cached, copied into the web build and syntax-checked', () => {
  for (const asset of ['recall-core.js', 'recall.js', 'recall.css']) {
    assert.ok(index.includes(asset)); assert.ok(serviceWorker.includes(asset)); assert.ok(build.includes(asset));
  }
  assert.ok(workflow.includes('node --check recall-core.js'));
  assert.ok(workflow.includes('node --check recall.js'));
});

test('class voice reflections record locally, attach transcripts and preserve audio in portable backups', () => {
  const studio = read('study-studio.js'), voice = read('voice-reflection.js');
  assert.ok(studio.includes("indexedDB.open(STUDIO_DB,3)"));
  assert.ok(studio.includes("createObjectStore('classAudio',{keyPath:'id'})"));
  assert.ok(studio.includes("putStudioRecord('classAudio'"));
  assert.ok(studio.includes("getStudioRecord('classAudio',clip.id)"));
  assert.ok(studio.includes("classAudio:classAudioRecords"));
  assert.ok(studio.includes("classAudio=zip.folder('class-audio')"));
  assert.ok(studio.includes("stores=[STUDIO_STORE,'academicRecords','personalDocuments','classAudio']"));
  assert.ok(voice.includes('navigator.mediaDevices.getUserMedia'));
  assert.ok(voice.includes('new MediaRecorder'));
  assert.ok(voice.includes('window.SpeechRecognition || window.webkitSpeechRecognition'));
  assert.ok(voice.includes('getPending:'));
  assert.ok(voice.includes('function cancel()'));
  assert.ok(voice.includes('recognition.onend ='));
  assert.ok(voice.includes('session.transcriptBeforeRecognition'));
  assert.ok(voice.includes('session.currentRecognitionFinal || session.currentRecognitionInterim'));
  assert.ok(voice.includes('session.recognitionRestartTimer'));
  assert.ok(voice.includes('session.stopRecognition'));
  assert.ok(read('app.js').includes('EduviaVoiceReflection?.cancel?.()'));
  assert.ok(voice.includes('attachSavedAudio'));
  assert.ok(studio.includes("field('Key words from the lecture'"));
  assert.ok(studio.includes('if(!record)return;'));
});
test('voice reflection assets are built, cached and syntax-checked', () => {
  const html=read('index.html'), sw=read('service-worker.js'), build=read('scripts/build-web.mjs'), workflow=read('.github/workflows/validate.yml');
  for (const asset of ['voice-reflection.js','voice-reflection.css']) {
    assert.ok(html.includes(asset)); assert.ok(sw.includes(asset)); assert.ok(build.includes(asset));
  }
  assert.ok(workflow.includes('node --check voice-reflection.js'));
  assert.ok(workflow.includes("eduvia-v109-ai-tutor-google"));
});
test('Android build declares the native microphone capture permissions requested by Capacitor WebView', () => {
  assert.ok(androidPrep.includes('android.permission.RECORD_AUDIO'));
  assert.ok(androidPrep.includes('android.permission.MODIFY_AUDIO_SETTINGS'));
  assert.ok(androidPrep.includes('android.permission.CAMERA'));
});

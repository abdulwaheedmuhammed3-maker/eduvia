const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app.js'), recall = read('recall.js'), core = read('recall-core.js');
const index = read('index.html'), worker = read('notifications-worker/src/index.js');
const native = read('native-bridge-src.js'), serviceWorker = read('service-worker.js');
const build = read('scripts/build-web.mjs'), workflow = read('.github/workflows/validate.yml');
const migration = read('notifications-worker/migrations/0003_recall_notification_routes.sql');

test('Recall is registered as a valid deep-link route and a Play learning tool', () => {
  assert.ok(app.includes("'recall'"));
  assert.ok(app.includes("route.startsWith('recall/')"));
  assert.ok(recall.includes('window.eduPageRenderers.recall = renderRecall'));
  assert.ok(recall.includes('data-page="recall"'));
});
test('Recall question bank is built from local course materials and flashcards', () => {
  assert.ok(recall.includes('loadCourseText(course.id)'));
  assert.ok(recall.includes('window.eduCourseIntelligence'));
  assert.ok(recall.includes('data.flashcards'));
  assert.ok(recall.includes('data.resources'));
  assert.ok(recall.includes('window.eduRecallBuildReminders'));
  assert.ok(app.includes('window.eduRecallBuildReminders(now)'));
});
test('Recall scheduling is bounded and notifications contain the prompt, not the answer', () => {
  assert.ok(core.includes("const LIMITS = { light: 2, balanced: 4, intensive: 6 }"));
  assert.ok(core.includes('(hourCounts.get(hour) || 0) >= 2'));
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

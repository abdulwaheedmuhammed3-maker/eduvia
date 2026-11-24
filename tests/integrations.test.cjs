const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('integration screens are registered, loaded, cached and copied into the app build', () => {
  const html = read('index.html');
  const app = read('app.js');
  const worker = read('service-worker.js');
  const build = read('scripts/build-web.mjs');
  assert.match(app, /'integrations','ai-tutor'/);
  assert.match(html, /integrations\.js\?v=/);
  assert.match(html, /integrations\.css\?v=/);
  assert.match(worker, /integrations\.js\?v=/);
  assert.match(worker, /integrations\.css\?v=/);
  assert.match(build, /'integrations\.js'/);
  assert.match(build, /'integrations\.css'/);
  assert.match(worker, /eduvia-v107-ai-google-integrations/);
});

test('AI requests run on the Worker and keep the OpenAI key out of browser assets', () => {
  const worker = read('notifications-worker/src/integrations.js');
  const client = read('integrations.js');
  assert.match(worker, /api\.openai\.com\/v1\/responses/);
  assert.match(worker, /store:\s*false/);
  assert.match(worker, /OPENAI_API_KEY/);
  assert.match(worker, /gpt-6\.2-sol/);
  assert.match(worker, /\/v1\/ai\/tutor/);
  assert.match(worker, /\/v1\/ai\/summary/);
  assert.match(client, /\/v1\/ai\/tutor/);
  assert.match(client, /contexts/);
  assert.doesNotMatch(client, /OPENAI_API_KEY|sk-[A-Za-z0-9]{16,}/);
});

test('Google OAuth uses state, PKCE and encrypted server-side refresh tokens', () => {
  const worker = read('notifications-worker/src/integrations.js');
  const migration = read('notifications-worker/migrations/0004_ai_google_integrations.sql');
  assert.match(worker, /code_challenge_method:\s*'S256'/);
  assert.match(worker, /state_hash/);
  assert.match(worker, /AES-GCM/);
  assert.match(worker, /GOOGLE_TOKEN_ENCRYPTION_KEY/);
  assert.match(worker, /refresh_token_enc/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS google_connections/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS google_oauth_states/);
  assert.match(worker, /\/v1\/integrations\/google\/disconnect/);
  assert.doesNotMatch(read('integrations.js'), /GOOGLE_CLIENT_SECRET|GOOGLE_TOKEN_ENCRYPTION_KEY/);
});

test('Drive Picker imports selected files through the existing local document reader', () => {
  const worker = read('notifications-worker/src/integrations.js');
  const client = read('integrations.js');
  assert.match(worker, /drive\.file/);
  assert.match(worker, /google\/drive\/download/);
  assert.match(worker, /MAX_JSON_BYTES/);
  assert.match(client, /google\.picker\.PickerBuilder/);
  assert.match(client, /eduHandleStudioFile\('material'/);
  assert.match(client, /intDriveCourse/);
});

test('Meet transcript and recording imports preserve the existing lecture workflow', () => {
  const worker = read('notifications-worker/src/integrations.js');
  const client = read('integrations.js');
  const lecture = read('lecture-intelligence.js');
  const studio = read('study-studio.js');
  assert.match(worker, /google\/meet\/records/);
  assert.match(worker, /google\/meet\/entries/);
  assert.match(worker, /drive\.meet\.readonly/);
  assert.match(worker, /MAX_AUDIO_BYTES\s*=\s*25\s*\*\s*1024\s*\*\s*1024/);
  assert.match(worker, /gpt-transcribe/);
  assert.match(client, /importMeetTranscript/);
  assert.match(client, /transcribeMeetRecording/);
  assert.match(client, /googleArtifactName/);
  assert.match(studio, /googleRecordingFileId/);
  assert.match(lecture, /data-lecture-action="ai-summary"/);
  assert.match(lecture, /generateLectureSummary/);
});

test('Calendar sync supports incremental tokens, deletion, weekly schedules and update-safe exports', () => {
  const worker = read('notifications-worker/src/integrations.js');
  const client = read('integrations.js');
  const app = read('app.js');
  assert.match(worker, /syncToken/);
  assert.match(worker, /status === 410/);
  assert.match(worker, /extendedProperties/);
  assert.match(worker, /eduviaId/);
  assert.match(worker, /fullSyncRequired/);
  assert.match(client, /googleCalendarImported/);
  assert.match(client, /repeatFrom/);
  assert.match(client, /repeatUntil/);
  assert.match(client, /localFieldsAsUtc/);
  assert.match(client, /toISOString\(\)\.slice\(0, 19\)/);
  assert.match(app, /event\.repeatFrom/);
  assert.match(app, /event\.repeatUntil/);
});

test('AI usage is rate-limited and API responses do not retain OpenAI conversations', () => {
  const worker = read('notifications-worker/src/integrations.js');
  const migration = read('notifications-worker/migrations/0004_ai_google_integrations.sql');
  assert.match(worker, /async function rateLimit/);
  assert.match(worker, /\/v1\/ai\/tutor/);
  assert.match(worker, /\/v1\/ai\/summary/);
  assert.match(worker, /\/v1\/ai\/transcribe/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS ai_usage/);
  assert.match(worker, /store:\s*false/);
});

test('worker routing keeps existing reminder endpoints while adding integrations', () => {
  const worker = read('notifications-worker/src/index.js');
  assert.match(worker, /handleIntegrationRoutes/);
  assert.match(worker, /\/v1\/schedule/);
  assert.match(worker, /\/v1\/test/);
  assert.match(worker, /\/v1\/unsubscribe/);
});

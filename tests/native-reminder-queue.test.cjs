const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');
const bridge = fs.readFileSync('native-bridge-src.js', 'utf8');

test('Android local reminder queue refreshes when Eduvia returns to the foreground', () => {
  assert.ok(bridge.includes("window.dispatchEvent(new Event('eduvia-native-resume'))"));
  const handler = app.slice(app.indexOf("window.addEventListener('eduvia-native-resume'"), app.indexOf("function updateSidebarGoal"));
  assert.ok(handler.includes('schedulePushSync()'));
  assert.ok(handler.includes('scheduleEventAlert()'));
  assert.ok(handler.includes('scheduleReminder()'));
});

test('Eduvia discloses the Android 300-reminder queue limit when future reminders are truncated', () => {
  assert.ok(bridge.includes('const MAX_LOCAL_REMINDERS = 300;'));
  assert.ok(bridge.includes('truncated: reminders.length > notifications.length'));
  assert.ok(app.includes('result.truncated'));
  assert.ok(app.includes('NATIVE_REMINDER_LIMIT_NOTICE_KEY'));
  assert.ok(app.includes('up to 300 future Eduvia reminders'));
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const entry=fs.readFileSync('entry-flow.js','utf8');
const native=fs.readFileSync('native-bridge-src.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const worker=fs.readFileSync('service-worker.js','utf8');

test('first-run notification invitation appears after profile setup, not on existing-user startup',()=>{
 const completion=entry.slice(entry.indexOf('function completeProfile'),entry.indexOf('function dismissExistingUserSplash'));
 const startup=entry.slice(entry.indexOf('const profileComplete ='),entry.indexOf('currentStep = 0;',entry.indexOf('const profileComplete =')));
 assert.ok(completion.includes('window.eduPromptFirstLaunchNotifications()'));
 assert.ok(completion.includes('root.remove()'));
 assert.ok(startup.includes('if (profileComplete)'));
 assert.ok(startup.includes('dismissExistingUserSplash()'));
 assert.ok(!startup.includes('eduPromptFirstLaunchNotifications'));
});

test('first-run invitation is shown once and has a user-controlled enable action',()=>{
 assert.ok(app.includes("const FIRST_LAUNCH_ALERT_PROMPT_KEY = 'eduvia-first-launch-alert-prompt-v1'"));
 assert.ok(app.includes("storageGet(FIRST_LAUNCH_ALERT_PROMPT_KEY)==='1'"));
 assert.ok(app.includes("storageSet(FIRST_LAUNCH_ALERT_PROMPT_KEY,'1')"));
 assert.ok(app.includes("openModal(\n  'Enable Eduvia alerts'"));
 assert.ok(app.includes("'Enable alerts'"));
 assert.ok(app.includes('()=>{closeModal();enableNotifications()}'));
 assert.ok(app.includes("case'enable-notifications':enableNotifications();break;"),'existing Settings toggle remains available');
});

test('browser and Android permission requests remain behind an explicit user action',()=>{
 const enable=app.slice(app.indexOf('async function enableNotifications()'),app.indexOf('function disableNotifications()'));
 assert.ok(enable.includes('Notification.requestPermission()'));
 assert.ok(enable.includes('window.EduviaNative.enableAlerts'));
 assert.ok(native.includes('async enableAlerts(reminders)'));
 assert.ok(native.includes('notificationAccess(true)'));
 const resume=native.slice(native.indexOf("App.addListener('appStateChange'"),native.indexOf("App.addListener('appRestoredResult'"));
 assert.ok(!resume.includes('notificationAccess(true)'));
 assert.ok(!resume.includes('requestPermissions()'));
});

test('returning users retain Settings controls and assets are cache-versioned together',()=>{
 assert.ok(app.includes('Eduvia phone notifications'));
 assert.ok(app.includes('data-action="${pushEnabled?\'disable-notifications\':\'enable-notifications\'}"'));
 assert.ok(index.includes('first-run-alerts-1'));
 assert.ok(index.includes('first-run-alert-optin-1'));
 assert.ok(worker.includes('eduvia-v93-first-run-alerts'));
 assert.ok(worker.includes('first-run-alerts-1'));
 assert.ok(worker.includes('first-run-alert-optin-1'));
});

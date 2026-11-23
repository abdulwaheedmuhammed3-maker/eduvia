const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');


 
test('backup preview delegates to the atomic restore handlers without a redundant unchecked save',()=>{
 const feature=read('feature-hub.js');
 const start=feature.indexOf('async function previewAndRestore(file,isZip)');
 const end=feature.indexOf("\n  document.addEventListener('change'",start);
 const restore=feature.slice(start,end);
 assert.ok(restore.includes('await originalImportZip(file)'));
 assert.ok(restore.includes('await originalImportJson(file)'));
 assert.ok(!/\bsave\(\)\s*;/.test(restore));
});
 
test('planner JSON restore uses the checked direct storage write and then refreshes UI without a second persistence write',()=>{
 const studio=read('study-studio.js');
 const start=studio.indexOf('async function importPlannerJsonBackup(file)');
 const end=studio.indexOf('async function replaceStudioStoresAtomically',start);
 const restore=studio.slice(start,end);
 assert.ok(restore.indexOf('localStorage.setItem(STORE_KEY,JSON.stringify(restored))')<restore.indexOf('data=restored;'));
 assert.ok(restore.includes('applyTheme();render();scheduleEventAlert();schedulePushSync()'));
 assert.ok(!/\bsave\(\)\s*;/.test(restore));
});

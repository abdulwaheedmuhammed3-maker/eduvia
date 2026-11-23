const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=path=>fs.readFileSync(path,'utf8');
const feature=read('feature-hub.js');
const studio=read('study-studio.js');
const expansions=read('learning-expansions.js');
const appStyles=read('styles.css');
const experienceStyles=read('experience.css');
const worker=read('notifications-worker/src/index.js');
const workflow=read('.github/workflows/validate.yml');

test('course and timetable category backup handlers share the same IIFE scope',()=>{
 const exportAt=feature.indexOf('function exportCategoryBackup(kind)');
 const importAt=feature.indexOf('async function importCategoryBackup(file,expectedKind)');
 const inputAt=feature.indexOf("if(e.target.id==='coursesCategoryBackupFile'");
 const clickAt=feature.indexOf("const categoryButton=e.target.closest('[data-action=\"export-category-backup\"]')");
 assert.ok(exportAt>=0&&importAt>=0&&inputAt>=0&&clickAt>=0);
 assert.ok(exportAt<inputAt,'export helper must be declared outside the change callback');
 assert.ok(importAt<inputAt,'import helper must be declared outside the change callback');
 assert.ok(feature.slice(clickAt,clickAt+250).includes('exportCategoryBackup(categoryButton.dataset.kind)'));
});

test('timetable restore reconnects course links using the existing plural matching helper',()=>{
 assert.ok(feature.includes('courseMatchKeys(c).some(key=>keys.includes(key))'));
 assert.ok(!feature.includes('courseMatchKey('),'the undefined singular matcher must not remain');
 assert.ok(feature.includes('function eventMatchKey('));
});

test('course mastery shortcut targets the current Edit learning area button',()=>{
 assert.ok(feature.includes('title="Edit (?:course|learning area)"'));
 assert.ok(feature.includes('data-feature="open-mastery" data-course="$2"'));
});

test('backup previews and imports reject partial or malformed planner data before replacement',()=>{
 assert.ok(feature.includes('function isValidPlannerBackup(value)'));
 assert.ok(feature.includes('isValidPlannerBackup(incoming)'));
 assert.ok(studio.includes("!Array.isArray(imported.courses)||!Array.isArray(imported.events)"));
 assert.ok(feature.includes('safetyPortableZip()'));
});

test('study practice has one source-aware generator and a usable multiple-choice payload',()=>{
 assert.equal((studio.match(/function localPractice\(course,sources,count,style\)\{/g)||[]).length,1);
 assert.ok(studio.includes("if(style==='mcq')"));
 assert.ok(studio.includes('options,'));
 assert.ok(studio.includes('correctOption,'));
 assert.ok(studio.includes('citation:correct.citation'));
 assert.ok(studio.includes('location:correct.location'));
 assert.ok(studio.includes('Multiple-choice practice needs at least four distinct passages.'));
 assert.ok(studio.includes('select an option and open “Show answer”'));
});

test('term archives retain class reflections and study quiz attempts',()=>{
 assert.ok(studio.includes('studyRecords:JSON.parse(JSON.stringify(data.studyRecords||[]))'));
 assert.ok(studio.includes('Class reflections and study quiz records'));
 assert.ok(studio.includes('(record.studyRecords||[])'));
});

test('Discover exposes every original learning-guide category',()=>{
 const categories=expansions.slice(expansions.indexOf('const cats=['),expansions.indexOf('];',expansions.indexOf('const cats=[')));
 for(const category of ['Learn smarter','Study smarter','Academic skills','Exam preparation','Opportunities','Digital skills','Career readiness'])assert.ok(categories.includes(category));
});

test('existing style tokens used by practice and Discover are defined with fallbacks',()=>{
 assert.ok(appStyles.includes('color:var(--ink)'));
 assert.ok(appStyles.includes('var(--surface-soft,var(--paper,#fff))'));
 assert.ok(appStyles.includes('var(--accent-purple,var(--green,#655ee0))'));
 assert.ok(experienceStyles.includes('--exp-card:var(--paper,#fff)'));
 assert.ok(experienceStyles.includes('--exp-soft:var(--surface-soft,#f7f8fd)'));
});

test('notification schedules are marked complete only after all reminder batches are written',()=>{
 const start=worker.indexOf("if (request.method === 'POST' && url.pathname === '/v1/schedule')");
 const end=worker.indexOf("if (request.method === 'POST' && url.pathname === '/v1/test')",start);
 const schedule=worker.slice(start,end);
 assert.ok(schedule.includes("VALUES (?, ?, \\'\\', ?)"));
 assert.ok(schedule.includes('await env.DB.batch(statements)'));
 assert.ok(schedule.includes("UPDATE devices SET schedule_hash = ? WHERE device_id = ?"));
 assert.ok(schedule.indexOf('await env.DB.batch(statements)')<schedule.indexOf('UPDATE devices SET schedule_hash'));
 assert.ok(!schedule.includes('schedule_hash = excluded.schedule_hash'));
});

test('changed assets are versioned identically in HTML and the new offline cache',()=>{
 const html=read('index.html');
 const sw=read('service-worker.js');
 for(const asset of ['styles.css','experience.css','study-studio.js','feature-hub.js','learning-expansions.js']){
  const url=html.match(new RegExp('(?:src|href)="([^"]*'+asset+'[^"]*)"'))?.[1];
  assert.ok(url&&url.includes('audit=1')||asset==='styles.css'||asset==='experience.css','the changed asset must have a cache-busting revision: '+asset);
  if(asset!=='styles.css'&&asset!=='experience.css')assert.ok(sw.includes('./'+url));
 }
 assert.ok(html.includes('styles.css?v=entry-flow-4&rev=application-audit-1'));
 assert.ok(sw.includes('./styles.css?v=entry-flow-4&rev=application-audit-1'));
 assert.ok(workerCacheVersion(sw)==='eduvia-v94-full-application-audit');
});
function workerCacheVersion(source){return source.match(/const CACHE = '([^']+)'/)?.[1]||''}

test('pull-request validation installs dependencies, runs the suite and builds the real web bundle',()=>{
 assert.ok(workflow.includes('npm install --no-package-lock'));
 assert.ok(workflow.includes('npm test'));
 assert.ok(workflow.includes('npm run build:web'));
});

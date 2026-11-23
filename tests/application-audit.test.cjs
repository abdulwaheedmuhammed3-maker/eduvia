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
 assert.ok(studio.includes('At least four distinct searchable topics or titled sections are needed for unambiguous choices'));
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
 assert.ok(!/var\\(--accent\\)/.test(appStyles));
 assert.ok(!appStyles.includes('var(--surface-2,var(--panel))'));
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
 assert.ok(html.includes('first-run-alerts-3'));
 assert.ok(html.includes('first-run-alert-optin-2'));
 assert.ok(sw.includes('first-run-alerts-3'));
 assert.ok(sw.includes('first-run-alert-optin-2'));
 assert.ok(sw.includes('./styles.css?v=entry-flow-4&rev=application-audit-1'));
 assert.ok(workerCacheVersion(sw)==='eduvia-v96-full-application-audit');
});
function workerCacheVersion(source){return source.match(/const CACHE = '([^']+)'/)?.[1]||''}

test('pull-request validation installs dependencies, runs the suite and builds the real web bundle',()=>{
 assert.ok(workflow.includes('npm install --no-package-lock'));
 assert.ok(workflow.includes('npm test'));
 assert.ok(workflow.includes('npm run build:web'));
});

test('initial and changed hash routes safely handle invalid URLs and malformed course IDs',()=>{
 const app=read('app.js');
 assert.ok(app.includes('const SUPPORTED_PAGE_ROUTES=new Set(['));
 assert.ok(app.includes('function resolveHashRoute(hash)'));
 assert.ok(app.includes("catch{\n      return {page:'courses',courseId:''};\n    }"));
 assert.ok(app.includes("SUPPORTED_PAGE_ROUTES.has(route)?route:'today'"));
 assert.ok(app.includes('const initialRoute=resolveHashRoute(location.hash)'));
 assert.ok(app.includes('const route=resolveHashRoute(location.hash)'));
 assert.ok(!app.includes("decodeURIComponent(initialRoute.slice(7))"));
});

test('legacy roadmap categories remain selected when editing a saved goal',()=>{
 const roadmaps=read('roadmaps.js');
 assert.ok(roadmaps.includes("const options=selected&&!categories.includes(selected)?[selected,...categories]:categories"));
 assert.ok(roadmaps.includes("options.map(category=>"));
});

test('category backup matching collapses actual whitespace before matching courses',()=>{
 const feature=read('feature-hub.js');
 assert.ok(feature.includes(".replace(/\\s+/g,' ')"));
 assert.ok(!feature.includes(".replace(/\\\\s+/g,' ')"));
});

test('material reads and portable backup exports use the saved extracted-text fallback when IndexedDB is unavailable',()=>{
 const studio=read('study-studio.js');
 assert.ok(studio.includes('function fallbackMaterial(materialId)'));
 assert.ok(studio.includes('resolve(req.result||fallbackMaterial(materialId))'));
 assert.ok(studio.includes("storeName===STUDIO_STORE?fallbackMaterial(recordId):null"));
 assert.ok(studio.includes('const cached=fallback();if(cached)return cached;throw error'));
 assert.ok(studio.includes('const fallbackMaterials=new Map(imported.materialText.filter(item=>item&&item.id!==undefined).map(item=>[String(item.id),item]))'));
 assert.ok(studio.includes('record=fallbackMaterials.get(metadata.id)'));
 assert.ok(studio.includes('materialRecords.push(record)'));
 assert.ok(studio.includes('restored.materialText=[]'));
});

test('course and timetable imports fall back from unmatched course codes to exact course names',()=>{
 const studio=read('study-studio.js');
 assert.ok(studio.includes("const raw=String(value||'').trim();if(!raw)return null"));
 assert.ok(studio.includes('let course=matchCourse(row.code)||matchCourse(row.name)'));
 assert.ok(studio.includes('const c=matchCourse(row.courseCode)||matchCourse(row.title)'));
 assert.ok(studio.includes("replaces class entries previously imported through Learning Studio"));
 assert.ok(studio.includes('Manually created classes and personal study sessions are kept'));
});

test('portable backup export and safety copies refuse to omit missing stored files',()=>{
 const studio=read('study-studio.js');
 const feature=read('feature-hub.js');
 assert.ok(studio.includes("if(!blob)throw new Error('A saved personal document is missing"));
 assert.ok(studio.includes("if(!record)throw new Error('An archived academic record is missing"));
 assert.ok(studio.includes("if(!record)throw new Error('Extracted course material is missing"));
 assert.ok(feature.includes("if(!record)throw new Error('The safety copy is incomplete"));
});

test('portable ZIP restore validates attachments before a single atomic IndexedDB replacement',()=>{
 const studio=read('study-studio.js');
 const start=studio.indexOf('async function importPortableBackup(file)');
 const end=studio.indexOf('function clearData()',start);
 const restore=studio.slice(start,end);
 assert.ok(restore.indexOf('Read and validate every attachment')<restore.indexOf("if(!confirm("));
 assert.ok(restore.indexOf("if(!confirm(")<restore.indexOf("storageSet(STORE_KEY,JSON.stringify(restored))"));
 assert.ok(restore.includes('The backup is missing the file for personal document'));
 assert.ok(restore.includes('The backup is missing archived academic record'));
 assert.ok(restore.includes('The backup is missing extracted course material'));
 assert.ok(restore.includes('await replaceStudioStoresAtomically('));
 assert.ok(restore.includes('const rollbackError='));
 assert.ok(studio.includes('tx.objectStore(storeName).clear()'));
});

test('multiple-choice questions are topic-specific and use distractors from other topic groups',()=>{
 const studio=read('study-studio.js');
 assert.ok(studio.includes('const groups=labels.map(topic=>'));
 assert.ok(studio.includes('const other=groups[(targetIndex+step)%groups.length]'));
 assert.ok(studio.includes("question:'Which passage best explains '+target.topic+' according to your course material?'"));
 assert.ok(studio.includes("if(distractors.length<3)continue"));
 assert.ok(studio.includes('Show correct choice / source passage'));
 assert.ok(studio.includes("Multiple-choice questions need at least four distinct searchable topics or titled sections."));
 assert.ok(studio.includes("if(generated.questions.length<count)toast('Created '"));
});

test('MCQ answer reveal expressions interpolate at runtime rather than displaying template placeholders',()=>{
 const studio=read('study-studio.js');
 assert.ok(studio.includes('<summary>${q.options?'));
 assert.ok(studio.includes('<p>${q.options?'));
 assert.ok(!studio.includes('\\${q.options?'));
});

test('Android APK is built for pull requests but the beta release is published only outside PRs',()=>{
 const workflow=read('.github/workflows/build-android.yml');
 assert.ok(workflow.includes('pull_request:'));
 assert.ok(workflow.includes('branches: [main]'));
 assert.ok(workflow.includes("if: github.event_name != 'pull_request'"));
 assert.ok(workflow.includes('npm run android:prepare'));
 assert.ok(workflow.includes('./gradlew assembleDebug'));
 assert.ok(workflow.includes('actions/upload-artifact@v7'));
});

test('a changed notification schedule removes sent and failed rows before inserting replacement IDs',()=>{
 const worker=read('notifications-worker/src/index.js');
 const start=worker.indexOf("if (request.method === 'POST' && url.pathname === '/v1/schedule')");
 const end=worker.indexOf("if (request.method === 'POST' && url.pathname === '/v1/test')",start);
 const schedule=worker.slice(start,end);
 assert.ok(schedule.includes("DELETE FROM reminders WHERE device_id = ?"));
 assert.ok(!schedule.includes("status IN ('pending', 'sending')"));
 assert.ok(schedule.indexOf('DELETE FROM reminders')<schedule.indexOf('await env.DB.batch(statements)'));
});

test('app reminder schedules deduplicate IDs before syncing to D1',()=>{
 const feature=read('feature-hub.js');
 assert.ok(feature.includes('const unique=new Map();for(const reminder of reminders)unique.set(String(reminder.id),reminder)'));
});
test('notification Worker rejects duplicate reminder IDs before writing schedule rows',()=>{
 const worker=read('notifications-worker/src/index.js');
 assert.ok(worker.includes('const reminderIds = new Set()'));
 assert.ok(worker.includes("The schedule contains duplicate reminder IDs."));
 assert.ok(worker.indexOf('reminderIds.has(reminder.id)')<worker.indexOf('await env.DB.prepare(\'INSERT INTO devices'));
});

test('notification Worker returns generic server errors instead of exposing internal exception messages',()=>{
 const worker=read('notifications-worker/src/index.js');
 assert.ok(worker.includes('const expected = error instanceof RequestError'));
 assert.ok(worker.includes("expected ? error.message : 'The notification service could not complete that request.'"));
 assert.ok(!worker.includes("{ error: error?.message || 'The notification service could not complete that request.' }"));
});

test('Clear planner data waits for all IndexedDB file stores to clear before reporting success',()=>{
 const studio=read('study-studio.js');
 const start=studio.indexOf('async function clearAllStudioRecords()');
 const end=studio.indexOf('document.addEventListener(\'change\',e=>{',start);
 const block=studio.slice(start,end);
 assert.ok(block.includes("stores=[STUDIO_STORE,'academicRecords','personalDocuments']"));
 assert.ok(block.includes("db.transaction(stores,'readwrite')"));
 assert.ok(block.includes("tx.objectStore(storeName).clear()"));
 assert.ok(block.includes('tx.oncomplete=()=>finish()'));
 assert.ok(block.includes('tx.onabort=()=>finish('));
 assert.ok(block.includes('await clearAllStudioRecords()'));
 assert.ok(block.includes('could not clear uploaded file storage'));
 assert.ok(!block.includes('indexedDB.deleteDatabase(STUDIO_DB)'));
});

test('canonical default data initializes every feature store used after a clear/reset',()=>{
 const app=read('app.js');
 const match=app.match(/const defaultData = \(\) => \(\{([\s\S]*?)\}\);/);
 assert.ok(match,'defaultData factory must remain directly inspectable');
 for(const field of ['activeMockExam','deadlines','flashcards','topicMastery','materials','materialText','imports','pendingCarryovers','studyPlan','askHistory','discoverSavedGuides','discoverReadHistory','playChallengeAttempts','wellnessCheckins']){
  assert.ok(new RegExp('(?:^|,)'+field+':').test(match[1]),'defaultData is missing '+field);
 }
});

test('deleting a course keeps linked learner content and clears only timetable entries',()=>{
 const app=read('app.js');
 const start=app.indexOf('function deleteCourse(courseId)');
 const end=app.indexOf('function deleteEvent(eventId)',start);
 const remove=app.slice(start,end);
 assert.ok(remove.includes("data.events=data.events.filter(event=>String(event.courseId||'')!==String(courseId))"));
 assert.ok(remove.includes('record.courseName=record.courseName||course.name'));
 for(const name of ['data.resources','data.deadlines','data.personalDocuments','data.materials','data.materialText','data.studyRecords','data.flashcards','data.exams','data.revisionTasks','data.roadmaps']){
  assert.ok(remove.includes(name),'linked records must be preserved and unlinked: '+name);
 }
 assert.ok(remove.includes('data.courses=data.courses.filter'));
 assert.ok(remove.includes("data.courses=data.courses.filter")||remove.includes("data.courses = data.courses.filter"));
 assert.ok(remove.includes("location.hash='courses'"));
 assert.ok(remove.includes('kept and unlinked'));
});

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
 for(const asset of ['styles.css','experience.css','app.js','study-studio.js','feature-hub.js','learning-expansions.js']){
  const url=html.match(new RegExp('(?:src|href)="([^"]*'+asset+'[^"]*)"'))?.[1];
  assert.ok(url&&/[?&]audit=\d+/.test(url)||asset==='styles.css'||asset==='experience.css','the changed asset must have a cache-busting revision: '+asset);
  if(asset!=='styles.css'&&asset!=='experience.css')assert.ok(sw.includes('./'+url));
 }
 assert.ok(html.includes('styles.css?v=entry-flow-4&rev=application-audit-1'));
 assert.ok(html.includes('first-run-alerts-6'));
 assert.ok(sw.includes('first-run-alerts-6'));
 assert.ok(html.includes('first-run-alert-optin-2'));
 assert.ok(sw.includes('first-run-alerts-6'));
 assert.ok(sw.includes('first-run-alert-optin-2'));
 assert.ok(sw.includes('./styles.css?v=entry-flow-4&rev=application-audit-1'));
 assert.ok(workerCacheVersion(sw)==='eduvia-v103-recorded-lecture-intelligence');
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
 for(const name of ['resources','deadlines','personalDocuments','materials','materialText','studyRecords','completed','flashcards','exams','revisionTasks','roadmaps']){
  assert.ok(remove.includes("'"+name+"'"),'linked records must be preserved and unlinked: '+name);
 }
 assert.ok(remove.includes('for(const name of collectionNames)'));
 assert.ok(remove.includes('previousCollections'));
 assert.ok(remove.includes('data.courses=data.courses.filter'));
 assert.ok(remove.includes("data.courses=data.courses.filter")||remove.includes("data.courses = data.courses.filter"));
 assert.ok(remove.includes("location.hash='courses'"));
 assert.ok(remove.includes('kept and unlinked'));
});

test('term archives capture and reset period-specific planners while preserving reusable assets',()=>{
 const studio=read('study-studio.js');
 const start=studio.indexOf('function archiveCurrentTerm()');
 const end=studio.indexOf('async function viewAcademicRecord',start);
 const archive=studio.slice(start,end);
 for(const field of ['deadlines','exams','revisionTasks','mockExamAttempts','activeMockExam','lastMockExam','flashcards','topicMastery','imports']){
  assert.ok(archive.includes(field+':JSON.parse(JSON.stringify(data.'+field),'archive captures '+field);
 }
 for(const reset of ['data.deadlines=[]','data.exams=[]','data.revisionTasks=[]','data.mockExamAttempts=[]','data.activeMockExam=null','data.lastMockExam=null','data.topicMastery={}','data.studyRecords=[]']){
  assert.ok(archive.includes(reset),'term rollover resets '+reset);
 }
 assert.ok(archive.includes("for(const collection of [data.resources,data.materials,data.materialText,data.personalDocuments,data.flashcards,data.roadmaps]"));
 assert.ok(archive.includes("item.courseId=''"),'reusable records must be detached from previous term courses');
 assert.ok(archive.includes('const previousData=JSON.parse(JSON.stringify(data))'));
 assert.ok(archive.includes('if(!save()){'));
 assert.ok(archive.includes("await deleteStudioRecord('academicRecords',archiveId)"));
 const viewerStart=studio.indexOf('async function viewAcademicRecord');
 const viewerEnd=studio.indexOf('function formatFileSize',viewerStart);
 const viewer=studio.slice(viewerStart,viewerEnd);
 assert.ok(viewer.includes('archivedDeadlines'));
 assert.ok(viewer.includes('archivedExams'));
 assert.ok(viewer.includes('archivedRevision'));
 assert.ok(viewer.includes('archivedMocks'));
 assert.ok(viewer.includes('archivedMastery'));
});

test('loadData normalizes every current feature store before renderers consume persisted data',()=>{
 const app=read('app.js');
 const start=app.indexOf('function loadData()');
 const end=app.indexOf('function learnerTypeOf',start);
 const loader=app.slice(start,end);
 assert.ok(loader.includes("Array.isArray(saved[key])?saved[key].filter(item=>item&&typeof item==='object'&&!Array.isArray(item))"));
 assert.ok(loader.includes("loaded.discoverSavedGuides=Array.isArray(saved.discoverSavedGuides)?saved.discoverSavedGuides.filter(item=>typeof item==='string'):[]"));
 for(const key of ['deadlines','flashcards','materials','materialText','pendingCarryovers','askHistory','discoverReadHistory','playChallengeAttempts','wellnessCheckins','roadmaps']){
  assert.ok(loader.includes("'"+key+"'"),'loadData must normalise '+key);
 }
 assert.ok(loader.includes('loaded.imports.courses=Array.isArray(loaded.imports.courses)?loaded.imports.courses:[]'));
 assert.ok(loader.includes('loaded.imports.timetable=Array.isArray(loaded.imports.timetable)?loaded.imports.timetable:[]'));
 assert.ok(loader.includes('loaded.profile.studyDays=Array.isArray(loaded.profile.studyDays)?loaded.profile.studyDays:[1,2,3,4,5,6]'));
 assert.ok(loader.includes('loaded.topicMastery=saved.topicMastery&&typeof saved.topicMastery'));
 assert.ok(loader.includes('loaded.activeMockExam=saved.activeMockExam&&typeof saved.activeMockExam'));
});

test('editing a document preserves its existing expiry reminder lead time',()=>{
 const feature=read('feature-hub.js');
 const start=feature.indexOf("if(action==='edit-document-meta')");
 const end=feature.indexOf("if(action==='export-backup')",start);
 const editor=feature.slice(start,end);
 assert.ok(editor.includes("const remindDays=[30,14,7,1].includes(Number(doc.remindDays))?Number(doc.remindDays):14"));
 assert.ok(editor.includes("(remindDays===days?'selected':'')"));
 assert.ok(editor.includes("doc.remindDays=Number(fd.get('remindDays')||14)"));
});

test('deleting a course unlinks completed-session history instead of leaving stale course IDs',()=>{
 const app=read('app.js');
 const start=app.indexOf('function deleteCourse(courseId)');
 const end=app.indexOf('function deleteEvent(eventId)',start);
 const remove=app.slice(start,end);
 assert.ok(remove.includes("'completed'"));
 assert.ok(remove.includes('record.courseName=record.courseName||course.name'));
 assert.ok(remove.includes("record.courseId=''"));
});

test('event and document reminders are marked delivered only after display succeeds',()=>{
 const app=read('app.js');
 const feature=read('feature-hub.js');
 assert.ok(app.includes("if(storageGet(alertKey)==='1'||at.getTime()<=now.getTime()-10*60*1000)continue"));
 assert.ok(app.includes('const shown=await showStudyNotification('));
 assert.ok(app.includes("if(!shown){\n        eventAlertTimer=setTimeout(()=>scheduleEventAlert(),60_000);"));
 assert.ok(app.includes("storageSet(key,'1');\n    }\n    scheduleEventAlert();"));
 const notifierStart=app.indexOf('async function showStudyNotification');
 const notifierEnd=app.indexOf('async function enableNotifications',notifierStart);
 const notifier=app.slice(notifierStart,notifierEnd);
 assert.ok(notifier.includes('return true'));
 assert.ok(notifier.includes('return false'));
 assert.ok(feature.includes('async function notifyExpiringDocuments()'));
 assert.ok(feature.includes('if(shown)storageSet(key,\'1\')'));
});

test('mock examination answer and self-assessment autosaves report storage failures',()=>{
 const feature=read('feature-hub.js');
 const start=feature.indexOf('function persistMockExamDraft()');
 const end=feature.indexOf("document.addEventListener('click',event=>{\n const button=event.target.closest('[data-mock-action]')",start);
 const block=feature.slice(start,end);
 assert.ok(block.includes('const error=storageSet(STORE_KEY,JSON.stringify(data))'));
 assert.ok(block.includes('Your mock exam changes could not be saved.'));
 assert.ok(block.includes('persistMockExamDraft();'));
 assert.ok(!block.includes('localStorage.setItem(STORE_KEY'));
});

test('web push schedules stay within the notification Worker 600-reminder limit',()=>{
 const feature=read('feature-hub.js');
 assert.ok(feature.includes("return [...unique.values()].sort((a,b)=>a.fireAt-b.fireAt).slice(0,600)"));
});

test('material metadata is not kept when its planner save fails',()=>{
 const studio=read('study-studio.js');
 const start=studio.indexOf('async function previewMaterial(');
 const end=studio.indexOf('function downloadCsv(',start);
 const save=studio.slice(start,end);
 assert.ok(save.includes('if(!save()){'));
 assert.ok(save.includes("data.materials=data.materials.filter(item=>item.id!==m.id)"));
 assert.ok(save.includes("(data.materialText||[]).filter(item=>item.id!==m.id)"));
 assert.ok(save.includes("if(storedInIndexedDb&&!await removeStoredMaterial(meta.id))toast('The lecture was not saved"));
 assert.ok(save.indexOf('if(!save()){')<save.indexOf("toast('Course material saved and indexed')"));
});

test('personal document deletion removes the blob first and restores it if metadata persistence fails',()=>{
 const studio=read('study-studio.js');
 const start=studio.indexOf('async function deletePersonalDocument(documentId)');
 const end=studio.indexOf('async function listStudioRecords',start);
 const remove=studio.slice(start,end);
 assert.ok(remove.includes("storedRecord=await getStudioRecord('personalDocuments',documentId)"));
 assert.ok(remove.indexOf("await deleteStudioRecord('personalDocuments',documentId)")<remove.indexOf('data.personalDocuments=previous.filter'));
 assert.ok(remove.indexOf("await deleteStudioRecord('personalDocuments',documentId)")<remove.indexOf('if(!save())'));
 assert.ok(remove.includes('if(!save()){\n    data.personalDocuments=previous;'));
 assert.ok(remove.includes("await putStudioRecord('personalDocuments',storedRecord)"));
});

test('new personal documents roll back their stored blob when planner metadata cannot be saved',()=>{
 const studio=read('study-studio.js');
 const start=studio.indexOf('function addPersonalDocument(file');
 const end=studio.indexOf('async function openPersonalDocument',start);
 const add=studio.slice(start,end);
 assert.ok(add.includes('if(!save()){'));
 assert.ok(add.includes("deleteStudioRecord('personalDocuments',documentId)"));
 assert.ok(add.indexOf('if(!save()){')<add.indexOf("toast('Document saved on this device')"));
});


test('restored tutorial links only render absolute HTTP or HTTPS destinations',()=>{
 const app=read('app.js');
 assert.ok(app.includes("function safeHttpUrl(value='')"));
 assert.ok(app.includes("['http:','https:'].includes(url.protocol)"));
 assert.ok(app.includes('href="${safeHttpUrl(r.url)}"'));
 assert.ok(!app.includes('href="${safe(r.url)}"'));
});

test('imported record identifiers are escaped before entering HTML attributes',()=>{
 const app=read('app.js');
 const studio=read('study-studio.js');
 assert.ok(app.includes('data-id="${safe(e.id)}"'));
 assert.ok(app.includes('data-id="${safe(c.id)}"'));
 assert.ok(app.includes('data-id="${safe(r.id)}"'));
 assert.ok(app.includes('value="${safe(c.id)}"'));
 assert.ok(!/data-id="\\$\\{[ecr]\\.id\\}"/.test(app));
 assert.ok(!/value="\\$\\{c\\.id\\}"/.test(app));
 assert.ok(studio.includes('data-id="${safe(m.id)}"'));
 assert.ok(!studio.includes('data-id="${m.id}"'));
});

test('persisted course colours are constrained to the built-in palette before rendering',()=>{
 const app=read('app.js');
 assert.ok(app.includes('let chosen=COLORS.includes(course?.color)?course.color:COLORS[0]'));
});

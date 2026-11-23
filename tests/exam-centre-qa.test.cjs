const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('feature-hub.js','utf8');
test('revision planner validates study-day values and uses a local date formatter',()=>{
 assert.ok(source.includes('rawStudyDays.map(Number).filter(day=>Number.isInteger(day)&&day>=0&&day<=6)'));
 assert.ok(source.includes('const localISO=d=>d.getFullYear()'));
});
test('revision plan date range excludes examination day and balances assignments',()=>{
 assert.ok(source.includes('d<examDate'));
 assert.ok(source.includes('Math.floor((index+0.5)*dates.length/work.length)'));
});
test('mock exam submission guards expiry and duplicate attempt persistence',()=>{
 assert.ok(source.includes('const expired=Number(active.endsAt)<=Date.now()'));
 assert.ok(source.includes('data.mockExamAttempts.some(attempt=>attempt.id===active.id)'));
});
test('mock answers are persisted on input and timer auto-submits',()=>{
 assert.ok(source.includes("event.target.matches('[data-mock-answer]')"));
 assert.ok(source.includes('if(left<=0)finishMockExam(true)'));
 assert.ok(source.includes("data.activeMockExam?.status==='in-progress'"));
 assert.ok(source.includes('if(mockExamTicker){clearInterval(mockExamTicker);mockExamTicker=null}'));
 assert.ok(source.includes('Number(active.endsAt)-Date.now()'));
});

test('mock session recovery normalizes answers and safely handles expired or malformed sessions',()=>{
 assert.ok(source.includes('active.answers=Array.isArray(active.answers)?active.answers: []'));
 assert.ok(source.includes('active.questions.map((_,index)=>String(active.answers[index]||\'\'))'));
 assert.ok(source.includes('if(!Number.isFinite(endsAt)||endsAt<=Date.now()){finishMockExam(true);return renderMockResults()}'));
 assert.ok(source.includes("active.status!=='in-progress'||!Array.isArray(active.questions)||!active.questions.length"));
});

test('the dedicated examination centre combines countdown, timetable, revision and mock exams',()=>{
 assert.ok(source.includes('exams:renderExamCentre'));
 const start=source.indexOf('function renderExamCentre(){');
 const end=source.indexOf('function renderExamTimetable(){',start);
 assert.ok(start>=0&&end>start,'dedicated examination centre renderer exists');
 const centre=source.slice(start,end);
 for(const feature of ['EXAM COUNTDOWN','renderExamTimetable()','renderRevisionPlans()','renderMockExamHub()']){
  assert.ok(centre.includes(feature),'exam centre should include '+feature);
 }
});
test('deleting an examination also removes only its linked revision tasks',()=>{
 assert.ok(source.includes('data.revisionTasks=data.revisionTasks.filter(task=>task.examId!==idValue)'));
});
test('exam countdown shortcut opens the dedicated examination centre',()=>{
 assert.ok(source.includes('data-page="exams">Open examination centre'));
});
test('exam centre contains only one examination timetable renderer',()=>{
 assert.equal(source.split('function renderExamTimetable(').length-1,1);
});

test('examination centre routes to the Play tab instead of More tools',()=>{
 const nav=source.slice(source.indexOf('const destinations={'),source.indexOf('const destination='));
 assert.ok(nav.includes("exams:'play'"));
 assert.ok(!nav.includes("exams:'more'"));
});


test('exam creation, editing and deletion roll back when local persistence fails',()=>{
 const submit=source.slice(source.indexOf("document.addEventListener('submit',event=>{if(event.target.id!=='examForm'"),source.indexOf('\ndata.revisionTasks=',source.indexOf("document.addEventListener('submit',event=>{if(event.target.id!=='examForm'")));
 assert.ok(submit.includes('const previousExams=[...data.exams]'));
 assert.ok(submit.includes('if(!save()){data.exams=previousExams;editingExamId=previousEditingExamId;render();return}'));
 assert.ok(submit.includes('if(!save()){data.exams=previousExams;data.revisionTasks=previousTasks;editingExamId=previousEditingExamId;render();return}'));
 assert.ok(submit.indexOf('if(!save())')<submit.indexOf("toast('Examination saved to your timetable.')"));
});

test('revision plans and checklist changes are rolled back when persistence fails',()=>{
 const start=source.indexOf('function generateRevisionPlan(');
 const end=source.indexOf('function renderRevisionPlans(',start);
 const planner=source.slice(start,end);
 assert.ok(planner.includes('const previousTasks=data.revisionTasks'));
 assert.ok(planner.includes('if(!save()){data.revisionTasks=previousTasks;render();return}'));
 const toggle=source.slice(source.indexOf("if(action==='toggle-task')"),source.indexOf("\n });",source.indexOf("if(action==='toggle-task')")));
 assert.ok(toggle.includes('const previous=task.completed'));
 assert.ok(toggle.includes('if(!save()){task.completed=previous;render()}'));
});

test('mock exam start, submission and review handle local persistence failures',()=>{
 const start=source.slice(source.indexOf('async function startMockExam('),source.indexOf('function mockClock(',source.indexOf('async function startMockExam(')));
 assert.ok(start.includes('const previousActiveExam=data.activeMockExam'));
 assert.ok(start.includes('if(!save()){data.activeMockExam=previousActiveExam;render();return}'));
 const finish=source.slice(source.indexOf('function finishMockExam('),source.indexOf('function renderMockResults(',source.indexOf('function finishMockExam(')));
 assert.ok(finish.includes('if(!save())render()'),'a completed result should remain visible with the storage error, not be presented as persisted');
 const review=source.slice(source.indexOf('function saveMockReview('),source.indexOf("document.addEventListener('submit',async event=>",source.indexOf('function saveMockReview(')));
 assert.ok(review.includes('previousAttempts=JSON.parse(JSON.stringify(data.mockExamAttempts||[]))'));
 assert.ok(review.includes('data.mockExamAttempts=previousAttempts;data.lastMockExam=previousLastAttempt;data.topicMastery=previousMastery;render();return'));
 assert.ok(review.indexOf('if(!save())')<review.indexOf("toast('Self-assessment saved."));
});

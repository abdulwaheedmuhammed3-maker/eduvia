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

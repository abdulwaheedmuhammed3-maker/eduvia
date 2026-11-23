const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const studio=fs.readFileSync('study-studio.js','utf8');

test('weekly study planning ignores expired one-off timetable entries but respects current and future conflicts',()=>{
 const helperStart=studio.indexOf('function planningEventIsActive(');
 const helperEnd=studio.indexOf('\n}',helperStart)+2;
 const helper=helperStart>=0&&helperEnd>1?studio.slice(helperStart,helperEnd):'';
 assert.ok(helper,'the planner must centralise one-off date relevance');
 const context={minutes:value=>{const [hours,minutes]=String(value||'').split(':').map(Number);return hours*60+minutes}};
 vm.runInNewContext(helper+';globalThis.checkPlanningEvent=planningEventIsActive;',context);
 const check=context.checkPlanningEvent;
 assert.equal(check({date:'2026-11-22',end:'12:00'},'2026-11-23',600),false,'a past extra class must not block a weekly slot forever');
 assert.equal(check({date:'',end:'12:00'},'2026-11-23',600),true,'a recurring timetable item must still block its weekday slot');
 assert.equal(check({date:'2026-11-24',end:'12:00'},'2026-11-23',600),true,'a future one-off event must protect its time slot');
 assert.equal(check({date:'2026-11-23',end:'12:00'},'2026-11-23',600),true,'an event still in progress today must protect its time slot');
 assert.equal(check({date:'2026-11-23',end:'09:00'},'2026-11-23',600),false,'an already-ended one-off event today must not block a later plan');
 const start=studio.indexOf('function generatePlan()');
 const end=studio.indexOf('function toTime(',start);
 const generator=studio.slice(start,end);
 assert.ok(generator.includes('const manual=data.events.filter(e=>!e.generated)'),'expired one-off records must remain in the saved timetable');
 assert.ok(generator.includes('blockers=manual.filter(e=>planningEventIsActive(e,planningDate,nowMinutes))'),'only active and future events should block weekly slots');
 assert.ok(generator.includes('data.events=manual.concat('),'the original manual schedule must be preserved when generated sessions are replaced');
});


test('PDF extraction refuses files over the 250-page processing limit instead of silently truncating them',()=>{
 const start=studio.indexOf('function ensurePdfPageLimit(');
 const end=studio.indexOf('\n}',start)+2;
 const helper=studio.slice(start,end);
 assert.ok(start>=0&&end>1,'the PDF page guard must exist');
 const context={};
 vm.runInNewContext(helper+';globalThis.checkPdfPageLimit=ensurePdfPageLimit;',context);
 assert.doesNotThrow(()=>context.checkPdfPageLimit(250));
 assert.throws(()=>context.checkPdfPageLimit(251),/more than 250 pages/i);
 const pdfBranch=studio.slice(studio.indexOf("if(ext==='pdf')"),studio.indexOf("if(['docx','pptx']",studio.indexOf("if(ext==='pdf')")));
 assert.ok(pdfBranch.indexOf('ensurePdfPageLimit(doc.numPages)')<pdfBranch.indexOf('Math.min(doc.numPages,250)'),'the guard must run before page extraction begins');
});


test('study availability only confirms saved changes and restores prior values when storage fails',()=>{
 const start=studio.indexOf('function saveAvailability(form)');
 const end=studio.indexOf('\n',start);
 const fn=studio.slice(start,end);
 assert.ok(fn.includes('if(!save())'),'availability updates must check the storage result');
 assert.ok(fn.includes('Object.assign(data.profile,previous)'),'failed writes must restore the prior in-memory preferences');
 assert.ok(fn.includes('form.elements.studyStart.value=previous.studyStart'),'failed writes must restore the visible start time');
 assert.ok(fn.includes('form.querySelectorAll'),'failed writes must restore visible selected days');
 assert.ok(fn.indexOf('if(!save())')<fn.indexOf("toast('Study availability saved')"),'success must only be shown after a successful save');
});

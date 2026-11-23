const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const studio=fs.readFileSync('study-studio.js','utf8');

test('course notes, course tasks and learning resources are not reported saved after storage failure',()=>{
 assert.ok(app.includes("if(!save()){data.resources=data.resources.filter(item=>item.id!==note.id);return}closeModal();toast('Note saved under '+course.name)"));
 assert.ok(app.includes("if(!save()){data.deadlines=data.deadlines.filter(item=>item.id!==task.id);return}closeModal();toast('Task saved under '+course.name)"));
 assert.ok(app.includes("if(!save()){data.resources=data.resources.filter(item=>item.id!==r.id);return}closeModal();toast('Saved to your learning kit')"));
});

test('course and timetable create/edit flows restore prior state on a failed save',()=>{
 assert.ok(app.includes("const previousCourses=[...data.courses];if(course)data.courses=data.courses.map(x=>x.id===course.id?obj:x);else data.courses.push(obj);if(!save()){data.courses=previousCourses;return}"));
 assert.ok(app.includes("const previousEvents=[...data.events],previousSelectedDate=selectedDate;"));
 assert.ok(app.includes("if(!save()){data.events=previousEvents;selectedDate=previousSelectedDate;return}closeModal();toast(event?'Timetable updated':'Added to your timetable')"));
});

test('session completion, focus completion and session-mark removal roll back on failed persistence',()=>{
 assert.ok(app.includes("if(!save()){data.completed=previousCompleted;return}toast('Session mark removed')"));
 assert.ok(app.includes("if(!save()){data.completed=data.completed.filter(item=>item.id!==completion.id);return}toast('Nice work — session complete!')"));
 assert.ok(app.includes("focusRunning=previousFocus.focusRunning;focusCompleted=previousFocus.focusCompleted"));
 assert.ok(app.includes("if(!save()){data.completed=data.completed.filter(item=>item.id!==completion.id);focusRunning=previousFocus.focusRunning;focusCompleted=previousFocus.focusCompleted;focusRemaining=previousFocus.focusRemaining;focusEndAt=previousFocus.focusEndAt;render();return}toast('Focus session complete. You did it!')"));
});

test('settings and course deletion restore prior saved state after a storage failure',()=>{
 assert.ok(app.includes('const previousProfile={name:data.profile.name,theme:data.profile.theme'));
 assert.ok(app.includes('if(!save()){Object.assign(data.profile,previousProfile);focusSessionMinutes=previousFocusMinutes'));
 assert.ok(app.includes('const previousCollections=collectionNames.map(name=>(data[name]||[]).map(record=>({...record})))'));
 assert.ok(app.includes('collectionNames.forEach((name,index)=>data[name]=previousCollections[index])'));
 assert.ok(app.includes("if(!save()){data.events=previousEvents;return}toast('Timetable item removed')"));
});

test('weekly study-plan generation restores the timetable and plan metadata if save fails',()=>{
 const start=studio.indexOf('function generatePlan()');
 const end=studio.indexOf('function toTime(',start);
 const generator=studio.slice(start,end);
 assert.ok(generator.includes('const previousEvents=data.events,previousStudyPlan=data.studyPlan,previousNotice=studioNotice'));
 assert.ok(generator.includes('if(!save()){data.events=previousEvents;data.studyPlan=previousStudyPlan;studioNotice=previousNotice;render();return}'));
});

test('first-run onboarding remains on the form when profile persistence fails',()=>{
 const start=studio.indexOf("if(e.target.id!=='onboardingForm')return");
 const end=studio.indexOf("\n});",start);
 const submit=studio.slice(start,end);
 assert.ok(submit.includes('const previousProfile={...data.profile}'));
 assert.ok(submit.includes('if(!save()){data.profile=previousProfile;return}'));
 assert.ok(submit.indexOf('if(!save())')<submit.indexOf("setPage('my-study')"));
});

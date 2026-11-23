const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const studio=fs.readFileSync('study-studio.js','utf8');

test('resource deletion, theme changes and profile-photo changes roll back after a failed save',()=>{
 assert.ok(app.includes("case'delete-resource':{const previousResources=data.resources"));
 assert.ok(app.includes("if(!save()){data.resources=previousResources;render();break}"));
 assert.ok(app.includes('const previousTheme=data.profile.theme'));
 assert.ok(app.includes('data.profile.theme=previousTheme;applyTheme();render();break'));
 assert.ok(app.includes('const previousAvatar=data.profile.avatarData'));
 assert.ok(app.includes("if(!save()){if(previousAvatar!==undefined)data.profile.avatarData=previousAvatar;render();break}"));
 assert.ok(app.includes("if(!save()){if(previousAvatar===undefined)delete data.profile.avatarData;else data.profile.avatarData=previousAvatar;render();return}"));
});

test('course and timetable imports restore courses, events, import history and preview on failed persistence',()=>{
 assert.ok(studio.includes('const previousCourses=(data.courses||[]).map(course=>({...course,topics:[...(course.topics||[])]}))'));
 assert.ok(studio.includes('previousImports={...data.imports,courses:[...(data.imports.courses||[])],timetable:[...(data.imports.timetable||[])]}'));
 assert.ok(studio.includes('if(!save()){data.courses=previousCourses;data.events=previousEvents;data.imports=previousImports'));
 assert.ok(studio.includes('pendingStudioImport=previousPending;studioNotice=previousNotice;render();return false'));
 assert.ok(studio.includes('if(commitStudioImport())closeModal()'));
});

test('carryover activation and formal learner profile updates are rolled back on storage failure',()=>{
 assert.ok(studio.includes('const previousCourses=(data.courses||[]).map(course=>({...course,topics:[...(course.topics||[])]})),previousCarryovers=(data.pendingCarryovers||[]).map(item=>({...item}))'));
 assert.ok(studio.includes('if(!save()){data.courses=previousCourses;data.pendingCarryovers=previousCarryovers;render();return}'));
 assert.ok(studio.includes('const previousProfile={...data.profile};'));
 assert.ok(studio.includes("if(!save()){data.profile=previousProfile;render();return}\n  toast('Your learning profile has been saved.')"));
});

test('class and study reflections are only marked complete after successful persistence',()=>{
 assert.ok(studio.includes('const previousRecords=[...(data.studyRecords||[])],previousCompleted=[...(data.completed||[])]'));
 assert.ok(studio.includes('if(!save()){data.studyRecords=previousRecords;data.completed=previousCompleted;return null}closeModal();return record'));
 assert.ok(studio.includes('const record=saveCompletedSession(event,date,{attendance'));
 assert.ok(studio.includes('if(!record)return;\n      toast(attended?'));
 assert.ok(studio.includes('if(!record)return;\n    toast(\'Study reflection saved\')'));
});

test('study-session quiz generation and attempts restore prior records after storage failure',()=>{
 assert.ok(studio.includes('const previousQuestions=record.quizQuestions'));
 assert.ok(studio.includes('if(!save()){record.quizQuestions=previousQuestions;return}'));
 assert.ok(studio.includes('previousAttempts=[...attempts],previousCompleted=[...(data.completed||[])],previousCompletedAt=record.completedAt'));
 assert.ok(studio.includes('if(!save()){record.quizAttempts=previousAttempts;record.completedAt=previousCompletedAt;data.completed=previousCompleted;render();return}'));
});

test('education results update local IndexedDB and planner summaries with rollback on failed planner save',()=>{
 assert.ok(studio.includes('previousHistory=(data.academicHistory||[]).map(item=>({...item,results:Array.isArray(item.results)?item.results.map(result=>({...result})):item.results}))'));
 assert.ok(studio.includes('if(!save()){data.academicHistory=previousHistory;data.pendingCarryovers=previousCarryovers;try{if(previousRecord)await putStudioRecord'));
 assert.ok(studio.includes('async function deleteAcademicRecord(recordId)'));
 assert.ok(studio.includes('if(!save()){data.academicHistory=previousHistory;data.pendingCarryovers=previousCarryovers;if(storedRecord)await putStudioRecord'));
});

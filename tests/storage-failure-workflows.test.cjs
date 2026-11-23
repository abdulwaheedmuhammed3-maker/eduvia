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

test('class and study reflections persist voice clips before completing sessions and retain rollback on failure',()=>{
 const start=studio.indexOf('async function saveCompletedSession(event,date,reflection,complete=true,voiceRecordings=[])');
 const end=studio.indexOf('function beginSessionCompletion',start);
 const saveBlock=studio.slice(start,end);
 assert.ok(saveBlock.includes('previousRecords=[...(data.studyRecords||[])],previousCompleted=[...(data.completed||[])]'));
 assert.ok(saveBlock.includes("await putStudioRecord('classAudio'"));
 assert.ok(saveBlock.includes('if(!save())'));
 assert.ok(saveBlock.includes('data.studyRecords=previousRecords'));
 assert.ok(saveBlock.includes('data.completed=previousCompleted'));
 assert.ok(saveBlock.includes("await deleteStudioRecord('classAudio',audioId)"));
 assert.ok(saveBlock.indexOf('if(!save())')<saveBlock.indexOf('closeModal()'));
 assert.ok(saveBlock.includes('return record'));
 const completion=studio.slice(studio.indexOf('function beginSessionCompletion(event,date)'),studio.indexOf('function sessionQuizSources',studio.indexOf('function beginSessionCompletion(event,date)')));
 assert.ok(completion.includes('const record=await saveCompletedSession(event,date,{attendance'));
 assert.ok(completion.includes('if(!record){if(submitButton)submitButton.disabled=false;return}'));
 assert.ok(completion.includes('const record=await saveCompletedSession(event,date,{topics:'));
 assert.ok(completion.includes('if(!record){if(submitButton)submitButton.disabled=false;return}'));
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


test('material deletion waits for IndexedDB removal and restores the file if planner persistence fails',()=>{
 assert.ok(studio.includes('async function removeStoredMaterial(materialId)'));
 assert.ok(studio.includes('return true}catch{return false}finally{db?.close()}'));
 const start=studio.indexOf("case'delete-material':{");
 const saveGate=studio.indexOf('if(!await removeStoredMaterial(materialId))',start);
 const metadataRemoval=studio.indexOf('data.materials=data.materials.filter(m=>String(m.id)!==materialId)',start);
 const rollback=studio.indexOf('if(!save()){data.materials=previousMaterials;data.materialText=previousText',start);
 assert.ok(start>=0&&saveGate>start&&metadataRemoval>saveGate,'the stored file must be removed before metadata changes');
 assert.ok(studio.slice(start,metadataRemoval).includes('stored=await getStudioRecord(STUDIO_STORE,materialId)'));
 assert.ok(rollback>metadataRemoval);
 assert.ok(studio.slice(rollback,rollback+260).includes('await putStudioRecord(STUDIO_STORE,stored)'));
});

 
test('recorded lecture deletion confirms file deletion before metadata removal and restores the file on save failure',()=>{
 const start=studio.indexOf('async remove(lectureId)');
 const end=studio.indexOf('\n  }\n};',start)+4;
 const remove=studio.slice(start,end);
 assert.ok(remove.includes('const storedRecord=storedInIndexedDb?await readMaterial(String(lectureId)):null'));
 assert.ok(remove.indexOf('await removeStoredMaterial(String(lectureId))')<remove.indexOf('data.materials.splice(index,1)'));
 assert.ok(remove.includes('if(!save()){'));
 assert.ok(remove.includes('await putStudioRecord(STUDIO_STORE,storedRecord)'));
 assert.ok(remove.includes('data.materials.splice(index,0,removed)'));
 assert.ok(remove.includes('data.materialText.splice(Math.max(0,fallbackIndex),0,fallback)'));
});

test('restored Google source references are revalidated before becoming clickable links',()=>{
 const lecture=fs.readFileSync('lecture-intelligence.js','utf8');
 const start=lecture.indexOf('function sourceLinkMarkup(value)');
 const end=lecture.indexOf('\n  }',start)+4;
 const helper=lecture.slice(start,end);
 assert.ok(helper.includes('validateGoogleSource(value)'));
 assert.ok(helper.includes('catch{return \'\'}'));
 assert.ok(helper.includes('escapeHtml(trusted)'));
 assert.ok(!helper.includes('escapeHtml(value)'));
});

 
test('learning profile editor restores all saved profile fields when storage fails',()=>{
 const start=studio.indexOf('function editStudyProfile()');
 const editor=studio.slice(start);
 assert.ok(editor.includes('const previousProfile={...data.profile}'));
 assert.ok(editor.includes("if(!save()){data.profile=previousProfile;render();return}closeModal();toast('Learning profile updated')"));
});


test('personal document deletion removes the file first and restores it if planner persistence fails',()=>{
 const start=studio.indexOf('async function deletePersonalDocument(documentId)');
 const end=studio.indexOf('\nasync function listStudioRecords',start);
 const remove=studio.slice(start,end);
 assert.ok(remove.includes("storedRecord=await getStudioRecord('personalDocuments',documentId)"));
 assert.ok(remove.indexOf("await deleteStudioRecord('personalDocuments',documentId)")<remove.indexOf('data.personalDocuments=previous.filter'));
 assert.ok(remove.includes('if(!save()){'));
 assert.ok(remove.includes("await putStudioRecord('personalDocuments',storedRecord)"));
 assert.ok(remove.includes('data.personalDocuments=previous'));
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const feature=fs.readFileSync('feature-hub.js','utf8');
const roadmaps=fs.readFileSync('roadmaps.js','utf8');
const expansions=fs.readFileSync('learning-expansions.js','utf8');

test('deadline and flashcard actions retain prior state when local save fails',()=>{
 assert.ok(feature.includes("if(!save()){item.completed=previous;render()}"));
 assert.ok(feature.includes("if(!save()){data.deadlines=previous;render()}"));
 assert.ok(feature.includes("if(!save()){Object.assign(card,previous);render()}"));
 assert.ok(feature.includes("if(!save()){data.flashcards=previous;render()}"));
 assert.ok(feature.includes("if(!save())data.deadlines=data.deadlines.filter(item=>item.id!==deadline.id)"));
});

test('generated revision cards and document metadata roll back on failed save',()=>{
 assert.ok(feature.includes('const previousFlashcards=[...data.flashcards],previousContext=context?{...context}:null'));
 assert.ok(feature.includes('if(!save()){data.flashcards=previousFlashcards;if(context&&previousContext)Object.assign(context,previousContext);render();return}'));
 assert.ok(feature.includes('const previousDoc={...doc}'));
 assert.ok(feature.includes('if(!save()){Object.assign(doc,previousDoc);render();return}closeModal()'));
});

test('learning mastery status and scores are restored when persistence fails',()=>{
 assert.ok(feature.includes("previous=data.topicMastery[key]?{...data.topicMastery[key]}:null"));
 assert.ok(feature.includes("if(!save()){if(previous)data.topicMastery[key]=previous;else delete data.topicMastery[key];render()}"));
});

test('roadmap creation, editing and milestone addition roll back if storage rejects the change',()=>{
 assert.ok(roadmaps.includes('const previousRoadmaps=[...data.roadmaps],previousRoadmap=editing?{...roadmap}:null'));
 assert.ok(roadmaps.includes("if(!save()){if(editing)Object.assign(roadmap,previousRoadmap);else data.roadmaps=previousRoadmaps;render();return}"));
 assert.ok(roadmaps.includes('const previousMilestones=[...roadmap.milestones],previousStatus=roadmap.status,previousUpdatedAt=roadmap.updatedAt'));
 assert.ok(roadmaps.includes('if(!save()){roadmap.milestones=previousMilestones;roadmap.status=previousStatus;roadmap.updatedAt=previousUpdatedAt;render();return}'));
});

test('roadmap deletion and milestone changes restore linked flashcards on failed save',()=>{
 assert.ok(roadmaps.includes('const previousFlashcards=data.flashcards.map(card=>({...card})),previousRoadmaps=[...data.roadmaps]'));
 assert.ok(roadmaps.includes('data.flashcards=previousFlashcards;data.roadmaps=previousRoadmaps;render();return'));
 assert.ok(roadmaps.includes('Object.assign(milestone,previousMilestone);roadmap.status=previousStatus;roadmap.updatedAt=previousUpdatedAt;render();return'));
 assert.ok(roadmaps.includes('data.flashcards=previousFlashcards;roadmap.milestones=previousMilestones;roadmap.status=previousStatus;roadmap.updatedAt=previousUpdatedAt;render();return'));
});

test('recall sprint, wellness, Ask Eduvia and Discover history do not claim failed saves',()=>{
 assert.ok(expansions.includes('playSprint=previousSprint;render();return'));
 assert.ok(expansions.includes('data.wellnessCheckins=previousCheckins;render();return'));
 assert.ok(expansions.includes('data.askHistory=previousAskHistory;render();return'));
 assert.ok(expansions.includes('data.discoverSavedGuides=previousSaved;render()}'));
 assert.ok(expansions.includes("data.discoverReadHistory=previousHistory;render();return}toast('Guide marked as read.')"));
});

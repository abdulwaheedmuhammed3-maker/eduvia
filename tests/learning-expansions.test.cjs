const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('learning-expansions.js','utf8');
test('Play & Learn registers a playable recall sprint using saved flashcards',()=>{
 assert.ok(source.includes('function renderPlay()'));
 assert.ok(source.includes('function startRecallSprint()'));
 assert.ok(source.includes('data-play-reveal'));
 assert.ok(source.includes('data-play-rate'));
 assert.ok(source.includes('updateFlashcardSchedule(card,remembered)'));
});
test('Ask Eduvia searches uploaded local materials and retains recent searches',()=>{
 assert.ok(source.includes('function runExpandedAsk(form)'));
 assert.ok(source.includes('window.eduCourseIntelligence?.search'));
 assert.ok(source.includes('data.askHistory.unshift'));
 assert.ok(source.includes('All learning areas'));
 assert.ok(source.includes('no online AI model is connected'));
});
test('Discover supports saved guides, reading history and new learning categories',()=>{
 const experience=fs.readFileSync('experience.js','utf8');
 assert.ok(experience.includes('window.eduDiscoverLibrary=discoverLibrary'));
 assert.ok(source.includes('Digital skills'));
 assert.ok(source.includes('Career readiness'));
 assert.ok(source.includes('data.discoverSavedGuides'));
 assert.ok(source.includes('data.discoverReadHistory'));
});
test('Study Wellness saves one editable daily local check-in and tracks study balance',()=>{
 assert.ok(source.includes('function renderWellness()'));
 assert.ok(source.includes('function saveWellnessCheckin(form)'));
 assert.ok(source.includes('const existing=data.wellnessCheckins.find(item=>item.date===date)'));
 assert.ok(source.includes('studyCompletionsForDate(date)'));
});
test('Performance Insights uses recorded quiz and mastery data without inventing grades',()=>{
 assert.ok(source.includes('function renderInsights()'));
 assert.ok(source.includes('record.quizAttempts'));
 assert.ok(source.includes('data.topicMastery'));
 assert.ok(source.includes('recorded academic results'));
 assert.ok(source.includes('does not estimate or invent grades'));
});
test('Wellness and insights are reachable from My Learning and More',()=>{
 assert.ok(source.includes('data-page="wellness"'));
 assert.ok(source.includes('data-page="insights"'));
 assert.ok(source.includes('wellness:renderWellness'));
 assert.ok(source.includes('insights:renderInsights'));
});
test('the expansions bundle is included in web, PWA and Android asset lists',()=>{
 const index=fs.readFileSync('index.html','utf8');
 const worker=fs.readFileSync('service-worker.js','utf8');
 const build=fs.readFileSync('scripts/build-web.mjs','utf8');
 assert.ok(index.includes('learning-expansions.js'));
 assert.ok(worker.includes('learning-expansions.js'));
 assert.ok(build.includes("'learning-expansions.js'"));
});

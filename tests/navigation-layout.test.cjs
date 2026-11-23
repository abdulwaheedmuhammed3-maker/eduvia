const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const app=read('app.js');
const experience=read('experience.js');
const expansion=read('learning-expansions.js');
const hub=read('feature-hub.js');
const roadmaps=read('roadmaps.js');
const index=read('index.html');
const polish=read('ui-polish.css');

test('Play uses one grouped toolkit and the Exam Centre opens its real screen',()=>{
 const play=experience.match(/function play\(\)\{([\s\S]*?)\n\}/)?.[1]||'';
 const rendered=expansion.match(/function renderPlay\(\)\{([\s\S]*?)\n  \}/)?.[1]||'';
 assert.ok(play.includes('exp-play-hero'));
 assert.ok(!play.includes('exp-tool-grid'),'the old duplicate tool grid must stay removed');
 assert.ok(rendered.includes('data-page="exams"'),'the Play card must open the dedicated examination centre');
 assert.ok(!play.includes('data-page="more"'),'the Exam Centre must not route to More tools');
 assert.equal((rendered.match(/class="learning-expansion-card"/g)||[]).length,5,'Play should show one five-card toolkit');
});

test('More tools groups secondary tools into named sections',()=>{
 const start=app.indexOf('function renderMore(){'),end=app.indexOf('\n\nfunction openModal',start);
 const more=app.slice(start,end);
 for(const key of ['more-tool-section','roadmaps','wellness','insights','study','settings','vault']){
  assert.ok(more.includes(key),'More tools should contain '+key);
 }
 assert.equal((more.match(/eyebrow:/g)||[]).length,3,'More tools should have three clear categories');
 assert.ok(!roadmaps.includes('roadmap-more-entry'),'Roadmaps should not be appended as an ungrouped card');
});

test('Nested feature pages highlight an actual primary navigation tab',()=>{
 for(const mapping of ["flashcards:'play'","mastery:'play'","practice:'play'","exams:'play'","tutorials:'my-study'","progress:'my-study'","records:'my-study'"]){
  assert.ok(hub.includes(mapping),'missing navigation mapping '+mapping);
 }
 assert.ok(roadmaps.includes("item.dataset.page==='my-study'"),'roadmaps should keep Learn active on mobile');
});

test('the refinement stylesheet is loaded last and supports light and dark themes',()=>{
 const polishPosition=index.indexOf('ui-polish.css?v=layout-audit-2');
 assert.ok(polishPosition>index.indexOf('icon-system.css'));
 assert.ok(polish.includes('.more-tool-section'));
 assert.ok(polish.includes('html[data-theme="dark"]'));
 assert.ok(polish.includes('.integrated-tab-section{'));
 assert.ok(polish.includes('overflow:visible'));
});

test('service worker caches the new stylesheet and updated screen modules',()=>{
 const sw=read('service-worker.js');
 assert.ok(sw.includes('./ui-polish.css?v=layout-audit-2'));
 assert.ok(sw.includes('eduvia-v91-card-actions'));
 assert.ok(sw.includes('play-screen-cleanup-2'));
 assert.ok(sw.includes('primary-nav-map-1'));
});

test('Create and View actions stay anchored at the bottom of their cards',()=>{
 const view=experience.includes('<section class="exp-inline-cta exp-inline-cta-action-bottom">')&&experience.includes('data-page="progress"');
 const create=expansion.includes('<div class="exp-empty exp-empty-action-bottom">')&&expansion.includes('data-page="flashcards"');
 assert.ok(view,'View learning progress remains a real bottom-aligned action');
 assert.ok(create,'Create flashcards remains a real bottom-aligned action');
 assert.ok(polish.includes('.exp-inline-cta-action-bottom>button'));
 assert.ok(polish.includes('.exp-play-challenge .exp-empty-action-bottom>button'));
 assert.ok(polish.includes('.exp-academic-grid button small{margin-top:auto}'));
});

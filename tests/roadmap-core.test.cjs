const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../roadmap-core.js');

test('validates real calendar dates and rejects malformed dates',()=>{
  assert.equal(core.validDate('2026-11-22'),true);
  assert.equal(core.validDate('2026-02-30'),false);
  assert.equal(core.validDate('22-11-2026'),false);
  assert.equal(core.validDate(''),false);
});

test('normalizes roadmap text, optional date, milestones and status',()=>{
  const roadmap=core.normalizeRoadmap({
    id:'r1',title:'  Learn Python  ',description:'  Build practical confidence.  ',
    targetDate:'2026-12-15',category:'Professional skill',status:'active',
    milestones:[{id:'m1',title:'Python basics',completed:true},{id:'m2',title:'Build a project',dueDate:'2026-12-10'}]
  });
  assert.equal(roadmap.title,'Learn Python');
  assert.equal(roadmap.description,'Build practical confidence.');
  assert.equal(roadmap.milestones.length,2);
  assert.equal(roadmap.milestones[0].completed,true);
  assert.equal(roadmap.status,'active');
});

test('rejects empty roadmap and empty milestones',()=>{
  assert.equal(core.normalizeRoadmap({title:'   '}),null);
  const roadmap=core.normalizeRoadmap({title:'A goal',milestones:[{title:' '},null,{title:'Valid'}]});
  assert.equal(roadmap.milestones.length,1);
  assert.equal(roadmap.milestones[0].title,'Valid');
});

test('caps roadmap and milestone field sizes',()=>{
  const roadmap=core.normalizeRoadmap({title:'x'.repeat(150),description:'y'.repeat(800),milestones:Array.from({length:100},(_,i)=>({id:String(i),title:'step '+i}))});
  assert.equal(roadmap.title.length,100);
  assert.equal(roadmap.description.length,600);
  assert.equal(roadmap.milestones.length,80);
});

test('calculates milestone completion progress without inventing progress',()=>{
  assert.deepEqual(core.progress({milestones:[]}),{total:0,completed:0,percent:0});
  assert.deepEqual(core.progress({milestones:[{completed:true},{completed:false},{completed:true}]}),{total:3,completed:2,percent:67});
});

test('marks overdue dates and keeps completed roadmaps complete',()=>{
  assert.equal(core.roadmapStatus({status:'active',targetDate:'2026-11-20'},'2026-11-22'),'overdue');
  assert.equal(core.roadmapStatus({status:'active',targetDate:'2026-11-25'},'2026-11-22'),'active');
  assert.equal(core.roadmapStatus({status:'completed',targetDate:'2026-11-20'},'2026-11-22'),'completed');
});

test('all milestones completed makes normalized roadmap complete',()=>{
  const roadmap=core.normalizeRoadmap({title:'Read a book',milestones:[{title:'Chapter 1',completed:true},{title:'Chapter 2',completed:true}]});
  assert.equal(roadmap.status,'completed');
});

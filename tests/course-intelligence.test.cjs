const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../course-intelligence.js');

const engine = global.window.eduCourseIntelligence;

test('indexes PDF page markers and retrieves matching passages with source locations', () => {
  const text = [
    '[PAGE 1]',
    'Introduction to arrays and lists. Arrays store values in an ordered sequence.',
    '',
    '[PAGE 2]',
    'A binary tree stores nodes. Each node can link to a left child and a right child.',
    'Tree traversal visits nodes in a defined order.'
  ].join('\n');
  const index = engine.buildIndex(text);
  assert.equal(index.version, engine.version);
  assert.equal(index.pageCount, 2);
  assert.ok(index.chunkCount >= 2);

  const results = engine.search([{
    id: 'material-1',
    name: 'CSC 201 lecture.pdf',
    courseId: 'csc201',
    text,
    index
  }], 'binary tree nodes child', 4);

  assert.ok(results.length > 0);
  assert.match(results[0].text, /binary tree stores nodes/i);
  assert.equal(results[0].page, 2);
  assert.equal(results[0].name, 'CSC 201 lecture.pdf');
  assert.match(results[0].citation, /Page 2/);
});

test('indexes PowerPoint slide markers and returns slide citations', () => {
  const text = '[SLIDE 1]\nAlgorithms solve computational problems.\n\n[SLIDE 2]\nBinary search repeatedly halves a sorted search interval.';
  const index = engine.buildIndex(text);
  assert.equal(index.slideCount, 2);
  const results = engine.search([{ name: 'Algorithms.pptx', text, index }], 'binary search sorted interval', 2);
  assert.ok(results.length > 0);
  assert.equal(results[0].slide, 2);
  assert.match(results[0].citation, /Slide 2/);
});

test('returns no unrelated passages rather than inventing a fallback', () => {
  const text = '[PAGE 3]\nA linked list stores elements in nodes connected by references.';
  const results = engine.search([{ name: 'Data structures.pdf', text }], 'photosynthesis chlorophyll sunlight', 4);
  assert.deepEqual(results, []);
});

test('keeps passage offsets aligned with the original extracted text', () => {
  const text = '[PAGE 4]\r\nQueues follow first in first out order.\r\n';
  const index = engine.buildIndex(text);
  const chunk = index.chunks[0];
  assert.equal(text.slice(chunk.start, chunk.end).trim(), 'Queues follow first in first out order.');
});

test('supports bounded retrieval batches above twenty passages for larger MCQ sets',()=>{
  const text=Array.from({length:32},(_,index)=>'[SECTION Binary processing '+index+']\nBinary processing passage '+index+' explains how computer systems process structured data and verify each operation.').join('\n\n');
  const index=engine.buildIndex(text);
  const results=engine.search([{name:'Large course notes.txt',text,index}],'binary processing',32);
  assert.equal(results.length,32);
  assert.equal(engine.search([{name:'Large course notes.txt',text,index}],'binary processing',250).length,32);
});

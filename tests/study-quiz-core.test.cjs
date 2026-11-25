const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../study-quiz-core.js');

const text = [
  'Arrays store values in an ordered sequence.',
  'Linked lists connect nodes through references.',
  'Stacks follow last in first out order.',
  'Queues follow first in first out order.'
].join(' ');

test('objective builder creates four distinct options and one indexed correct answer', () => {
  const questions = core.buildObjectiveQuestions(
    { reflection: { topics: ['Arrays', 'Linked lists', 'Stacks', 'Queues'] } },
    [{ id: 'material-1', name: 'CSC 201 notes.pdf', text, location: 'Page 2' }],
    ['Arrays', 'Linked lists', 'Stacks', 'Queues'],
    10
  );

  assert.ok(questions.length >= 4);
  for (const question of questions) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map(core.normalize)).size, 4);
    assert.equal(question.type, 'objective');
    assert.ok(Number.isInteger(question.correctOption));
    assert.equal(core.normalize(question.options[question.correctOption]), core.normalize(question.answer));
    assert.match(question.prompt, /Which term best completes/);
    assert.equal(question.source, 'CSC 201 notes.pdf');
    assert.equal(question.location, 'Page 2');
  }
});

test('objective builder never fabricates options when three distinct distractors are unavailable', () => {
  const questions = core.buildObjectiveQuestions(
    { reflection: { topics: ['Arrays'] } },
    [{ name: 'Short note', text: 'Arrays store values in an ordered sequence.' }],
    ['Arrays'],
    10
  );
  assert.deepEqual(questions, []);
});

test('objective question validation rejects malformed, duplicate and multi-answer payloads', () => {
  assert.equal(core.isObjectiveQuestion({ options: ['A', 'B', 'C', 'D'], correctOption: 2 }), true);
  assert.equal(core.isObjectiveQuestion({ options: ['A', 'B', 'B', 'D'], correctOption: 2 }), false);
  assert.equal(core.isObjectiveQuestion({ options: ['A', 'B', 'C'], correctOption: 1 }), false);
  assert.equal(core.isObjectiveQuestion({ options: ['A', 'B', 'C', 'D'], correctOption: 4 }), false);
  assert.equal(core.isObjectiveQuestion({ options: ['A', 'B', 'C', 'D'], correctOption: null }), false);
});

test('source text remains attached to the generated item for answer review', () => {
  const source = 'Arrays store values in an ordered sequence. Linked lists connect nodes through references. Stacks follow last in first out order. Queues follow first in first out order.';
  const question = core.buildObjectiveQuestions(
    { reflection: {} },
    [{ name: 'Lecture slides.pptx', text: source, index: { chunks: [{ start: 0, end: source.length, slide: 4 }] } }],
    ['Arrays', 'Linked lists', 'Stacks', 'Queues'],
    1
  )[0];

  assert.ok(question);
  assert.equal(question.location, 'Slide 4');
  assert.equal(question.explanation, 'Arrays store values in an ordered sequence.');
  assert.match(question.citation, /Lecture slides\.pptx/);
});

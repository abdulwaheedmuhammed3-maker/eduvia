const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'study-studio.js'), 'utf8');

test('the learning profile editor has one authoritative implementation', () => {
  const declarations = source.match(/function\s+editStudyProfile\s*\(/g) || [];
  assert.equal(declarations.length, 1);
});

test('formal education profile saves validate all required academic fields', () => {
  for (const field of ['institution', 'stage', 'degreeProgramme', 'level', 'academicSession']) {
    assert.ok(source.includes(field), 'Missing formal education field: ' + field);
  }
  assert.ok(source.includes("if(type==='formal'"));
});

test('non-formal profile editor does not clear saved academic details', () => {
  const lastEditor = source.lastIndexOf('// Final universal learning-profile editor.');
  assert.ok(lastEditor >= 0);
  const editor = source.slice(lastEditor);
  assert.ok(editor.includes("if(type==='formal'"));
  assert.ok(editor.includes('data.profile.programme=data.profile.learningFocus'));
  assert.ok(!editor.includes("data.profile.institution=''"));
});

test('study completion accepts flexible key words and starts an unlimited 10-question recall quiz',()=>{
  assert.ok(source.includes("field('Key words from your study','keyPoints'"));
  assert.ok(!source.includes("if(keyPoints.length!==5)"));
  assert.ok(source.includes('openSessionQuiz(record.id)'));
  assert.ok(source.includes('10 questions'));
  assert.ok(source.includes('data-action="retake-session-quiz"'));
});
test('study quiz attempts calculate first, latest and best without limiting retakes',()=>{
  assert.ok(source.includes('function sessionQuizStats(attempts)'));
  assert.ok(source.includes('const first=list[list.length-1],latest=list[0]'));
  assert.ok(source.includes('best:'));
  assert.ok(source.includes('attempts.unshift(attempt)'));
});

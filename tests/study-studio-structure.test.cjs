const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'study-studio.js'), 'utf8');

test('the learning profile editor has one authoritative implementation', () => {
  const declarations = source.match(/function\\s+editStudyProfile\\s*\\(/g) || [];
  assert.equal(declarations.length, 1);
});

test('formal education profile saves validate all required academic fields', () => {
  for (const field of ['institution', 'stage', 'degreeProgramme', 'level', 'academicSession']) {
    assert.ok(source.includes(field), 'Missing formal education field: ' + field);
  }
  assert.ok(source.includes('learnerType===\'formal\''));
});

test('non-formal profile editor does not clear saved academic details', () => {
  const lastEditor = source.lastIndexOf('// Final universal learning-profile editor.');
  assert.ok(lastEditor >= 0);
  const editor = source.slice(lastEditor);
  assert.ok(editor.includes("if(type==='formal')"));
  assert.ok(editor.includes("data.profile.programme=data.profile.learningFocus"));
  assert.ok(!editor.includes("data.profile.institution=''"));
});

const test = require('node:test');
const assert = require('node:assert/strict');
const learnerProfile = require('../learner-profile.js');

test('supports all five explicit learner paths', () => {
  for (const type of Object.keys(learnerProfile.TYPES)) {
    assert.equal(learnerProfile.resolveLearnerType({ learnerType: type }), type);
  }
});

test('defaults a new profile to independent learning', () => {
  assert.equal(learnerProfile.resolveLearnerType({}), 'independent');
  assert.equal(learnerProfile.resolveLearnerType(null), 'independent');
  assert.equal(learnerProfile.resolveLearnerType([]), 'independent');
});

test('migrates legacy school and university profiles to formal education', () => {
  for (const field of ['institution', 'matricNumber', 'faculty', 'department', 'degreeProgramme', 'academicSession', 'term']) {
    assert.equal(learnerProfile.resolveLearnerType({ [field]: 'legacy value' }), 'formal', field);
  }
  assert.equal(learnerProfile.resolveLearnerType({ stage: 'undergraduate' }), 'formal');
  assert.equal(learnerProfile.resolveLearnerType({ stage: 'other' }), 'independent');
});

test('an explicit learner path takes precedence over legacy academic fields', () => {
  assert.equal(
    learnerProfile.resolveLearnerType({ learnerType: 'professional', institution: 'Old university', level: '300 Level' }),
    'professional'
  );
  assert.equal(
    learnerProfile.resolveLearnerType({ learnerType: 'general', degreeProgramme: 'Old programme' }),
    'general'
  );
});

test('reports all required formal-education fields without mutating the profile', () => {
  const profile = { institution: 'Unilorin', stage: 'undergraduate', degreeProgramme: 'Computer Science' };
  assert.deepEqual(learnerProfile.missingFormalFields(profile), ['level', 'academicSession']);
  assert.deepEqual(profile, { institution: 'Unilorin', stage: 'undergraduate', degreeProgramme: 'Computer Science' });
});

test('returns useful learner-facing labels and a safe fallback', () => {
  assert.equal(learnerProfile.label('exam-prep'), 'Exam & certification preparation');
  assert.equal(learnerProfile.label('unknown'), 'Self-directed learning');
});

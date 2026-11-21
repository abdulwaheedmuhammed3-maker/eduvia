(function attachEduviaLearnerProfile(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EduviaLearnerProfile = api;
})(typeof globalThis === 'object' ? globalThis : null, function createLearnerProfileApi() {
  const TYPES = Object.freeze({
    formal: 'Formal education',
    independent: 'Self-directed learning',
    professional: 'Professional development',
    'exam-prep': 'Exam & certification preparation',
    general: 'General knowledge & personal interests'
  });
  const FORMAL_REQUIRED_FIELDS = Object.freeze([
    'institution',
    'stage',
    'degreeProgramme',
    'level',
    'academicSession'
  ]);
  const LEGACY_ACADEMIC_FIELDS = Object.freeze([
    'institution',
    'matricNumber',
    'faculty',
    'department',
    'degreeProgramme',
    'academicSession',
    'term'
  ]);

  function resolveLearnerType(profile = {}) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return 'independent';
    if (Object.prototype.hasOwnProperty.call(TYPES, profile.learnerType)) return profile.learnerType;

    const hasLegacyAcademicData = LEGACY_ACADEMIC_FIELDS.some(key =>
      String(profile[key] || '').trim().length > 0
    );
    const stage = String(profile.stage || '').trim();
    const hasAcademicStage = Boolean(stage) && stage !== 'other';
    return hasLegacyAcademicData || hasAcademicStage ? 'formal' : 'independent';
  }

  function isFormalLearner(profile = {}) {
    return resolveLearnerType(profile) === 'formal';
  }

  function label(type) {
    return TYPES[type] || TYPES.independent;
  }

  function missingFormalFields(profile = {}) {
    return FORMAL_REQUIRED_FIELDS.filter(key => !String(profile[key] || '').trim());
  }

  return Object.freeze({
    TYPES,
    FORMAL_REQUIRED_FIELDS,
    resolveLearnerType,
    isFormalLearner,
    label,
    missingFormalFields
  });
});

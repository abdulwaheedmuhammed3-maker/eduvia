/* Eduvia on-device objective quiz builder. Source-backed questions only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.eduStudyQuizCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const STOP_WORDS = new Set((
    'about above after again against all also although among another any are around because been before being ' +
    'below between both but can cannot could did does doing during each either else for from further had has have ' +
    'having here how into its itself just more most much must neither nor not now off once only other our out over ' +
    'own same should since some such than that the their them then there these they this those through too under ' +
    'until upon very was were what when where which while who why will with would you your ' +
    'according based called describes described example examples including includes made make makes many method ' +
    'methods process processes system systems using uses used work works'
  ).split(/\s+/));

  const normalize = value => String(value || '').toLocaleLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#]+/g, ' ').replace(/\s+/g, ' ').trim();

  function asList(value) {
    if (Array.isArray(value)) return value;
    return String(value || '').split(/[\r\n;|]+/);
  }

  function cleanConcept(value) {
    const concept = String(value || '').replace(/^\s*[\d.)-]+\s*/, '')
      .replace(/^[\s"'“”‘’]+|[\s"'“”‘’.,;:!?]+$/g, '')
      .replace(/\s+/g, ' ').trim();
    const key = normalize(concept);
    if (!key || concept.length < 3 || concept.length > 64) return '';
    const words = key.split(' ');
    if (words.length > 6 || words.every(word => STOP_WORDS.has(word))) return '';
    return concept;
  }

  function addUnique(target, value) {
    const concept = cleanConcept(value);
    const key = normalize(concept);
    if (concept && !target.some(item => normalize(item) === key)) target.push(concept);
  }

  function wordConcepts(value) {
    const words = String(value || '').match(/[A-Za-z][A-Za-z0-9+#.-]{3,}/g) || [];
    return words.filter(word => {
      const key = normalize(word);
      return key.length >= 4 && !STOP_WORDS.has(key) && !/^\d+$/.test(key);
    });
  }

  function splitSentences(value) {
    return String(value || '')
      .replace(/\r/g, '\n')
      .replace(/\[(?:SOURCE|PAGE|SLIDE|SECTION):?[^\]]*\]/gi, ' ')
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/gm, '')
      .split(/(?<=[.!?])\s+|\n+/)
      .map(sentence => sentence.replace(/\s+/g, ' ').trim())
      .filter(sentence => sentence.length >= 32 && sentence.length <= 420);
  }

  function sourcePassages(sources) {
    const output = [];
    (Array.isArray(sources) ? sources : []).forEach(source => {
      if (!source || typeof source !== 'object') return;
      const fullText = String(source.text || '');
      const chunks = Array.isArray(source.index?.chunks) ? source.index.chunks : [];
      const units = chunks.length
        ? chunks.map(chunk => ({
            text: fullText.slice(Number(chunk.start) || 0, Number(chunk.end) || 0),
            location: chunk.page ? 'Page ' + chunk.page
              : chunk.slide ? 'Slide ' + chunk.slide
              : String(chunk.section || source.location || '')
          }))
        : [{ text: fullText, location: String(source.location || '') }];

      units.forEach(unit => {
        splitSentences(unit.text).forEach(sentence => {
          output.push({
            sentence,
            source: String(source.name || source.source || 'Course material'),
            location: String(unit.location || source.location || ''),
            citation: String(source.citation || [
              source.name || source.source || 'Course material',
              unit.location || source.location || ''
            ].filter(Boolean).join(' · ')),
            materialId: String(source.id || source.materialId || '')
          });
        });
      });
    });
    return output;
  }

  function containsPhrase(sentence, phrase) {
    const text = ' ' + normalize(sentence) + ' ';
    const term = ' ' + normalize(phrase) + ' ';
    return term.length > 2 && text.includes(term);
  }

  function maskPhrase(sentence, phrase) {
    const escaped = String(phrase).replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
    return sentence.replace(new RegExp(escaped, 'i'), '_____');
  }

  function chooseAnswer(sentence, explicitConcepts) {
    const matches = explicitConcepts.filter(term => containsPhrase(sentence, term));
    if (matches.length) {
      return matches.sort((a, b) => normalize(b).length - normalize(a).length)[0];
    }
    const words = wordConcepts(sentence).filter(word => containsPhrase(sentence, word));
    if (!words.length) return '';
    return words.sort((a, b) => b.length - a.length)[0];
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function shuffled(options, seed) {
    const result = options.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = stableHash(seed + ':' + index) % (index + 1);
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function isObjectiveQuestion(question) {
    return !!question &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      new Set(question.options.map(normalize)).size === 4 &&
      Number.isInteger(Number(question.correctOption)) &&
      Number(question.correctOption) >= 0 &&
      Number(question.correctOption) <= 3;
  }

  function buildObjectiveQuestions(record, sources, courseTopics, count) {
    const reflection = record && record.reflection || {};
    const passages = sourcePassages(sources);
    const explicitConcepts = [];
    asList(courseTopics).forEach(value => addUnique(explicitConcepts, value));
    asList(reflection.topics).forEach(value => addUnique(explicitConcepts, value));
    passages.forEach(item => {
      const section = item.location.replace(/^Page \d+$|^Slide \d+$/i, '');
      if (section) addUnique(explicitConcepts, section);
    });

    const learnedPoints = [
      ...asList(reflection.keyPoints),
      ...asList(reflection.learned),
      ...asList(reflection.gained)
    ];
    learnedPoints.forEach(value => {
      const text = String(value || '').trim();
      if (text && text.length <= 64) addUnique(explicitConcepts, text);
    });

    const allConcepts = explicitConcepts.slice();
    passages.forEach(item => wordConcepts(item.sentence).forEach(word => addUnique(allConcepts, word)));
    learnedPoints.forEach(value => wordConcepts(value).forEach(word => addUnique(allConcepts, word)));

    const wanted = Math.max(1, Math.min(30, Math.floor(Number(count) || 10)));
    const questions = [];
    const seen = new Set();

    passages.forEach((item, passageIndex) => {
      if (questions.length >= wanted) return;
      const answer = chooseAnswer(item.sentence, explicitConcepts);
      if (!answer) return;

      const masked = maskPhrase(item.sentence, answer);
      if (masked === item.sentence) return;
      const excludedSet = new Set(normalize(item.sentence).split(' '));
      const distractors = [];
      const addDistractor = value => {
        const concept = cleanConcept(value);
        const key = normalize(concept);
        if (!concept || key === normalize(answer) || excludedSet.has(key) ||
            containsPhrase(item.sentence, concept) ||
            distractors.some(existing => normalize(existing) === key)) return;
        distractors.push(concept);
      };

      explicitConcepts.forEach(addDistractor);
      allConcepts.forEach(addDistractor);
      if (distractors.length < 3) return;

      const choices = shuffled([answer, ...distractors.slice(0, 3)], item.source + ':' + item.location + ':' + passageIndex + ':' + item.sentence);
      const correctOption = choices.findIndex(option => normalize(option) === normalize(answer));
      const identity = normalize(item.sentence) + '|' + normalize(answer);
      if (seen.has(identity) || !isObjectiveQuestion({ options: choices, correctOption })) return;
      seen.add(identity);

      const prompt = 'Which term best completes this statement from your course material? “' + masked + '”';
      questions.push({
        prompt,
        question: prompt,
        answer,
        options: choices,
        correctOption,
        explanation: item.sentence,
        source: item.source,
        location: item.location,
        citation: item.citation,
        materialId: item.materialId,
        type: 'objective'
      });
    });

    return questions;
  }

  return { buildObjectiveQuestions, isObjectiveQuestion, sourcePassages, normalize };
});

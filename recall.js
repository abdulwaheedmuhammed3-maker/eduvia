(function () {
  'use strict';
  const core = window.EduviaRecallCore;
  if (!core) return;
  function ensureState() {
    const existing = data.recallState && typeof data.recallState === 'object' ? data.recallState : {};
    data.recallState = {
      enabled: existing.enabled === true,
      frequency: ['light', 'balanced', 'intensive'].includes(existing.frequency) ? existing.frequency : 'balanced',
      quietStart: /^\d{2}:\d{2}$/.test(existing.quietStart || '') ? existing.quietStart : '21:00',
      quietEnd: /^\d{2}:\d{2}$/.test(existing.quietEnd || '') ? existing.quietEnd : '08:00',
      days: Array.isArray(existing.days) && existing.days.length ? existing.days.map(Number).filter(day => day >= 0 && day <= 6) : (data.profile.studyDays || [1, 2, 3, 4, 5, 6]),
      seed: String(existing.seed || core.stableId(String(Date.now()) + ':' + (data.profile.name || 'learner'))),
      questions: Array.isArray(existing.questions) ? existing.questions : [],
      history: Array.isArray(existing.history) ? existing.history : []
    };
    return data.recallState;
  }
  let state = ensureState();
  let revealedQuestionId = '';
  function today() { return todayISO(); }
  function due(question, date) { return !question.nextReview || String(question.nextReview) <= (date || today()); }
  function sourceQuestion(kind, sourceKey, course, prompt, answer, source, location, materialId) {
    const id = core.stableId(kind + ':' + sourceKey), old = state.questions.find(item => item.id === id) || {};
    return {
      ...old, id, kind, sourceKey, courseId: course && course.id || '', courseName: course && (course.name || course.code) || '',
      prompt: String(prompt || '').trim().slice(0, 220), answer: String(answer || '').trim().slice(0, 1000),
      source: String(source || 'Course material').slice(0, 120), location: String(location || '').slice(0, 120),
      materialId: materialId || '', nextReview: old.nextReview || today(), level: Number(old.level) || 0,
      reviewCount: Number(old.reviewCount) || 0, incorrectCount: Number(old.incorrectCount) || 0,
      lastReviewedAt: Number(old.lastReviewedAt) || 0
    };
  }
  async function buildQuestionBank() {
    const previous = JSON.parse(JSON.stringify(state));
    const oldQuestions = new Map(state.questions.map(item => [item.id, item]));
    const next = [], seen = new Set();
    const add = question => {
      if (!question || !question.prompt || !question.answer || seen.has(question.id)) return;
      seen.add(question.id);
      const old = oldQuestions.get(question.id);
      if (old) Object.assign(question, {
        nextReview: old.nextReview || question.nextReview, level: Number(old.level) || 0,
        reviewCount: Number(old.reviewCount) || 0, incorrectCount: Number(old.incorrectCount) || 0,
        lastReviewedAt: Number(old.lastReviewedAt) || 0
      });
      next.push(question);
    };
    (data.flashcards || []).forEach(card => {
      if (!card || !String(card.front || '').trim() || !String(card.back || '').trim()) return;
      const course = (data.courses || []).find(item => item.id === card.courseId) || null;
      const question = sourceQuestion('flashcard', 'flashcard:' + String(card.id || card.front), course,
        String(card.front), String(card.back), 'Saved flashcard', course && course.name || 'Flashcard', '');
      question.flashcardId = String(card.id || '');
      question.nextReview = card.nextReview || question.nextReview;
      question.level = Number(card.level) || question.level;
      add(question);
    });
    const engine = window.eduCourseIntelligence;
    if (engine && typeof loadCourseText === 'function') {
      for (const course of data.courses || []) {
        let sources = [];
        try { sources = await loadCourseText(course.id); } catch { sources = []; }
        const topics = Array.isArray(course.topics) ? course.topics : String(course.topics || '').split(/[,;\n]+/);
        for (const topicValue of topics) {
          const topic = String(topicValue || '').trim();
          if (topic.length < 2 || !sources.length) continue;
          const passage = engine.search(sources, topic, 3)[0];
          if (!passage || String(passage.text || '').trim().length < 45) continue;
          add(sourceQuestion('topic', 'topic:' + course.id + ':' + topic.toLocaleLowerCase(), course,
            'How would you explain ' + topic + ' from memory?', passage.text, passage.name,
            passage.location || passage.citation, passage.materialId));
        }
        for (const source of sources) {
          const index = source.index && Array.isArray(source.index.chunks) ? source.index : engine.buildIndex(source.text);
          const sections = new Map();
          (index.chunks || []).forEach(chunk => {
            const section = String(chunk.section || '').trim();
            if (section) { const rows = sections.get(section) || []; rows.push(chunk); sections.set(section, rows); }
          });
          for (const [section, chunks] of sections) {
            const excerpts = chunks.slice(0, 2).map(chunk => String(source.text || '').slice(chunk.start, chunk.end).trim()).filter(Boolean);
            const answer = excerpts.join('\n\n').slice(0, 1000);
            if (answer.length < 45) continue;
            const location = chunks[0].page ? 'Page ' + chunks[0].page : (chunks[0].slide ? 'Slide ' + chunks[0].slide : section);
            add(sourceQuestion('section', 'section:' + source.id + ':' + section.toLocaleLowerCase(), course,
              'What are the main ideas covered in ' + section + '?', answer, source.name, location, source.id));
          }
        }
      }
    }
    (data.resources || []).filter(item => item && item.kind === 'note' && String(item.body || '').trim()).forEach(note => {
      const course = (data.courses || []).find(item => item.id === note.courseId) || null;
      add(sourceQuestion('note', 'note:' + String(note.id || note.title), course,
        'What are the key points in your note "' + String(note.title || 'Personal note') + '"?',
        note.body, note.title || 'Personal note', course && course.name || 'Saved note', ''));
    });
    state.questions = next.slice(0, 160);
    const validMaterialIds = new Set((data.materials || []).map(item => String(item.id)));
    state.questions = state.questions.filter(item => !item.materialId || validMaterialIds.has(String(item.materialId)));
    if (!save()) {
      data.recallState = previous; state = data.recallState; render(); return false;
    }
    schedulePushSync();
    toast('Recall question bank refreshed from your saved learning materials.');
    return true;
  }
  function blockedByDate(now) {
    const output = {};
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date(now); day.setDate(day.getDate() + offset);
      const date = day.toLocaleDateString('en-CA');
      const events = typeof dayEvents === 'function' ? dayEvents(date) : [];
      output[date] = (events || []).map(event => ({ start: event.start, end: event.end, bufferMinutes: 10 }));
    }
    return output;
  }
  window.eduRecallBuildReminders = function (now) {
    if (!state.enabled || !state.questions.length) return [];
    const reference = now instanceof Date ? new Date(now) : new Date(now || Date.now());
    const schedule = core.createSchedule({
      questions: state.questions, now: reference, frequency: state.frequency,
      activeStart: data.profile.studyStart || '09:00', activeEnd: data.profile.studyEnd || '21:00',
      quietStart: state.quietStart, quietEnd: state.quietEnd, days: state.days,
      seed: state.seed, blockedByDate: blockedByDate(reference)
    });
    const byId = new Map(state.questions.map(question => [String(question.id), question]));
    return schedule.map(item => {
      const question = byId.get(item.questionId);
      if (!question) return null;
      return { id: item.id, title: 'Eduvia Recall · ' + (question.courseName || 'Quick question'),
        body: question.prompt, fireAt: item.fireAt, url: './#recall/' + encodeURIComponent(question.id) };
    }).filter(Boolean);
  };
  function streakCount() {
    const days = new Set(state.history.map(item => item.date));
    let count = 0; const date = new Date();
    for (let index = 0; index < 366; index++) {
      const key = date.toLocaleDateString('en-CA');
      if (!days.has(key)) { if (index === 0) { date.setDate(date.getDate() - 1); continue; } break; }
      count++; date.setDate(date.getDate() - 1);
    }
    return count;
  }
  function currentQuestion() {
    const selected = state.questions.find(item => item.id === currentRecallQuestionId);
    if (selected) return selected;
    return state.questions.filter(item => due(item)).sort((a, b) =>
      String(a.nextReview || '').localeCompare(String(b.nextReview || '')) ||
      Number(a.lastReviewedAt || 0) - Number(b.lastReviewedAt || 0)
    )[0] || state.questions[0] || null;
  }
  function renderQuestion(question) {
    if (!question) return '<div class="recall-question-empty"><strong>Your next question is waiting.</strong><p>Refresh your question bank after adding course materials, topic lists or flashcards.</p><button class="primary-btn" data-recall-action="refresh">Build my question bank</button></div>';
    const isRevealed = revealedQuestionId === question.id, isDue = due(question);
    return '<article class="recall-question-card"><div class="recall-question-meta"><span>' + safe(question.courseName || 'General learning') + '</span><span>' + (isDue ? 'Due for review' : 'Opened from notification') + '</span></div>' +
      '<h2>' + safe(question.prompt) + '</h2>' +
      (isRevealed ? '<div class="recall-answer"><strong>Suggested answer from your saved source</strong><p>' + safe(question.answer) + '</p><div class="recall-source">Source: ' + safe(question.source) + (question.location ? ' · ' + safe(question.location) : '') + '</div></div>' :
      '<p class="recall-hint">Try to answer without opening your notes. Reveal the source answer when you are ready.</p>') +
      '<div class="recall-question-actions">' +
      (isRevealed ? '<button class="primary-btn" data-recall-action="rate-remembered" data-id="' + safe(question.id) + '">I remembered it</button><button class="secondary-btn" data-recall-action="rate-review" data-id="' + safe(question.id) + '">I need to review</button>' :
      '<button class="primary-btn" data-recall-action="reveal" data-id="' + safe(question.id) + '">Reveal answer</button>') + '</div></article>';
  }
  function renderRecall() {
    const history = state.history || [];
    const askedToday = history.filter(item => item.date === today()).length;
    const remembered = history.filter(item => item.remembered).length;
    const accuracy = history.length ? Math.round(remembered / history.length * 100) : 0;
    const question = currentQuestion();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOptions = days.map((label, index) => '<label class="recall-day-option"><input type="checkbox" name="recallDay" value="' + index + '" ' + (state.days.includes(index) ? 'checked' : '') + '><span>' + label + '</span></label>').join('');
    const courseCounts = (data.courses || []).map(course => {
      const count = state.questions.filter(item => item.courseId === course.id).length;
      return '<div class="recall-course-row"><span>' + safe(course.name) + '</span><strong>' + count + '</strong></div>';
    }).join('');
    const recent = history.slice(0, 5).map(item => '<div class="recall-history-row"><span>' + safe(item.courseName || 'Learning') +
      '<small>' + safe(item.question || '') + '</small></span><strong class="' + (item.remembered ? 'is-remembered' : 'needs-review') + '">' +
      (item.remembered ? 'Remembered' : 'Review again') + '</strong></div>').join('');
    return pageHead('ACTIVE RECALL', 'Eduvia Recall', 'Short, spontaneous questions from your own course materials and flashcards. Build lasting memory a few minutes at a time.',
      '<button class="secondary-btn" data-recall-action="refresh">↻ Refresh questions</button>') +
      '<div class="recall-stat-grid"><div class="stat-card"><div class="stat-label">QUESTIONS TODAY</div><div class="stat-value">' + askedToday + '</div><div class="stat-note">answered so far</div></div>' +
      '<div class="stat-card"><div class="stat-label">QUESTION BANK</div><div class="stat-value">' + state.questions.length + '</div><div class="stat-note">saved on this device</div></div>' +
      '<div class="stat-card"><div class="stat-label">RECALL ACCURACY</div><div class="stat-value">' + accuracy + '%</div><div class="stat-note">from ' + history.length + ' answers</div></div>' +
      '<div class="stat-card"><div class="stat-label">RECALL STREAK</div><div class="stat-value">' + streakCount() + ' days</div><div class="stat-note">days with an answer</div></div></div>' +
      renderQuestion(question) +
      '<section class="panel recall-settings-panel"><div class="panel-head"><div><h3>Your recall rhythm</h3><p>Choose how many random questions you want per active hour. Eduvia spaces them out and never sends more than three in one hour.</p></div><span class="habit-badge">◷</span></div>' +
      '<form id="recallSettingsForm"><label class="recall-enable-row"><span><strong>Random Recall notifications</strong><small>Send questions during your configured study days and study window.</small></span><input type="checkbox" name="enabled" ' + (state.enabled ? 'checked' : '') + '></label>' +
      '<div class="recall-settings-grid"><label>Questions per active hour<select name="frequency"><option value="light" ' + (state.frequency === 'light' ? 'selected' : '') + '>Light · 1 per hour</option><option value="balanced" ' + (state.frequency === 'balanced' ? 'selected' : '') + '>Balanced · 2 per hour</option><option value="intensive" ' + (state.frequency === 'intensive' ? 'selected' : '') + '>Intensive · 3 per hour</option></select></label>' +
      '<label>Quiet hours start<input type="time" name="quietStart" value="' + safe(state.quietStart) + '"></label><label>Quiet hours end<input type="time" name="quietEnd" value="' + safe(state.quietEnd) + '"></label></div>' +
      '<div class="recall-days"><strong>Active days</strong><div>' + dayOptions + '</div></div>' +
      '<p class="recall-footnote">Questions are randomly timed inside your study hours (' + safe(data.profile.studyStart || '09:00') + '–' + safe(data.profile.studyEnd || '21:00') +
      '), avoid quiet hours and scheduled classes. Questions you have not answered can return on later active days; once you answer, spaced review determines when they return. Enable Eduvia phone notifications in Settings to receive them while the app is closed.</p>' +
      '<button class="primary-btn" type="submit">Save Recall settings</button></form></section>' +
      '<div class="recall-two-column"><section class="panel"><div class="panel-head"><div><h3>Questions by course</h3><p>Built from your own saved content.</p></div></div>' +
      (courseCounts || '<p class="recall-muted">Add a learning area to get started.</p>') + '</section><section class="panel"><div class="panel-head"><div><h3>Recent answers</h3><p>Your latest recall attempts.</p></div></div>' +
      (recent || '<p class="recall-muted">Your answered questions will appear here.</p>') + '</section></div>' +
      '<div class="recall-privacy-note">Eduvia builds this question bank locally. Only the short prompt and scheduled delivery time are sent to the push service; answers and course materials remain on this device. Questions are built from your flashcards, topic names and material headings, not from unsupported invented facts.</div>';
  }
  function saveRecallSettings(form) {
    const previous = JSON.parse(JSON.stringify(state)), fd = new FormData(form);
    const selectedDays = fd.getAll('recallDay').map(Number).filter(day => day >= 0 && day <= 6);
    if (!selectedDays.length) { toast('Choose at least one active day for Recall.'); return; }
    state.enabled = fd.get('enabled') === 'on';
    state.frequency = ['light', 'balanced', 'intensive'].includes(fd.get('frequency')) ? fd.get('frequency') : 'balanced';
    state.quietStart = String(fd.get('quietStart') || '21:00');
    state.quietEnd = String(fd.get('quietEnd') || '08:00');
    state.days = selectedDays;
    if (!save()) { data.recallState = previous; state = data.recallState; render(); return; }
    schedulePushSync();
    toast(state.enabled ? 'Recall notifications are enabled. Make sure phone notifications are enabled in Settings.' : 'Recall notifications are paused.');
  }
  function rateQuestion(questionId, remembered) {
    const previousState = JSON.parse(JSON.stringify(state));
    const previousFlashcards = JSON.parse(JSON.stringify(data.flashcards || []));
    const question = state.questions.find(item => item.id === questionId);
    if (!question) { toast('That question is no longer in your Recall bank. Refresh your questions.'); return; }
    const result = core.reviewResult(question.level, remembered, today());
    question.level = result.level; question.nextReview = result.nextReview; question.lastReviewedAt = Date.now();
    question.reviewCount = Number(question.reviewCount || 0) + 1;
    if (!remembered) question.incorrectCount = Number(question.incorrectCount || 0) + 1;
    if (question.kind === 'flashcard' && question.flashcardId) {
      const card = (data.flashcards || []).find(item => String(item.id) === String(question.flashcardId));
      if (card) { card.level = result.level; card.nextReview = result.nextReview; card.lastReviewed = Date.now(); }
    }
    state.history.unshift({ id: core.stableId(question.id + ':' + Date.now()), questionId: question.id, question: question.prompt,
      courseName: question.courseName, date: today(), remembered: Boolean(remembered), answeredAt: Date.now() });
    state.history = state.history.slice(0, 200);
    currentRecallQuestionId = ''; revealedQuestionId = '';
    if (!save()) { data.recallState = previousState; state = data.recallState; data.flashcards = previousFlashcards; render(); return; }
    schedulePushSync();
    toast(remembered ? 'Nice recall. This question will return after a longer interval.' : 'This question will return tomorrow for another attempt.');
  }
  document.addEventListener('submit', event => {
    if (event.target.id !== 'recallSettingsForm') return;
    event.preventDefault(); saveRecallSettings(event.target);
  });
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
    if (!target) return;
    const action = target.closest('[data-recall-action]');
    if (action) {
      const kind = action.dataset.recallAction;
      if (kind === 'refresh') { buildQuestionBank().catch(error => toast(error.message || 'Eduvia could not refresh your Recall questions.')); return; }
      if (kind === 'reveal') { revealedQuestionId = action.dataset.id || ''; currentRecallQuestionId = revealedQuestionId; render(); return; }
      if (kind === 'rate-remembered' || kind === 'rate-review') { rateQuestion(action.dataset.id, kind === 'rate-remembered'); return; }
    }
  });
  const oldPlay = window.eduPageRenderers && window.eduPageRenderers.play;
  if (window.eduPageRenderers) {
    window.eduPageRenderers.recall = renderRecall;
    window.eduPageRenderers.play = function () {
      const base = typeof oldPlay === 'function' ? oldPlay() : '';
      return base + '<section class="exp-section recall-play-link"><div class="exp-section-heading"><div><div class="eyebrow">BUILD LONG-TERM MEMORY</div><h2>Recall a little, often.</h2><p>Get short questions from your own learning material throughout your active study window.</p></div></div>' +
        '<button class="learning-expansion-card" data-page="recall"><span class="exp-icon exp-icon-purple">?</span><strong>Eduvia Recall</strong><span>Random micro-questions, spaced review and a personal recall history.</span><small>' +
        state.questions.length + ' questions saved · ' + state.history.length + ' answered →</small></button></section>';
    };
  }
  const oldSyncNav = window.syncNav;
  if (typeof oldSyncNav === 'function') {
    window.syncNav = function () {
      oldSyncNav();
      if (currentPage === 'recall') {
        document.querySelectorAll('[data-nav-key="play"]').forEach(item => item.classList.add('active'));
        const crumb = document.getElementById('crumbCurrent');
        if (crumb) crumb.textContent = 'Eduvia Recall';
      }
    };
  }
  if (typeof render === 'function') render();
})();

/* Eduvia AI Tutor and Google Workspace integrations.
 * API credentials stay in the Cloudflare Worker. The browser stores only a revocable device session token.
 */
(() => {
  const root = window;
  const TOKEN_KEY = 'eduvia-intelligence-session-v1';
  const HISTORY_PREFIX = 'eduvia-ai-tutor-history-v1:';
  const MAX_HISTORY = 16;
  const state = {
    courseId: '',
    histories: {},
    busy: false,
    error: '',
    notice: '',
    googleConnected: false,
    googleChecked: false,
    googleBusy: '',
    driveFiles: [],
    meetConferences: [],
    calendarEvents: [],
    calendarMessage: ''
  };

  const apiBase = () => String(root.EDUVIA_PUSH_API_URL || '').replace(/\/+$/, '');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const lineBreaks = value => {
    let safe = escapeHtml(value);
    safe = safe.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    safe = safe.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    safe = safe.replace(/^# (.+)$/gm, '<h3>$1</h3>');
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    safe = safe.replace(/(^|\n)[*-] (.+)/g, '$1• $2');
    return safe.replace(/\r\n?/g, '\n').replace(/\n/g, '<br>');
  };
  const appData = () => {
    try { if (typeof data !== 'undefined') return data; } catch {}
    return root.data || { courses: [], events: [] };
  };
  const courses = () => Array.isArray(appData().courses) ? appData().courses : [];
  const renderApp = () => { if (typeof root.render === 'function') root.render(); };
  const showToast = message => { if (typeof root.toast === 'function') root.toast(message); };
  const readStorage = key => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
  const writeStorage = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  const removeStorage = key => { try { localStorage.removeItem(key); } catch {} };

  function selectedCourseId() {
    if (state.courseId && courses().some(course => String(course.id) === String(state.courseId))) return String(state.courseId);
    const legacy = document.querySelector('#askEduviaForm select[name="courseId"]')?.value;
    if (legacy && courses().some(course => String(course.id) === String(legacy))) return String(legacy);
    return String(courses()[0]?.id || '');
  }

  function historyFor(courseId) {
    const key = String(courseId || 'general');
    if (!state.histories[key]) {
      try {
        const stored = JSON.parse(readStorage(HISTORY_PREFIX + key) || '[]');
        state.histories[key] = Array.isArray(stored) ? stored.slice(-MAX_HISTORY) : [];
      } catch { state.histories[key] = []; }
    }
    return state.histories[key];
  }

  function saveHistory(courseId) {
    const messages = historyFor(courseId).slice(-MAX_HISTORY);
    writeStorage(HISTORY_PREFIX + String(courseId || 'general'), JSON.stringify(messages));
  }

  async function ensureSession(forceNew = false) {
    const base = apiBase();
    if (!base) throw new Error('Eduvia’s intelligence service URL has not been configured yet.');
    if (!forceNew) {
      const saved = readStorage(TOKEN_KEY);
      if (saved) return saved;
    }
    const response = await fetch(base + '/v1/intelligence/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.token) throw new Error(payload.error || 'Eduvia could not start a secure AI session.');
    writeStorage(TOKEN_KEY, payload.token);
    return payload.token;
  }

  async function apiRequest(path, options = {}, retry = true) {
    const base = apiBase();
    if (!base) throw new Error('Eduvia’s intelligence service URL has not been configured yet.');
    const token = await ensureSession();
    const headers = { ...(options.headers || {}), Authorization: 'Bearer ' + token };
    if (options.body && typeof options.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      options = { ...options, body: JSON.stringify(options.body) };
    }
    const response = await fetch(base + path, { ...options, headers, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && retry) {
      removeStorage(TOKEN_KEY);
      await ensureSession(true);
      return apiRequest(path, options, false);
    }
    if (!response.ok) throw new Error(payload.error || 'Eduvia could not complete this request.');
    return payload;
  }

  async function checkHealth() {
    const base = apiBase();
    if (!base) return { ok: false, aiConfigured: false, googleConfigured: false };
    const response = await fetch(base + '/v1/intelligence/health', { cache: 'no-store' });
    if (!response.ok) throw new Error('Intelligence service is unavailable.');
    return response.json();
  }

  async function tutor(messages, options = {}) {
    return apiRequest('/v1/intelligence/tutor', {
      method: 'POST',
      body: {
        messages,
        course: options.course || 'General learning',
        level: options.level || 'Adapt to my understanding',
        sourceContext: options.sourceContext || ''
      }
    });
  }

  async function summarizeLecture(options = {}) {
    return apiRequest('/v1/intelligence/summarize', {
      method: 'POST',
      body: {
        title: options.title || 'Recorded lecture',
        course: options.course || '',
        sourceText: options.sourceText || ''
      }
    });
  }

  async function connectedGoogleStatus() {
    const result = await apiRequest('/v1/google/status', { method: 'GET' });
    state.googleConnected = Boolean(result.connected);
    state.googleChecked = true;
    return state.googleConnected;
  }

  function tutorMarkup() {
    const courseId = selectedCourseId();
    state.courseId = courseId;
    const course = courses().find(item => String(item.id) === courseId);
    const messages = historyFor(courseId);
    const options = courses().map(item =>
      '<option value="' + escapeHtml(item.id) + '" ' + (String(item.id) === courseId ? 'selected' : '') + '>' +
      escapeHtml((item.code ? item.code + ' · ' : '') + item.name) + '</option>'
    ).join('');
    const transcript = messages.map(message =>
      '<article class="eduvia-ai-message eduvia-ai-message-' + (message.role === 'assistant' ? 'assistant' : 'learner') + '">' +
      '<span>' + (message.role === 'assistant' ? 'EDUVIA TUTOR' : 'YOU') + '</span><div class="eduvia-ai-message-body">' + lineBreaks(message.content) + '</div></article>'
    ).join('');
    const status = state.error
      ? '<p class="eduvia-ai-error" role="alert">' + escapeHtml(state.error) + '</p>'
      : state.notice
        ? '<p class="eduvia-ai-notice" role="status">' + escapeHtml(state.notice) + '</p>'
        : '<p class="eduvia-ai-privacy">Your question and any selected course excerpts are sent securely to Eduvia’s server and its configured OpenAI model. Chat history is saved on this device; do not submit passwords, private identifiers or sensitive documents.</p>';
    return '<section class="panel eduvia-ai-panel">' +
      '<div class="eduvia-ai-heading"><div><div class="eyebrow">YOUR PERSONAL AI TEACHER</div><h2>Eduvia Tutor</h2><p>Ask follow-up questions, request step-by-step explanations and learn from your own course materials.</p></div><span class="eduvia-ai-spark">✦</span></div>' +
      '<div class="eduvia-ai-chat" aria-live="polite">' + (transcript || '<div class="eduvia-ai-welcome"><strong>What would you like to understand today?</strong><p>Try asking for a simple explanation, a worked example or a quick knowledge check.</p></div>') +
      (state.busy ? '<div class="eduvia-ai-thinking"><span></span><span></span><span></span> Eduvia is preparing an explanation…</div>' : '') + '</div>' +
      status +
      '<form id="eduviaTutorForm" class="eduvia-ai-form">' +
      '<div class="form-grid"><label class="form-field">Learning area<select name="courseId"><option value="">General learning</option>' + options + '</select></label>' +
      '<label class="form-field">Explanation level<select name="level"><option>Adapt to my understanding</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label></div>' +
      '<label class="eduvia-ai-source-toggle"><input type="checkbox" name="useSources" checked> Use relevant passages from my saved course materials when available</label>' +
      '<label class="form-field"><span class="sr-only">Your question</span><textarea name="question" rows="3" maxlength="4000" required placeholder="Ask Eduvia to explain a concept, solve an example or test your understanding…" ' + (state.busy ? 'disabled' : '') + '></textarea></label>' +
      '<div class="eduvia-ai-actions"><button class="secondary-btn" type="button" data-eduvia-ai-action="clear-chat" ' + (!messages.length || state.busy ? 'disabled' : '') + '>Clear conversation</button><button class="primary-btn" type="submit" ' + (state.busy ? 'disabled' : '') + '>Ask Eduvia Tutor ↗</button></div>' +
      '</form></section>';
  }

  function googleMarkup() {
    const connectedLabel = state.googleConnected ? 'Google account connected' : state.googleChecked ? 'Google account not connected' : 'Checking connection…';
    const nativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
    const driveItems = state.driveFiles.map(file =>
      '<article class="eduvia-google-item"><div><strong>' + escapeHtml(file.name) + '</strong><small>' + escapeHtml(file.mimeType || 'Google Drive file') + '</small></div><button type="button" class="secondary-btn" data-eduvia-google-action="import-drive" data-file-id="' + escapeHtml(file.id) + '">Import to course</button></article>'
    ).join('');
    const meetItems = state.meetConferences.map(item =>
      '<article class="eduvia-google-item"><div><strong>Google Meet session</strong><small>' + escapeHtml(item.startTime || item.name) + '</small></div><button type="button" class="secondary-btn" data-eduvia-google-action="import-meet" data-conference="' + escapeHtml(item.name) + '">Import transcript</button></article>'
    ).join('');
    const calendarItems = state.calendarEvents.slice(0, 10).map(item =>
      '<article class="eduvia-google-item"><div><strong>' + escapeHtml(item.summary || 'Untitled event') + '</strong><small>' + escapeHtml(item.start?.dateTime || item.start?.date || '') + '</small></div><span class="eduvia-google-tag">Calendar</span></article>'
    ).join('');
    return '<section class="panel eduvia-google-panel"><div class="eduvia-google-heading"><div><div class="eyebrow">CONNECTED LEARNING</div><h3>Google Workspace</h3><p>Import authorised Drive files and Meet transcripts, and synchronise your timetable with Calendar.</p></div><span class="eduvia-google-mark">G</span></div>' +
      '<div class="eduvia-google-status"><span class="eduvia-google-dot ' + (state.googleConnected ? 'connected' : '') + '"></span>' + escapeHtml(connectedLabel) + '</div>' +
      '<div class="eduvia-google-actions">' +
      (nativeApp
        ? '<button type="button" class="secondary-btn" disabled>Google sign-in on Android is being prepared</button>'
        : state.googleConnected
          ? '<button type="button" class="secondary-btn" data-eduvia-google-action="drive">Choose Drive files</button><button type="button" class="secondary-btn" data-eduvia-google-action="meet">Find Meet lectures</button><button type="button" class="secondary-btn" data-eduvia-google-action="calendar">Sync Calendar</button><button type="button" class="text-btn" data-eduvia-google-action="disconnect">Disconnect</button>'
          : '<button type="button" class="primary-btn" data-eduvia-google-action="connect" ' + (state.googleBusy ? 'disabled' : '') + '>Connect Google Workspace</button>') +
      '</div>' +
      (driveItems ? '<div class="eduvia-google-list"><strong>Drive files</strong>' + driveItems + '</div>' : '') +
      (meetItems ? '<div class="eduvia-google-list"><strong>Recent Meet sessions</strong>' + meetItems + '</div>' : '') +
      (calendarItems ? '<div class="eduvia-google-list"><strong>Upcoming Calendar events</strong>' + calendarItems + '</div>' : '') +
      (state.calendarMessage ? '<p class="eduvia-ai-notice">' + escapeHtml(state.calendarMessage) + '</p>' : '') +
      '<p class="eduvia-ai-privacy">Google access is permission-based. Eduvia asks you to select Drive files with Google Picker; it does not browse your entire Drive. Meet access is limited to transcripts available to the connected Google account. Calendar sync uses your primary calendar. Imported materials are saved to this device.</p>' + (nativeApp ? '<p class="eduvia-ai-privacy">Google sign-in currently works in the Eduvia web app. The Android APK needs the separate system-browser OAuth and deep-link configuration before this can be enabled there.</p>' : '') + '</section>';
  }

  function renderExtras() {
    return '<div class="eduvia-intelligence-stack">' + tutorMarkup() + googleMarkup() + '</div>';
  }

  async function buildSourceContext(courseId, question) {
    if (!courseId || typeof loadCourseText !== 'function' || !root.eduCourseIntelligence?.search) return '';
    try {
      const sources = await loadCourseText(courseId);
      const matches = root.eduCourseIntelligence.search(sources, question, 6);
      return matches.map(item => '[' + (item.citation || item.name || 'Course material') + ']\n' + item.text).join('\n\n').slice(0, 16000);
    } catch {
      return '';
    }
  }

  async function submitTutor(form) {
    if (state.busy) return;
    const formData = new FormData(form);
    const courseId = String(formData.get('courseId') || '');
    const question = String(formData.get('question') || '').trim();
    const level = String(formData.get('level') || 'Adapt to my understanding');
    if (!question) return;
    state.courseId = courseId;
    const course = courses().find(item => String(item.id) === courseId);
    const messages = historyFor(courseId);
    messages.push({ role: 'user', content: question });
    state.histories[courseId || 'general'] = messages.slice(-MAX_HISTORY);
    state.error = '';
    state.notice = '';
    state.busy = true;
    saveHistory(courseId);
    renderApp();
    try {
      const sourceContext = formData.get('useSources') === 'on' ? await buildSourceContext(courseId, question) : '';
      const recent = historyFor(courseId).slice(-MAX_HISTORY);
      const result = await tutor(recent, { course: course?.name || 'General learning', level, sourceContext });
      recent.push({ role: 'assistant', content: result.answer });
      state.histories[courseId || 'general'] = recent.slice(-MAX_HISTORY);
      saveHistory(courseId);
    } catch (error) {
      state.error = error?.message || 'Eduvia Tutor could not answer right now.';
    } finally {
      state.busy = false;
      renderApp();
    }
  }

  async function connectGoogle() {
    state.googleBusy = 'connect';
    state.error = '';
    renderApp();
    try {
      const result = await apiRequest('/v1/google/connect', { method: 'POST', body: {} });
      if (!result.authorizationUrl) throw new Error('Google did not return an authorisation link.');
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      state.error = error?.message || 'Google Workspace could not be connected.';
      state.googleBusy = '';
      renderApp();
    }
  }

  async function loadGooglePicker() {
    if (window.google?.picker?.PickerBuilder) return;
    if (!window.__eduviaGooglePickerScript) {
      window.__eduviaGooglePickerScript = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-eduvia-google-picker]');
        if (existing) {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.dataset.eduviaGooglePicker = '1';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Google Picker could not be loaded. Check your internet connection and Google API setup.'));
        document.head.appendChild(script);
      });
    }
    await window.__eduviaGooglePickerScript;
    await new Promise((resolve, reject) => {
      if (!window.gapi?.load) return reject(new Error('Google API libraries did not load correctly.'));
      window.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Google Drive file picker could not be initialised.')) });
    });
  }

  async function browseDrive() {
    state.googleBusy = 'drive';
    state.error = '';
    state.notice = '';
    renderApp();
    try {
      const config = await apiRequest('/v1/google/picker-config', { method: 'GET' });
      await loadGooglePicker();
      const picker = new window.google.picker.PickerBuilder()
        .addView(new window.google.picker.DocsView(window.google.picker.ViewId.DOCS).setMode(window.google.picker.DocsViewMode.LIST).setMimeTypes('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg,image/webp,text/plain,text/markdown'))
        .setOAuthToken(config.accessToken)
        .setDeveloperKey(config.apiKey)
        .setAppId(String(config.appId))
        .setMaxItems(10)
        .setTitle('Choose lecture files to import into Eduvia')
        .setCallback(result => {
          if (result.action !== window.google.picker.Action.PICKED) return;
          const docs = result[window.google.picker.Response.DOCUMENTS] || [];
          if (!docs.length) return;
          state.googleBusy = 'drive-import';
          (async () => {
            for (const doc of docs) {
              try {
                await importDriveFile(String(doc.id || ''), String(doc.name || 'Drive lecture file'));
              } catch (error) {
                state.error = (state.error ? state.error + ' ' : '') + (error?.message || 'One Drive file could not be imported.');
              }
            }
            state.googleBusy = '';
            renderApp();
          })();
        })
        .build();
      state.googleBusy = '';
      renderApp();
      picker.setVisible(true);
    } catch (error) {
      state.googleBusy = '';
      state.error = error?.message || 'Google Drive could not be opened.';
      renderApp();
    }
  }

  async function loadMeetConferences() {
    state.googleBusy = 'meet';
    renderApp();
    try {
      const result = await apiRequest('/v1/google/meet/conferences', { method: 'GET' });
      state.meetConferences = result.conferences || [];
      state.notice = state.meetConferences.length ? 'Choose a Meet session to import its generated transcript.' : 'No accessible Meet sessions were found. Only meetings with available artifacts can be imported.';
    } catch (error) {
      state.error = error.message;
    } finally {
      state.googleBusy = '';
      renderApp();
    }
  }

  function bytesFromBase64(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function saveImportedLecture(title, courseId, sourceText, sourceName, sourceUrl = '') {
    if (!root.eduLectureIntelligenceCore || !root.eduLectureMaterials?.save) throw new Error('Recorded Lecture storage is not ready. Refresh Eduvia and try again.');
    const extracted = root.eduLectureIntelligenceCore.cleanTranscript(sourceText);
    const result = root.eduLectureIntelligenceCore.summarizeLecture(extracted, 8);
    if (!result.keyPoints.length) throw new Error('The imported material did not contain enough readable text to create lecture notes.');
    const course = courses().find(item => String(item.id) === String(courseId));
    const record = {
      id: 'google-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      name: String(title || 'Imported lecture').slice(0, 120),
      courseId: String(courseId || ''),
      lectureDate: new Date().toLocaleDateString('en-CA'),
      sourceUrl,
      text: extracted,
      keyPoints: result.keyPoints,
      topics: result.topics,
      attachments: [{ name: sourceName, type: 'Google Workspace import', size: 0, characters: extracted.length }],
      createdAt: Date.now(),
      sentenceCount: result.sentenceCount,
      method: 'google-import-local-extractive-v1'
    };
    try {
      const ai = await summarizeLecture({ title: record.name, course: course?.name || '', sourceText: extracted.slice(0, 50000) });
      record.aiSummary = ai.summary;
      record.aiSummaryModel = ai.model;
      record.aiSummaryCreatedAt = Date.now();
      record.method = 'google-import-ai-summary-v1';
    } catch (error) {
      record.aiSummaryError = error?.message || 'AI summary unavailable';
    }
    await root.eduLectureMaterials.save(record);
    state.notice = record.aiSummary ? 'Lecture imported and AI summary generated.' : 'Lecture imported. Local source-based notes were saved; AI summary is not currently available.';
    return record;
  }

  async function importDriveFile(fileId, fileName = 'Google Drive file') {
    state.googleBusy = 'drive-import';
    renderApp();
    try {
      const result = await apiRequest('/v1/google/drive/import', { method: 'POST', body: { fileId } });
      const file = result.file;
      const blob = new Blob([bytesFromBase64(file.base64)], { type: file.mimeType });
      const fileObject = new File([blob], file.name, { type: file.mimeType });
      if (typeof root.eduExtractLectureAsset !== 'function') throw new Error('The document reader is not ready. Refresh Eduvia and try again.');
      const text = await root.eduExtractLectureAsset(fileObject);
      const courseId = state.courseId || selectedCourseId();
      await saveImportedLecture(file.name || fileName, courseId, text, file.name || fileName, '');
      state.driveFiles = [];
      if (typeof root.render === 'function') root.render();
      showToast(state.notice);
    } catch (error) {
      state.error = error?.message || 'The Drive file could not be imported.';
    } finally {
      state.googleBusy = '';
      renderApp();
    }
  }

  async function importMeetTranscript(conferenceName) {
    state.googleBusy = 'meet-import';
    renderApp();
    try {
      const query = new URLSearchParams({ conferenceRecord: conferenceName });
      const result = await apiRequest('/v1/google/meet/transcripts?' + query.toString(), { method: 'GET' });
      const sections = [];
      for (const transcript of result.transcripts || []) {
        for (const entry of transcript.entries || []) {
          const timestamp = entry.startTime ? '[' + entry.startTime + '] ' : '';
          sections.push(timestamp + String(entry.text || ''));
        }
      }
      const text = sections.join('\n');
      if (text.length < 80) throw new Error('The selected Meet session has no generated transcript entries yet. Check that transcription was enabled and the transcript has finished processing.');
      const title = 'Google Meet lecture — ' + new Date().toLocaleDateString('en-NG');
      await saveImportedLecture(title, state.courseId || selectedCourseId(), text, 'Google Meet transcript');
      state.meetConferences = [];
      showToast(state.notice);
    } catch (error) {
      state.error = error?.message || 'The Meet transcript could not be imported.';
    } finally {
      state.googleBusy = '';
      renderApp();
    }
  }

  function localDateTime(value) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(value));
    const get = type => parts.find(part => part.type === type)?.value || '';
    return { date: get('year') + '-' + get('month') + '-' + get('day'), time: get('hour') + ':' + get('minute') };
  }

  function calendarSnapshotFromLocal(event) {
    return {
      title: String(event.title || ''),
      date: String(event.date || ''),
      start: String(event.start || ''),
      end: String(event.end || ''),
      note: String(event.note || '')
    };
  }

  function calendarSnapshotsEqual(left, right) {
    if (!left || !right) return false;
    return ['title', 'date', 'start', 'end', 'note'].every(key =>
      String(left[key] || '') === String(right[key] || '')
    );
  }

  async function syncCalendar() {
    state.googleBusy = 'calendar';
    state.calendarMessage = '';
    state.error = '';
    renderApp();
    try {
      const result = await apiRequest('/v1/google/calendar/events', { method: 'GET' });
      state.calendarEvents = result.events || [];
      const app = appData();
      if (!Array.isArray(app.events)) app.events = [];
      let imported = 0;
      let conflicts = 0;
      for (const item of state.calendarEvents) {
        if (!item.start?.dateTime || !item.end?.dateTime) continue;
        const start = localDateTime(item.start.dateTime);
        const end = localDateTime(item.end.dateTime);
        const remoteSnapshot = {
          title: String(item.summary || 'Google Calendar event'),
          date: start.date,
          start: start.time,
          end: end.time,
          note: String(item.description || '')
        };
        const existing = app.events.find(entry => entry.googleEventId === item.id || entry.googleCalendarEventId === item.id);
        if (!existing) {
          app.events.push({
            id: 'gcal-' + item.id,
            ...remoteSnapshot,
            type: 'study',
            courseId: '',
            googleEventId: item.id,
            googleCalendarEventId: item.id,
            googleSyncSnapshot: remoteSnapshot
          });
          imported++;
          continue;
        }
        const baseline = existing.googleSyncSnapshot || null;
        const localSnapshot = calendarSnapshotFromLocal(existing);
        const localChanged = baseline ? !calendarSnapshotsEqual(localSnapshot, baseline) : false;
        const remoteChanged = baseline ? !calendarSnapshotsEqual(remoteSnapshot, baseline) : true;
        if (!baseline || (!localChanged && remoteChanged) || (!localChanged && !remoteChanged) || (localChanged && remoteChanged)) {
          Object.assign(existing, {
            title: remoteSnapshot.title,
            date: remoteSnapshot.date,
            start: remoteSnapshot.start,
            end: remoteSnapshot.end,
            note: remoteSnapshot.note,
            googleSyncSnapshot: remoteSnapshot
          });
          if (localChanged && remoteChanged) conflicts++;
        }
        existing.googleEventId = item.id;
        existing.googleCalendarEventId = item.id;
      }
      if (imported || conflicts || state.calendarEvents.length) {
        if (typeof save === 'function') await save();
      }

      let exported = 0;
      const today = new Date().toLocaleDateString('en-CA');
      for (const event of app.events.slice(0, 60)) {
        if (!event.date || event.date < today || !event.start || !event.end) continue;
        const calendarPayload = {
          summary: event.title || 'Eduvia learning session',
          description: String(event.note || '') + (event.type ? (event.note ? '\n' : '') + 'Synced from Eduvia (' + event.type + ')' : 'Synced from Eduvia'),
          start: {
            dateTime: event.date + 'T' + event.start + ':00',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          },
          end: {
            dateTime: event.date + 'T' + event.end + ':00',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          }
        };
        const remoteEventId = event.googleCalendarEventId || event.googleEventId || '';
        const method = remoteEventId ? 'update' : 'create';
        const endpoint = '/v1/google/calendar/events?action=' + method +
          (remoteEventId ? '&eventId=' + encodeURIComponent(remoteEventId) : '');
        const saved = await apiRequest(endpoint, { method: 'POST', body: { event: calendarPayload } });
        const savedId = saved.event?.id || remoteEventId;
        if (savedId) {
          event.googleCalendarEventId = savedId;
          event.googleEventId = savedId;
        }
        event.googleSyncSnapshot = calendarSnapshotFromLocal(event);
        exported++;
      }
      if (exported && typeof save === 'function') await save();
      state.calendarMessage = 'Calendar sync finished: ' + imported + ' new event(s) imported and ' +
        exported + ' Eduvia event(s) synchronised.' +
        (conflicts ? ' ' + conflicts + ' event(s) changed in both places; Google Calendar values were kept.' : '') +
        ' Sync is manual and covers timed events and up to 60 Eduvia timetable entries at a time.';
    } catch (error) {
      state.error = error?.message || 'Google Calendar could not be synchronised.';
    } finally {
      state.googleBusy = '';
      renderApp();
    }
  }

  async function disconnectGoogle() {
    if (!window.confirm('Disconnect Google Workspace from this Eduvia device?')) return;
    state.googleBusy = 'disconnect';
    try {
      await apiRequest('/v1/google/disconnect', { method: 'POST', body: {} });
      state.googleConnected = false;
      state.driveFiles = [];
      state.meetConferences = [];
      state.calendarEvents = [];
      state.notice = 'Google Workspace disconnected from this device.';
    } catch (error) {
      state.error = error.message;
    } finally {
      state.googleBusy = '';
      renderApp();
    }
  }

  async function initializeGoogle() {
    try {
      const params = new URLSearchParams(window.location.search);
      const result = params.get('google');
      if (result) {
        state.notice = result === 'connected' ? 'Google Workspace connected successfully.' : 'Google connection was not completed (' + result + ').';
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('google');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
      const health = await checkHealth();
      if (health.googleConfigured) {
        await connectedGoogleStatus();
      } else {
        state.googleChecked = true;
      }
    } catch {
      state.googleChecked = true;
    }
    renderApp();
  }

  document.addEventListener('submit', event => {
    if (event.target?.id !== 'eduviaTutorForm') return;
    event.preventDefault();
    submitTutor(event.target);
  });

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-eduvia-ai-action],[data-eduvia-google-action]') : null;
    if (!target) return;
    const aiAction = target.dataset.eduviaAiAction;
    const googleAction = target.dataset.eduviaGoogleAction;
    if (aiAction === 'clear-chat') {
      const courseId = selectedCourseId();
      state.histories[courseId || 'general'] = [];
      removeStorage(HISTORY_PREFIX + (courseId || 'general'));
      state.error = '';
      state.notice = 'Conversation cleared on this device.';
      renderApp();
      return;
    }
    if (googleAction === 'connect') connectGoogle();
    if (googleAction === 'drive') browseDrive();
    if (googleAction === 'meet') loadMeetConferences();
    if (googleAction === 'calendar') syncCalendar();
    if (googleAction === 'disconnect') disconnectGoogle();
    if (googleAction === 'import-drive') importDriveFile(target.dataset.fileId || '');
    if (googleAction === 'import-meet') importMeetTranscript(target.dataset.conference || '');
  });

  const pageRenderers = root.eduPageRenderers || {};
  if (typeof pageRenderers.ask === 'function' && !root.eduAskAiWrapped) {
    const originalAsk = pageRenderers.ask;
    pageRenderers.ask = function() { return originalAsk() + renderExtras(); };
    root.eduAskAiWrapped = true;
    root.eduPageRenderers = pageRenderers;
  }

  root.eduIntelligenceClient = {
    tutor,
    summarizeLecture,
    checkHealth,
    apiRequest,
    saveImportedLecture
  };

  initializeGoogle();
})();

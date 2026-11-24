(function () {
  const root = window;
  const TOKEN_KEY = 'eduvia.integrations.device.v1';
  const AUTO_SUMMARY_KEY = 'eduvia.integrations.auto-summary.v1';
  const AUTO_MEET_KEY = 'eduvia.integrations.auto-meet-transcription.v1';
  const CALENDAR_SYNC_KEY = 'eduvia.integrations.calendar-sync.v1';
  const apiRoot = String(root.EDUVIA_PUSH_API_URL || '').replace(/\/+$/, '');
  const state = { status: null, statusLoading: false, history: [], meetings: [], busy: false, calendarMessage: '', meetMessage: '' };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify = message => { if (typeof root.toast === 'function') root.toast(message); };
  const isAutoSummaryEnabled = () => safeGet(AUTO_SUMMARY_KEY) === '1';
  const isAutoMeetEnabled = () => safeGet(AUTO_MEET_KEY) === '1';
  function safeGet(key) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
  function safeSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
  function deviceToken() {
    let token = safeGet(TOKEN_KEY);
    if (token && /^[A-Za-z0-9_-]{40,60}$/.test(token)) return token;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    token = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    safeSet(TOKEN_KEY, token);
    return token;
  }
  function requireApi() {
    if (!apiRoot) throw new Error('The Eduvia integration service URL is not configured.');
  }
  async function api(path, options = {}) {
    requireApi();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', 'Bearer ' + deviceToken());
    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
    const response = await fetch(apiRoot + path, { method: options.method || 'GET', headers, body, cache: 'no-store' });
    const raw = await response.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch {}
    if (!response.ok) {
      const error = new Error(payload.error || ('Eduvia integration request failed (' + response.status + ').'));
      error.status = response.status;
      throw error;
    }
    return payload;
  }
  async function apiBlob(path) {
    requireApi();
    const response = await fetch(apiRoot + path, { headers: { Authorization: 'Bearer ' + deviceToken() }, cache: 'no-store' });
    if (!response.ok) {
      let payload = {};
      try { payload = await response.json(); } catch {}
      throw new Error(payload.error || ('Could not download that Google Drive file (' + response.status + ').'));
    }
    return { blob: await response.blob(), name: decodeURIComponent(response.headers.get('X-File-Name') || 'Google Drive material') };
  }
  async function loadStatus(force = false) {
    if (state.status && !force) return state.status;
    try {
      state.status = await api('/v1/integrations/status');
    } catch (error) {
      state.status = { unavailable: true, error: error.message };
    }
    return state.status;
  }
  function courseOptions(selected) {
    const courses = Array.isArray(data.courses) ? data.courses : [];
    return '<option value="">Choose a learning area</option>' + courses.map(course =>
      '<option value="' + esc(course.id) + '" ' + (String(course.id) === String(selected || '') ? 'selected' : '') + '>' +
      esc((course.code ? course.code + ' · ' : '') + course.name) + '</option>'
    ).join('');
  }
  function courseName(id) {
    return (data.courses || []).find(course => String(course.id) === String(id))?.name || 'General learning';
  }
  function settingsToggle(label, description, key, checked) {
    return '<label class="int-toggle-row"><span><b>' + esc(label) + '</b><small>' + esc(description) + '</small></span>' +
      '<input type="checkbox" data-integration-toggle="' + esc(key) + '" ' + (checked ? 'checked' : '') + '></label>';
  }
  function ensureStatus() {
    if (state.status || state.statusLoading) return;
    state.statusLoading = true;
    loadStatus(true).finally(() => { state.statusLoading = false; if (currentPage === 'integrations' || currentPage === 'ai-tutor') renderIfCurrent(); });
  }
  function renderIntegrationPage() {
    ensureStatus();
    const s = state.status || {};
    const connected = Boolean(s.googleConnected);
    const aiReady = Boolean(s.aiEnabled);
    const googleReady = Boolean(s.googleConfigured);
    const pickerReady = Boolean(s.drivePickerConfigured);
    const meetingList = state.meetings.map(item => {
      const rec = item.record;
      const time = rec.startTime || rec.start_time || '';
      const date = time ? new Date(time).toLocaleString() : 'Recent Google Meet';
      const transcriptButtons = item.transcripts.map(transcript =>
        '<button class="secondary-btn" data-integration-action="import-meet-transcript" data-transcript="' + esc(transcript.name) + '" data-record="' + esc(rec.name) + '">Import transcript</button>'
      ).join('');
      const recordingButtons = item.recordings.map(recording => {
        const fileId = recording.driveDestination?.file?.id || recording.driveDestination?.fileId || recording.driveFileId || '';
        return fileId ? '<button class="secondary-btn" data-integration-action="transcribe-meet-recording" data-file-id="' + esc(fileId) + '" data-name="' + esc(recording.name || 'Google Meet recording') + '" data-record="' + esc(rec.name) + '">Transcribe recording</button>' : '';
      }).join('');
      return '<article class="int-meet-card"><div><b>' + esc(rec.space || rec.name || 'Google Meet') + '</b><small>' + esc(date) + '</small></div>' +
        '<div class="int-meet-actions">' + (transcriptButtons || '<span class="int-muted">No generated transcript available</span>') + recordingButtons + '</div></article>';
    }).join('');
    return '<section class="page-heading"><div><div class="eyebrow">CONNECTED LEARNING</div><h1>AI & Google Workspace</h1><p>Bring your tutor, lecture processing, Drive files, Meet transcripts and Calendar into one learning workflow.</p></div></section>' +
      '<section class="int-status-grid">' +
        '<article class="int-status-card"><span class="int-status-icon">✦</span><div><b>Eduvia AI</b><small>' + (aiReady ? 'Ready · GPT-6.2 Sol' : 'Not configured') + '</small></div><span class="int-status-dot ' + (aiReady ? 'is-ready' : '') + '"></span></article>' +
        '<article class="int-status-card"><span class="int-status-icon">G</span><div><b>Google account</b><small>' + (connected ? esc(s.googleEmail || 'Connected') : 'Not connected') + '</small></div><span class="int-status-dot ' + (connected ? 'is-ready' : '') + '"></span></article>' +
        '<article class="int-status-card"><span class="int-status-icon">▤</span><div><b>Drive Picker</b><small>' + (pickerReady ? 'Ready' : 'Setup required') + '</small></div><span class="int-status-dot ' + (pickerReady ? 'is-ready' : '') + '"></span></article>' +
      '</section>' +
      (s.unavailable ? '<div class="int-notice is-warning">' + esc(s.error || 'The integration service is unavailable. Complete its setup before connecting services.') + ' <button class="text-btn" data-integration-action="refresh-status">Retry</button></div>' : '') +
      '<section class="panel int-panel"><div class="int-panel-head"><div><div class="eyebrow">GOOGLE ACCOUNT</div><h2>' + (connected ? 'Google is connected' : 'Connect Google Workspace') + '</h2><p>' + (connected ? 'Eduvia can access only the Google services and files covered by the permissions you approved.' : 'Authorise Google once to enable Drive imports, eligible Meet artifacts and Calendar synchronisation.') + '</p></div></div>' +
      '<div class="int-action-row">' +
        (connected ? '<button class="secondary-btn" data-integration-action="disconnect-google">Disconnect Google</button>' : '<button class="primary-btn" data-integration-action="connect-google" ' + (!googleReady ? 'disabled' : '') + '>Connect Google account</button>') +
      '</div>' +
      '<p class="int-privacy-note">Google refresh credentials are encrypted in Eduvia’s server-side database. The short-lived Picker access token is held in memory only. Disconnecting removes the saved Google connection for this device.</p>' +
      '</section>' +
      '<section class="panel int-panel"><div class="int-panel-head"><div><div class="eyebrow">CHATGPT-POWERED LEARNING</div><h2>Eduvia AI Tutor</h2><p>Ask questions about your courses. The tutor uses relevant source passages from your uploaded learning materials and explains concepts step by step.</p></div></div>' +
        '<div class="int-action-row"><button class="primary-btn" data-page="ai-tutor" ' + (!aiReady ? 'disabled' : '') + '>Open AI Tutor ↗</button></div>' +
        '<p class="int-privacy-note">Only the question, recent conversation and selected source excerpts are sent to OpenAI for each answer. Eduvia does not send the entire materials library.</p>' +
      '</section>' +
      '<section class="panel int-panel"><div class="int-panel-head"><div><div class="eyebrow">GOOGLE DRIVE</div><h2>Import learning materials</h2><p>Choose a file from your Google Drive and send it through Eduvia’s existing PDF, Office and OCR reader.</p></div></div>' +
        '<label class="form-field int-course-field">Save this material under<select id="intDriveCourse">' + courseOptions('') + '</select></label>' +
        '<div class="int-action-row"><button class="primary-btn" data-integration-action="pick-drive-file" ' + (!connected || !pickerReady ? 'disabled' : '') + '>Choose from Google Drive</button></div>' +
        '<p class="int-privacy-note">The file you select is downloaded for this import and stored in the current device’s Eduvia materials library. Drive access is limited to files you select or Meet artifacts.</p>' +
      '</section>' +
      '<section class="panel int-panel"><div class="int-panel-head"><div><div class="eyebrow">GOOGLE MEET</div><h2>Recorded lectures and transcripts</h2><p>Find your recent Meet conference artifacts, import generated transcripts, or transcribe a small recording when no transcript exists.</p></div></div>' +
        '<label class="form-field int-course-field">Save imported lectures under<select id="intMeetCourse">' + courseOptions('') + '</select></label>' +
        settingsToggle('Automatically transcribe eligible Meet recordings when syncing', 'This can use OpenAI transcription credits. Only recordings up to 25 MB are supported by this first version.', AUTO_MEET_KEY, isAutoMeetEnabled()) +
        '<div class="int-action-row"><button class="primary-btn" data-integration-action="sync-meet" ' + (!connected ? 'disabled' : '') + '>Find recent Meet recordings</button></div>' +
        (state.meetMessage ? '<p class="int-muted">' + esc(state.meetMessage) + '</p>' : '') +
        '<div class="int-meet-list">' + (meetingList || '<p class="int-muted">No Meet artifacts loaded. Select Find recent Meet recordings to check the last 30 days.</p>') + '</div>' +
        '<p class="int-privacy-note">Google Meet must have generated a transcript or recording for the meeting. Transcript entries are normally available for 30 days. Google exposes the conference records available to the connected account, generally meetings the learner organised.</p>' +
      '</section>' +
      '<section class="panel int-panel"><div class="int-panel-head"><div><div class="eyebrow">GOOGLE CALENDAR</div><h2>Synchronise your schedule</h2><p>Import Google events into Eduvia or send Eduvia classes and study sessions to your primary Google Calendar.</p></div></div>' +
        '<div class="int-action-row"><button class="secondary-btn" data-integration-action="calendar-import" ' + (!connected ? 'disabled' : '') + '>Import from Google Calendar</button><button class="primary-btn" data-integration-action="calendar-export" ' + (!connected ? 'disabled' : '') + '>Export Eduvia schedule</button></div>' +
        (state.calendarMessage ? '<p class="int-muted">' + esc(state.calendarMessage) + '</p>' : '') +
        '<p class="int-privacy-note">Imports skip duplicates and bring in dated events for the next 180 days. Exported events receive an Eduvia ID so repeat exports update existing events rather than duplicating them. Google Calendar changes are imported when you sync; this is not a continuous background two-way sync.</p>' +
      '</section>' +
      '<section class="panel int-panel"><div class="int-panel-head"><div><div class="eyebrow">LECTURE PROCESSING</div><h2>AI-generated study summaries</h2><p>Upgrade extracted lecture notes into a structured study guide with explanations, definitions, key concepts and revision questions.</p></div></div>' +
        settingsToggle('Automatically create an AI summary after importing a lecture', 'When enabled, a saved transcript or lecture import is sent to OpenAI for a study guide. You can still create summaries manually.', AUTO_SUMMARY_KEY, isAutoSummaryEnabled()) +
        '<p class="int-privacy-note">AI summaries are saved with the lecture on this device. AI processing requires an active OpenAI API configuration and uses separate API billing.</p>' +
      '</section>';
  }
  function tutorMessagesHtml() {
    if (!state.history.length) return '<div class="int-tutor-empty"><span>✦</span><b>What are you learning today?</b><p>Ask for an explanation, an example, a step-by-step solution or a quick knowledge check.</p></div>';
    return state.history.map(item => '<article class="int-chat-message is-' + esc(item.role) + '"><small>' + (item.role === 'assistant' ? 'EDUVIA TUTOR' : 'YOU') + '</small><div>' + esc(item.content).replace(/\n/g, '<br>') + '</div></article>').join('');
  }
  function renderTutorPage() {
    ensureStatus();
    const aiReady = Boolean(state.status?.aiEnabled);
    const selected = state.selectedTutorCourse || (data.courses || [])[0]?.id || '';
    return '<section class="page-heading"><div><div class="eyebrow">YOUR PERSONAL AI LEARNING COMPANION</div><h1>Eduvia AI Tutor</h1><p>A tutor that can work with your own uploaded notes, explain difficult concepts and help you test your understanding.</p></div></section>' +
      '<section class="panel int-tutor-panel">' +
        '<div class="int-tutor-controls"><label class="form-field">Learning area<select id="intTutorCourse">' + courseOptions(selected) + '</select></label></div>' +
        '<div id="intTutorMessages" class="int-tutor-messages">' + tutorMessagesHtml() + '</div>' +
        '<form id="intTutorForm" class="int-tutor-form"><textarea name="question" rows="3" maxlength="1400" placeholder="Ask Eduvia to explain a concept, solve a practice question or test your understanding…" required></textarea><button class="primary-btn" type="submit" ' + (!aiReady ? 'disabled' : '') + '>Ask Eduvia ↗</button></form>' +
        (!aiReady ? '<p class="int-privacy-note">The AI service has not been configured on the Eduvia server yet.</p>' : '<p class="int-privacy-note">Eduvia searches the selected course materials locally, then sends only relevant excerpts and your question to OpenAI. Answers may be wrong: verify important facts with your original notes.</p>') +
      '</section>' +
      '<div class="int-tutor-footer"><button class="text-btn" data-integration-action="clear-tutor">Clear this conversation</button><button class="secondary-btn" data-page="integrations">AI & Google Workspace settings</button></div>';
  }
  function renderIfCurrent() {
    if (typeof render === 'function') render();
  }
  function syncIntegrationStatus() {
    loadStatus(true).then(() => { if (currentPage === 'integrations' || currentPage === 'ai-tutor') renderIfCurrent(); });
  }
  async function connectGoogle() {
    try {
      const returnUrl = location.origin + location.pathname;
      const result = await api('/v1/integrations/google/start', { method: 'POST', body: { returnUrl } });
      if (!result.authorizationUrl) throw new Error('Google did not return a sign-in link.');
      location.href = result.authorizationUrl;
    } catch (error) { notify(error.message); }
  }
  async function disconnectGoogle() {
    if (!confirm('Disconnect Google from this Eduvia installation? Google imports and Calendar sync will stop until you reconnect.')) return;
    try {
      await api('/v1/integrations/google/disconnect', { method: 'POST', body: {} });
      state.status = null;
      state.meetings = [];
      notify('Google disconnected from this device.');
      syncIntegrationStatus();
    } catch (error) { notify(error.message); }
  }
  function loadGooglePicker() {
    return new Promise((resolve, reject) => {
      if (root.google?.picker) { resolve(); return; }
      let script = document.querySelector('script[data-eduvia-google-picker]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.dataset.eduviaGooglePicker = '1';
        script.onerror = () => reject(new Error('Google Picker could not be loaded. Check your connection.'));
        document.head.appendChild(script);
      }
      script.addEventListener('load', () => {
        if (!root.gapi?.load) { reject(new Error('Google Picker is unavailable in this browser.')); return; }
        root.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Google Picker could not be initialised.')) });
      }, { once: true });
      if (script.dataset.loaded === '1' && root.gapi?.load) root.gapi.load('picker', { callback: resolve });
      script.addEventListener('load', () => { script.dataset.loaded = '1'; }, { once: true });
    });
  }
  async function chooseDriveFile() {
    try {
      const config = await api('/v1/integrations/google/picker');
      await loadGooglePicker();
      const picker = new root.google.picker.PickerBuilder()
        .setAppId(config.appId)
        .setDeveloperKey(config.developerKey)
        .setOAuthToken(config.accessToken)
        .addView(root.google.picker.ViewId.DOCS)
        .enableFeature(root.google.picker.Feature.NAV_HIDDEN)
        .setTitle('Choose a learning material for Eduvia')
        .setCallback(result => {
          if (result.action !== root.google.picker.Action.PICKED || !result.docs?.length) return;
          importDriveFile(result.docs[0]).catch(error => notify(error.message));
        })
        .build();
      picker.setVisible(true);
    } catch (error) { notify(error.message); }
  }
  async function importDriveFile(file) {
    const courseId = document.getElementById('intDriveCourse')?.value || '';
    try {
      const download = await apiBlob('/v1/integrations/google/drive/download?fileId=' + encodeURIComponent(file.id));
      const ext = download.name.split('.').pop().toLowerCase();
      const allowed = new Set(['pdf','docx','pptx','txt','md','csv','png','jpg','jpeg','webp','doc','ppt']);
      if (!allowed.has(ext)) throw new Error('This file type is not supported by Eduvia yet. Choose a PDF, Word document, slide deck, spreadsheet, text file or image.');
      const imported = new File([download.blob], download.name, { type: download.blob.type || file.mimeType || 'application/octet-stream' });
      if (typeof root.eduHandleStudioFile !== 'function') throw new Error('Eduvia’s document reader is not ready. Refresh the app and try again.');
      await root.eduHandleStudioFile('material', imported, courseId);
      notify('Google Drive file sent to the Eduvia material importer.');
    } catch (error) { notify(error.message); }
  }
  async function syncMeet() {
    state.meetMessage = 'Checking recent Google Meet conferences…';
    renderIfCurrent();
    try {
      const response = await api('/v1/integrations/google/meet/records');
      const records = (response.records || []).slice(0, 12);
      const items = [];
      for (const record of records) {
        const [transcriptResult, recordingResult] = await Promise.all([
          api('/v1/integrations/google/meet/transcripts?conferenceRecord=' + encodeURIComponent(record.name)).catch(() => ({ items: [] })),
          api('/v1/integrations/google/meet/recordings?conferenceRecord=' + encodeURIComponent(record.name)).catch(() => ({ items: [] }))
        ]);
        items.push({ record, transcripts: transcriptResult.items || [], recordings: recordingResult.items || [] });
      }
      state.meetings = items;
      state.meetMessage = items.length + ' recent conference' + (items.length === 1 ? '' : 's') + ' checked.';
      renderIfCurrent();
      if (isAutoMeetEnabled()) {
        for (const item of items) {
          if (item.transcripts.length) {
            for (const transcript of item.transcripts) await importMeetTranscript(transcript.name, item.record, true).catch(error => { state.meetMessage = error.message; });
          } else {
            for (const recording of item.recordings) {
              const fileId = recording.driveDestination?.file?.id || recording.driveDestination?.fileId || recording.driveFileId || '';
              if (fileId) await transcribeMeetRecording(fileId, recording.name || 'Google Meet recording', item.record, true).catch(error => { state.meetMessage = error.message; });
            }
          }
        }
        renderIfCurrent();
      }
    } catch (error) {
      state.meetMessage = error.message;
      renderIfCurrent();
      notify(error.message);
    }
  }
  function meetingTitle(record) {
    return 'Google Meet lecture · ' + (record.space || record.name || 'Recorded meeting').split('/').pop();
  }
  function meetingDate(record) {
    const raw = record.startTime || record.start_time || '';
    return raw ? new Date(raw).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA');
  }
  function createLectureRecord(title, courseId, date, sourceText, sourceName, method, sourceUrl) {
    const core = root.eduLectureIntelligenceCore;
    if (!core || !root.eduLectureMaterials?.save) throw new Error('Eduvia’s lecture notes module is not ready.');
    const cleaned = core.cleanTranscript(sourceText);
    const result = core.summarizeLecture(cleaned, 8);
    if (!cleaned || !result.keyPoints.length) throw new Error('The transcript did not contain enough readable lecture text to create notes.');
    return {
      id: crypto.randomUUID(),
      name: title,
      courseId: String(courseId || ''),
      lectureDate: date || meetingDate({}),
      sourceUrl: sourceUrl || '',
      text: cleaned,
      keyPoints: result.keyPoints,
      topics: result.topics,
      attachments: [{ name: sourceName || title, type: method, size: 0, characters: cleaned.length }],
      createdAt: Date.now(),
      sentenceCount: result.sentenceCount,
      method
    };
  }
  async function importMeetTranscript(transcriptName, record, silent = false) {
    try {
      if ((data.materials || []).some(item => item?.googleArtifactName === transcriptName)) { if (!silent) notify('This Google Meet transcript is already saved in Eduvia.'); return null; }
      const selectedCourse = document.getElementById('intMeetCourse')?.value || '';
      if (!selectedCourse) throw new Error('Choose a learning area before importing this Meet transcript.');
      const result = await api('/v1/integrations/google/meet/entries?transcript=' + encodeURIComponent(transcriptName));
      const entries = (result.items || []).slice().sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
      const text = entries.map(entry => {
        const time = entry.startTime ? new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return (time ? '[' + time + '] ' : '') + String(entry.text || '').trim();
      }).filter(line => line.trim()).join('\n');
      const courseId = selectedCourse;
      const lecture = createLectureRecord(meetingTitle(record), courseId, meetingDate(record), text, 'Google Meet transcript', 'google-meet-transcript', '');
      lecture.googleArtifactName = transcriptName;
      await root.eduLectureMaterials.save(lecture);
      if (isAutoSummaryEnabled() && state.status?.aiEnabled) await generateLectureSummary(lecture.id, { silent: true });
      if (!silent) notify('Meet transcript imported into Recorded Lectures.');
      return lecture;
    } catch (error) {
      if (!silent) notify(error.message);
      throw error;
    }
  }
  async function transcribeMeetRecording(fileId, name, record, silent = false) {
    try {
      if ((data.materials || []).some(item => item?.googleRecordingFileId === fileId)) { if (!silent) notify('This Google Meet recording is already saved in Eduvia.'); return null; }
      const selectedCourse = document.getElementById('intMeetCourse')?.value || '';
      if (!selectedCourse) throw new Error('Choose a learning area before transcribing this Meet recording.');
      const download = await apiBlob('/v1/integrations/google/drive/download?fileId=' + encodeURIComponent(fileId) + '&transcribe=1');
      const upload = new FormData();
      upload.append('file', new File([download.blob], name || download.name || 'meet-recording.mp4', { type: download.blob.type || 'video/mp4' }));
      const result = await api('/v1/ai/transcribe', { method: 'POST', body: upload });
      const courseId = selectedCourse;
      const lecture = createLectureRecord(meetingTitle(record), courseId, meetingDate(record), result.transcript, name || 'Google Meet recording', 'google-meet-ai-transcription', '');
      lecture.googleRecordingFileId = fileId;
      await root.eduLectureMaterials.save(lecture);
      if (isAutoSummaryEnabled() && state.status?.aiEnabled) await generateLectureSummary(lecture.id, { silent: true });
      if (!silent) notify('Google Meet recording transcribed and saved to Recorded Lectures.');
      return lecture;
    } catch (error) {
      if (!silent) notify(error.message);
      throw error;
    }
  }
  async function generateLectureSummary(id, options = {}) {
    const silent = Boolean(options.silent);
    try {
      const record = await root.eduLectureMaterials?.read(id);
      if (!record) throw new Error('This lecture could not be found on this device.');
      if (record.text.length > 28000) throw new Error('This lecture is too long for one AI summary. Split the transcript into shorter sections.');
      const result = await api('/v1/ai/summary', {
        method: 'POST',
        body: { title: record.name, courseName: courseName(record.courseId), transcript: record.text }
      });
      await root.eduLectureMaterials.update(id, { aiSummary: result.summary, aiSummaryModel: result.model, aiSummaryCreatedAt: result.createdAt });
      if (!silent) {
        notify('AI study guide saved with your lecture.');
        root.eduLectureIntelligence?.openSavedLecture?.(id);
      }
      return result.summary;
    } catch (error) {
      if (!silent) notify(error.message);
      throw error;
    }
  }
  function renderAiSummary(summary) {
    return summary ? '<section class="int-ai-summary"><div class="eyebrow">AI-GENERATED STUDY GUIDE</div><pre>' + esc(summary) + '</pre></section>' : '';
  }
  async function askTutor(courseId, question) {
    const sources = typeof loadCourseText === 'function' ? await loadCourseText(courseId) : [];
    const passages = root.eduCourseIntelligence?.search(sources, question, 5) || [];
    const contexts = passages.map(item => ({ text: item.text, citation: item.citation || item.name }));
    const answer = await api('/v1/ai/tutor', {
      method: 'POST',
      body: {
        courseName: courseName(courseId),
        question,
        history: state.history.slice(-9, -1),
        contexts
      }
    });
    return answer.answer;
  }
  async function submitTutor(form) {
    const questionInput = form.querySelector('textarea[name="question"]');
    const question = String(questionInput?.value || '').trim();
    const courseId = document.getElementById('intTutorCourse')?.value || '';
    if (!question) return;
    if (state.busy) return;
    state.history.push({ role: 'user', content: question });
    questionInput.value = '';
    state.busy = true;
    renderIfCurrent();
    try {
      const answer = await askTutor(courseId, question);
      state.history.push({ role: 'assistant', content: answer });
    } catch (error) {
      state.history.push({ role: 'assistant', content: 'I could not complete that request: ' + error.message });
    } finally {
      state.busy = false;
      renderIfCurrent();
      document.getElementById('intTutorMessages')?.scrollTo({ top: 999999, behavior: 'smooth' });
    }
  }
  function localDateTime(date, time) {
    return date + 'T' + time + ':00';
  }
  function nextWeekdayDate(weekday) {
    const now = new Date();
    const offset = (Number(weekday) - now.getDay() + 7) % 7;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function importGoogleEvent(event) {
    if (!event) return 0;
    if (event.status === 'cancelled') { const before=(data.events||[]).length; data.events=(data.events||[]).filter(item=>!(item.googleCalendarImported&&item.googleEventId===event.id)); return before-data.events.length; }
    if (event.start?.date) return 0;
    const start = new Date(event.start?.dateTime || '');
    const end = new Date(event.end?.dateTime || '');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    const startTime = String(start.getHours()).padStart(2, '0') + ':' + String(start.getMinutes()).padStart(2, '0');
    const endTime = String(end.getHours()).padStart(2, '0') + ':' + String(end.getMinutes()).padStart(2, '0');
    const rules = (event.recurrence || []).join(';');
    const weekly = /FREQ=WEEKLY/i.test(rules);
    if (event.recurrence?.length && !weekly) return 0;
    const byDayMatch = rules.match(/BYDAY=([^;]+)/i);
    const dayMap = {SU:0,MO:1,TU:2,WE:3,TH:4,FR:5,SA:6};
    const days = weekly && byDayMatch ? byDayMatch[1].split(',').map(value => dayMap[value.replace(/^[+-]?\d+/, '')]).filter(value => Number.isInteger(value)) : [start.getDay()];
    let count = 0;
    if (weekly) {
      const allowedDays = new Set(days.length ? days : [start.getDay()]);
      data.events = (data.events || []).filter(item => !(item.googleCalendarImported && item.googleEventId === event.id && !allowedDays.has(Number(item.day))));
    }
    for (const day of (days.length ? days : [start.getDay()])) {
      const date = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
      if (!weekly && (date < new Date().toLocaleDateString('en-CA') || date > new Date(Date.now() + 180 * 86400000).toLocaleDateString('en-CA'))) continue;
      const existing = (data.events || []).find(item => item.googleCalendarImported && item.googleEventId === event.id && Number(item.day) === Number(day));
      if (existing) {
        existing.title = String(event.summary || existing.title).slice(0, 120);
        existing.start = startTime;
        existing.end = endTime;
        existing.date = weekly ? '' : date;
        existing.location = event.location || '';
        count++;
        continue;
      }
      data.events.push({
        id: 'google-' + event.id + '-' + day,
        title: String(event.summary || 'Google Calendar event').slice(0, 120),
        type: 'study',
        courseId: '',
        date: weekly ? '' : date,
        repeatUntil: weekly && /UNTIL=(\d{4})(\d{2})(\d{2})/.test(rules) ? (rules.match(/UNTIL=(\d{4})(\d{2})(\d{2})/).slice(1).join('-')) : '',
        day,
        start: startTime,
        end: endTime,
        location: String(event.location || '').slice(0, 180),
        remind: false,
        duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)),
        oneTime: !weekly,
        source: 'google-calendar',
        googleCalendarImported: true,
        googleEventId: event.id
      });
      count++;
    }
    return count;
  }
  async function importCalendar() {
    try {
      let syncToken = safeGet(CALENDAR_SYNC_KEY);
      let result;
      try {
        result = await api('/v1/integrations/google/calendar/events' + (syncToken ? '?syncToken=' + encodeURIComponent(syncToken) : ''));
      } catch (error) {
        if (error.status !== 410) throw error;
        safeSet(CALENDAR_SYNC_KEY, '');
        result = await api('/v1/integrations/google/calendar/events');
      }
      let count = 0;
      const eventMap = new Map((result.events || []).map(event => [event.id, event]));
      for (const event of eventMap.values()) count += importGoogleEvent(event);
      if (result.nextSyncToken) safeSet(CALENDAR_SYNC_KEY, result.nextSyncToken);
      if (result.moreAvailable) throw new Error('This calendar contains more than 10,000 items. The initial import was partial; ask the Eduvia administrator to raise the sync page limit.');
      save();
      state.calendarMessage = count + ' Google Calendar item' + (count === 1 ? '' : 's') + ' imported or refreshed.';
      renderIfCurrent();
      notify(state.calendarMessage);
    } catch (error) {
      state.calendarMessage = error.message;
      renderIfCurrent();
      notify(error.message);
    }
  }
  async function exportCalendar() {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos';
    const items = (data.events || []).filter(event => !event.googleCalendarImported && event.start && event.end);
    const exports = [];
    const make = (event, date, recurrence) => ({
      eduviaId: String(event.id),
      eduviaType: event.type || 'study',
      summary: String(event.title || 'Eduvia learning session').slice(0, 150),
      description: 'Exported from Eduvia.',
      location: String(event.location || ''),
      start: { dateTime: localDateTime(date, event.start), timeZone: zone },
      end: { dateTime: localDateTime(date, event.end), timeZone: zone },
      recurrence: recurrence || [],
      googleEventId: event.googleEventId || ''
    });
    for (const event of items) {
      if (event.date) {
        exports.push(make(event, event.date, []));
      } else if (Number.isInteger(Number(event.day)) && Number(event.day) >= 0 && Number(event.day) <= 6) {
        exports.push(make(event, nextWeekdayDate(event.day), ['RRULE:FREQ=WEEKLY']));
      }
    }
    for (const exam of data.exams || []) {
      if (!exam.date) continue;
      const startTime = exam.startTime || '09:00';
      const start = new Date('2000-01-01T' + startTime + ':00');
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const endTime = String(end.getHours()).padStart(2, '0') + ':' + String(end.getMinutes()).padStart(2, '0');
      exports.push(make({ id: 'exam-' + exam.id, type: 'exam', title: 'Exam · ' + exam.title, googleEventId: exam.googleEventId || '' }, exam.date, []));
      exports[exports.length - 1].end = { dateTime: localDateTime(exam.date, endTime), timeZone: zone };
    }
    let count = 0;
    for (const event of exports) {
      const result = await api('/v1/integrations/google/calendar/events', { method: 'POST', body: { event } });
      count++;
      const local = (data.events || []).find(item => String(item.id) === event.eduviaId);
      if (local) local.googleEventId = result.id;
      const exam = (data.exams || []).find(item => 'exam-' + item.id === event.eduviaId);
      if (exam) exam.googleEventId = result.id;
    }
    save();
    state.calendarMessage = count + ' Eduvia calendar item' + (count === 1 ? '' : 's') + ' exported or updated in Google Calendar.';
    renderIfCurrent();
    notify(state.calendarMessage);
  }
  function renderIfSamePage() {
    if (currentPage === 'integrations' || currentPage === 'ai-tutor') renderIfCurrent();
  }
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('[data-integration-action]') : null;
    if (!button) return;
    const action = button.dataset.integrationAction;
    if (action === 'connect-google') connectGoogle();
    if (action === 'refresh-status') { state.status = null; syncIntegrationStatus(); }
    if (action === 'disconnect-google') disconnectGoogle();
    if (action === 'pick-drive-file') chooseDriveFile();
    if (action === 'sync-meet') syncMeet();
    if (action === 'import-meet-transcript') {
      const meeting = state.meetings.find(item => item.record.name === button.dataset.record)?.record;
      if (meeting) importMeetTranscript(button.dataset.transcript, meeting);
    }
    if (action === 'transcribe-meet-recording') {
      const meeting = state.meetings.find(item => item.record.name === button.dataset.record)?.record;
      if (meeting) transcribeMeetRecording(button.dataset.fileId, button.dataset.name, meeting);
    }
    if (action === 'calendar-import') importCalendar();
    if (action === 'calendar-export') exportCalendar().catch(error => notify(error.message));
    if (action === 'clear-tutor') { state.history = []; renderIfCurrent(); }
  });
  document.addEventListener('change', event => {
    const toggle = event.target instanceof Element ? event.target.closest('[data-integration-toggle]') : null;
    if (toggle) {
      const key = toggle.dataset.integrationToggle;
      safeSet(key, toggle.checked ? '1' : '0');
      notify(toggle.checked ? 'Preference enabled.' : 'Preference disabled.');
    }
  });
  document.addEventListener('submit', event => {
    if (event.target.id !== 'intTutorForm') return;
    event.preventDefault();
    submitTutor(event.target);
  });
  root.eduPageRenderers = Object.assign(root.eduPageRenderers || {}, {
    integrations: renderIntegrationPage,
    'ai-tutor': renderTutorPage
  });
  const oldMore = root.eduPageRenderers.more;
  if (typeof oldMore === 'function') {
    root.eduPageRenderers.more = function () {
      const markup = oldMore();
      return markup + '<section class="more-tool-section"><div class="more-tool-section-head"><div><span class="eyebrow">CONNECTED LEARNING</span><h2>AI and Google Workspace</h2></div><span>1 tool</span></div><div class="more-tool-grid"><button type="button" class="more-tool-card more-tool-card-purple" data-page="integrations"><span class="more-tool-icon">✦</span><span class="more-tool-copy"><strong>AI & Google Workspace</strong><span>AI tutor, lecture summaries, Google Meet, Drive and Calendar</span></span><span class="more-tool-open">↗</span></button></div></section>';
    };
  }
  const oldAsk = root.eduPageRenderers.ask;
  if (typeof oldAsk === 'function') {
    root.eduPageRenderers.ask = function () {
      return '<section class="panel int-ask-tutor-prompt"><div><div class="eyebrow">NEW · CHATGPT-POWERED LEARNING</div><h2>Need a tutor, not just a search result?</h2><p>Ask questions in natural language and get step-by-step explanations grounded in your saved course materials.</p></div><button class="primary-btn" data-page="ai-tutor" ' + (state.status?.aiEnabled ? '' : '') + '>Open AI Tutor ↗</button></section>' + oldAsk();
    };
  }
  const oldSyncNav = root.syncNav;
  if (typeof oldSyncNav === 'function') {
    root.syncNav = function () {
      oldSyncNav();
      const destination = currentPage === 'ai-tutor' ? 'ask' : currentPage === 'integrations' ? 'my-study' : '';
      if (destination) {
        document.querySelectorAll('.mobile-nav-item[data-page]').forEach(item => item.classList.toggle('active', item.dataset.page === destination));
        const desktopDestination = currentPage === 'ai-tutor' ? 'ask' : 'more';
        document.querySelectorAll('.nav-item[data-page]').forEach(item => item.classList.toggle('active', item.dataset.page === desktopDestination));
        const crumb = document.getElementById('crumbCurrent');
        if (crumb) crumb.textContent = currentPage === 'ai-tutor' ? 'AI Tutor' : 'Integrations';
      }
    };
  }
  root.eduIntegrations = {
    api,
    refreshStatus: syncIntegrationStatus,
    isAutoSummaryEnabled,
    generateLectureSummary,
    renderAiSummary,
    importMeetTranscript,
    transcribeMeetRecording
  };
  const googleStatus = new URLSearchParams(location.search).get('google');
  const googleError = new URLSearchParams(location.search).get('google_error');
  if (googleStatus || googleError) {
    history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(() => notify(googleStatus === 'connected' ? 'Google account connected to this Eduvia device.' : 'Google could not be connected. ' + (googleError === 'consent_denied' ? 'You cancelled the Google permission request.' : 'Check the Google OAuth setup and try again.')), 500);
  }
  if (!state.status) loadStatus(true);
  root.eduPageRenderers = root.eduPageRenderers || {};
  ensureStatus();
  if (typeof root.render === 'function') root.render();
})();
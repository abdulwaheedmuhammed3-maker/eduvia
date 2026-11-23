/* Voice input for class reflections. Raw clips remain in local IndexedDB. */
(function () {
  'use strict';
  const MAX_DURATION_MS = 8 * 60 * 1000;
  const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
  const pending = [];
  let active = null;
  let timer = null;
  const recognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

  function fieldFor(target) {
    return document.getElementById(target === 'learned' ? 'f-learned' : target === 'studyAreas' ? 'f-studyAreas' : 'f-topics');
  }
  function status(message) {
    const element = document.getElementById('voiceReflectionStatus');
    if (element) element.textContent = message;
  }
  function setButtons(recording) {
    const start = document.querySelector('[data-voice-action="start"]');
    const stop = document.querySelector('[data-voice-action="stop"]');
    const discard = document.querySelector('[data-voice-action="discard"]');
    if (start) start.disabled = recording;
    if (stop) stop.disabled = !recording;
    if (discard) discard.hidden = !pending.length;
    const submit = document.querySelector('#activeForm button[type="submit"]');
    if (submit) submit.disabled = recording;
  }
  function safeText(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function revokePendingUrls() {
    pending.forEach(clip => { if (clip.previewUrl) URL.revokeObjectURL(clip.previewUrl); });
  }
  function renderPending() {
    const container = document.getElementById('voiceReflectionClips');
    if (!container) return;
    container.innerHTML = pending.map(clip =>
      '<div class="voice-reflection-clip"><span>' + safeText(clip.label) + ' · ' + Math.max(1, Math.round(clip.durationMs / 1000)) + ' sec</span>' +
      '<audio controls preload="none" data-pending-voice-audio="' + safeText(clip.id) + '"></audio></div>'
    ).join('');
    pending.forEach(clip => {
      const audio = Array.from(container.querySelectorAll('audio[data-pending-voice-audio]')).find(item => item.dataset.pendingVoiceAudio === clip.id);
      if (audio && clip.previewUrl) audio.src = clip.previewUrl;
    });
    setButtons(Boolean(active));
  }
  function chooseMimeType() {
    if (!window.MediaRecorder?.isTypeSupported) return '';
    return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
      .find(type => MediaRecorder.isTypeSupported(type)) || '';
  }
  function finishRecognition(instance) {
    if (active && active.recognition === instance) {
      active.stopRecognition = true;
      if (active.recognitionRestartTimer) clearTimeout(active.recognitionRestartTimer);
    }
    try { instance?.stop(); } catch {}
  }

  function writeTranscriptToField(session, transcript) {
    const formatted = session.target === 'learned'
      ? transcript.replace(/(?<=[.!?])\s+(?=[A-Z0-9])/g, '\n')
      : transcript;
    session.field.value = [session.baseText, formatted].filter(Boolean).join(session.baseText ? '\n' : '');
    session.field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function finishNativeRecognition(session) {
    if (!session?.nativeSpeech) return;
    if (session.nativeSpeechStopPromise) return session.nativeSpeechStopPromise;
    session.nativeSpeechStopPromise = (async () => {
      const speech = session.nativeSpeech;
      try { await speech.setPTTState({ held: false }); } catch {}
      try {
        if (session.nativeSpeechStarted && typeof speech.forceStop === 'function') {
          await speech.forceStop({ timeout: 1200 });
        } else if (session.nativeSpeechStarted) {
          await speech.stop();
        }
      } catch {
        try { await speech.stop(); } catch {}
      }
      for (const handle of session.nativeSpeechListeners || []) {
        try { await handle.remove(); } catch {}
      }
      session.nativeSpeechListeners = [];
      session.nativeSpeechStarted = false;
    })();
    return session.nativeSpeechStopPromise;
  }

  async function startNativeRecognition(session) {
    const speech = window.EduviaNativeSpeechRecognition;
    if (!speech) throw new Error('The Android speech-recognition component is not available in this build.');
    session.nativeSpeech = speech;

    const availability = await speech.available();
    if (active !== session || session.stopRecognition) return;
    if (!availability?.available) {
      throw new Error('This phone does not currently have a speech-recognition service available.');
    }

    const permission = await speech.requestPermissions();
    if (active !== session || session.stopRecognition) return;
    if (permission?.speechRecognition !== 'granted') {
      throw new Error('Microphone permission for speech recognition was not granted.');
    }

    const partialHandle = await speech.addListener('partialResults', event => {
      if (active !== session || session.stopRecognition || session.transcriptionDisabled) return;
      const accumulated = String(event?.accumulated || '').trim();
      const current = Array.isArray(event?.matches) ? String(event.matches[0] || '').trim() : '';
      const transcript = String(event?.accumulatedText || '').trim() || [accumulated, current].filter(Boolean).join(' ').trim();
      if (!transcript) return;
      session.nativeTranscript = transcript;
      writeTranscriptToField(session, transcript);
      status('Recording and transcribing with Android speech recognition…');
    });
    session.nativeSpeechListeners.push(partialHandle);

    const errorHandle = await speech.addListener('error', event => {
      if (active !== session || session.stopRecognition) return;
      const code = String(event?.code || '').toLowerCase();
      if (code.includes('no_match') || code.includes('speech_timeout') || code.includes('no match')) {
        status('Still recording. Speak clearly after a brief pause; any words already recognised are kept.');
        return;
      }
      session.transcriptionDisabled = true;
      status('Android speech recognition paused. Your audio recording continues and is still being saved. Check your phone’s speech-recognition service or use your keyboard microphone.');
    });
    session.nativeSpeechListeners.push(errorHandle);

    const stateHandle = await speech.addListener('listeningState', event => {
      if (active !== session || session.stopRecognition || session.transcriptionDisabled) return;
      const state = event?.state || event?.status;
      if (state === 'started') status('Recording and transcribing with Android speech recognition…');
      else if (state === 'stopped' && event?.reason !== 'userStop') {
        status('Audio recording continues. Android speech recognition is preparing to listen again…');
      }
    });
    session.nativeSpeechListeners.push(stateHandle);

    if (active !== session || session.stopRecognition) return;
    await speech.setPTTState({ held: true });
    if (active !== session || session.stopRecognition) {
      try { await speech.setPTTState({ held: false }); } catch {}
      return;
    }
    session.nativeSpeechStarted = true;
    await speech.start({
      language: navigator.language || 'en-US',
      maxResults: 5,
      popup: false,
      partialResults: true,
      continuousPTT: true,
      muteRecognizerBeep: true
    });
    if (active === session && !session.stopRecognition) {
      status('Recording and transcribing with Android speech recognition. Speak naturally; pause briefly between points.');
    }
  }

  async function start() {
    if (active) return;
    let acquiredStream = null;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      status('Audio recording is not supported here. Open Eduvia in a secure, up-to-date browser and allow microphone access.');
      return;
    }
    const targetSelect = document.getElementById('voiceReflectionTarget');
    const target = targetSelect?.value || 'topics';
    const field = fieldFor(target);
    if (!field) { status('The reflection field is not available.'); return; }

    setButtons(true);
    try {
      acquiredStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const stream = acquiredStream;
      const mimeType = chooseMimeType();
      if (!document.getElementById('voiceReflectionPanel')) { stream.getTracks().forEach(track => track.stop()); return; }
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];
      const startedAt = Date.now();
      const nativeAndroid = Boolean(window.EduviaNative?.isAndroid && window.EduviaNativeSpeechRecognition);
      const Recognition = nativeAndroid ? null : recognitionConstructor;
      const recognition = Recognition ? new Recognition() : null;
      const baseText = String(field.value || '').trim();
      const session = {
        stream, recorder, recognition, chunks, startedAt, target, field, baseText,
        finalTranscript: '', transcriptBeforeRecognition: '', currentRecognitionFinal: '',
        currentRecognitionInterim: '', recognitionRestartTimer: null, stopRecognition: false,
        transcriptionDisabled: false, failed: false, nativeSpeech: null, nativeSpeechListeners: [],
        nativeSpeechStarted: false, nativeSpeechStartPromise: null, nativeSpeechStopPromise: null,
        nativeTranscript: '', stopRequested: false
      };
      active = session;

      recorder.addEventListener('dataavailable', event => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener('error', () => {
        session.failed = true;
        status('The recording was interrupted. Try again; any transcript already received remains in the field.');
      });
      recorder.addEventListener('stop', async () => {
        clearTimeout(timer);
        session.stopRecognition = true;
        finishRecognition(recognition);
        await finishNativeRecognition(session);
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
        const durationMs = Math.max(0, Date.now() - startedAt);
        if (!session.discard && blob.size && blob.size <= MAX_AUDIO_BYTES && !session.failed) {
          const id = 'voice-' + (window.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9));
          const label = target === 'learned' ? 'Key words from the lecture or study' : target === 'studyAreas' ? 'Study areas to review' : 'Topics covered';
          pending.push({ id, blob, target, durationMs, mimeType: blob.type || 'audio/webm', label, createdAt: Date.now(), previewUrl: URL.createObjectURL(blob) });
          status('Voice clip added. You can record another section or save the class reflection. Review the transcript and edit any mistakes.');
        } else if (session.discard) {
          status('Unsubmitted voice recording discarded.');
        } else if (blob.size > MAX_AUDIO_BYTES) {
          status('The audio clip was too large to attach. Your transcript remains in the form; record a shorter section.');
        } else {
          status('No audio clip was saved. Your transcript remains in the form if any speech was recognised.');
        }
        active = null;
        renderPending();
      });

      if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || document.documentElement.lang || 'en-NG';
        const formatTranscript = value => target === 'learned' ? value.replace(/(?<=[.!?])\s+(?=[A-Z0-9])/g, '\n') : value;
        const updateTranscriptField = () => {
          const transcript = [session.transcriptBeforeRecognition, session.currentRecognitionFinal, session.currentRecognitionInterim].filter(Boolean).join(' ');
          field.value = [baseText, formatTranscript(transcript)].filter(Boolean).join(baseText ? '\n' : '');
          field.dispatchEvent(new Event('input', { bubbles: true }));
        };
        recognition.onresult = event => {
          let finalText = '', interimText = '';
          for (let index = 0; index < recognition.results.length; index++) {
            const result = recognition.results[index];
            const text = String(result[0]?.transcript || '').trim();
            if (!text) continue;
            if (result.isFinal) finalText += (finalText ? ' ' : '') + text;
            else interimText += (interimText ? ' ' : '') + text;
          }
          session.currentRecognitionFinal = finalText;
          session.currentRecognitionInterim = interimText;
          session.finalTranscript = [session.transcriptBeforeRecognition, finalText].filter(Boolean).join(' ');
          updateTranscriptField();
          status(interimText ? 'Listening and transcribing…' : 'Recording. Your recognised speech is appearing in the selected field.');
        };
        recognition.onerror = event => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            session.transcriptionDisabled = true;
            status('Microphone access for speech-to-text was denied. The audio recording can still be kept; use your phone keyboard microphone to enter the words.');
          } else if (event.error === 'network') {
            session.transcriptionDisabled = true;
            status('Live transcription lost its network connection. Your audio recording continues and any words already recognised are kept.');
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            session.transcriptionDisabled = true;
            status('Live transcription paused (' + event.error + '). Your audio recording continues.');
          }
        };
        recognition.onend = () => {
          const completedSpeech = session.currentRecognitionFinal || session.currentRecognitionInterim;
          if (completedSpeech) {
            session.transcriptBeforeRecognition = [session.transcriptBeforeRecognition, completedSpeech].filter(Boolean).join(' ');
            session.finalTranscript = session.transcriptBeforeRecognition;
            updateTranscriptField();
          }
          session.currentRecognitionFinal = '';
          session.currentRecognitionInterim = '';
          if (active !== session || session.stopRecognition || session.transcriptionDisabled || recorder.state !== 'recording') return;
          clearTimeout(session.recognitionRestartTimer);
          session.recognitionRestartTimer = setTimeout(() => {
            if (active !== session || session.stopRecognition || session.transcriptionDisabled || recorder.state !== 'recording') return;
            try {
              recognition.start();
            } catch {
              session.transcriptionDisabled = true;
              status('Live transcription stopped in this browser. Your audio recording continues; use your phone keyboard microphone for any remaining words.');
            }
          }, 250);
        };
      }

      recorder.start(1000);
      if (nativeAndroid) {
        session.nativeSpeechStartPromise = startNativeRecognition(session).catch(async error => {
          session.transcriptionDisabled = true;
          await finishNativeRecognition(session);
          if (active === session && !session.stopRecognition) {
            const detail = String(error?.message || '').trim();
            status((detail ? detail + ' ' : 'Live Android transcription could not start. ') +
              'Your audio recording will still be saved. Check that a speech-recognition service is enabled on your phone, or use your keyboard microphone.');
          }
        });
        await session.nativeSpeechStartPromise;
      } else if (recognition) {
        try {
          recognition.start();
          status('Recording and transcribing. Speak naturally; pause briefly between separate learning points.');
        } catch {
          session.transcriptionDisabled = true;
          status('Audio recording started. Live transcription could not start in this browser; use your phone keyboard microphone in the selected field.');
        }
      } else {
        status('Audio recording started. This browser does not support live transcription; use your phone keyboard microphone in the selected field.');
      }
      setButtons(true);
      timer = setTimeout(() => stop(), MAX_DURATION_MS);
    } catch (error) {
      (active?.stream || acquiredStream)?.getTracks?.().forEach(track => track.stop());
      if (active) {
        active.stopRecognition = true;
        await finishNativeRecognition(active);
      }
      active = null;
      setButtons(false);
      const reason = error?.name === 'NotAllowedError' ? 'Allow microphone access in your phone or browser settings, then try again.' :
        error?.name === 'NotFoundError' ? 'No microphone was found on this device.' :
        'Eduvia could not start the microphone. Check microphone access and try again.';
      status(reason);
      setButtons(false);
    }
  }

  async function stop() {
    if (!active || active.stopRequested) return;
    const session = active;
    session.stopRequested = true;
    session.stopRecognition = true;
    status('Finishing the recording…');
    finishRecognition(session.recognition);
    try {
      if (session.nativeSpeechStartPromise) await session.nativeSpeechStartPromise;
      await finishNativeRecognition(session);
      if (session.recorder.state !== 'inactive') session.recorder.stop();
      else {
        session.stream.getTracks().forEach(track => track.stop());
        active = null;
        setButtons(false);
      }
    } catch (error) {
      session.stream.getTracks().forEach(track => track.stop());
      active = null;
      setButtons(false);
      status('The recording could not be completed: ' + (error.message || 'unknown microphone error'));
    }
  }

  function cancel() {
    if (active) {
      const session = active;
      session.discard = true;
      session.stopRecognition = true;
      finishRecognition(session.recognition);
      void finishNativeRecognition(session);
      try { if (session.recorder.state !== 'inactive') session.recorder.stop(); }
      catch { session.stream.getTracks().forEach(track => track.stop()); active = null; }
    }
    clearTimeout(timer);
    revokePendingUrls();
    pending.length = 0;
  }

  function discardLatest() {
    const clip = pending.pop();
    if (clip?.previewUrl) URL.revokeObjectURL(clip.previewUrl);
    renderPending();
    status(clip ? 'Last voice clip discarded. Its transcript remains in the reflection fields.' : 'There is no voice clip to discard.');
  }

  async function attachSavedAudio(metadata) {
    const clips = Array.isArray(metadata) ? metadata : [];
    for (const clip of clips) {
      const element = Array.from(document.querySelectorAll('audio[data-saved-class-audio]')).find(item => item.dataset.savedClassAudio === String(clip.id));
      if (!element) continue;
      try {
        const stored = await getStudioRecord('classAudio', String(clip.id));
        if (stored?.blob) {
          const url = URL.createObjectURL(stored.blob);
          element.src = url;
          element.addEventListener('emptied', () => URL.revokeObjectURL(url), { once: true });
        } else {
          element.replaceWith(Object.assign(document.createElement('span'), { className: 'voice-audio-unavailable', textContent: 'Audio is not on this device. Restore the portable ZIP backup to play it.' }));
        }
      } catch {
        element.replaceWith(Object.assign(document.createElement('span'), { className: 'voice-audio-unavailable', textContent: 'Audio could not be loaded from this device.' }));
      }
    }
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-voice-action]') : null;
    if (!target) return;
    const action = target.dataset.voiceAction;
    if (action === 'start') { start().catch(error => status(error.message || 'Could not start voice recording.')); return; }
    if (action === 'stop') { stop(); return; }
    if (action === 'discard') discardLatest();
  });

  window.EduviaVoiceReflection = {
    getPending: () => pending.map(({ id, blob, target, durationMs, mimeType, createdAt }) => ({ id, blob, target, durationMs, mimeType, createdAt })),
    clearPending: () => { clearTimeout(timer); revokePendingUrls(); pending.length = 0; active = null; renderPending(); },
    cancel,
    attachSavedAudio
  };
  window.addEventListener('pagehide', () => { if (active) stop(); });
})();

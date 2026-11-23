(function (root) {
  'use strict';
  const LIMITS = { light: 1, balanced: 2, intensive: 3 };
  const REVIEW_DAYS = [1, 3, 7, 14, 30];
  function stableId(value) {
    const input = String(value || ''); let hash = 2166136261;
    for (let i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'q-' + (hash >>> 0).toString(36);
  }
  function localISO(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function addDays(dateValue, count) {
    const parts = String(dateValue || '').split('-').map(Number);
    const date = parts.length === 3 && parts.every(Number.isFinite) ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    date.setDate(date.getDate() + Number(count || 0));
    return localISO(date);
  }
  function parseClock(value, fallback) {
    const match = String(value || fallback || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }
  function inClockWindow(minute, start, end) {
    if (start === null || end === null || start === end) return false;
    const value = ((minute % 1440) + 1440) % 1440;
    return start < end ? value >= start && value < end : value >= start || value < end;
  }
  function blockedAt(minute, blocks) {
    return (Array.isArray(blocks) ? blocks : []).some(block => {
      const start = parseClock(block && block.start, ''), end = parseClock(block && block.end, '');
      if (start === null || end === null || start === end) return false;
      const buffer = Math.max(0, Number(block.bufferMinutes ?? 10));
      const from = start - buffer; let to = end + buffer;
      if (to <= from) to += 1440;
      if (from < 0) return minute >= from + 1440 || minute < to;
      if (to > 1440) return minute >= from || minute < to - 1440;
      return minute >= from && minute < to;
    });
  }
  function seedNumber(text) {
    let hash = 2166136261;
    for (const char of String(text)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function randomFor(seed) {
    let state = seedNumber(seed) || 1;
    return function () {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, random) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index--) {
      const next = Math.floor(random() * (index + 1));
      [copy[index], copy[next]] = [copy[next], copy[index]];
    }
    return copy;
  }
  function createSchedule(options) {
    const settings = options || {};
    const now = settings.now instanceof Date ? new Date(settings.now.getTime()) : new Date(settings.now || Date.now());
    const questions = Array.isArray(settings.questions) ? settings.questions : [];
    const frequency = Object.prototype.hasOwnProperty.call(LIMITS, settings.frequency) ? settings.frequency : 'balanced';
    const hourlyLimit = LIMITS[frequency];
    const activeStart = parseClock(settings.activeStart, '09:00');
    const activeEnd = parseClock(settings.activeEnd, '21:00');
    const quietStart = parseClock(settings.quietStart, '21:00');
    const quietEnd = parseClock(settings.quietEnd, '08:00');
    const activeDays = new Set((Array.isArray(settings.days) ? settings.days : [1, 2, 3, 4, 5]).map(Number));
    const output = [];
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (activeStart === null || activeEnd === null || activeStart === activeEnd) return output;
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date(today); day.setDate(today.getDate() + offset);
      if (!activeDays.has(day.getDay())) continue;
      const date = localISO(day);
      let endMinute = activeEnd;
      if (endMinute <= activeStart) endMinute += 1440;
      const blocked = settings.blockedByDate && settings.blockedByDate[date] || [];
      const candidates = [];
      for (let minute = activeStart + 5; minute <= endMinute - 5; minute += 5) {
        if (inClockWindow(minute, quietStart, quietEnd) || blockedAt(minute, blocked)) continue;
        const fireAt = new Date(day); fireAt.setMinutes(minute, 0, 0);
        if (fireAt.getTime() <= now.getTime() + 60000) continue;
        candidates.push({ minute, fireAt: fireAt.getTime() });
      }
      const due = questions.filter(question => question && question.id &&
        (!question.nextReview || String(question.nextReview) <= date) &&
        String(question.prompt || '').trim() && String(question.answer || '').trim());
      const random = randomFor(String(settings.seed || 'eduvia-recall') + ':' + date);
      const orderedQuestions = due.sort((a, b) =>
        String(a.nextReview || '0000-00-00').localeCompare(String(b.nextReview || '0000-00-00')) ||
        Number(a.lastReviewedAt || 0) - Number(b.lastReviewedAt || 0) ||
        Number(b.incorrectCount || 0) - Number(a.incorrectCount || 0) ||
        String(a.id).localeCompare(String(b.id))
      );
      const pickedTimes = [], hourCounts = new Map();
      for (const candidate of shuffle(candidates, random)) {
        const hour = Math.floor(candidate.minute / 60);
        if ((hourCounts.get(hour) || 0) >= hourlyLimit) continue;
        if (pickedTimes.some(item => Math.abs(item.minute - candidate.minute) < 15)) continue;
        pickedTimes.push(candidate); hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      pickedTimes.sort((a, b) => a.fireAt - b.fireAt);
      const ordered = shuffle(orderedQuestions, random);
      const count = Math.min(pickedTimes.length, ordered.length);
      for (let index = 0; index < count; index++) {
        const question = ordered[index];
        output.push({ id: 'recall:' + date + ':' + String(question.id), questionId: String(question.id), date, fireAt: pickedTimes[index].fireAt });
      }
    }
    return output.sort((a, b) => a.fireAt - b.fireAt);
  }
  function reviewResult(level, remembered, fromDate) {
    const nextLevel = remembered ? Math.min(5, Math.max(0, Number(level) || 0) + 1) : 0;
    const days = remembered ? REVIEW_DAYS[Math.max(0, nextLevel - 1)] : 1;
    return { level: nextLevel, days, nextReview: addDays(fromDate, days) };
  }
  const api = { LIMITS, REVIEW_DAYS, stableId, addDays, parseClock, createSchedule, reviewResult };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EduviaRecallCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

const test = require('node:test');
const assert = require('node:assert/strict');
const recall = require('../recall-core.js');

test('Recall schedule is deterministic for the same learner settings and date', () => {
  const questions = Array.from({ length: 40 }, (_, index) => ({ id: 'q-' + index, prompt: 'Question ' + index + '?', answer: 'Answer', nextReview: '2026-11-23' }));
  const options = { questions, now: new Date(2026, 10, 23, 7, 0), frequency: 'intensive', activeStart: '09:00', activeEnd: '21:00', quietStart: '21:00', quietEnd: '08:00', days: [1, 2, 3, 4, 5], seed: 'stable-seed' };
  assert.deepEqual(recall.createSchedule(options), recall.createSchedule(options));
});

test('Recall respects daily frequency, selected days, quiet hours and the two-per-hour cap', () => {
  const questions = Array.from({ length: 40 }, (_, index) => ({ id: 'q-' + index, prompt: 'Question ' + index + '?', answer: 'Answer', nextReview: '2026-11-23' }));
  const schedule = recall.createSchedule({ questions, now: new Date(2026, 10, 23, 7, 0), frequency: 'intensive', activeStart: '09:00', activeEnd: '21:00', quietStart: '20:00', quietEnd: '08:00', days: [1, 2, 3, 4, 5], seed: 'limit-seed' });
  const byDate = new Map();
  for (const item of schedule) {
    byDate.set(item.date, (byDate.get(item.date) || 0) + 1);
    const time = new Date(item.fireAt);
    assert.ok(time.getHours() >= 8 && time.getHours() < 20);
    assert.ok([1, 2, 3, 4, 5].includes(time.getDay()));
  }
  for (const count of byDate.values()) assert.ok(count <= 6);
  const hourly = new Map();
  for (const item of schedule) { const date = new Date(item.fireAt); const key = item.date + ':' + date.getHours(); hourly.set(key, (hourly.get(key) || 0) + 1); }
  for (const count of hourly.values()) assert.ok(count <= 2);
});

test('Recall avoids scheduled class blocks and does not repeat a question in its seven-day queue', () => {
  const questions = Array.from({ length: 40 }, (_, index) => ({ id: 'q-' + index, prompt: 'Question ' + index + '?', answer: 'Answer', nextReview: '2026-11-23' }));
  const blockedByDate = { '2026-11-23': [{ start: '09:00', end: '12:00', bufferMinutes: 10 }] };
  const schedule = recall.createSchedule({ questions, now: new Date(2026, 10, 23, 7, 0), frequency: 'balanced', activeStart: '09:00', activeEnd: '21:00', quietStart: '21:00', quietEnd: '08:00', days: [1, 2, 3, 4, 5], blockedByDate, seed: 'class-block' });
  const ids = schedule.map(item => item.questionId);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of schedule.filter(item => item.date === '2026-11-23')) {
    const time = new Date(item.fireAt);
    assert.ok(time.getHours() > 12 || (time.getHours() === 12 && time.getMinutes() >= 10));
  }
});

test('Recall review intervals lengthen when remembered and reset after a missed answer', () => {
  assert.deepEqual(recall.reviewResult(0, true, '2026-11-23'), { level: 1, days: 1, nextReview: '2026-11-24' });
  assert.deepEqual(recall.reviewResult(1, true, '2026-11-23'), { level: 2, days: 3, nextReview: '2026-11-26' });
  assert.deepEqual(recall.reviewResult(4, true, '2026-11-23'), { level: 5, days: 30, nextReview: '2026-12-23' });
  assert.deepEqual(recall.reviewResult(4, false, '2026-11-23'), { level: 0, days: 1, nextReview: '2026-11-24' });
});

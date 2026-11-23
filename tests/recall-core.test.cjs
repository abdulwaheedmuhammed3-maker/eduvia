const test = require('node:test');
const assert = require('node:assert/strict');
const recall = require('../recall-core.js');

function questions(count, date = '2026-11-23') {
  return Array.from({ length: count }, (_, index) => ({
    id: 'q-' + index, prompt: 'Question ' + index + '?', answer: 'Answer ' + index, nextReview: date
  }));
}

test('Recall schedule is deterministic for the same learner settings and date', () => {
  const options = {
    questions: questions(80), now: new Date(2026, 10, 23, 7, 0), frequency: 'intensive',
    activeStart: '09:00', activeEnd: '21:00', quietStart: '21:00', quietEnd: '08:00',
    days: [1, 2, 3, 4, 5], seed: 'stable-seed'
  };
  assert.deepEqual(recall.createSchedule(options), recall.createSchedule(options));
});

test('Recall offers 1, 2 or 3 random questions per active hour, never exceeding 3', () => {
  const expected = [['light', 1], ['balanced', 2], ['intensive', 3]];
  for (const [frequency, perHour] of expected) {
    const schedule = recall.createSchedule({
      questions: questions(40), now: new Date(2026, 10, 23, 7, 0), frequency,
      activeStart: '09:00', activeEnd: '12:00', quietStart: '21:00', quietEnd: '08:00',
      days: [1], seed: 'hourly-' + frequency
    });
    const byHour = new Map();
    for (const item of schedule) {
      const time = new Date(item.fireAt);
      const hour = time.getHours();
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
      assert.equal(item.date, '2026-11-23');
      assert.ok([9, 10, 11].includes(hour));
    }
    for (const hour of [9, 10, 11]) assert.equal(byHour.get(hour), perHour);
    for (const count of byHour.values()) assert.ok(count <= 3);
  }
});

test('Recall respects selected days, quiet hours and avoids scheduled class blocks', () => {
  const schedule = recall.createSchedule({
    questions: questions(80), now: new Date(2026, 10, 23, 7, 0), frequency: 'intensive',
    activeStart: '09:00', activeEnd: '21:00', quietStart: '20:00', quietEnd: '08:00',
    days: [1, 2, 3, 4, 5],
    blockedByDate: { '2026-11-23': [{ start: '09:00', end: '12:00', bufferMinutes: 10 }] },
    seed: 'class-block'
  });
  const byDate = new Map(), hourly = new Map();
  for (const item of schedule) {
    const time = new Date(item.fireAt);
    assert.ok([1, 2, 3, 4, 5].includes(time.getDay()));
    assert.ok(time.getHours() >= 8 && time.getHours() < 20);
    byDate.set(item.date, (byDate.get(item.date) || 0) + 1);
    const key = item.date + ':' + time.getHours();
    hourly.set(key, (hourly.get(key) || 0) + 1);
    if (item.date === '2026-11-23') {
      assert.ok(time.getHours() > 12 || (time.getHours() === 12 && time.getMinutes() >= 10));
    }
  }
  for (const count of hourly.values()) assert.ok(count <= 3);
});

test('Recall review intervals lengthen when remembered and reset after a missed answer', () => {
  assert.deepEqual(recall.reviewResult(0, true, '2026-11-23'), { level: 1, days: 1, nextReview: '2026-11-24' });
  assert.deepEqual(recall.reviewResult(1, true, '2026-11-23'), { level: 2, days: 3, nextReview: '2026-11-26' });
  assert.deepEqual(recall.reviewResult(4, true, '2026-11-23'), { level: 5, days: 30, nextReview: '2026-12-23' });
  assert.deepEqual(recall.reviewResult(4, false, '2026-11-23'), { level: 0, days: 1, nextReview: '2026-11-24' });
});

test('an unanswered question is scheduled again on each following active day until rated', () => {
  const schedule = recall.createSchedule({
    questions: [{ id: 'q-single', prompt: 'What did you learn?', answer: 'The answer', nextReview: '2026-11-23' }],
    now: new Date(2026, 10, 23, 7, 0), frequency: 'balanced',
    activeStart: '09:00', activeEnd: '21:00', quietStart: '21:00', quietEnd: '08:00',
    days: [1, 2, 3, 4, 5], seed: 'repeat-unanswered'
  });
  assert.deepEqual(schedule.map(item => item.date), ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']);
  assert.ok(schedule.every(item => item.questionId === 'q-single'));
});

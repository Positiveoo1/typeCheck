import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatProgressLabel,
  getDailyProgress,
  getDayKey,
  getStreaks,
  getTodayProgress,
  GOAL_CELEBRATED_KEY,
  loadCelebratedDay,
  normalizeDailyGoal,
  saveCelebratedDay,
  shiftDayKey
} from './dailyProgress.js';

// Local-time dates so tests are timezone independent.
const at = (month, day, hour = 12) => new Date(2026, month - 1, day, hour, 0, 0).getTime();
const NOW = at(11, 20, 15);
const test = (month, day, elapsedSeconds = 30, hour = 12) => ({
  createdAt: at(month, day, hour),
  elapsedSeconds
});
const testsOn = (month, day, count, elapsedSeconds = 30) =>
  Array.from({ length: count }, (_, index) => test(month, day, elapsedSeconds, 8 + index));

describe('normalizeDailyGoal', () => {
  it('clamps and falls back per goal type', () => {
    assert.deepEqual(normalizeDailyGoal({}), { type: 'tests', value: 5 });
    assert.deepEqual(normalizeDailyGoal({ type: 'minutes' }), { type: 'minutes', value: 10 });
    assert.deepEqual(normalizeDailyGoal({ type: 'tests', value: 999 }), { type: 'tests', value: 50 });
    assert.deepEqual(normalizeDailyGoal({ type: 'minutes', value: 0 }), { type: 'minutes', value: 1 });
    assert.deepEqual(normalizeDailyGoal({ type: 'minutes', value: 500 }), { type: 'minutes', value: 120 });
    assert.deepEqual(normalizeDailyGoal({ type: 'bogus', value: 'x' }), { type: 'tests', value: 5 });
    assert.deepEqual(normalizeDailyGoal({ type: 'tests', value: 3.6 }), { type: 'tests', value: 4 });
  });
});

describe('day helpers', () => {
  it('formats local day keys and shifts across month boundaries', () => {
    assert.equal(getDayKey(at(3, 5)), '2026-03-05');
    assert.equal(getDayKey('nope'), null);
    assert.equal(getDayKey(null), null);
    assert.equal(shiftDayKey('2026-03-01', -1), '2026-02-28');
    assert.equal(shiftDayKey('2026-12-31', 1), '2027-01-01');
  });
});

describe('getTodayProgress', () => {
  it('counts only today, in tests', () => {
    const results = [...testsOn(11, 20, 2), ...testsOn(11, 19, 4)];
    const progress = getTodayProgress(results, { type: 'tests', value: 5 }, NOW);

    assert.equal(progress.tests, 2);
    assert.equal(progress.current, 2);
    assert.equal(progress.fraction, 0.4);
    assert.equal(progress.met, false);
  });

  it('counts minutes and meets the goal', () => {
    const results = [test(11, 20, 300), test(11, 20, 300)];
    const progress = getTodayProgress(results, { type: 'minutes', value: 10 }, NOW);

    assert.equal(progress.minutes, 10);
    assert.equal(progress.met, true);
    assert.equal(progress.fraction, 1);
  });

  it('handles empty input', () => {
    const progress = getTodayProgress([], undefined, NOW);
    assert.equal(progress.current, 0);
    assert.equal(progress.met, false);
  });
});

describe('getStreaks', () => {
  const goal = { type: 'tests', value: 2 };

  it('counts consecutive goal-met days ending today', () => {
    const results = [...testsOn(11, 20, 2), ...testsOn(11, 19, 3), ...testsOn(11, 18, 2)];
    assert.deepEqual(getStreaks(results, goal, NOW), { current: 3, best: 3 });
  });

  it('keeps the streak alive through yesterday when today is not met yet', () => {
    const results = [...testsOn(11, 20, 1), ...testsOn(11, 19, 2), ...testsOn(11, 18, 2)];
    assert.equal(getStreaks(results, goal, NOW).current, 2);
  });

  it('resets when yesterday was missed', () => {
    const results = [...testsOn(11, 20, 2), ...testsOn(11, 18, 2), ...testsOn(11, 17, 2)];
    const streaks = getStreaks(results, goal, NOW);
    assert.equal(streaks.current, 1);
    assert.equal(streaks.best, 2);
  });

  it('does not count days that miss the goal', () => {
    const results = [...testsOn(11, 19, 1), ...testsOn(11, 18, 2)];
    assert.equal(getStreaks(results, goal, NOW).current, 0);
  });

  it('tracks best streak across gaps and month boundaries', () => {
    const results = [
      ...testsOn(10, 30, 2),
      ...testsOn(10, 31, 2),
      ...testsOn(11, 1, 2),
      ...testsOn(11, 2, 2),
      ...testsOn(11, 19, 2)
    ];
    assert.deepEqual(getStreaks(results, goal, NOW), { current: 1, best: 4 });
  });

  it('supports minute goals', () => {
    const results = [test(11, 20, 600), test(11, 19, 300), test(11, 19, 300)];
    assert.equal(getStreaks(results, { type: 'minutes', value: 10 }, NOW).current, 2);
  });
});

describe('getDailyProgress / label', () => {
  it('combines progress and streak into an accessible label', () => {
    const results = [...testsOn(11, 20, 2), ...testsOn(11, 19, 5), ...testsOn(11, 18, 5)];
    const progress = getDailyProgress(results, { type: 'tests', value: 5 }, NOW);

    assert.equal(progress.currentStreak, 2);
    assert.equal(progress.bestStreak, 2);
    assert.equal(formatProgressLabel(progress), '2 days streak, 2 of 5 tests today');
    assert.equal(
      formatProgressLabel({ ...progress, currentStreak: 1, goalType: 'minutes', goalValue: 10, current: 3 }),
      '1 day streak, 3 of 10 minutes today'
    );
  });
});

describe('celebration storage', () => {
  it('round trips through injected storage and tolerates failures', () => {
    const values = new Map();
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    };

    assert.equal(loadCelebratedDay(storage), null);
    saveCelebratedDay('2026-11-20', storage);
    assert.equal(values.get(GOAL_CELEBRATED_KEY), '2026-11-20');
    assert.equal(loadCelebratedDay(storage), '2026-11-20');

    const broken = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      }
    };
    assert.equal(loadCelebratedDay(broken), null);
    assert.doesNotThrow(() => saveCelebratedDay('x', broken));
  });
});

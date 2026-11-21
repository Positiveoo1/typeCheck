import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDailyChallengeText,
  formatDailyResetCountdown,
  getDailyChallengeKey,
  getMsUntilDailyReset,
  getResultDailyKey,
  loadDailyDone,
  recordDailyDone
} from './dailyChallenge.js';
import { buildShareText } from './shareCard.js';
import {
  buildTrainingTarget,
  getEffectiveTestConfig,
  getTrainingModeIds,
  shouldExtendTarget
} from './trainingModes.js';
import { getModeLabel } from './typingLogic.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value))
  };
}

describe('daily challenge', () => {
  it('uses the UTC calendar date as the key', () => {
    assert.equal(getDailyChallengeKey(new Date('2026-11-21T00:00:00Z')), '2026-11-21');
    assert.equal(getDailyChallengeKey(new Date('2026-11-21T23:59:59.999Z')), '2026-11-21');
    assert.equal(getDailyChallengeKey(new Date('2026-11-22T00:00:00Z')), '2026-11-22');
    // 23:30 in New York on the 21st is already the 22nd in UTC.
    assert.equal(getDailyChallengeKey(new Date('2026-11-21T23:30:00-05:00')), '2026-11-22');
  });

  it('builds the same 40-word text for the same day and language', () => {
    const first = buildDailyChallengeText({ dateKey: '2026-11-21', language: 'english' });
    const second = buildDailyChallengeText({ dateKey: '2026-11-21', language: 'english' });
    assert.equal(first, second);
    assert.equal(first.split(' ').length, 40);
  });

  it('builds different texts for different days and languages', () => {
    const today = buildDailyChallengeText({ dateKey: '2026-11-21' });
    assert.notEqual(today, buildDailyChallengeText({ dateKey: '2026-11-22' }));
    assert.notEqual(today, buildDailyChallengeText({ dateKey: '2026-11-21', language: 'french' }));
  });

  it('switches text exactly at UTC midnight', () => {
    const before = buildTrainingTarget({
      language: 'english',
      now: new Date('2026-11-21T23:59:59Z'),
      trainingMode: 'daily'
    });
    const after = buildTrainingTarget({
      language: 'english',
      now: new Date('2026-11-22T00:00:01Z'),
      trainingMode: 'daily'
    });
    assert.equal(before, buildDailyChallengeText({ dateKey: '2026-11-21' }));
    assert.equal(after, buildDailyChallengeText({ dateKey: '2026-11-22' }));
  });

  it('ignores the selected time/word setting and never extends the target', () => {
    assert.ok(getTrainingModeIds().includes('daily'));
    assert.deepEqual(
      getEffectiveTestConfig({ testType: 'time', testValue: 60, trainingMode: 'daily' }),
      { testType: 'words', testValue: 40 }
    );
    const text = buildTrainingTarget({
      dateKey: '2026-11-21',
      testType: 'time',
      testValue: 15,
      trainingMode: 'daily'
    });
    assert.equal(text.split(' ').length, 40);
    assert.equal(
      shouldExtendTarget({ targetText: 'a b', testType: 'time', trainingMode: 'daily', typedLength: 2 }),
      false
    );
  });

  it('labels daily results with the day', () => {
    assert.equal(getModeLabel('words', 40, 'daily', 'english', '2026-11-21'), 'daily 2026-11-21');
    assert.equal(getResultDailyKey({ modeLabel: 'daily 2026-11-21' }), '2026-11-21');
    assert.equal(getResultDailyKey({ modeLabel: '40 words' }), null);
  });

  it('counts down to the next UTC midnight', () => {
    const ms = getMsUntilDailyReset(new Date('2026-11-21T21:30:00Z'));
    assert.equal(ms, 2.5 * 60 * 60 * 1000);
    assert.equal(formatDailyResetCountdown(ms), '2h 30m');
  });

  it('tracks local completion with the best wpm of the day', () => {
    const storage = createMemoryStorage();
    const now = new Date('2026-11-21T10:00:00Z');
    assert.equal(loadDailyDone({ now, storage }), null);

    recordDailyDone({ modeLabel: 'daily 2026-11-21', wpm: 70 }, { now, storage });
    recordDailyDone({ modeLabel: 'daily 2026-11-21', wpm: 64 }, { now, storage });
    assert.deepEqual(loadDailyDone({ now, storage }), {
      attempts: 2,
      bestWpm: 70,
      dateKey: '2026-11-21'
    });

    // Tomorrow the record no longer counts.
    assert.equal(loadDailyDone({ now: new Date('2026-11-22T00:00:01Z'), storage }), null);
  });

  it('mentions the day in the share text', () => {
    assert.match(
      buildShareText({
        accuracy: 98,
        dailyRank: 3,
        modeLabel: 'daily 2026-11-21',
        trainingMode: 'daily',
        wpm: 88
      }),
      /^TypeCheck Daily 2026-11-21: 88 WPM at 98% accuracy, rank #3 today/
    );
  });
});

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

// functions/verify.js is CommonJS with no firebase dependencies, so the
// Cloud Function's validation logic can be tested here directly.
const require = createRequire(import.meta.url);
const {
  analyzeKeystrokeLog,
  buildModeLabel,
  countHistoricalMistakes,
  verifySubmission
} = require('../functions/verify.js');

function buildLog(text, msPerChar = 200, startT = 0) {
  const log = [{ len: 0, t: startT }];
  for (let index = 1; index <= text.length; index += 1) {
    log.push({ code: 'KeyA', t: startT + index * msPerChar, text: text.slice(0, index) });
  }
  return log;
}

const WORDS_10 = 'one two three four five six seven eight nine ten';

function wordsSubmission(overrides = {}) {
  return {
    keystrokeLog: buildLog(WORDS_10),
    language: 'english',
    targetText: WORDS_10,
    testType: 'words',
    testValue: 10,
    trainingMode: 'standard',
    typedText: WORDS_10,
    ...overrides
  };
}

describe('submitResult verification helpers', () => {
  it('accepts the engine log format and derives lengths from text', () => {
    const result = analyzeKeystrokeLog(buildLog('hello'), 'hello');
    assert.equal(result.finalSeconds, 1);
    assert.equal(result.eventCount, 6);
  });

  it('still accepts the legacy { t, len } format for empty runs', () => {
    assert.equal(analyzeKeystrokeLog([{ len: 0, t: 0 }], '').finalSeconds, 0);
  });

  it('requires the final log text to equal typedText', () => {
    assert.throws(() => analyzeKeystrokeLog(buildLog('hellp'), 'hello'), /does not end/);
  });

  it('rejects paste bursts and non-chronological logs', () => {
    const burst = [...buildLog('hello wo'), { t: 1610, text: 'hello world' }];
    assert.throws(() => analyzeKeystrokeLog(burst, 'hello world'), /burst/);
    const log = buildLog('hello');
    log[2].t = 1;
    assert.throws(() => analyzeKeystrokeLog(log, 'hello'), /chronological/);
  });

  it('counts corrected mistakes from text snapshots', () => {
    const log = [
      { len: 0, t: 0 },
      { t: 100, text: 'h' },
      { t: 200, text: 'hx' },
      { t: 300, text: 'h' },
      { t: 400, text: 'he' }
    ];
    assert.equal(countHistoricalMistakes('hello', log), 1);
  });

  it('builds mode labels like the client', () => {
    assert.equal(buildModeLabel({ language: 'english', testType: 'time', testValue: 30, trainingMode: 'standard' }), '30s');
    assert.equal(buildModeLabel({ language: 'french', testType: 'words', testValue: 10, trainingMode: 'standard' }), 'french 10 words');
    assert.equal(buildModeLabel({ language: 'english', testType: 'time', testValue: 60, trainingMode: 'accuracy-lock' }), 'accuracy lock 60s');
    assert.equal(buildModeLabel({ dailyKey: '2026-11-21', testType: 'words', testValue: 40, trainingMode: 'daily' }), 'daily 2026-11-21');
  });

  it('recomputes stats for a valid words test', () => {
    const verified = verifySubmission(wordsSubmission());
    assert.equal(verified.modeLabel, '10 words');
    assert.equal(verified.accuracy, 100);
    assert.equal(verified.elapsedSeconds, (WORDS_10.length * 200) / 1000);
    assert.equal(verified.wpm, Math.round(WORDS_10.length / 5 / (verified.elapsedSeconds / 60)));
    assert.equal(verified.isLeaderboardEligible, true);
  });

  it('rejects words tests whose target does not match testValue', () => {
    assert.throws(() => verifySubmission(wordsSubmission({ testValue: 30 })), /word count/);
  });

  it('checks timed-test duration against the log', () => {
    const text = 'abc def ghi jkl mno pqr stu vwx yz';
    const base = {
      language: 'english',
      targetText: `${text} more words here`,
      testType: 'time',
      testValue: 15,
      trainingMode: 'standard',
      typedText: text
    };
    const verified = verifySubmission({ ...base, keystrokeLog: buildLog(text, 300) });
    assert.equal(verified.elapsedSeconds, 15);
    assert.throws(
      () => verifySubmission({ ...base, keystrokeLog: buildLog(text, 600) }),
      /Elapsed time/
    );
  });

  it('rejects custom texts and stale daily keys', () => {
    assert.throws(() => verifySubmission(wordsSubmission({ trainingMode: 'custom' })), /Custom/);
    assert.throws(
      () =>
        verifySubmission(
          wordsSubmission({ dailyKey: '2026-11-19', testValue: 40, trainingMode: 'daily' }),
          { now: new Date('2026-11-21T12:00:00Z') }
        ),
      /expired/
    );
  });
});

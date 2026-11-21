import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkResultPlausibility, isPlausibleResult } from './resultPlausibility.js';

// Builds an engine-shaped keystroke log: { t: 0, len: 0 } followed by one
// `{ t, text }` snapshot per typed character, msPerChar apart.
function buildLog(text, msPerChar = 200) {
  const log = [{ len: 0, t: 0 }];
  for (let index = 1; index <= text.length; index += 1) {
    log.push({ code: 'KeyA', t: index * msPerChar, text: text.slice(0, index) });
  }
  return log;
}

function buildResult(overrides = {}) {
  const typedText = overrides.typedText ?? 'the quick brown fox jumps over the lazy dog '.repeat(3);
  const keystrokeLog = overrides.keystrokeLog ?? buildLog(typedText);
  return {
    accuracy: 97,
    elapsedSeconds: 30,
    keystrokeLog,
    typedText,
    wpm: 60,
    ...overrides
  };
}

describe('result plausibility', () => {
  it('accepts a normal human-paced run', () => {
    assert.deepEqual(checkResultPlausibility(buildResult()), { ok: true });
    assert.equal(isPlausibleResult(buildResult()), true);
  });

  it('rejects out-of-range wpm, low accuracy and too-short runs', () => {
    assert.equal(checkResultPlausibility(buildResult({ wpm: 301 })).reason, 'wpm-out-of-range');
    assert.equal(checkResultPlausibility(buildResult({ accuracy: 49 })).reason, 'low-accuracy');
    assert.equal(checkResultPlausibility(buildResult({ elapsedSeconds: 4 })).reason, 'too-short');
  });

  it('rejects a missing or sparse keystroke log', () => {
    assert.equal(checkResultPlausibility(buildResult({ keystrokeLog: [] })).reason, 'missing-log');
    const typedText = 'a'.repeat(100);
    const sparseLog = [{ len: 0, t: 0 }, { t: 20000, text: typedText }];
    assert.equal(
      checkResultPlausibility(buildResult({ keystrokeLog: sparseLog, typedText })).reason,
      'too-few-events'
    );
  });

  it('rejects paste-like bursts', () => {
    const typedText = 'hello world';
    const log = [...buildLog('hello'), { t: 1010, text: typedText }];
    // Pad with enough events to pass the coverage check.
    assert.equal(
      checkResultPlausibility(buildResult({ keystrokeLog: log, typedText })).reason,
      'paste-burst'
    );
  });

  it('allows deleting several characters at once (ctrl+backspace)', () => {
    const log = [
      ...buildLog('hello wor'),
      { t: 1801, text: 'hello ' },
      ...buildLog('hello world').slice(7).map((event) => ({ ...event, t: event.t + 2000 }))
    ];
    const result = buildResult({ keystrokeLog: log, typedText: 'hello world' });
    assert.equal(checkResultPlausibility(result).ok, true);
  });

  it('rejects non-chronological logs and logs that disagree with typed text', () => {
    const log = buildLog('hello world');
    log[3] = { ...log[3], t: 1 };
    assert.equal(
      checkResultPlausibility(buildResult({ keystrokeLog: log, typedText: 'hello world' })).reason,
      'not-chronological'
    );
    assert.equal(
      checkResultPlausibility(
        buildResult({ keystrokeLog: buildLog('hello worl'), typedText: 'hello world' })
      ).reason,
      'log-mismatch'
    );
  });

  it('rejects inhuman sustained speed', () => {
    // 20ms per char = 600 wpm, sustained for several seconds.
    const typedText = 'x'.repeat(300);
    const result = buildResult({ keystrokeLog: buildLog(typedText, 20), typedText });
    assert.equal(checkResultPlausibility(result).reason, 'sustained-speed');
  });

  it('tolerates short fast bursts inside an otherwise normal run', () => {
    const slow = buildLog('a'.repeat(40), 250);
    const lastT = slow.at(-1).t;
    const burst = [];
    for (let index = 1; index <= 8; index += 1) {
      burst.push({ t: lastT + index * 30, text: 'a'.repeat(40 + index) });
    }
    const typedText = 'a'.repeat(48);
    const result = buildResult({ keystrokeLog: [...slow, ...burst], typedText });
    assert.equal(checkResultPlausibility(result).ok, true);
  });
});

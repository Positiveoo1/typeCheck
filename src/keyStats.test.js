import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPersonalDrill,
  extractRunKeyStats,
  getSlowBigrams,
  getWeakKeys,
  mergeKeyStats
} from './keyStats.js';
import { buildTrainingTarget } from './trainingModes.js';

function logFor(texts, step = 200) {
  return [{ t: 0, len: 0 }, ...texts.map((text, i) => ({ t: (i + 1) * step, text, code: 'x' }))];
}

describe('extractRunKeyStats', () => {
  it('counts first attempts, errors, and ignores corrections', () => {
    const stats = extractRunKeyStats({
      targetText: 'cat',
      keystrokeLog: logFor(['c', 'ca', 'cax', 'ca', 'cat'])
    });

    assert.deepEqual(stats.chars.c, { attempts: 1, errors: 0 });
    assert.deepEqual(stats.chars.t, { attempts: 1, errors: 1 });
    assert.deepEqual(stats.bigrams.ca, { count: 1, totalMs: 200 });
    assert.equal(stats.bigrams.at, undefined);
  });

  it('skips spaces and pauses over 2000ms', () => {
    const stats = extractRunKeyStats({
      targetText: 'ab cd',
      keystrokeLog: [
        { t: 0, len: 0 },
        { t: 100, text: 'a' },
        { t: 2500, text: 'ab' },
        { t: 2600, text: 'ab ' },
        { t: 2700, text: 'ab c' },
        { t: 2800, text: 'ab cd' }
      ]
    });

    assert.equal(stats.bigrams.ab, undefined);
    assert.equal(stats.bigrams.cd.count, 1);
    assert.equal(stats.chars[' '], undefined);
  });

  it('handles missing logs', () => {
    assert.deepEqual(extractRunKeyStats({ targetText: 'a' }), { chars: {}, bigrams: {} });
  });
});

describe('mergeKeyStats', () => {
  it('decays old counts and caps bigrams', () => {
    const stored = {
      chars: { a: { attempts: 100, errors: 10 } },
      bigrams: { ab: { count: 10, totalMs: 1000 }, cd: { count: 1, totalMs: 100 } }
    };
    const run = {
      chars: { a: { attempts: 10, errors: 1 } },
      bigrams: { ab: { count: 2, totalMs: 200 } }
    };
    const merged = mergeKeyStats(stored, run, { maxBigrams: 1 });

    assert.ok(Math.abs(merged.chars.a.attempts - 100) < 1e-9);
    assert.ok(Math.abs(merged.chars.a.errors - 10) < 1e-9);
    assert.deepEqual(Object.keys(merged.bigrams), ['ab']);
    assert.ok(Math.abs(merged.bigrams.ab.count - 11) < 1e-9);
  });
});

describe('getWeakKeys / getSlowBigrams', () => {
  it('does not over-weight letters with few attempts', () => {
    const keys = getWeakKeys({
      chars: {
        q: { attempts: 1, errors: 1 },
        z: { attempts: 100, errors: 30 },
        a: { attempts: 100, errors: 0 }
      }
    });

    assert.equal(keys[0].key, 'z');
    assert.ok(!keys.some((entry) => entry.key === 'a'));
  });

  it('ranks bigrams relative to the median', () => {
    const slow = getSlowBigrams({
      bigrams: {
        ab: { count: 4, totalMs: 400 },
        cd: { count: 4, totalMs: 400 },
        ef: { count: 4, totalMs: 1200 },
        gh: { count: 1, totalMs: 5000 }
      }
    });

    assert.deepEqual(slow.map((entry) => entry.bigram), ['ef']);
    assert.equal(slow[0].ratio, 3);
  });
});

describe('buildPersonalDrill', () => {
  const wordList = ['zip', 'zoo', 'apple', 'table', 'chair', 'river'];
  const stats = {
    chars: { z: { attempts: 150, errors: 60 }, a: { attempts: 150, errors: 0 } },
    bigrams: {}
  };

  it('falls back to the fallback list without enough data', () => {
    const drill = buildPersonalDrill({
      stats: { chars: { z: { attempts: 5, errors: 5 } }, bigrams: {} },
      wordList,
      fallbackWords: ['fallback'],
      wordCount: 3,
      random: () => 0
    });

    assert.equal(drill, 'fallback fallback fallback');
  });

  it('favours words with weak letters and returns the requested count', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const words = buildPersonalDrill({ stats, wordList, wordCount: 200, random }).split(' ');
    const zWords = words.filter((word) => word.includes('z')).length;

    assert.equal(words.length, 200);
    assert.ok(zWords > 120);
  });

  it('weak training mode uses key stats and stays pure', () => {
    const options = { random: () => 0.5, testType: 'words', testValue: 10, trainingMode: 'weak' };
    const first = buildTrainingTarget({ ...options, keyStats: stats });
    const second = buildTrainingTarget({ ...options, keyStats: stats });
    const fallback = buildTrainingTarget({ ...options, random: () => 0 });

    assert.equal(first, second);
    assert.equal(first.split(' ').length, 10);
    assert.equal(fallback.split(' ').length, 10);
  });
});

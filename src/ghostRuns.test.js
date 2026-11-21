import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GHOST_RUNS_KEY,
  MAX_GHOST_MODE_LABELS,
  buildGhost,
  compactPositions,
  formatGhostComparison,
  formatGhostLead,
  getGhostComparison,
  getGhostPositionAt,
  isGhostRecordable,
  loadGhost,
  normalizeGhostMode,
  recordGhostRun
} from './ghostRuns.js';

function memoryStorage() {
  const data = new Map();

  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value))
  };
}

function makeLog(count) {
  const log = [{ t: 0, len: 0 }];

  for (let index = 1; index <= count; index += 1) {
    log.push({ t: index * 50, text: 'a'.repeat(index), code: 'KeyA' });
  }

  return log;
}

function makeResult(overrides = {}) {
  return {
    accuracy: 97,
    keystrokeLog: makeLog(20),
    modeLabel: 'english 30s',
    testType: 'time',
    trainingMode: 'standard',
    wpm: 60,
    ...overrides
  };
}

test('compactPositions maps log entries to [t, length] pairs', () => {
  assert.deepEqual(
    compactPositions([{ t: 0, len: 0 }, { t: 120.4, text: 'ab' }, { t: 90, text: 'abc' }]),
    [[0, 0], [120, 2], [120, 3]]
  );
  assert.deepEqual(compactPositions([{ t: 40, text: 'a' }]), [[0, 0], [40, 1]]);
  assert.deepEqual(compactPositions(null), [[0, 0]]);
});

test('compactPositions downsamples but keeps endpoints and order', () => {
  const positions = compactPositions(makeLog(3000), 600);

  assert.equal(positions.length, 600);
  assert.deepEqual(positions[0], [0, 0]);
  assert.deepEqual(positions.at(-1), [150000, 3000]);
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(positions[index][0] >= positions[index - 1][0]);
  }
});

test('getGhostPositionAt finds the last point at or before the time', () => {
  const ghost = { positions: [[0, 0], [100, 1], [250, 2], [400, 5]] };

  assert.equal(getGhostPositionAt(ghost, -5), 0);
  assert.equal(getGhostPositionAt(ghost, 0), 0);
  assert.equal(getGhostPositionAt(ghost, 99), 0);
  assert.equal(getGhostPositionAt(ghost, 100), 1);
  assert.equal(getGhostPositionAt(ghost, 300), 2);
  assert.equal(getGhostPositionAt(ghost, 99999), 5);
  assert.equal(getGhostPositionAt(null, 10), 0);
});

test('isGhostRecordable rejects invalid, custom, replay and empty results', () => {
  assert.equal(isGhostRecordable(makeResult()), true);
  assert.equal(isGhostRecordable(makeResult({ isInvalid: true })), false);
  assert.equal(isGhostRecordable(makeResult({ trainingMode: 'custom' })), false);
  assert.equal(isGhostRecordable(makeResult({ isReplay: true })), false);
  assert.equal(isGhostRecordable(makeResult({ keystrokeLog: [] })), false);
  assert.equal(isGhostRecordable(makeResult({ wpm: 0 })), false);
  assert.equal(buildGhost(makeResult({ isInvalid: true })), null);
});

test('recordGhostRun keeps the best and always replaces the last run', () => {
  const storage = memoryStorage();

  assert.deepEqual(recordGhostRun(makeResult({ wpm: 60 }), {}, storage), {
    best: null,
    last: null
  });
  recordGhostRun(makeResult({ wpm: 50 }), {}, storage);
  assert.equal(loadGhost('english 30s', 'best', storage).wpm, 60);
  assert.equal(loadGhost('english 30s', 'last', storage).wpm, 50);

  const result = makeResult({ wpm: 70 });
  const comparison = recordGhostRun(result, {}, storage);

  assert.deepEqual(comparison.best, { accuracy: 97, wpm: 60 });
  assert.deepEqual(comparison.last, { accuracy: 97, wpm: 50 });
  assert.equal(loadGhost('english 30s', 'best', storage).wpm, 70);
  assert.equal(loadGhost('english 30s', 'last', storage).wpm, 70);
  assert.equal(loadGhost('english 60s', 'best', storage), null);
});

test('recordGhostRun ignores replays and invalid results', () => {
  const storage = memoryStorage();

  assert.equal(recordGhostRun(makeResult(), { isReplay: true }, storage), null);
  assert.equal(recordGhostRun(makeResult({ isInvalid: true }), {}, storage), null);
  assert.equal(storage.data.has(GHOST_RUNS_KEY), false);
});

test('recordGhostRun bounds the number of stored mode labels', () => {
  const storage = memoryStorage();

  for (let index = 0; index < MAX_GHOST_MODE_LABELS + 5; index += 1) {
    recordGhostRun(makeResult({ modeLabel: `mode ${index}` }), { now: index + 1 }, storage);
  }

  const store = JSON.parse(storage.data.get(GHOST_RUNS_KEY));

  assert.equal(Object.keys(store).length, MAX_GHOST_MODE_LABELS);
  assert.equal(store['mode 0'], undefined);
  assert.ok(store[`mode ${MAX_GHOST_MODE_LABELS + 4}`]);
});

test('storage failures and corrupt data are tolerated', () => {
  const broken = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    }
  };

  assert.equal(loadGhost('x', 'best', broken), null);
  assert.doesNotThrow(() => recordGhostRun(makeResult(), {}, broken));
  assert.equal(loadGhost('x', 'best', { getItem: () => '{nope' }), null);
  assert.equal(loadGhost('x', 'best', null), null);
});

test('comparison text and lead formatting', () => {
  const storage = memoryStorage();

  recordGhostRun(makeResult({ wpm: 60 }), {}, storage);

  const result = makeResult({ wpm: 66 });

  recordGhostRun(result, {}, storage);

  const comparison = getGhostComparison(result, 'best');

  assert.equal(formatGhostComparison(comparison), 'vs ghost: you beat your best by 6 WPM');
  assert.equal(
    formatGhostComparison({ kind: 'last', wpmDelta: -3 }),
    'vs ghost: you finished 3 WPM behind your last run'
  );
  assert.equal(getGhostComparison(result, 'off'), null);
  assert.equal(getGhostComparison({}, 'best'), null);
  assert.equal(formatGhostLead(12), '12 chars ahead of ghost');
  assert.equal(formatGhostLead(-1), '1 char behind ghost');
  assert.equal(formatGhostLead(0), 'level with ghost');
  assert.equal(normalizeGhostMode('last'), 'last');
  assert.equal(normalizeGhostMode('nope'), 'off');
});

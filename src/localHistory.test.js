import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addLocalResult,
  buildDashboardFromLocal,
  countUnsynced,
  getUnsyncedResults,
  loadLocalHistory,
  LOCAL_HISTORY_KEY,
  LOCAL_HISTORY_LIMIT,
  markResultsSynced,
  mergeResultSources,
  normalizeLocalHistory,
  saveLocalHistory,
  shouldNudgeGuest,
  toLocalResult
} from './localHistory.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value))
  };
}

const completed = {
  accuracy: 96,
  correctChars: 150,
  elapsedSeconds: 30,
  keystrokeLog: [{ key: 'a' }],
  modeLabel: '30s',
  rawWpm: 62,
  targetText: 'a long target text',
  testType: 'time',
  trainingMode: 'standard',
  wpm: 60,
  wrongChars: 6
};

describe('toLocalResult', () => {
  it('stores a compact shape without keystroke logs or text', () => {
    const entry = toLocalResult(completed, { id: 'a', now: 1000 });

    assert.deepEqual(entry, {
      id: 'a',
      createdAt: 1000,
      wpm: 60,
      rawWpm: 62,
      accuracy: 96,
      correctChars: 150,
      wrongChars: 6,
      elapsedSeconds: 30,
      modeLabel: '30s',
      testType: 'time',
      trainingMode: 'standard',
      language: 'english',
      syncedToUid: null
    });
    assert.equal('keystrokeLog' in entry, false);
    assert.equal('targetText' in entry, false);
  });

  it('records the synced account when given', () => {
    assert.equal(toLocalResult(completed, { syncedToUid: 'u1' }).syncedToUid, 'u1');
  });
});

describe('addLocalResult', () => {
  it('prepends and caps the list', () => {
    let history = [];
    for (let index = 0; index < LOCAL_HISTORY_LIMIT + 5; index += 1) {
      history = addLocalResult(history, toLocalResult(completed, { id: String(index), now: index }));
    }

    assert.equal(history.length, LOCAL_HISTORY_LIMIT);
    assert.equal(history[0].id, String(LOCAL_HISTORY_LIMIT + 4));
  });
});

describe('storage', () => {
  it('round trips and sorts newest first', () => {
    const storage = createStorage();
    const older = toLocalResult(completed, { id: 'old', now: 1 });
    const newer = toLocalResult(completed, { id: 'new', now: 2 });

    assert.equal(saveLocalHistory([older, newer], storage), true);
    assert.deepEqual(
      loadLocalHistory(storage).map((entry) => entry.id),
      ['new', 'old']
    );
  });

  it('survives corrupt JSON, bad entries and a throwing storage', () => {
    assert.deepEqual(loadLocalHistory(createStorage({ [LOCAL_HISTORY_KEY]: '{oops' })), []);
    assert.deepEqual(normalizeLocalHistory([null, 5, { id: 1 }, { id: 'x', createdAt: 'bad' }]), []);

    const broken = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      }
    };
    assert.deepEqual(loadLocalHistory(broken), []);
    assert.equal(saveLocalHistory([], broken), false);
  });

  it('is a no-op without localStorage (SSR)', () => {
    assert.deepEqual(loadLocalHistory(), []);
    assert.equal(saveLocalHistory([]), false);
  });
});

describe('sync tracking', () => {
  const history = [
    toLocalResult(completed, { id: 'a', now: 3 }),
    toLocalResult(completed, { id: 'b', now: 2, syncedToUid: 'u1' }),
    toLocalResult(completed, { id: 'c', now: 1 })
  ];

  it('finds unsynced results, newest first, with a cap', () => {
    assert.deepEqual(
      getUnsyncedResults(history).map((entry) => entry.id),
      ['a', 'c']
    );
    assert.deepEqual(
      getUnsyncedResults(history, 1).map((entry) => entry.id),
      ['a']
    );
    assert.equal(countUnsynced(history), 2);
  });

  it('marks results synced without mutating', () => {
    const next = markResultsSynced(history, ['a', 'c'], 'u2');

    assert.equal(countUnsynced(next), 0);
    assert.equal(next[0].syncedToUid, 'u2');
    assert.equal(countUnsynced(history), 2);
  });

  it('nudges guests every fifth unsynced result', () => {
    const make = (count) =>
      Array.from({ length: count }, (_, index) => toLocalResult(completed, { id: String(index) }));

    assert.equal(shouldNudgeGuest(make(4)), false);
    assert.equal(shouldNudgeGuest(make(5)), true);
    assert.equal(shouldNudgeGuest(make(6)), false);
    assert.equal(shouldNudgeGuest(make(10)), true);
    assert.equal(shouldNudgeGuest([]), false);
  });
});

describe('mergeResultSources', () => {
  it('drops duplicates of the same test and sorts newest first', () => {
    const local = [toLocalResult(completed, { id: 'l', now: 5000 })];
    const remote = [
      { ...local[0], id: 'r', createdAt: new Date(5000 + 2000) },
      { ...local[0], id: 'old', wpm: 10, createdAt: new Date(1000) }
    ];
    const merged = mergeResultSources(local, remote);

    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, 'r');
  });
});

describe('buildDashboardFromLocal', () => {
  it('builds the dashboard shape from results', () => {
    const history = [
      toLocalResult({ ...completed, wpm: 50 }, { id: 'a', now: 1 }),
      toLocalResult({ ...completed, wpm: 70, accuracy: 99 }, { id: 'b', now: 2 })
    ];
    const dashboard = buildDashboardFromLocal(history);

    assert.equal(dashboard.completed, 2);
    assert.equal(dashboard.results[0].id, 'b');
    assert.ok(dashboard.results[0].createdAt instanceof Date);
    assert.equal(dashboard.modes['30s'].bestWpm, 70);
    assert.equal(dashboard.modes['30s'].bestAccuracy, 99);
    assert.equal(dashboard.totalTypingSeconds, 60);
    assert.equal(dashboard.estimatedWordsTyped, 60);
  });

  it('handles empty history', () => {
    const dashboard = buildDashboardFromLocal([]);
    assert.equal(dashboard.completed, 0);
    assert.deepEqual(dashboard.results, []);
  });
});

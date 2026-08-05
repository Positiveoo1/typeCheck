import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getBestEntryPerPlayer,
  getEntryTestType,
  getLeaderboardSummary,
  getModeOptions,
  getPlayerInitials,
  sortLeaderboardEntries
} from './leaderboardLogic.js';

describe('leaderboard sorting and filtering helpers', () => {
  it('sorts by WPM, then accuracy, then newest result date', () => {
    const entries = [
      { id: 'slow', accuracy: 99, createdAt: '2026-01-03', wpm: 50 },
      { id: 'fast-low-accuracy', accuracy: 90, createdAt: '2026-01-04', wpm: 80 },
      { id: 'fast-new', accuracy: 95, createdAt: '2026-01-05', wpm: 80 },
      { id: 'fast-old', accuracy: 95, createdAt: '2026-01-01', wpm: 80 }
    ];

    assert.deepEqual(
      entries.sort(sortLeaderboardEntries).map((entry) => entry.id),
      ['fast-new', 'fast-old', 'fast-low-accuracy', 'slow']
    );
  });

  it('infers missing test types from mode labels', () => {
    assert.equal(getEntryTestType({ testType: 'time', modeLabel: '10 words' }), 'time');
    assert.equal(getEntryTestType({ modeLabel: '10 words' }), 'words');
    assert.equal(getEntryTestType({ modeLabel: '30s' }), 'time');
  });

  it('orders mode options by known priority before custom labels', () => {
    const modes = getModeOptions([
      { modeLabel: 'code 30s' },
      { modeLabel: '30 words' },
      { modeLabel: '15s' },
      { modeLabel: '10 words' },
      { modeLabel: '15s' }
    ]);

    assert.deepEqual(modes, ['15s', '10 words', '30 words', 'code 30s']);
  });

  it('summarizes visible leaderboard entries', () => {
    assert.deepEqual(
      getLeaderboardSummary([
        { accuracy: 90, modeLabel: '30s', wpm: 50 },
        { accuracy: 100, modeLabel: '30s', wpm: 80 },
        { accuracy: 95, modeLabel: '10 words', wpm: 65 }
      ]),
      {
        averageAccuracy: 95,
        modeCount: 2,
        topWpm: 80,
        totalEntries: 3
      }
    );
  });

  it('builds compact initials for podium avatars', () => {
    assert.equal(getPlayerInitials('@ada_lovelace'), 'AL');
    assert.equal(getPlayerInitials('Grace Hopper'), 'GH');
    assert.equal(getPlayerInitials(''), '?');
  });

  it('keeps only each player\'s best run, in place', () => {
    // Already sorted best-first, as it would be after sortLeaderboardEntries.
    const runs = [
      { id: 'a1', userId: 'alice', wpm: 90 },
      { id: 'b1', userId: 'bob', wpm: 80 },
      { id: 'a2', userId: 'alice', wpm: 70 },
      { id: 'a3', userId: 'alice', wpm: 60 },
      { id: 'c1', userId: 'cara', wpm: 50 }
    ];

    assert.deepEqual(
      getBestEntryPerPlayer(runs).map((entry) => entry.id),
      ['a1', 'b1', 'c1']
    );
  });

  it('falls back to player name when a run has no userId', () => {
    const runs = [
      { id: 'g1', playerName: 'Guest', userId: null, wpm: 40 },
      { id: 'g2', playerName: 'Guest', userId: null, wpm: 30 }
    ];

    assert.deepEqual(
      getBestEntryPerPlayer(runs).map((entry) => entry.id),
      ['g1']
    );
  });
});
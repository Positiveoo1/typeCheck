import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getAuthActionErrorMessage,
  getDashboardDocRef,
  getLeaderboardPlayerName,
  getPublicPlayerDocRef,
  getResultsCollectionRef,
  getUserDocRef,
  isCloudResultEligible,
  loadFirebaseDashboard,
  serializeDashboard,
  serializePublicPlayer,
  toDisplayNameFromEmail
} from './services/typecheckData.js';

function createFakeFirebase() {
  return {
    collection(...parts) {
      return { kind: 'collection', parts };
    },
    db: { app: 'fake' },
    doc(...parts) {
      return { kind: 'doc', parts };
    },
    getDoc() {
      return Promise.resolve({
        data: () => ({
          completed: 1,
          modes: {
            '30s': {
              completed: 1,
              bestWpm: 50
            }
          },
          started: 1
        })
      });
    },
    getDocs() {
      return Promise.resolve({
        docs: [
          {
            id: 'result-1',
            data: () => ({
              accuracy: '98',
              correctChars: '120',
              createdAt: { toDate: () => new Date('2026-01-02T00:00:00Z') },
              elapsedSeconds: '30',
              endedByAccuracyLock: false,
              modeLabel: '30s',
              testType: 'time',
              trainingMode: 'standard',
              wpm: '48',
              wrongChars: '3'
            })
          }
        ]
      });
    },
    limit(value) {
      return { limit: value };
    },
    orderBy(field, direction) {
      return { direction, field };
    },
    query(collectionRef, ...constraints) {
      return { collectionRef, constraints };
    },
    serverTimestamp() {
      return 'SERVER_TIMESTAMP';
    }
  };
}

describe('Firestore reference helpers', () => {
  it('builds the expected user, dashboard, results, and public-player refs', () => {
    const firebase = createFakeFirebase();

    assert.deepEqual(getUserDocRef(firebase, 'u1').parts, [firebase.db, 'users', 'u1']);
    assert.deepEqual(getDashboardDocRef(firebase, 'u1').parts, [
      firebase.db,
      'users',
      'u1',
      'stats',
      'dashboard'
    ]);
    assert.deepEqual(getResultsCollectionRef(firebase, 'u1').parts, [
      firebase.db,
      'users',
      'u1',
      'results'
    ]);
    assert.deepEqual(getPublicPlayerDocRef(firebase, 'u1').parts, [
      firebase.db,
      'publicPlayers',
      'u1'
    ]);
  });
});

describe('serialization helpers', () => {
  it('serializes dashboards with a server timestamp', () => {
    const firebase = createFakeFirebase();
    const payload = serializeDashboard(firebase, {
      completed: 3,
      estimatedWordsTyped: 44,
      incomplete: 1,
      modes: {},
      started: 5,
      totalTypingSeconds: 120
    });

    assert.deepEqual(payload, {
      completed: 3,
      estimatedWordsTyped: 44,
      incomplete: 1,
      modes: {},
      started: 5,
      totalTypingSeconds: 120,
      updatedAt: 'SERVER_TIMESTAMP'
    });
  });

  it('serializes public players using username and email fallback names', () => {
    const firebase = createFakeFirebase();
    const payload = serializePublicPlayer(
      firebase,
      { username: 'speedy' },
      { displayName: 'Speed Runner', email: 'first.last@example.com' }
    );

    assert.deepEqual(payload, {
      displayName: 'Speed Runner',
      fallbackName: 'First Last',
      username: 'speedy',
      updatedAt: 'SERVER_TIMESTAMP'
    });
  });
});

describe('display and auth helpers', () => {
  it('chooses leaderboard player names by public priority', () => {
    assert.equal(getLeaderboardPlayerName({ username: 'neo' }), '@neo');
    assert.equal(getLeaderboardPlayerName({ displayName: 'Neo' }), 'Neo');
    assert.equal(getLeaderboardPlayerName({ fallbackName: 'Anonymous' }), 'Anonymous');
    assert.equal(getLeaderboardPlayerName({}), 'Anonymous typist');
  });

  it('derives readable display names from email local parts', () => {
    assert.equal(toDisplayNameFromEmail('ada.lovelace@example.com'), 'Ada Lovelace');
    assert.equal(toDisplayNameFromEmail(''), 'Anonymous typist');
  });

  it('maps known auth errors and falls back for unknown errors', () => {
    assert.equal(
      getAuthActionErrorMessage({ code: 'auth/invalid-credential' }),
      'Current password is incorrect.'
    );
    assert.equal(
      getAuthActionErrorMessage({ code: 'auth/something-new' }),
      'Could not complete this account action.'
    );
  });
});

describe('cloud result eligibility', () => {
  const validResult = {
    accuracy: 98,
    correctChars: 120,
    elapsedSeconds: 30,
    modeLabel: '30s',
    testType: 'time',
    trainingMode: 'standard',
    wpm: 48,
    wrongChars: 3
  };

  it('accepts results that match Firestore result rule bounds', () => {
    assert.equal(isCloudResultEligible(validResult), true);
  });

  it('rejects results Firestore rules would deny', () => {
    assert.equal(isCloudResultEligible({ ...validResult, wpm: 401 }), false);
    assert.equal(
      isCloudResultEligible({ ...validResult, wpm: Number.POSITIVE_INFINITY }),
      false
    );
    assert.equal(isCloudResultEligible({ ...validResult, modeLabel: '' }), false);
    assert.equal(isCloudResultEligible({ ...validResult, testType: 'custom' }), false);
  });
});

describe('Firebase dashboard loading', () => {
  it('normalizes Firestore dashboard and result documents', async () => {
    const dashboard = await loadFirebaseDashboard(createFakeFirebase(), 'u1');

    assert.equal(dashboard.started, 1);
    assert.equal(dashboard.completed, 1);
    assert.equal(dashboard.modes['30s'].bestWpm, 50);
    assert.equal(dashboard.results.length, 1);
    assert.deepEqual(dashboard.results[0], {
      id: 'result-1',
      accuracy: 98,
      correctChars: 120,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      elapsedSeconds: 30,
      endedByAccuracyLock: false,
      modeLabel: '30s',
      netWpm: 48,
      rawWpm: 48,
      testType: 'time',
      trainingMode: 'standard',
      wpm: 48,
      wrongChars: 3
    });
  });
});

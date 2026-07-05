import {
  createEmptyDashboard,
  LEADERBOARD_RESULTS_LIMIT,
  normalizeDashboard,
  normalizeProfile,
  PROFILE_RESULTS_LIMIT
} from '../appState.js';

let firebaseRuntimePromise = null;
const MAX_CLOUD_WPM = 400;
const MAX_RESULT_CHARS = 20000;
const MAX_MODE_LABEL_LENGTH = 80;
const MAX_TRAINING_MODE_LENGTH = 40;

export function getFirebaseRuntime() {
  if (!firebaseRuntimePromise) {
    firebaseRuntimePromise = import('./firebaseRuntime.js');
  }

  return firebaseRuntimePromise;
}

export function getDashboardDocRef(firebase, userId) {
  return firebase.doc(firebase.db, 'users', userId, 'stats', 'dashboard');
}

export function getUserDocRef(firebase, userId) {
  return firebase.doc(firebase.db, 'users', userId);
}

export function getResultsCollectionRef(firebase, userId) {
  return firebase.collection(firebase.db, 'users', userId, 'results');
}

export function getLeaderboardCollectionRef(firebase) {
  return firebase.collection(firebase.db, 'leaderboardResults');
}

export function getPublicPlayerDocRef(firebase, userId) {
  return firebase.doc(firebase.db, 'publicPlayers', userId);
}

export function serializeDashboard(firebase, dashboard) {
  return {
    completed: dashboard.completed,
    estimatedWordsTyped: dashboard.estimatedWordsTyped || 0,
    incomplete: dashboard.incomplete,
    modes: dashboard.modes,
    started: dashboard.started,
    totalTypingSeconds: dashboard.totalTypingSeconds || 0,
    updatedAt: firebase.serverTimestamp()
  };
}

export function toDisplayNameFromEmail(email) {
  const localPart = String(email || '').split('@')[0];
  const words = localPart
    .split(/[._\-+\s]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return 'Anonymous typist';

  return words
    .slice(0, 2)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

export function getLeaderboardPlayerName(profile) {
  if (profile?.username) return `@${profile.username}`;
  if (profile?.displayName) return profile.displayName;
  if (profile?.fallbackName) return profile.fallbackName;

  return 'Anonymous typist';
}

function isNumberInRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function isStringWithLength(value, min, max) {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

export function isCloudResultEligible(result) {
  return (
    isNumberInRange(result?.accuracy, 0, 100) &&
    isNumberInRange(result?.correctChars, 0, MAX_RESULT_CHARS) &&
    isNumberInRange(result?.elapsedSeconds, 0, Number.MAX_SAFE_INTEGER) &&
    isNumberInRange(result?.wpm, 0, MAX_CLOUD_WPM) &&
    isNumberInRange(result?.wrongChars, 0, MAX_RESULT_CHARS) &&
    isStringWithLength(result?.modeLabel, 1, MAX_MODE_LABEL_LENGTH) &&
    (result?.testType === 'time' || result?.testType === 'words') &&
    isStringWithLength(
      result?.trainingMode || 'standard',
      1,
      MAX_TRAINING_MODE_LENGTH
    )
  );
}

export function serializePublicPlayer(firebase, profile, user) {
  return {
    displayName: user?.displayName || null,
    fallbackName: toDisplayNameFromEmail(user?.email),
    username: profile?.username || '',
    updatedAt: firebase.serverTimestamp()
  };
}

export function getAuthActionErrorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'Current password is incorrect.',
    'auth/invalid-email': 'This account does not have a valid email address.',
    'auth/missing-password': 'Enter your current password.',
    'auth/provider-already-linked': 'This account already has password sign-in enabled.',
    'auth/requires-recent-login': 'Sign in again before changing your password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/user-mismatch': 'This password does not match the signed-in account.',
    'auth/weak-password': 'New password should be at least 6 characters.'
  };

  return messages[error?.code] || 'Could not complete this account action.';
}

export function getPasswordResetActionSettings() {
  if (typeof window === 'undefined') return undefined;

  return {
    handleCodeInApp: false,
    url: window.location.origin
  };
}

export async function loadFirebaseProfile(firebase, user) {
  if (!firebase.db || !user) {
    return normalizeProfile(null, user);
  }

  const userDocRef = getUserDocRef(firebase, user.uid);
  const userSnapshot = await firebase.getDoc(userDocRef);
  const savedProfile = userSnapshot.data();

  if (!userSnapshot.exists() || !savedProfile?.createdAt) {
    firebase.setDoc(
      userDocRef,
      {
        createdAt: firebase.serverTimestamp(),
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null
      },
      { merge: true }
    ).catch((error) => {
      console.error('Failed to initialize user profile:', error);
    });
  }

  return normalizeProfile(savedProfile, user);
}

export async function loadFirebaseDashboard(firebase, userId) {
  if (!firebase.db) return createEmptyDashboard();

  const [dashboardSnapshot, resultsSnapshot] = await Promise.all([
    firebase.getDoc(getDashboardDocRef(firebase, userId)),
    firebase.getDocs(firebase.query(
      getResultsCollectionRef(firebase, userId),
      firebase.orderBy('createdAt', 'desc'),
      firebase.limit(PROFILE_RESULTS_LIMIT)
    ))
  ]);

  const results = resultsSnapshot.docs.map((resultDoc) => {
    const data = resultDoc.data();

    return {
      id: resultDoc.id,
      accuracy: Number(data.accuracy) || 0,
      correctChars: Number(data.correctChars) || 0,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
      elapsedSeconds: Number(data.elapsedSeconds) || 0,
      endedByAccuracyLock: Boolean(data.endedByAccuracyLock),
      modeLabel: data.modeLabel || '',
      testType: data.testType || 'time',
      trainingMode: data.trainingMode || 'standard',
      wpm: Number(data.wpm) || 0,
      wrongChars: Number(data.wrongChars) || 0
    };
  });

  return normalizeDashboard(dashboardSnapshot.data(), results);
}

function isMissingFirestoreIndexError(error) {
  return (
    error?.code === 'failed-precondition' &&
    String(error?.message || '').includes('requires an index')
  );
}

async function loadLeaderboardResultsSnapshot(firebase, indexedQuery) {
  try {
    return await firebase.getDocs(indexedQuery);
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) {
      throw error;
    }

    return firebase.getDocs(firebase.query(
      getLeaderboardCollectionRef(firebase),
      firebase.orderBy('wpm', 'desc'),
      firebase.limit(LEADERBOARD_RESULTS_LIMIT)
    ));
  }
}

export async function loadGlobalLeaderboard() {
  const firebase = await getFirebaseRuntime();
  if (!firebase.db) return [];

  const resultsSnapshot = await loadLeaderboardResultsSnapshot(firebase, firebase.query(
    getLeaderboardCollectionRef(firebase),
    firebase.orderBy('wpm', 'desc'),
    firebase.limit(LEADERBOARD_RESULTS_LIMIT)
  ));
  const userIds = [...new Set(resultsSnapshot.docs
    .map((resultDoc) => resultDoc.data().userId)
    .filter(Boolean))];
  const userProfiles = new Map();

  await Promise.all(userIds.map(async (userId) => {
    const userSnapshot = await firebase.getDoc(getPublicPlayerDocRef(firebase, userId));
    userProfiles.set(userId, userSnapshot.data() || {});
  }));

  const rankedResults = resultsSnapshot.docs
    .map((resultDoc) => {
      const data = resultDoc.data();
      const userId = data.userId || '';
      const profile = userProfiles.get(userId) || {};

      return {
        id: resultDoc.id,
        accuracy: Number(data.accuracy) || 0,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
        modeLabel: data.modeLabel || '',
        playerName: getLeaderboardPlayerName(profile),
        testType: data.testType || 'time',
        trainingMode: data.trainingMode || 'standard',
        userId,
        wpm: Number(data.wpm) || 0
      };
    })
    .filter((result) => result.modeLabel)
    .sort((firstResult, secondResult) => (
      secondResult.wpm - firstResult.wpm ||
      secondResult.accuracy - firstResult.accuracy ||
      (new Date(secondResult.createdAt || 0) - new Date(firstResult.createdAt || 0))
    ));
  const bestByUserAndMode = new Map();

  rankedResults.forEach((result) => {
    if (!result.userId) return;

    const key = `${result.userId}:${result.modeLabel}`;
    if (bestByUserAndMode.has(key)) return;

    bestByUserAndMode.set(key, result);
  });

  return [...bestByUserAndMode.values()];
}

export async function loadPublicPlayerProfile(userId) {
  const firebase = await getFirebaseRuntime();
  if (!firebase.db || !userId) {
    return {
      error: 'Could not load this player profile.',
      playerName: 'Player',
      results: []
    };
  }

  const [playerSnapshot, resultsSnapshot] = await Promise.all([
    firebase.getDoc(getPublicPlayerDocRef(firebase, userId)),
    loadLeaderboardResultsSnapshot(firebase, firebase.query(
      getLeaderboardCollectionRef(firebase),
      firebase.where('userId', '==', userId),
      firebase.orderBy('wpm', 'desc'),
      firebase.limit(LEADERBOARD_RESULTS_LIMIT)
    ))
  ]);
  const profile = playerSnapshot.data() || {};
  const results = resultsSnapshot.docs
    .map((resultDoc) => {
      const data = resultDoc.data();

      return {
        id: resultDoc.id,
        accuracy: Number(data.accuracy) || 0,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
        modeLabel: data.modeLabel || '',
        testType: data.testType || 'time',
        trainingMode: data.trainingMode || 'standard',
        userId: data.userId || '',
        wpm: Number(data.wpm) || 0
      };
    })
    .filter((result) => (
      result.userId === userId &&
      result.modeLabel
    ))
    .sort((firstResult, secondResult) => (
      secondResult.wpm - firstResult.wpm ||
      secondResult.accuracy - firstResult.accuracy ||
      (new Date(secondResult.createdAt || 0) - new Date(firstResult.createdAt || 0))
    ));

  return {
    error: '',
    playerName: getLeaderboardPlayerName(profile),
    results
  };
}

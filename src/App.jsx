'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'framer-motion';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import TestSettings from './components/TestSettings.jsx';
import TypingTest from './components/TypingTest.jsx';
import { isFirebaseConfigured } from './services/firebaseConfig.js';
import {
  getThemeIds,
  getThemePersonality,
  getUnlockedThemeIds,
  hexToRgbParts,
  normalizeAccentColor
} from './themePersonalities.js';
import { getTrainingModeIds } from './trainingModes.js';
import { getModeLabel } from './typingLogic.js';

const SETTINGS_KEY = 'typecheck-settings';
const THEME_KEY = 'typecheck-theme';
const ONBOARDING_KEY = 'typecheck-onboarding-complete';
const ONBOARDING_VERSION = '2026-06-training-leaderboard-profile';
const THEMES = getThemeIds();
const MODE_LABELS = ['15s', '30s', '60s', '10 words', '30 words', '60 words'];
const SHORTCUT_TIME_MODES = [15, 30, 60];
const SHORTCUT_WORD_MODES = [10, 30, 60];
const PROFILE_RESULTS_LIMIT = 400;
const LEADERBOARD_RESULTS_LIMIT = 500;
const ACCOUNT_SECURITY_WINDOW_DAYS = 30;
const PASSWORD_CHANGE_LIMIT = 2;
const PASSWORD_RESET_EMAIL_LIMIT = 4;
const MISTAKE_MODES = ['backspace', 'strict'];
const SOUND_STYLES = ['click', 'soft', 'bright'];
const TRAINING_MODE_IDS = getTrainingModeIds();
const TOAST_LIFETIME_MS = 4200;
const DEFAULT_SETTINGS = {
  customText: 'Small steady practice makes typing feel effortless.',
  mistakeMode: 'backspace',
  reducedMotion: false,
  showKeyboard: true,
  soundEnabled: true,
  soundStyle: 'theme',
  soundVolume: 0.9,
  testType: 'time',
  timeMode: 30,
  trainingMode: 'standard',
  accentColor: '',
  wordMode: 10
};
const MIN_CUSTOM_TIME = 5;
const MAX_CUSTOM_TIME = 300;
const MAX_CUSTOM_TEXT_LENGTH = 1200;
const MIN_CUSTOM_TEST_CHARACTERS = 10;

const AuthPanel = lazy(() => import('./components/AuthPanel.jsx'));
const Dashboard = lazy(() => import('./components/Dashboard.jsx'));
const Leaderboard = lazy(() => import('./components/Leaderboard.jsx'));
const LegalPage = lazy(() => import('./components/LegalPage.jsx'));
const Profile = lazy(() => import('./components/Profile.jsx'));
const PublicProfile = lazy(() => import('./components/PublicProfile.jsx'));
const preloadResults = () => import('./components/Results.jsx');
const Results = lazy(preloadResults);
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'));
let firebaseRuntimePromise = null;

function getFirebaseRuntime() {
  if (!firebaseRuntimePromise) {
    firebaseRuntimePromise = import('./services/firebaseRuntime.js');
  }

  return firebaseRuntimePromise;
}

function normalizeTimeMode(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return DEFAULT_SETTINGS.timeMode;

  return Math.min(
    MAX_CUSTOM_TIME,
    Math.max(MIN_CUSTOM_TIME, Math.round(numericValue))
  );
}

function normalizeCustomTextSetting(value) {
  const normalizedValue = String(value || '').replace(/\s+/g, ' ').trim();

  return normalizedValue.slice(0, MAX_CUSTOM_TEXT_LENGTH) || DEFAULT_SETTINGS.customText;
}

function isTooShortCustomTest(test) {
  return (
    test?.trainingMode === 'custom' &&
    String(test?.targetText || '').replace(/\s/g, '').length < MIN_CUSTOM_TEST_CHARACTERS
  );
}

function loadPage() {
  if (typeof window === 'undefined') return 'test';

  if (window.location.hash === '#dashboard') return 'dashboard';
  if (window.location.hash === '#leaderboard') return 'leaderboard';
  if (window.location.hash === '#profile') return 'profile';
  if (window.location.hash === '#settings') return 'settings';
  if (window.location.hash === '#privacy') return 'privacy';
  if (window.location.hash === '#terms') return 'terms';
  if (window.location.hash.startsWith('#player=')) return 'public-profile';

  return 'test';
}

function loadPublicProfileUserId() {
  if (typeof window === 'undefined') return '';
  if (!window.location.hash.startsWith('#player=')) return '';

  return decodeURIComponent(window.location.hash.replace('#player=', ''));
}

function loadTheme() {
  try {
    if (typeof localStorage === 'undefined') return 'matrix';

    const savedTheme = localStorage.getItem(THEME_KEY);
    return THEMES.includes(savedTheme) ? savedTheme : 'matrix';
  } catch {
    return 'matrix';
  }
}

function saveTheme(theme) {
  try {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function getPasswordResetActionSettings() {
  if (typeof window === 'undefined') return undefined;

  return {
    handleCodeInApp: false,
    url: `${window.location.origin}/#test`
  };
}

function ToastStack({ onDismiss, toasts }) {
  return (
    <div className="toast-region" aria-live="polite" aria-label="Notifications">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            className={`toast toast-${toast.type}`}
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 28, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 28, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div>
              <strong>{toast.title}</strong>
              {toast.message && <span>{toast.message}</span>}
            </div>
            <button
              aria-label={`Dismiss ${toast.title}`}
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              x
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function createModeStats() {
  return {
    started: 0,
    completed: 0,
    incomplete: 0,
    bestWpm: 0,
    bestAccuracy: 0
  };
}

function createEmptyDashboard() {
  return {
    started: 0,
    completed: 0,
    incomplete: 0,
    modes: Object.fromEntries(MODE_LABELS.map((label) => [label, createModeStats()])),
    results: [],
    estimatedWordsTyped: 0,
    totalTypingSeconds: 0
  };
}

function loadSettings() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;

    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    return {
      mistakeMode: MISTAKE_MODES.includes(savedSettings?.mistakeMode)
        ? savedSettings.mistakeMode
        : DEFAULT_SETTINGS.mistakeMode,
      reducedMotion:
        typeof savedSettings?.reducedMotion === 'boolean'
          ? savedSettings.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
      accentColor: normalizeAccentColor(
        savedSettings?.accentColor,
        DEFAULT_SETTINGS.accentColor
      ),
      customText: normalizeCustomTextSetting(savedSettings?.customText),
      showKeyboard:
        typeof savedSettings?.showKeyboard === 'boolean'
          ? savedSettings.showKeyboard
          : DEFAULT_SETTINGS.showKeyboard,
      testType:
        savedSettings?.testType === 'words' || savedSettings?.testType === 'time'
          ? savedSettings.testType
          : DEFAULT_SETTINGS.testType,
      timeMode: normalizeTimeMode(savedSettings?.timeMode),
      trainingMode: TRAINING_MODE_IDS.includes(savedSettings?.trainingMode)
        ? savedSettings.trainingMode
        : DEFAULT_SETTINGS.trainingMode,
      wordMode: [10, 30, 60].includes(savedSettings?.wordMode)
        ? savedSettings.wordMode
        : DEFAULT_SETTINGS.wordMode,
      soundEnabled:
        typeof savedSettings?.soundEnabled === 'boolean'
          ? savedSettings.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      soundStyle: [...SOUND_STYLES, 'theme'].includes(savedSettings?.soundStyle)
        ? savedSettings.soundStyle
        : DEFAULT_SETTINGS.soundStyle,
      soundVolume:
        Number.isFinite(Number(savedSettings?.soundVolume))
          ? Math.min(1, Math.max(0, Number(savedSettings.soundVolume)))
          : DEFAULT_SETTINGS.soundVolume
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  try {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function loadOnboardingComplete() {
  try {
    if (typeof localStorage === 'undefined') return true;

    return localStorage.getItem(ONBOARDING_KEY) === ONBOARDING_VERSION;
  } catch {
    return true;
  }
}

function saveOnboardingComplete() {
  try {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function normalizeDashboard(savedDashboard, results = savedDashboard?.results) {
  const emptyDashboard = createEmptyDashboard();
  const normalizedResults = Array.isArray(results)
    ? results.slice(0, PROFILE_RESULTS_LIMIT)
    : [];
  const fallbackTypingSeconds = normalizedResults.reduce(
    (totalSeconds, result) => totalSeconds + (Number(result.elapsedSeconds) || 0),
    0
  );
  const fallbackEstimatedWords = normalizedResults.reduce(
    (totalWords, result) => totalWords + Math.round((Number(result.correctChars) || 0) / 5),
    0
  );

  if (!savedDashboard) {
    return {
      ...emptyDashboard,
      estimatedWordsTyped: fallbackEstimatedWords,
      results: normalizedResults,
      totalTypingSeconds: fallbackTypingSeconds
    };
  }

  return {
    started: Number(savedDashboard.started) || 0,
    completed: Number(savedDashboard.completed) || 0,
    estimatedWordsTyped:
      Number(savedDashboard.estimatedWordsTyped) || fallbackEstimatedWords,
    incomplete: Number(savedDashboard.incomplete) || 0,
    modes: {
      ...Object.fromEntries(
        MODE_LABELS.map((label) => [
          label,
          {
            ...createModeStats(),
            ...(savedDashboard.modes?.[label] || {})
          }
        ])
      ),
      ...Object.fromEntries(
        Object.entries(savedDashboard.modes || {}).map(([label, mode]) => [
          label,
          {
            ...createModeStats(),
            ...mode
          }
        ])
      )
    },
    results: normalizedResults,
    totalTypingSeconds:
      Number(savedDashboard.totalTypingSeconds) || fallbackTypingSeconds
  };
}

function addCompletedResultToDashboard(dashboard, completedResult, options = {}) {
  const mode = dashboard.modes[completedResult.modeLabel] || createModeStats();
  const nextMode = {
    ...mode,
    started: mode.started + (options.countStarted ? 1 : 0),
    completed: mode.completed + 1,
    bestWpm: Math.max(mode.bestWpm || 0, completedResult.wpm),
    bestAccuracy: Math.max(mode.bestAccuracy || 0, completedResult.accuracy)
  };

  return {
    ...dashboard,
    started: dashboard.started + (options.countStarted ? 1 : 0),
    completed: dashboard.completed + 1,
    modes: {
      ...dashboard.modes,
      [completedResult.modeLabel]: nextMode
    },
    results: [
      {
        id: createId(),
        accuracy: completedResult.accuracy,
        correctChars: completedResult.correctChars,
        createdAt: new Date(),
        elapsedSeconds: completedResult.elapsedSeconds,
        endedByAccuracyLock: Boolean(completedResult.endedByAccuracyLock),
        modeLabel: completedResult.modeLabel,
        testType: completedResult.testType,
        trainingMode: completedResult.trainingMode || 'standard',
        wpm: completedResult.wpm,
        wrongChars: completedResult.wrongChars
      },
      ...dashboard.results
    ].slice(0, PROFILE_RESULTS_LIMIT),
    estimatedWordsTyped:
      (Number(dashboard.estimatedWordsTyped) || 0) +
      Math.round((Number(completedResult.correctChars) || 0) / 5),
    totalTypingSeconds:
      (Number(dashboard.totalTypingSeconds) || 0) +
      (Number(completedResult.elapsedSeconds) || 0)
  };
}

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function getDashboardDocRef(firebase, userId) {
  return firebase.doc(firebase.db, 'users', userId, 'stats', 'dashboard');
}

function getUserDocRef(firebase, userId) {
  return firebase.doc(firebase.db, 'users', userId);
}

function getResultsCollectionRef(firebase, userId) {
  return firebase.collection(firebase.db, 'users', userId, 'results');
}

function getLeaderboardCollectionRef(firebase) {
  return firebase.collection(firebase.db, 'leaderboardResults');
}

function getPublicPlayerDocRef(firebase, userId) {
  return firebase.doc(firebase.db, 'publicPlayers', userId);
}

function serializeDashboard(firebase, dashboard) {
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

function toDate(value) {
  const date = value?.toDate?.() || value;
  if (!date) return null;

  const normalizedDate = date instanceof Date ? date : new Date(date);
  return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
}

function normalizeDateArray(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map(toDate)
    .filter(Boolean)
    .sort((firstDate, secondDate) => secondDate - firstDate);
}

function getAccountSecurityWindowStart() {
  return new Date(Date.now() - ACCOUNT_SECURITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

function getRecentAccountEvents(events) {
  const windowStart = getAccountSecurityWindowStart();

  return normalizeDateArray(events).filter((eventDate) => eventDate >= windowStart);
}

function normalizeProfile(savedProfile, user) {
  const joinedAt =
    savedProfile?.createdAt?.toDate?.() ||
    savedProfile?.createdAt ||
    user?.metadata?.creationTime ||
    null;

  return {
    accountSecurity: {
      passwordChangedAt: normalizeDateArray(
        savedProfile?.accountSecurity?.passwordChangedAt
      ),
      resetEmailSentAt: normalizeDateArray(
        savedProfile?.accountSecurity?.resetEmailSentAt
      )
    },
    city: savedProfile?.city || '',
    github: savedProfile?.github || '',
    joinedAt,
    occupation: savedProfile?.occupation || '',
    username: savedProfile?.username || '',
    website: savedProfile?.website || ''
  };
}

async function loadFirebaseProfile(firebase, user) {
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

async function loadFirebaseDashboard(firebase, userId) {
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

function toDisplayNameFromEmail(email) {
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

function getLeaderboardPlayerName(profile) {
  if (profile?.username) return `@${profile.username}`;
  if (profile?.displayName) return profile.displayName;
  if (profile?.fallbackName) return profile.fallbackName;

  return 'Anonymous typist';
}

function serializePublicPlayer(firebase, profile, user) {
  return {
    displayName: user?.displayName || null,
    fallbackName: toDisplayNameFromEmail(user?.email),
    username: profile?.username || '',
    updatedAt: firebase.serverTimestamp()
  };
}

function getAuthActionErrorMessage(error) {
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

async function loadGlobalLeaderboard() {
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

async function loadPublicPlayerProfile(userId) {
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

const ONBOARDING_ITEMS = [
  {
    selector: '[data-onboarding-target="settings"]',
    title: 'Choose your test',
    text: 'Pick a time limit, word count, or custom time before you start.'
  },
  {
    selector: '[data-onboarding-target="training"]',
    title: 'Train a weak spot',
    text: 'Turn on training modes for awkward keys, quotes, code, numbers, or accuracy practice.'
  },
  {
    selector: '[data-onboarding-target="typing"]',
    title: 'Type in the text area',
    text: 'Start typing the visible words. The test begins on your first key.'
  },
  {
    selector: '[data-onboarding-target="restart-shortcut"]',
    title: 'Use the restart shortcut',
    text: 'Press Cmd or Ctrl plus Enter to restart without reaching for the mouse.'
  },
  {
    selector: '[data-onboarding-target="leaderboard"]',
    title: 'Compare rankings',
    text: 'Open the leaderboard to filter scores by time, words, and specific modes.'
  },
  {
    selector: '[data-onboarding-target="app-settings"]',
    title: 'Tune the app',
    text: 'Use settings for themes, keyboard display, sound, motion, and typing rules.'
  },
  {
    selector: '[data-onboarding-target="account-dashboard"]',
    title: 'Save your progress',
    text: 'Sign in to keep your dashboard, profile, public stats, and eligible leaderboard results synced.'
  }
];

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function Onboarding({ onDismiss }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const step = ONBOARDING_ITEMS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === ONBOARDING_ITEMS.length - 1;

  useLayoutEffect(() => {
    const updateSpotlight = () => {
      const target = document.querySelector(step.selector);

      if (!target) {
        setSpotlight(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const padding = 10;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = Math.min(320, viewportWidth - 28);
      const spaceBelow = viewportHeight - rect.bottom;
      const panelTop =
        spaceBelow > 220
          ? rect.bottom + 16
          : Math.max(14, rect.top - 232);

      setSpotlight({
        height: rect.height + padding * 2,
        left: clampNumber(rect.left - padding, 14, viewportWidth - 48),
        panelLeft: clampNumber(rect.left, 14, viewportWidth - panelWidth - 14),
        panelTop: clampNumber(panelTop, 14, viewportHeight - 220),
        top: clampNumber(rect.top - padding, 14, viewportHeight - 48),
        width: Math.min(rect.width + padding * 2, viewportWidth - 28)
      });
    };

    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [step.selector]);

  return (
    <motion.div
      className="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <button
        aria-label="Close onboarding"
        className="onboarding-backdrop"
        onClick={onDismiss}
        type="button"
      />
      {spotlight && (
        <motion.div
          className="onboarding-spotlight"
          animate={{
            height: spotlight.height,
            left: spotlight.left,
            top: spotlight.top,
            width: spotlight.width
          }}
          initial={false}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
      <motion.section
        className="onboarding-panel"
        aria-labelledby="onboarding-title"
        style={
          spotlight
            ? {
                left: spotlight.panelLeft,
                top: spotlight.panelTop
              }
            : {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }
        }
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <p className="eyebrow">quick start {stepIndex + 1}/{ONBOARDING_ITEMS.length}</p>
        <h2 id="onboarding-title">{step.title}</h2>
        <p>{step.text}</p>
        <div className="onboarding-progress" aria-hidden="true">
          {ONBOARDING_ITEMS.map((item, index) => (
            <span
              className={index === stepIndex ? 'active' : ''}
              key={item.title}
            />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="secondary-action" onClick={onDismiss} type="button">
            Skip
          </button>
          <button
            className="secondary-action"
            disabled={isFirstStep}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            type="button"
          >
            Back
          </button>
          <button
            className="primary-action"
            onClick={() => {
              if (isLastStep) {
                onDismiss();
                return;
              }

              setStepIndex((current) => current + 1);
            }}
            type="button"
          >
            {isLastStep ? 'Start typing' : 'Next'}
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [dashboard, setDashboard] = useState(createEmptyDashboard);
  const [leaderboard, setLeaderboard] = useState({
    entries: [],
    error: '',
    isLoading: false
  });
  const [publicProfile, setPublicProfile] = useState({
    error: '',
    isLoading: false,
    playerName: 'Player',
    results: [],
    userId: ''
  });
  const activeAttemptRef = useRef(null);
  const [currentPage, setCurrentPage] = useState('test');
  const [theme, setTheme] = useState('matrix');
  const [restartKey, setRestartKey] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(() => normalizeProfile(null, null));
  const [isAuthReady, setIsAuthReady] = useState(!isFirebaseConfigured);
  const [isAuthGateOpen, setIsAuthGateOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [showMobileTip, setShowMobileTip] = useState(true);
  const [pendingPage, setPendingPage] = useState(null);
  const [pendingResultSave, setPendingResultSave] = useState(null);
  const [replayTargetText, setReplayTargetText] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const {
    accentColor,
    customText,
    mistakeMode,
    reducedMotion,
    showKeyboard,
    soundEnabled,
    soundStyle,
    soundVolume,
    testType,
    timeMode,
    trainingMode,
    wordMode
  } = settings;
  const themePersonality = getThemePersonality(theme);
  const effectiveSoundStyle =
    soundStyle === 'theme' ? themePersonality.soundStyle : soundStyle;

  const dismissToast = useCallback((toastId) => {
    setToasts((currentToasts) => (
      currentToasts.filter((toast) => toast.id !== toastId)
    ));
  }, []);

  const notify = useCallback(({ message = '', title, type = 'info' }) => {
    const toastId = createId();

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        id: toastId,
        message,
        title,
        type
      }
    ].slice(-4));

    window.setTimeout(() => {
      dismissToast(toastId);
    }, TOAST_LIFETIME_MS);
  }, [dismissToast]);

  const updateDashboard = useCallback((updater) => {
    setDashboard((currentDashboard) => {
      const nextDashboard = updater(currentDashboard);

      if (!user || !isFirebaseConfigured) return nextDashboard;

      getFirebaseRuntime()
        .then((firebase) => {
          if (!firebase.db) return;

          return firebase.setDoc(
            getDashboardDocRef(firebase, user.uid),
            serializeDashboard(firebase, nextDashboard),
            { merge: true }
          );
        })
        .catch((error) => {
          console.error('Failed to save dashboard:', error);
          notify({
            title: 'Dashboard not saved',
            message: 'Your latest progress could not be synced.',
            type: 'error'
          });
        });

      return nextDashboard;
    });
  }, [notify, user]);

  useEffect(() => {
    setIsOnboardingOpen(!loadOnboardingComplete());
    preloadResults();
  }, []);

  useEffect(() => {
    const isTextInput = (element) => {
      const tagName = element?.tagName?.toLowerCase();

      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        element?.isContentEditable
      );
    };

    const clearCapsLockIndicators = () => {
      document
        .querySelectorAll('[data-caps-lock="true"]')
        .forEach((element) => {
          element.dataset.capsLock = 'false';
        });
    };

    const getInputWrapper = (element) => (
      element?.closest?.('.field-with-caps, .password-field') ||
      document.querySelector('.word-display.typing-focused')
    );

    const updateCapsLock = (event) => {
      if (!isTextInput(document.activeElement)) {
        clearCapsLockIndicators();
        return;
      }

      if (typeof event.getModifierState === 'function') {
        clearCapsLockIndicators();
        const wrapper = getInputWrapper(document.activeElement);

        if (wrapper) {
          wrapper.dataset.capsLock = String(event.getModifierState('CapsLock'));
        }
      }
    };

    const handleFocusIn = (event) => {
      clearCapsLockIndicators();

      if (!isTextInput(event.target)) return;

      const wrapper = getInputWrapper(event.target);
      if (wrapper) {
        wrapper.dataset.capsLock = 'false';
      }
    };

    const handleFocusOut = () => {
      window.requestAnimationFrame(() => {
        if (isTextInput(document.activeElement)) return;

        clearCapsLockIndicators();
      });
    };

    window.addEventListener('keydown', updateCapsLock);
    window.addEventListener('keyup', updateCapsLock);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('keydown', updateCapsLock);
      window.removeEventListener('keyup', updateCapsLock);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const dismissOnboarding = useCallback(() => {
    saveOnboardingComplete();
    setIsOnboardingOpen(false);
  }, []);

  const saveCompletedResult = useCallback(async (completedResult, options = {}) => {
    if (!user || !isFirebaseConfigured) {
      if (!isFirebaseConfigured) {
        console.error('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* values before saving performance.');
      }
      return;
    }

    const firebase = await getFirebaseRuntime();
    if (!firebase.db) return;

    firebase.setDoc(
      getUserDocRef(firebase, user.uid),
      {
        email: user.email || null,
        lastActiveAt: firebase.serverTimestamp()
      },
      { merge: true }
    ).catch((error) => {
      console.error('Failed to update user profile:', error);
    });

    if (!options.skipDashboardUpdate) {
      updateDashboard((currentDashboard) => (
        addCompletedResultToDashboard(currentDashboard, completedResult, {
          countStarted: options.countStarted
        })
      ));
    }

    firebase.addDoc(getResultsCollectionRef(firebase, user.uid), {
      accuracy: completedResult.accuracy,
      correctChars: completedResult.correctChars,
      elapsedSeconds: completedResult.elapsedSeconds,
      endedByAccuracyLock: Boolean(completedResult.endedByAccuracyLock),
      modeLabel: completedResult.modeLabel,
      testType: completedResult.testType,
      trainingMode: completedResult.trainingMode || 'standard',
      wpm: completedResult.wpm,
      wrongChars: completedResult.wrongChars,
      createdAt: firebase.serverTimestamp()
    }).catch((error) => {
      console.error('Failed to save result:', error);
      notify({
        title: 'Result not saved',
        message: 'Your local result is visible, but syncing failed.',
        type: 'error'
      });
    });

    firebase.setDoc(
      getPublicPlayerDocRef(firebase, user.uid),
      serializePublicPlayer(firebase, userProfile, user),
      { merge: true }
    ).catch((error) => {
      console.error('Failed to update public player profile:', error);
    });

    if (completedResult.trainingMode !== 'custom') {
      firebase.addDoc(getLeaderboardCollectionRef(firebase), {
        accuracy: completedResult.accuracy,
        createdAt: firebase.serverTimestamp(),
        modeLabel: completedResult.modeLabel,
        testType: completedResult.testType,
        trainingMode: completedResult.trainingMode || 'standard',
        userId: user.uid,
        wpm: completedResult.wpm
      }).catch((error) => {
        console.error('Failed to save public leaderboard result:', error);
      });
    }
  }, [notify, updateDashboard, user, userProfile]);

  const markIncompleteAttempt = useCallback(() => {
    const currentAttempt = activeAttemptRef.current;
    if (!currentAttempt) return;

    updateDashboard((currentDashboard) => {
      const mode = currentDashboard.modes[currentAttempt.modeLabel] || createModeStats();

      return {
        ...currentDashboard,
        incomplete: currentDashboard.incomplete + 1,
        modes: {
          ...currentDashboard.modes,
          [currentAttempt.modeLabel]: {
            ...mode,
            incomplete: mode.incomplete + 1
          }
        }
      };
    });

    activeAttemptRef.current = null;
  }, [updateDashboard]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthReady(true);
      return undefined;
    }

    let isSubscribed = true;
    let unsubscribe = null;
    let idleCallbackId = null;
    let timeoutId = null;

    const startAuthSync = () => {
      getFirebaseRuntime().then((firebase) => {
        if (!isSubscribed) return;

        if (!firebase.auth) {
          setIsAuthReady(true);
          return;
        }

        unsubscribe = firebase.onAuthStateChanged(firebase.auth, (nextUser) => {
          const syncAuthState = async () => {
            setIsAuthReady(false);

            if (!nextUser) {
              if (!isSubscribed) return;

              setUser(null);
              setUserProfile(normalizeProfile(null, null));
              setIsAuthReady(true);
              return;
            }

            let nextDashboard = createEmptyDashboard();
            let nextProfile = normalizeProfile(null, nextUser);

            try {
              [nextDashboard, nextProfile] = await Promise.all([
                loadFirebaseDashboard(firebase, nextUser.uid),
                loadFirebaseProfile(firebase, nextUser)
              ]);
            } catch (error) {
              if (isSubscribed) {
                console.error('Failed to load dashboard:', error);
                notify({
                  title: 'Account data issue',
                  message: 'Signed in, but some saved data could not be loaded.',
                  type: 'warning'
                });
              }
            }

            if (!isSubscribed) return;

            setUser(nextUser);
            setUserProfile(nextProfile);
            setDashboard(nextDashboard);
            setIsAuthReady(true);
            setIsAuthGateOpen(false);

            if (firebase.db) {
              firebase.setDoc(
                getPublicPlayerDocRef(firebase, nextUser.uid),
                serializePublicPlayer(firebase, nextProfile, nextUser),
                { merge: true }
              ).catch((error) => {
                console.error('Failed to update public player profile:', error);
              });
            }

            if (pendingPage === 'dashboard' || pendingPage === 'profile') {
              window.location.hash = `#${pendingPage}`;
              setCurrentPage(pendingPage);
              setPendingPage(null);
            }
          };

          syncAuthState();
        });
      }).catch((error) => {
        console.error('Failed to initialize Firebase:', error);
        if (isSubscribed) setIsAuthReady(true);
      });
    };

    if (['dashboard', 'profile'].includes(currentPage)) {
      startAuthSync();
    } else if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(startAuthSync, { timeout: 2200 });
    } else {
      timeoutId = window.setTimeout(startAuthSync, 900);
    }

    return () => {
      isSubscribed = false;
      unsubscribe?.();

      if (idleCallbackId !== null) {
        window.cancelIdleCallback?.(idleCallbackId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [currentPage, notify, pendingPage]);
  useEffect(() => {
    if (currentPage !== 'leaderboard') return undefined;

    let isSubscribed = true;
    setLeaderboard((currentLeaderboard) => ({
      ...currentLeaderboard,
      error: '',
      isLoading: true
    }));

    loadGlobalLeaderboard()
      .then((entries) => {
        if (!isSubscribed) return;

        setLeaderboard({
          entries,
          error: '',
          isLoading: false
        });
      })
      .catch((error) => {
        if (!isSubscribed) return;

        console.error('Failed to load leaderboard:', error);
        notify({
          title: 'Leaderboard unavailable',
          message: 'Could not load the latest public scores.',
          type: 'error'
        });
        setLeaderboard({
          entries: [],
          error: 'Could not load the leaderboard.',
          isLoading: false
        });
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentPage, notify]);

  useEffect(() => {
    if (currentPage !== 'public-profile') return undefined;

    const userId = loadPublicProfileUserId();

    if (!userId) {
      setPublicProfile({
        error: 'Could not load this player profile.',
        isLoading: false,
        playerName: 'Player',
        results: [],
        userId: ''
      });
      return undefined;
    }

    let isSubscribed = true;
    setPublicProfile((currentProfile) => ({
      ...currentProfile,
      error: '',
      isLoading: true,
      userId
    }));

    loadPublicPlayerProfile(userId)
      .then((nextProfile) => {
        if (!isSubscribed) return;

        setPublicProfile({
          ...nextProfile,
          isLoading: false,
          userId
        });
      })
      .catch((error) => {
        if (!isSubscribed) return;

        console.error('Failed to load public player profile:', error);
        notify({
          title: 'Profile unavailable',
          message: 'Could not load this public player profile.',
          type: 'error'
        });
        setPublicProfile({
          error: 'Could not load this player profile.',
          isLoading: false,
          playerName: 'Player',
          results: [],
          userId
        });
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentPage, notify]);

  useEffect(() => {
    if (!isAuthReady || user || !['dashboard', 'profile'].includes(currentPage)) return;

    window.location.hash = 'test';
    setCurrentPage('test');
    setPendingPage(currentPage);
    setIsAuthGateOpen(true);
  }, [currentPage, isAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady || !user || !pendingResultSave) return;

    saveCompletedResult(pendingResultSave.result, {
      countStarted: pendingResultSave.countStarted
    });
    setPendingResultSave(null);
  }, [isAuthReady, pendingResultSave, saveCompletedResult, user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.resultMotion = themePersonality.resultMotion;
  }, [theme, themePersonality.resultMotion]);

  useEffect(() => {
    const rootStyle = document.documentElement.style;
    const normalizedAccent = normalizeAccentColor(accentColor);
    const accentRgb = hexToRgbParts(normalizedAccent);

    if (!normalizedAccent || !accentRgb) {
      rootStyle.removeProperty('--accent-2');
      rootStyle.removeProperty('--accent-2-rgb');
      rootStyle.removeProperty('--accent-3');
      rootStyle.removeProperty('--caret');
      rootStyle.removeProperty('--caret-rgb');
      return;
    }

    rootStyle.setProperty('--accent-2', normalizedAccent);
    rootStyle.setProperty('--accent-2-rgb', accentRgb.join(', '));
    rootStyle.setProperty('--accent-3', normalizedAccent);
    rootStyle.setProperty('--caret', normalizedAccent);
    rootStyle.setProperty('--caret-rgb', accentRgb.join(', '));
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    setCurrentPage(loadPage());
    setTheme(loadTheme());
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    setIsPageLoading(true);

    const timeoutId = window.setTimeout(() => {
      setIsPageLoading(false);
    }, 520);

    return () => window.clearTimeout(timeoutId);
  }, [currentPage]);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(loadPage());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const finishTest = useCallback((nextResult) => {
    const previousBest = Number(
      dashboard.modes[nextResult.modeLabel]?.bestWpm
    ) || 0;
    const comparableResults = (dashboard.results || []).filter(
      (result) => result.modeLabel === nextResult.modeLabel
    );
    const personalAverageWpm = comparableResults.length
      ? Math.round(
          comparableResults.reduce(
            (total, result) => total + (Number(result.wpm) || 0),
            0
          ) / comparableResults.length
        )
      : 0;
    const personalAverageAccuracy = comparableResults.length
      ? Math.round(
          comparableResults.reduce(
            (total, result) => total + (Number(result.accuracy) || 0),
            0
          ) / comparableResults.length
        )
      : 0;

    const isInvalidShortCustomTest = isTooShortCustomTest(nextResult);
    const isPersonalBest =
      !isInvalidShortCustomTest &&
      Boolean(user) &&
      nextResult.wpm > previousBest;

    const completedResult = {
      ...nextResult,
      bestWpm: user && !isInvalidShortCustomTest
        ? Math.max(previousBest, nextResult.wpm)
        : 0,
      isInvalid: isInvalidShortCustomTest,
      isPersonalBest,
      personalAverageAccuracy,
      personalAverageWpm
    };

    setResult(completedResult);
    activeAttemptRef.current = null;

    if (isInvalidShortCustomTest) {
      notify({
        title: 'test invalid - too short',
        message: `Use at least ${MIN_CUSTOM_TEST_CHARACTERS} characters for custom tests.`,
        type: 'warning'
      });
      return;
    }

    updateDashboard((currentDashboard) => (
      addCompletedResultToDashboard(currentDashboard, completedResult)
    ));

    if (user && isFirebaseConfigured) {
      saveCompletedResult(completedResult, { skipDashboardUpdate: true });
    } else if (isFirebaseConfigured) {
      setPendingResultSave({
        countStarted: true,
        result: completedResult
      });
      setIsAuthGateOpen(true);
    } else {
      console.error('Typing performance was not saved because Firebase is not configured.');
    }
  }, [dashboard.modes, dashboard.results, notify, saveCompletedResult, updateDashboard, user]);

  const handleTestStart = useCallback((startedTest) => {
    if (activeAttemptRef.current) return;

    const modeLabel = getModeLabel(
      startedTest.testType,
      startedTest.testValue,
      startedTest.trainingMode
    );
    const attempt = {
      id: createId(),
      modeLabel,
      targetText: startedTest.targetText || '',
      testType: startedTest.testType,
      testValue: startedTest.testValue,
      trainingMode: startedTest.trainingMode || 'standard'
    };

    if (isTooShortCustomTest(attempt)) return;

    activeAttemptRef.current = attempt;

    updateDashboard((currentDashboard) => {
      const mode = currentDashboard.modes[modeLabel] || createModeStats();

      return {
        ...currentDashboard,
        started: currentDashboard.started + 1,
        modes: {
          ...currentDashboard.modes,
          [modeLabel]: {
            ...mode,
            started: mode.started + 1
          }
        }
      };
    });
  }, [updateDashboard, user]);

  const resetTest = useCallback((options = {}) => {
    markIncompleteAttempt();
    setReplayTargetText(options.targetText || null);
    setResult(null);
    setIsActive(false);
    setRestartKey((key) => key + 1);
  }, [markIncompleteAttempt]);

  const restart = useCallback(() => {
    resetTest();
  }, [resetTest]);

  const tryAgain = useCallback(() => {
    if (!result?.targetText) {
      resetTest();
      return;
    }

    resetTest({ targetText: result.targetText });
  }, [resetTest, result]);

  const handleSettingsChange = useCallback((nextType, nextValue) => {
    markIncompleteAttempt();
    setReplayTargetText(null);

    const nextSettings = {
      ...settings,
      testType: nextType,
      ...(nextType === 'time'
        ? { timeMode: normalizeTimeMode(nextValue) }
        : { wordMode: nextValue })
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
    setResult(null);
    setRestartKey((key) => key + 1);
  }, [markIncompleteAttempt, settings]);

  const handleTrainingModeChange = useCallback((nextTrainingMode) => {
    if (!TRAINING_MODE_IDS.includes(nextTrainingMode)) return;

    markIncompleteAttempt();
    setReplayTargetText(null);

    const nextSettings = {
      ...settings,
      trainingMode: nextTrainingMode
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
    setResult(null);
    setRestartKey((key) => key + 1);
  }, [markIncompleteAttempt, settings]);

  const handleCustomTextChange = useCallback((nextCustomText) => {
    const trimmedCustomText = String(nextCustomText || '').slice(0, MAX_CUSTOM_TEXT_LENGTH);
    const nextSettings = {
      ...settings,
      customText: trimmedCustomText
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);

    if (settings.trainingMode !== 'custom') return;

    markIncompleteAttempt();
    setReplayTargetText(null);
    setResult(null);
    setRestartKey((key) => key + 1);
  }, [markIncompleteAttempt, settings]);

  const handleSoundToggle = useCallback((nextSoundEnabled) => {
    const nextSettings = {
      ...settings,
      soundEnabled: nextSoundEnabled
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
  }, [settings]);

  const handlePreferencesChange = useCallback((nextOptions) => {
    const nextSettings = {
      ...settings,
      ...nextOptions,
      mistakeMode: MISTAKE_MODES.includes(nextOptions.mistakeMode)
        ? nextOptions.mistakeMode
        : settings.mistakeMode,
      reducedMotion:
        typeof nextOptions.reducedMotion === 'boolean'
          ? nextOptions.reducedMotion
          : settings.reducedMotion,
      accentColor:
        typeof nextOptions.accentColor === 'string'
          ? normalizeAccentColor(nextOptions.accentColor, settings.accentColor)
          : settings.accentColor,
      showKeyboard:
        typeof nextOptions.showKeyboard === 'boolean'
          ? nextOptions.showKeyboard
          : settings.showKeyboard,
      soundStyle: [...SOUND_STYLES, 'theme'].includes(nextOptions.soundStyle)
        ? nextOptions.soundStyle
        : settings.soundStyle,
      soundVolume:
        Number.isFinite(Number(nextOptions.soundVolume))
          ? Math.min(1, Math.max(0, Number(nextOptions.soundVolume)))
          : settings.soundVolume
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
  }, [settings]);

  const handleSignOut = () => {
    setIsSignOutConfirmOpen(true);
  };

  const confirmSignOut = async () => {
    if (!isFirebaseConfigured) return;
    setPendingPage(null);
    setIsAuthGateOpen(false);
    window.location.hash = 'test';
    setCurrentPage('test');

    try {
      const firebase = await getFirebaseRuntime();
      if (!firebase.auth) return;

      await firebase.signOut(firebase.auth);
      setIsSignOutConfirmOpen(false);
    } catch (error) {
      console.error('Sign out failed:', error);
      notify({
        title: 'Sign out failed',
        message: 'Try again in a moment.',
        type: 'error'
      });
    }
  };

  const handleThemeChange = (nextTheme) => {
    if (!THEMES.includes(nextTheme)) return;
    if (!getUnlockedThemeIds(dashboard).includes(nextTheme) && nextTheme !== theme) return;
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

  const saveUserProfile = useCallback(async (nextProfile) => {
    if (!user || !isFirebaseConfigured) return;

    const firebase = await getFirebaseRuntime();
    if (!firebase.db) return;

    const profilePayload = {
      city: nextProfile.city || '',
      displayName: user.displayName || null,
      email: user.email || null,
      github: nextProfile.github || '',
      occupation: nextProfile.occupation || '',
      photoURL: user.photoURL || null,
      updatedAt: firebase.serverTimestamp(),
      username: nextProfile.username || '',
      website: nextProfile.website || ''
    };

    await firebase.setDoc(getUserDocRef(firebase, user.uid), profilePayload, { merge: true });
    await firebase.setDoc(
      getPublicPlayerDocRef(firebase, user.uid),
      serializePublicPlayer(firebase, nextProfile, user),
      { merge: true }
    );
    setUserProfile((currentProfile) => ({
      ...currentProfile,
      ...nextProfile
    }));
  }, [user]);

  const requestPasswordReset = useCallback(async () => {
    if (!user?.email || !isFirebaseConfigured) {
      throw new Error('Password reset is only available for email accounts.');
    }

    const firebase = await getFirebaseRuntime();
    if (!firebase.auth || !firebase.db) {
      throw new Error('Password reset is only available for email accounts.');
    }

    const recentResetEmails = getRecentAccountEvents(
      userProfile.accountSecurity?.resetEmailSentAt
    );

    if (recentResetEmails.length >= PASSWORD_RESET_EMAIL_LIMIT) {
      throw new Error(
        `You can send ${PASSWORD_RESET_EMAIL_LIMIT} reset emails every ${ACCOUNT_SECURITY_WINDOW_DAYS} days.`
      );
    }

    try {
      await firebase.sendPasswordResetEmail(
        firebase.auth,
        user.email,
        getPasswordResetActionSettings()
      );

      const nextResetEmailDates = [new Date(), ...recentResetEmails];
      await firebase.setDoc(
        getUserDocRef(firebase, user.uid),
        {
          accountSecurity: {
            resetEmailSentAt: nextResetEmailDates
          },
          email: user.email || null,
          updatedAt: firebase.serverTimestamp()
        },
        { merge: true }
      );

      setUserProfile((currentProfile) => ({
        ...currentProfile,
        accountSecurity: {
          ...(currentProfile.accountSecurity || {}),
          resetEmailSentAt: nextResetEmailDates
        }
      }));
    } catch (error) {
      if (error?.message?.startsWith('You can send')) {
        throw error;
      }

      throw new Error(getAuthActionErrorMessage(error));
    }
  }, [user, userProfile.accountSecurity]);

  const changePassword = useCallback(async ({ currentPassword, nextPassword }) => {
    if (!user?.email || !isFirebaseConfigured) {
      throw new Error('Password changes are only available for accounts with an email.');
    }

    const firebase = await getFirebaseRuntime();
    if (!firebase.auth || !firebase.db) {
      throw new Error('Password changes are only available for accounts with an email.');
    }

    const hasPasswordProvider = user.providerData?.some(
      (provider) => provider.providerId === 'password'
    );

    if (hasPasswordProvider && !currentPassword) {
      throw new Error('Enter your current password.');
    }

    if (!nextPassword || nextPassword.length < 6) {
      throw new Error('New password should be at least 6 characters.');
    }

    const recentPasswordChanges = getRecentAccountEvents(
      userProfile.accountSecurity?.passwordChangedAt
    );

    if (recentPasswordChanges.length >= PASSWORD_CHANGE_LIMIT) {
      throw new Error(
        `You can change your password ${PASSWORD_CHANGE_LIMIT} times every ${ACCOUNT_SECURITY_WINDOW_DAYS} days.`
      );
    }

    try {
      const credential = firebase.EmailAuthProvider.credential(user.email, nextPassword);

      if (hasPasswordProvider) {
        const currentCredential = firebase.EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

        await firebase.reauthenticateWithCredential(user, currentCredential);
        await firebase.updatePassword(user, nextPassword);
      } else {
        await firebase.linkWithCredential(user, credential);
      }

      await user.reload?.();

      const nextPasswordChangeDates = [new Date(), ...recentPasswordChanges];
      await firebase.setDoc(
        getUserDocRef(firebase, user.uid),
        {
          accountSecurity: {
            passwordChangedAt: nextPasswordChangeDates
          },
          email: user.email || null,
          updatedAt: firebase.serverTimestamp()
        },
        { merge: true }
      );

      setUserProfile((currentProfile) => ({
        ...currentProfile,
        accountSecurity: {
          ...(currentProfile.accountSecurity || {}),
          passwordChangedAt: nextPasswordChangeDates
        }
      }));
    } catch (error) {
      if (
        error?.message?.startsWith('You can change') ||
        error?.message?.startsWith('Enter your') ||
        error?.message?.startsWith('New password')
      ) {
        throw error;
      }

      throw new Error(getAuthActionErrorMessage(error));
    }
  }, [user, userProfile.accountSecurity]);

  const dismissMobileTip = () => {
    setShowMobileTip(false);
  };

  const navigate = (nextPage, options = {}) => {
    if (['dashboard', 'profile'].includes(nextPage) && isAuthReady && !user) {
      setPendingPage(nextPage);
      setIsAuthGateOpen(true);
      return;
    }

    if (nextPage === currentPage) {
      if (nextPage === 'test' && options.restart) {
        restart();
      }

      return;
    }

    if (
      nextPage === 'dashboard' ||
      nextPage === 'profile' ||
      nextPage === 'leaderboard' ||
      nextPage === 'public-profile' ||
      nextPage === 'settings' ||
      nextPage === 'privacy' ||
      nextPage === 'terms'
    ) {
      markIncompleteAttempt();
      setReplayTargetText(null);
      setResult(null);
      setIsActive(false);
      setRestartKey((key) => key + 1);
    } else if (options.restart) {
      restart();
    }

    window.location.hash = nextPage === 'test' ? 'test' : nextPage;
    setCurrentPage(nextPage);
  };

  const openPublicProfile = (userId) => {
    if (!userId) return;

    markIncompleteAttempt();
    setReplayTargetText(null);
    setResult(null);
    setIsActive(false);
    setRestartKey((key) => key + 1);
    window.location.hash = `player=${encodeURIComponent(userId)}`;
    setCurrentPage('public-profile');
  };

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isFormField =
        tagName === 'input' || tagName === 'textarea' || tagName === 'select';
      const isEditable = isFormField || event.target?.isContentEditable;
      const hasModifier = event.altKey || event.ctrlKey || event.metaKey;
      const normalizedKey = event.key.toLowerCase();

      if (isOnboardingOpen) return;

      if (isAuthGateOpen || isSignOutConfirmOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setPendingPage(null);
          setIsAuthGateOpen(false);
          setIsSignOutConfirmOpen(false);
        }

        return;
      }

      if (isEditable && !hasModifier && event.key !== 'Escape') {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        restart();
        return;
      }

      if (result && event.key === 'Enter' && !hasModifier) {
        event.preventDefault();

        if (event.shiftKey) {
          tryAgain();
        } else {
          restart();
        }

        return;
      }

      if (event.key === 'Escape' && currentPage === 'test') {
        event.preventDefault();
        restart();
        return;
      }

      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      if (normalizedKey === 't') {
        event.preventDefault();
        navigate('test');
        return;
      }

      if (normalizedKey === 'd') {
        event.preventDefault();
        navigate('dashboard');
        return;
      }

      if (normalizedKey === 'l') {
        event.preventDefault();
        navigate('leaderboard');
        return;
      }

      if (normalizedKey === 'p') {
        event.preventDefault();
        navigate('profile');
        return;
      }

      if (normalizedKey === 's') {
        event.preventDefault();
        navigate('settings');
        return;
      }

      if (currentPage !== 'test' || isActive) return;

      const shortcutIndex = Number(event.key) - 1;

      if (!Number.isInteger(shortcutIndex)) return;

      if (shortcutIndex >= 0 && shortcutIndex < SHORTCUT_TIME_MODES.length) {
        event.preventDefault();
        handleSettingsChange('time', SHORTCUT_TIME_MODES[shortcutIndex]);
        return;
      }

      const wordModeIndex = shortcutIndex - SHORTCUT_TIME_MODES.length;

      if (wordModeIndex >= 0 && wordModeIndex < SHORTCUT_WORD_MODES.length) {
        event.preventDefault();
        handleSettingsChange('words', SHORTCUT_WORD_MODES[wordModeIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [
    currentPage,
    handleSettingsChange,
    isActive,
    isAuthGateOpen,
    isOnboardingOpen,
    isSignOutConfirmOpen,
    navigate,
    restart,
    result,
    tryAgain
  ]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <LayoutGroup>
        <motion.div className="app" data-theme={theme} layout>
        <AnimatePresence>
          {(!isAuthReady || isPageLoading) && (
            <motion.div
              className="page-loading-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <span />
            </motion.div>
          )}
        </AnimatePresence>

        <Header
          currentPage={currentPage}
          onNavigate={navigate}
          onNotify={notify}
          profile={userProfile}
          user={user}
        />

        <AnimatePresence>
          {showMobileTip && currentPage === 'test' && (
            <motion.div
              className="mobile-tip"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <span>Best with a physical keyboard. Mobile testing still works.</span>
              <button
                aria-label="Dismiss mobile typing tip"
                onClick={dismissMobileTip}
                type="button"
              >
                x
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOnboardingOpen && !isAuthGateOpen && !isSignOutConfirmOpen && (
            <Onboarding onDismiss={dismissOnboarding} />
          )}
        </AnimatePresence>

        <div
          className={
            isAuthGateOpen || isSignOutConfirmOpen
              ? 'page-content gated-blur'
              : 'page-content'
          }
        >
          <Suspense fallback={null}>
            <AnimatePresence mode="wait">
              {currentPage === 'dashboard' && user ? (
                <Dashboard key="dashboard" dashboard={dashboard} />
              ) : currentPage === 'leaderboard' ? (
                <Leaderboard
                  key="leaderboard"
                  entries={leaderboard.entries}
                  error={leaderboard.error}
                  isLoading={leaderboard.isLoading}
                  currentUserId={user?.uid || ''}
                  onOpenProfile={openPublicProfile}
                />
              ) : currentPage === 'public-profile' ? (
                <PublicProfile
                  key={`public-profile-${publicProfile.userId}`}
                  error={publicProfile.error}
                  isLoading={publicProfile.isLoading}
                  onBack={() => navigate('leaderboard')}
                  playerName={publicProfile.playerName}
                  results={publicProfile.results}
                />
              ) : currentPage === 'profile' && user ? (
                <Profile
                  key="profile"
                  onChangePassword={changePassword}
                  onNotify={notify}
                  onRequestPasswordReset={requestPasswordReset}
                  dashboard={dashboard}
                  onSaveProfile={saveUserProfile}
                  onSignOut={handleSignOut}
                  profile={userProfile}
                  user={user}
                />
              ) : currentPage === 'settings' ? (
                <SettingsPage
                  key="settings"
                  accentColor={accentColor}
                  dashboard={dashboard}
                  mistakeMode={mistakeMode}
                  onPreferencesChange={handlePreferencesChange}
                  onSoundToggle={handleSoundToggle}
                  onThemeChange={handleThemeChange}
                  reducedMotion={reducedMotion}
                  showKeyboard={showKeyboard}
                  soundEnabled={soundEnabled}
                  soundStyle={soundStyle}
                  soundVolume={soundVolume}
                  theme={theme}
                />
              ) : currentPage === 'privacy' || currentPage === 'terms' ? (
                <LegalPage
                  key={currentPage}
                  onBack={() => navigate('test')}
                  type={currentPage}
                />
              ) : (
              <motion.div
                key="test-page"
                className="home-page"
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <AnimatePresence initial={false}>
                  {!result && (
                    <motion.div
                      data-onboarding-target="settings"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <TestSettings
                        customText={customText}
                        disabled={isActive}
                        onCustomTextChange={handleCustomTextChange}
                        onSettingsChange={handleSettingsChange}
                        onTrainingModeChange={handleTrainingModeChange}
                        selectedType={testType}
                        selectedTrainingMode={trainingMode}
                        selectedValue={testType === 'time' ? timeMode : wordMode}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {result ? (
                    <Results
                      key="results"
                      onNextGame={restart}
                      onTryAgain={tryAgain}
                      stats={result}
                    />
                  ) : (
                    <TypingTest
                      key="test"
                      onActiveChange={setIsActive}
                      onFinish={finishTest}
                      onRestart={restart}
                      onStart={handleTestStart}
                      mistakeMode={mistakeMode}
                      restartKey={restartKey}
                      showKeyboard={showKeyboard}
                      soundEnabled={soundEnabled}
                      soundStyle={effectiveSoundStyle}
                      soundVolume={soundVolume}
                      testType={testType}
                      testValue={testType === 'time' ? timeMode : wordMode}
                      targetTextOverride={replayTargetText}
                      customText={customText}
                      trainingMode={trainingMode}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
              )}
            </AnimatePresence>
          </Suspense>
        </div>

        <Footer onNavigate={navigate} />

        <AnimatePresence>
          {isAuthGateOpen && (
            <motion.div
              className="auth-gate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <button
                aria-label="Close sign in prompt"
                className="auth-gate-backdrop"
                onClick={() => {
                  setPendingPage(null);
                  setIsAuthGateOpen(false);
                }}
                type="button"
              />
              <Suspense fallback={null}>
                <AuthPanel
                  className="auth-panel auth-panel-modal"
                  message="Sign in to save results and view your typing performance."
                  onNotify={notify}
                  onClose={() => {
                    setPendingPage(null);
                    setIsAuthGateOpen(false);
                  }}
                  onSuccess={() => setIsAuthGateOpen(false)}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSignOutConfirmOpen && (
            <motion.div
              className="auth-gate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <button
                aria-label="Close sign out confirmation"
                className="auth-gate-backdrop"
                onClick={() => setIsSignOutConfirmOpen(false)}
                type="button"
              />
              <motion.section
                className="confirm-panel"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="eyebrow">account</p>
                <h2>Sign out?</h2>
                <p className="confirm-copy">
                  Your saved typing performance stays in your account.
                </p>
                <div className="confirm-actions">
                  <button
                    className="confirm-secondary"
                    onClick={() => setIsSignOutConfirmOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-primary"
                    onClick={confirmSignOut}
                    type="button"
                  >
                    Sign out
                  </button>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
        <ToastStack onDismiss={dismissToast} toasts={toasts} />
        </motion.div>
      </LayoutGroup>
    </MotionConfig>
  );
}

export default App;

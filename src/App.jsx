'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import AuthPanel from './components/AuthPanel.jsx';
import Dashboard from './components/Dashboard.jsx';
import Header from './components/Header.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Profile from './components/Profile.jsx';
import PublicProfile from './components/PublicProfile.jsx';
import Results from './components/Results.jsx';
import TestSettings from './components/TestSettings.jsx';
import TypingTest from './components/TypingTest.jsx';
import { auth, db, isFirebaseConfigured } from './services/firebase.js';

const SETTINGS_KEY = 'typecheck-settings';
const THEME_KEY = 'typecheck-theme';
const ONBOARDING_KEY = 'typecheck-onboarding-complete';
const THEMES = ['matrix', 'serika', 'botanical', 'midnight', 'rose'];
const MODE_LABELS = ['15s', '30s', '60s', '10 words', '30 words', '60 words'];
const SHORTCUT_TIME_MODES = [15, 30, 60];
const SHORTCUT_WORD_MODES = [10, 30, 60];
const PROFILE_RESULTS_LIMIT = 400;
const LEADERBOARD_RESULTS_LIMIT = 500;
const LEADERBOARD_MODE_LABEL = '10 words';
const DEFAULT_SETTINGS = {
  testType: 'time',
  timeMode: 30,
  wordMode: 10
};
const MIN_CUSTOM_TIME = 5;
const MAX_CUSTOM_TIME = 300;

function normalizeTimeMode(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return DEFAULT_SETTINGS.timeMode;

  return Math.min(
    MAX_CUSTOM_TIME,
    Math.max(MIN_CUSTOM_TIME, Math.round(numericValue))
  );
}

function loadPage() {
  if (typeof window === 'undefined') return 'test';

  if (window.location.hash === '#dashboard') return 'dashboard';
  if (window.location.hash === '#leaderboard') return 'leaderboard';
  if (window.location.hash === '#profile') return 'profile';
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
      testType:
        savedSettings?.testType === 'words' || savedSettings?.testType === 'time'
          ? savedSettings.testType
          : DEFAULT_SETTINGS.testType,
      timeMode: normalizeTimeMode(savedSettings?.timeMode),
      wordMode: [10, 30, 60].includes(savedSettings?.wordMode)
        ? savedSettings.wordMode
        : DEFAULT_SETTINGS.wordMode
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

    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return true;
  }
}

function saveOnboardingComplete() {
  try {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(ONBOARDING_KEY, 'true');
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
    modes: Object.fromEntries(
      MODE_LABELS.map((label) => [
        label,
        {
          ...createModeStats(),
          ...(savedDashboard.modes?.[label] || {})
        }
      ])
    ),
    results: normalizedResults,
    totalTypingSeconds:
      Number(savedDashboard.totalTypingSeconds) || fallbackTypingSeconds
  };
}

function getModeLabel(testType, testValue) {
  return testType === 'words' ? `${testValue} words` : `${testValue}s`;
}

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function getDashboardDocRef(userId) {
  return doc(db, 'users', userId, 'stats', 'dashboard');
}

function getUserDocRef(userId) {
  return doc(db, 'users', userId);
}

function getResultsCollectionRef(userId) {
  return collection(db, 'users', userId, 'results');
}

function getLeaderboardCollectionRef() {
  return collection(db, 'leaderboardResults');
}

function getPublicPlayerDocRef(userId) {
  return doc(db, 'publicPlayers', userId);
}

function serializeDashboard(dashboard) {
  return {
    completed: dashboard.completed,
    estimatedWordsTyped: dashboard.estimatedWordsTyped || 0,
    incomplete: dashboard.incomplete,
    modes: dashboard.modes,
    started: dashboard.started,
    totalTypingSeconds: dashboard.totalTypingSeconds || 0,
    updatedAt: serverTimestamp()
  };
}

function normalizeProfile(savedProfile, user) {
  const joinedAt =
    savedProfile?.createdAt?.toDate?.() ||
    savedProfile?.createdAt ||
    user?.metadata?.creationTime ||
    null;

  return {
    city: savedProfile?.city || '',
    github: savedProfile?.github || '',
    joinedAt,
    occupation: savedProfile?.occupation || '',
    username: savedProfile?.username || '',
    website: savedProfile?.website || ''
  };
}

async function loadFirebaseProfile(user) {
  if (!db || !user) {
    return normalizeProfile(null, user);
  }

  const userDocRef = getUserDocRef(user.uid);
  const userSnapshot = await getDoc(userDocRef);
  const savedProfile = userSnapshot.data();

  if (!userSnapshot.exists() || !savedProfile?.createdAt) {
    setDoc(
      userDocRef,
      {
        createdAt: serverTimestamp(),
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

async function loadFirebaseDashboard(userId) {
  if (!db) return createEmptyDashboard();

  const [dashboardSnapshot, resultsSnapshot] = await Promise.all([
    getDoc(getDashboardDocRef(userId)),
    getDocs(query(
      getResultsCollectionRef(userId),
      orderBy('createdAt', 'desc'),
      limit(PROFILE_RESULTS_LIMIT)
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
      modeLabel: data.modeLabel || '',
      testType: data.testType || 'time',
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

function serializePublicPlayer(profile, user) {
  return {
    displayName: user?.displayName || null,
    fallbackName: toDisplayNameFromEmail(user?.email),
    username: profile?.username || '',
    updatedAt: serverTimestamp()
  };
}

async function loadGlobalLeaderboard() {
  if (!db) return [];

  const resultsSnapshot = await getDocs(query(
    getLeaderboardCollectionRef(),
    orderBy('wpm', 'desc'),
    limit(LEADERBOARD_RESULTS_LIMIT)
  ));
  const userIds = [...new Set(resultsSnapshot.docs
    .map((resultDoc) => resultDoc.data().userId)
    .filter(Boolean))];
  const userProfiles = new Map();

  await Promise.all(userIds.map(async (userId) => {
    const userSnapshot = await getDoc(getPublicPlayerDocRef(userId));
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
        userId,
        wpm: Number(data.wpm) || 0
      };
    })
    .filter((result) => result.modeLabel === LEADERBOARD_MODE_LABEL)
    .sort((firstResult, secondResult) => (
      secondResult.wpm - firstResult.wpm ||
      secondResult.accuracy - firstResult.accuracy ||
      (new Date(secondResult.createdAt || 0) - new Date(firstResult.createdAt || 0))
    ));
  const bestByUser = new Map();

  rankedResults.forEach((result) => {
    if (!result.userId || bestByUser.has(result.userId)) return;

    bestByUser.set(result.userId, result);
  });

  return [...bestByUser.values()].slice(0, 50);
}

async function loadPublicPlayerProfile(userId) {
  if (!db || !userId) {
    return {
      error: 'Could not load this player profile.',
      playerName: 'Player',
      results: []
    };
  }

  const [playerSnapshot, resultsSnapshot] = await Promise.all([
    getDoc(getPublicPlayerDocRef(userId)),
    getDocs(query(
      getLeaderboardCollectionRef(),
      orderBy('wpm', 'desc'),
      limit(LEADERBOARD_RESULTS_LIMIT)
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
        userId: data.userId || '',
        wpm: Number(data.wpm) || 0
      };
    })
    .filter((result) => (
      result.userId === userId &&
      result.modeLabel === LEADERBOARD_MODE_LABEL
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
    title: 'Pick a mode',
    text: 'Choose a time limit or word count before you start.'
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
    selector: '[data-onboarding-target="account-dashboard"]',
    title: 'Track progress',
    text: 'Sign in when you want your results and dashboard saved.'
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
  const [isAuthReady, setIsAuthReady] = useState(!auth);
  const [isAuthGateOpen, setIsAuthGateOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [showMobileTip, setShowMobileTip] = useState(true);
  const [pendingPage, setPendingPage] = useState(null);
  const [pendingResultSave, setPendingResultSave] = useState(null);
  const [replayTargetText, setReplayTargetText] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const { testType, timeMode, wordMode } = settings;

  const updateDashboard = useCallback((updater) => {
    if (!user || !db) return;

    setDashboard((currentDashboard) => {
      const nextDashboard = updater(currentDashboard);

      setDoc(getDashboardDocRef(user.uid), serializeDashboard(nextDashboard), {
        merge: true
      }).catch((error) => {
        console.error('Failed to save dashboard:', error);
      });

      return nextDashboard;
    });
  }, [user]);

  useEffect(() => {
    setIsOnboardingOpen(!loadOnboardingComplete());
  }, []);

  const dismissOnboarding = useCallback(() => {
    saveOnboardingComplete();
    setIsOnboardingOpen(false);
  }, []);

  const saveCompletedResult = useCallback((completedResult, options = {}) => {
    if (!user || !db) {
      if (!isFirebaseConfigured) {
        console.error('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* values before saving performance.');
      }
      return;
    }

    setDoc(
      getUserDocRef(user.uid),
      {
        email: user.email || null,
        lastActiveAt: serverTimestamp()
      },
      { merge: true }
    ).catch((error) => {
      console.error('Failed to update user profile:', error);
    });

    updateDashboard((currentDashboard) => {
      const mode = currentDashboard.modes[completedResult.modeLabel] || createModeStats();
      const nextMode = {
        ...mode,
        started: mode.started + (options.countStarted ? 1 : 0),
        completed: mode.completed + 1,
        bestWpm: Math.max(mode.bestWpm || 0, completedResult.wpm),
        bestAccuracy: Math.max(mode.bestAccuracy || 0, completedResult.accuracy)
      };

      return {
        ...currentDashboard,
        started: currentDashboard.started + (options.countStarted ? 1 : 0),
        completed: currentDashboard.completed + 1,
        modes: {
          ...currentDashboard.modes,
          [completedResult.modeLabel]: nextMode
        },
        results: [
          {
            id: createId(),
            accuracy: completedResult.accuracy,
            correctChars: completedResult.correctChars,
            createdAt: new Date(),
            elapsedSeconds: completedResult.elapsedSeconds,
            modeLabel: completedResult.modeLabel,
            testType: completedResult.testType,
            wpm: completedResult.wpm,
            wrongChars: completedResult.wrongChars
          },
          ...currentDashboard.results
        ].slice(0, PROFILE_RESULTS_LIMIT),
        estimatedWordsTyped:
          (Number(currentDashboard.estimatedWordsTyped) || 0) +
          Math.round((Number(completedResult.correctChars) || 0) / 5),
        totalTypingSeconds:
          (Number(currentDashboard.totalTypingSeconds) || 0) +
          (Number(completedResult.elapsedSeconds) || 0)
      };
    });

    addDoc(getResultsCollectionRef(user.uid), {
      accuracy: completedResult.accuracy,
      correctChars: completedResult.correctChars,
      elapsedSeconds: completedResult.elapsedSeconds,
      modeLabel: completedResult.modeLabel,
      testType: completedResult.testType,
      wpm: completedResult.wpm,
      wrongChars: completedResult.wrongChars,
      createdAt: serverTimestamp()
    }).catch((error) => {
      console.error('Failed to save result:', error);
    });

    setDoc(
      getPublicPlayerDocRef(user.uid),
      serializePublicPlayer(userProfile, user),
      { merge: true }
    ).catch((error) => {
      console.error('Failed to update public player profile:', error);
    });

    if (completedResult.modeLabel === LEADERBOARD_MODE_LABEL) {
      addDoc(getLeaderboardCollectionRef(), {
        accuracy: completedResult.accuracy,
        createdAt: serverTimestamp(),
        modeLabel: completedResult.modeLabel,
        testType: completedResult.testType,
        userId: user.uid,
        wpm: completedResult.wpm
      }).catch((error) => {
        console.error('Failed to save public leaderboard result:', error);
      });
    }
  }, [updateDashboard, user, userProfile]);

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
    if (!auth) {
      setIsAuthReady(true);
      return undefined;
    }

    let isSubscribed = true;

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const syncAuthState = async () => {
        setIsAuthReady(false);

        if (!nextUser) {
          if (!isSubscribed) return;

          setUser(null);
          setUserProfile(normalizeProfile(null, null));
          setDashboard(createEmptyDashboard());
          setIsAuthReady(true);
          return;
        }

        let nextDashboard = createEmptyDashboard();
        let nextProfile = normalizeProfile(null, nextUser);

        try {
          [nextDashboard, nextProfile] = await Promise.all([
            loadFirebaseDashboard(nextUser.uid),
            loadFirebaseProfile(nextUser)
          ]);
        } catch (error) {
          if (isSubscribed) {
            console.error('Failed to load dashboard:', error);
          }
        }

        if (!isSubscribed) return;

        setUser(nextUser);
        setUserProfile(nextProfile);
        setDashboard(nextDashboard);
        setIsAuthReady(true);
        setIsAuthGateOpen(false);

        if (db) {
          setDoc(
            getPublicPlayerDocRef(nextUser.uid),
            serializePublicPlayer(nextProfile, nextUser),
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

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [pendingPage]);

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
        setLeaderboard({
          entries: [],
          error: 'Could not load the leaderboard.',
          isLoading: false
        });
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentPage]);

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
  }, [currentPage]);

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
  }, [theme]);

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

    const isPersonalBest = Boolean(user) && nextResult.wpm > previousBest;

    const completedResult = {
      ...nextResult,
      bestWpm: user ? Math.max(previousBest, nextResult.wpm) : 0,
      isPersonalBest
    };

    setResult(completedResult);
    activeAttemptRef.current = null;

    if (user && db) {
      saveCompletedResult(completedResult);
    } else if (auth && isFirebaseConfigured) {
      setPendingResultSave({
        countStarted: true,
        result: completedResult
      });
      setIsAuthGateOpen(true);
    } else {
      console.error('Typing performance was not saved because Firebase is not configured.');
    }
  }, [dashboard.modes, saveCompletedResult, user]);

  const handleTestStart = useCallback((startedTest) => {
    if (!user) return;
    if (activeAttemptRef.current) return;

    const modeLabel = getModeLabel(startedTest.testType, startedTest.testValue);
    const attempt = {
      id: createId(),
      modeLabel,
      testType: startedTest.testType,
      testValue: startedTest.testValue
    };

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

  const handleSignOut = () => {
    setIsSignOutConfirmOpen(true);
  };

  const confirmSignOut = () => {
    if (!auth) return;
    setPendingPage(null);
    setIsAuthGateOpen(false);
    window.location.hash = 'test';
    setCurrentPage('test');
    signOut(auth);
    setIsSignOutConfirmOpen(false);
  };

  const handleThemeChange = (nextTheme) => {
    if (!THEMES.includes(nextTheme)) return;
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

  const saveUserProfile = useCallback(async (nextProfile) => {
    if (!user || !db) return;

    const profilePayload = {
      city: nextProfile.city || '',
      displayName: user.displayName || null,
      email: user.email || null,
      github: nextProfile.github || '',
      occupation: nextProfile.occupation || '',
      photoURL: user.photoURL || null,
      updatedAt: serverTimestamp(),
      username: nextProfile.username || '',
      website: nextProfile.website || ''
    };

    await setDoc(getUserDocRef(user.uid), profilePayload, { merge: true });
    await setDoc(
      getPublicPlayerDocRef(user.uid),
      serializePublicPlayer(nextProfile, user),
      { merge: true }
    );
    setUserProfile((currentProfile) => ({
      ...currentProfile,
      ...nextProfile
    }));
  }, [user]);

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
      nextPage === 'public-profile'
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
          onThemeChange={handleThemeChange}
          profile={userProfile}
          theme={theme}
          user={user}
        />

        <AnimatePresence>
          {showMobileTip && (
            <motion.div
              className="mobile-tip"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <span>A laptop keyboard gives the most accurate typing results.</span>
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
          <AnimatePresence mode="wait">
            {currentPage === 'dashboard' && user ? (
              <Dashboard key="dashboard" dashboard={dashboard} />
            ) : currentPage === 'leaderboard' ? (
              <Leaderboard
                key="leaderboard"
                entries={leaderboard.entries}
                error={leaderboard.error}
                isLoading={leaderboard.isLoading}
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
                dashboard={dashboard}
                onSaveProfile={saveUserProfile}
                onSignOut={handleSignOut}
                profile={userProfile}
                user={user}
              />
            ) : (
              <motion.div
                key="test-page"
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div data-onboarding-target="settings">
                  <TestSettings
                    disabled={isActive}
                    onSettingsChange={handleSettingsChange}
                    selectedType={testType}
                    selectedValue={testType === 'time' ? timeMode : wordMode}
                  />
                </div>

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
                      restartKey={restartKey}
                      testType={testType}
                      testValue={testType === 'time' ? timeMode : wordMode}
                      targetTextOverride={replayTargetText}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
              <AuthPanel
                className="auth-panel auth-panel-modal"
                message="Sign in to save results and view your typing performance."
                onClose={() => {
                  setPendingPage(null);
                  setIsAuthGateOpen(false);
                }}
                onSuccess={() => setIsAuthGateOpen(false)}
              />
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
      </motion.div>
    </LayoutGroup>
  );
}

export default App;

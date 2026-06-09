import { useCallback, useEffect, useRef, useState } from 'react';
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
import Results from './components/Results.jsx';
import TestSettings from './components/TestSettings.jsx';
import TypingTest from './components/TypingTest.jsx';
import { auth, db, isFirebaseConfigured } from './services/firebase.js';

const SETTINGS_KEY = 'typecheck-settings';
const THEME_KEY = 'typecheck-theme';
const THEMES = ['matrix', 'serika', 'botanical', 'midnight', 'rose'];
const MODE_LABELS = ['15s', '30s', '60s', '10 words', '30 words', '60 words'];
const SHORTCUT_TIME_MODES = [15, 30, 60];
const SHORTCUT_WORD_MODES = [10, 30, 60];
const DEFAULT_SETTINGS = {
  testType: 'time',
  timeMode: 30,
  wordMode: 10
};

function loadPage() {
  return window.location.hash === '#dashboard' ? 'dashboard' : 'test';
}

function loadTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return THEMES.includes(savedTheme) ? savedTheme : 'matrix';
  } catch {
    return 'matrix';
  }
}

function saveTheme(theme) {
  try {
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
    results: []
  };
}

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    return {
      testType:
        savedSettings?.testType === 'words' || savedSettings?.testType === 'time'
          ? savedSettings.testType
          : DEFAULT_SETTINGS.testType,
      timeMode: [15, 30, 60].includes(savedSettings?.timeMode)
        ? savedSettings.timeMode
        : DEFAULT_SETTINGS.timeMode,
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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function normalizeDashboard(savedDashboard, results = savedDashboard?.results) {
  const emptyDashboard = createEmptyDashboard();

  if (!savedDashboard) return emptyDashboard;

  return {
    started: Number(savedDashboard.started) || 0,
    completed: Number(savedDashboard.completed) || 0,
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
    results: Array.isArray(results) ? results.slice(0, 20) : []
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

function serializeDashboard(dashboard) {
  return {
    completed: dashboard.completed,
    incomplete: dashboard.incomplete,
    modes: dashboard.modes,
    started: dashboard.started,
    updatedAt: serverTimestamp()
  };
}

async function loadFirebaseDashboard(userId) {
  if (!db) return createEmptyDashboard();

  const [dashboardSnapshot, resultsSnapshot] = await Promise.all([
    getDoc(getDashboardDocRef(userId)),
    getDocs(query(getResultsCollectionRef(userId), orderBy('createdAt', 'desc'), limit(20)))
  ]);

  const results = resultsSnapshot.docs.map((resultDoc) => {
    const data = resultDoc.data();

    return {
      id: resultDoc.id,
      accuracy: Number(data.accuracy) || 0,
      elapsedSeconds: Number(data.elapsedSeconds) || 0,
      modeLabel: data.modeLabel || '',
      testType: data.testType || 'time',
      wpm: Number(data.wpm) || 0,
      wrongChars: Number(data.wrongChars) || 0
    };
  });

  return normalizeDashboard(dashboardSnapshot.data(), results);
}

function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [dashboard, setDashboard] = useState(createEmptyDashboard);
  const activeAttemptRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(loadPage);
  const [theme, setTheme] = useState(loadTheme);
  const [restartKey, setRestartKey] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState(null);
  const [restartPulse, setRestartPulse] = useState(0);
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(!auth);
  const [isAuthGateOpen, setIsAuthGateOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [showMobileTip, setShowMobileTip] = useState(true);
  const [pendingPage, setPendingPage] = useState(null);
  const [pendingResultSave, setPendingResultSave] = useState(null);
  const [replayTargetText, setReplayTargetText] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

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

  const saveCompletedResult = useCallback((completedResult, options = {}) => {
    if (!user || !db) {
      if (!isFirebaseConfigured) {
        console.error('Firebase is not configured. Add VITE_FIREBASE_* values before saving performance.');
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
            elapsedSeconds: completedResult.elapsedSeconds,
            modeLabel: completedResult.modeLabel,
            testType: completedResult.testType,
            wpm: completedResult.wpm,
            wrongChars: completedResult.wrongChars
          },
          ...currentDashboard.results
        ].slice(0, 20)
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
  }, [updateDashboard, user]);

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
          setDashboard(createEmptyDashboard());
          setIsAuthReady(true);
          return;
        }

        let nextDashboard = createEmptyDashboard();

        try {
          nextDashboard = await loadFirebaseDashboard(nextUser.uid);
        } catch (error) {
          if (isSubscribed) {
            console.error('Failed to load dashboard:', error);
          }
        }

        if (!isSubscribed) return;

        setUser(nextUser);
        setDashboard(nextDashboard);
        setIsAuthReady(true);
        setIsAuthGateOpen(false);

        if (pendingPage === 'dashboard') {
          window.location.hash = 'dashboard';
          setCurrentPage('dashboard');
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
    if (!isAuthReady || user || currentPage !== 'dashboard') return;

    window.location.hash = 'test';
    setCurrentPage('test');
    setPendingPage('dashboard');
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
    setRestartPulse((pulse) => pulse + 1);
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
        ? { timeMode: nextValue }
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

  const dismissMobileTip = () => {
    setShowMobileTip(false);
  };

  const navigate = (nextPage, options = {}) => {
    if (nextPage === 'dashboard' && isAuthReady && !user) {
      setPendingPage('dashboard');
      setIsAuthGateOpen(true);
      return;
    }

    if (nextPage === currentPage) {
      if (nextPage === 'test' && options.restart) {
        restart();
      }

      return;
    }

    if (nextPage === 'dashboard') {
      markIncompleteAttempt();
      setReplayTargetText(null);
      setResult(null);
      setIsActive(false);
      setRestartKey((key) => key + 1);
    } else if (options.restart) {
      restart();
    }

    window.location.hash = nextPage === 'dashboard' ? 'dashboard' : 'test';
    setCurrentPage(nextPage);
  };

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isFormField =
        tagName === 'input' || tagName === 'textarea' || tagName === 'select';
      const isEditable = isFormField || event.target?.isContentEditable;
      const hasModifier = event.altKey || event.ctrlKey || event.metaKey;
      const normalizedKey = event.key.toLowerCase();

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
          onSignOut={handleSignOut}
          onThemeChange={handleThemeChange}
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
            ) : (
              <motion.div
                key="test-page"
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <TestSettings
                  disabled={isActive}
                  onSettingsChange={handleSettingsChange}
                  selectedType={testType}
                  selectedValue={testType === 'time' ? timeMode : wordMode}
                />

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
                      restartPulse={restartPulse}
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

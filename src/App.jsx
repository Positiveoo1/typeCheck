import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import AuthPanel from './components/AuthPanel.jsx';
import Dashboard from './components/Dashboard.jsx';
import Header from './components/Header.jsx';
import Results from './components/Results.jsx';
import TestSettings from './components/TestSettings.jsx';
import TypingTest from './components/TypingTest.jsx';
import { auth, db } from './services/firebase.js';

const SETTINGS_KEY = 'typecheck-settings';
const DASHBOARD_KEY = 'typecheck-dashboard';
const THEME_KEY = 'typecheck-theme';
const THEMES = ['matrix', 'serika', 'botanical', 'midnight', 'rose'];
const MODE_LABELS = ['15s', '30s', '60s', '10 words', '30 words', '60 words'];
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

function loadDashboard() {
  try {
    const savedDashboard = JSON.parse(localStorage.getItem(DASHBOARD_KEY));
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
      results: Array.isArray(savedDashboard.results)
        ? savedDashboard.results.slice(0, 20)
        : []
    };
  } catch {
    return createEmptyDashboard();
  }
}

function saveDashboard(dashboard) {
  try {
    localStorage.setItem(DASHBOARD_KEY, JSON.stringify(dashboard));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function getModeLabel(testType, testValue) {
  return testType === 'words' ? `${testValue} words` : `${testValue}s`;
}

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [dashboard, setDashboard] = useState(loadDashboard);
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
  const [pendingPage, setPendingPage] = useState(null);

  const { testType, timeMode, wordMode } = settings;

  const updateDashboard = useCallback((updater) => {
    if (!user) return;

    setDashboard((currentDashboard) => {
      const nextDashboard = updater(currentDashboard);
      saveDashboard(nextDashboard);
      return nextDashboard;
    });
  }, [user]);

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

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthReady(true);

      if (nextUser) {
        setIsAuthGateOpen(false);

        if (pendingPage === 'dashboard') {
          window.location.hash = 'dashboard';
          setCurrentPage('dashboard');
          setPendingPage(null);
        }
      }
    });
  }, [pendingPage]);

  useEffect(() => {
    if (!isAuthReady || user || currentPage !== 'dashboard') return;

    window.location.hash = 'test';
    setCurrentPage('test');
    setPendingPage('dashboard');
    setIsAuthGateOpen(true);
  }, [currentPage, isAuthReady, user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(loadPage());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user) return;

      const currentAttempt = activeAttemptRef.current;
      if (!currentAttempt) return;

      const currentDashboard = loadDashboard();
      const mode = currentDashboard.modes[currentAttempt.modeLabel] || createModeStats();
      const nextDashboard = {
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

      saveDashboard(nextDashboard);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const finishTest = useCallback((nextResult) => {
    const bestKey = `typecheck-best-${nextResult.testType}-${nextResult.modeLabel}`;
    let previousBest = 0;

    if (user) {
      try {
        previousBest = Number(localStorage.getItem(bestKey)) || 0;
      } catch {
        previousBest = 0;
      }
    }

    const isPersonalBest = Boolean(user) && nextResult.wpm > previousBest;

    if (user && isPersonalBest && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(bestKey, String(nextResult.wpm));
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
    }

    const completedResult = {
      ...nextResult,
      bestWpm: user ? Math.max(previousBest, nextResult.wpm) : 0,
      isPersonalBest
    };

    setResult(completedResult);
    activeAttemptRef.current = null;

    updateDashboard((currentDashboard) => {
      const mode = currentDashboard.modes[completedResult.modeLabel] || createModeStats();
      const nextMode = {
        ...mode,
        completed: mode.completed + 1,
        bestWpm: Math.max(mode.bestWpm || 0, completedResult.wpm),
        bestAccuracy: Math.max(mode.bestAccuracy || 0, completedResult.accuracy)
      };

      return {
        ...currentDashboard,
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

    if (user && db) {
      addDoc(collection(db, 'users', user.uid, 'results'), {
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
    }
  }, [updateDashboard, user]);

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

  const restart = useCallback(() => {
    markIncompleteAttempt();
    setRestartPulse((pulse) => pulse + 1);
    setResult(null);
    setIsActive(false);
    setRestartKey((key) => key + 1);
  }, [markIncompleteAttempt]);

  const handleSettingsChange = (nextType, nextValue) => {
    markIncompleteAttempt();

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
  };

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
    setTheme(nextTheme);
    saveTheme(nextTheme);
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
      setResult(null);
      setIsActive(false);
      setRestartKey((key) => key + 1);
    } else if (options.restart) {
      restart();
    }

    window.location.hash = nextPage === 'dashboard' ? 'dashboard' : 'test';
    setCurrentPage(nextPage);
  };

  return (
    <LayoutGroup>
      <motion.div className="app" data-theme={theme} layout>
        <Header
          currentPage={currentPage}
          onNavigate={navigate}
          onSignOut={handleSignOut}
          onThemeChange={handleThemeChange}
          theme={theme}
          user={user}
        />

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
                    <Results key="results" onRestart={restart} stats={result} />
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

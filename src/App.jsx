'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState
} from 'react';
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'framer-motion';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import Onboarding from './components/Onboarding.jsx';
import TestSettings from './components/TestSettings.jsx';
import TypingTest from './components/TypingTest.jsx';
import { isFirebaseConfigured } from './services/firebaseConfig.js';
import {
  ACCOUNT_SECURITY_WINDOW_DAYS,
  addCompletedResultToDashboard,
  createEmptyDashboard,
  createId,
  getRecentAccountEvents,
  isTooShortCustomTest,
  loadOnboardingComplete,
  MIN_CUSTOM_TEST_CHARACTERS,
  normalizeProfile,
  PASSWORD_RESET_EMAIL_LIMIT,
  saveOnboardingComplete,
  SHORTCUT_TIME_MODES,
  SHORTCUT_WORD_MODES
} from './appState.js';
import { ToastStack, useToasts } from './hooks/useToasts.jsx';
import {
  loadPublicProfileUserId,
  pushPageRoute,
  useAppRouting
} from './hooks/useAppRouting.js';
import { useDashboardPersistence } from './hooks/useDashboardPersistence.js';
import { useThemeSettings } from './hooks/useThemeSettings.js';
import {
  getAuthActionErrorMessage,
  getFirebaseRuntime,
  getPasswordResetActionSettings,
  getPublicPlayerDocRef,
  getResultsCollectionRef,
  getLeaderboardCollectionRef,
  getUserDocRef,
  loadFirebaseDashboard,
  loadFirebaseProfile,
  loadGlobalLeaderboard,
  loadPublicPlayerProfile,
  serializePublicPlayer
} from './services/typecheckData.js';
import { getModeLabel } from './typingLogic.js';

const AuthPanel = lazy(() => import('./components/AuthPanel.jsx'));
const Dashboard = lazy(() => import('./components/Dashboard.jsx'));
const Leaderboard = lazy(() => import('./components/Leaderboard.jsx'));
const LegalPage = lazy(() => import('./components/LegalPage.jsx'));
const Profile = lazy(() => import('./components/Profile.jsx'));
const PublicProfile = lazy(() => import('./components/PublicProfile.jsx'));
const preloadResults = () => import('./components/Results.jsx');
const Results = lazy(preloadResults);
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'));

function App() {
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
  const { currentPage, isPageLoading, setCurrentPage } = useAppRouting();
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
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const { dismissToast, notify, toasts } = useToasts();
  const {
    activeAttemptRef,
    dashboard,
    markIncompleteAttempt,
    setDashboard,
    updateDashboard
  } = useDashboardPersistence({ notify, user });

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

  const {
    effectiveSoundStyle,
    handleCustomTextChange,
    handlePreferencesChange,
    handleSettingsChange,
    handleSoundToggle,
    handleThemeChange,
    handleTrainingModeChange,
    settings,
    theme
  } = useThemeSettings({
    dashboard,
    markIncompleteAttempt,
    setReplayTargetText,
    setRestartKey,
    setResult
  });
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
              pushPageRoute(pendingPage);
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

    pushPageRoute('test');
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

  const handleSignOut = () => {
    setIsSignOutConfirmOpen(true);
  };

  const confirmSignOut = async () => {
    if (!isFirebaseConfigured) return;
    setPendingPage(null);
    setIsAuthGateOpen(false);
    pushPageRoute('test');
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

    pushPageRoute(nextPage);
    setCurrentPage(nextPage);
  };

  const openPublicProfile = (userId) => {
    if (!userId) return;

    markIncompleteAttempt();
    setReplayTargetText(null);
    setResult(null);
    setIsActive(false);
    setRestartKey((key) => key + 1);
    pushPageRoute('public-profile', { userId });
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

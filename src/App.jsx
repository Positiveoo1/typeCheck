'use client';

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { lazy, useCallback, useEffect, useState } from 'react';
import {
  ACCOUNT_SECURITY_WINDOW_DAYS,
  addCompletedResultToDashboard,
  createId,
  createModeStats,
  getRecentAccountEvents,
  isTooShortCustomTest,
  loadOnboardingComplete,
  MIN_CUSTOM_TEST_CHARACTERS,
  normalizeProfile,
  PASSWORD_RESET_EMAIL_LIMIT,
  saveOnboardingComplete
} from './appState.js';
import AppPages from './components/app/AppPages.jsx';
import MobileTip from './components/app/MobileTip.jsx';
import Onboarding from './components/app/Onboarding.jsx';
import AuthGateModal from './components/auth/AuthGateModal.jsx';
import SignOutConfirmModal from './components/auth/SignOutConfirmModal.jsx';
import Footer from './components/layout/Footer.jsx';
import Header from './components/layout/Header.jsx';
import { useAppKeyboardShortcuts } from './hooks/app/useAppKeyboardShortcuts.js';
import { pushPageRoute, useAppRouting } from './hooks/app/useAppRouting.js';
import { useAuthSync } from './hooks/auth/useAuthSync.js';
import { useDashboardPersistence } from './hooks/data/useDashboardPersistence.js';
import { useRemotePageData } from './hooks/data/useRemotePageData.js';
import { useCapsLockIndicator } from './hooks/ui/useCapsLockIndicator.js';
import { useThemeSettings } from './hooks/ui/useThemeSettings.js';
import { ToastStack, useToasts } from './hooks/ui/useToasts.jsx';
import { isFirebaseConfigured } from './services/firebaseConfig.js';
import {
  getAuthActionErrorMessage,
  getFirebaseRuntime,
  getPasswordResetActionSettings,
  getPublicPlayerDocRef,
  getUserDocRef,
  isCloudResultEligible,
  serializePublicPlayer
} from './services/typecheckData.js';
import { getModeLabel } from './typingLogic.js';

const AuthPanel = lazy(() => import('./components/auth/AuthPanel.jsx'));

function App() {
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
  const { leaderboard, publicProfile } = useRemotePageData({ currentPage, notify });

  useEffect(() => {
    setIsOnboardingOpen(!loadOnboardingComplete());
  }, []);

  useCapsLockIndicator();

  const dismissOnboarding = useCallback(() => {
    saveOnboardingComplete();
    setIsOnboardingOpen(false);
  }, []);

  const saveCompletedResult = useCallback(
    async (completedResult, options = {}) => {
      if (!user || !isFirebaseConfigured) {
        if (!isFirebaseConfigured) {
          console.error(
            'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* values before saving performance.'
          );
        }
        return;
      }

      const firebase = await getFirebaseRuntime();
      if (!firebase.db) return;

      firebase
        .setDoc(
          getUserDocRef(firebase, user.uid),
          {
            email: user.email || null,
            lastActiveAt: firebase.serverTimestamp()
          },
          { merge: true }
        )
        .catch((error) => {
          console.error('Failed to update user profile:', error);
        });

      if (!options.skipDashboardUpdate) {
        updateDashboard((currentDashboard) =>
          addCompletedResultToDashboard(currentDashboard, completedResult, {
            countStarted: options.countStarted
          })
        );
      }

      const canSaveCloudResult = isCloudResultEligible(completedResult);

      if (canSaveCloudResult) {
        const submitResult = firebase.httpsCallable(firebase.functions, 'submitResult');
        submitResult({
          targetText: completedResult.targetText,
          typedText: completedResult.typedText,
          testType: completedResult.testType,
          testValue: completedResult.testValue,
          trainingMode: completedResult.trainingMode || 'standard',
          modeLabel: completedResult.modeLabel,
          language: completedResult.language,
          keystrokeLog: completedResult.keystrokeLog || [],
          endedByAccuracyLock: Boolean(completedResult.endedByAccuracyLock)
        }).catch((error) => {
          console.error('Failed to save result:', error);
          notify({
            title: 'Result not saved',
            message: 'Your local result is visible, but syncing failed.',
            type: 'error'
          });
        });
      } else {
        console.warn(
          'Skipped Firebase result save because the result is outside Firestore rule bounds.'
        );
      }

      firebase
        .setDoc(
          getPublicPlayerDocRef(firebase, user.uid),
          serializePublicPlayer(firebase, userProfile, user),
          { merge: true }
        )
        .catch((error) => {
          console.error('Failed to update public player profile:', error);
        });
    },
    [notify, updateDashboard, user, userProfile]
  );

  const {
    effectiveSoundStyle,
    handleCustomTextChange,
    handleLanguageChange,
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
    language,
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

  useAuthSync({
    currentPage,
    notify,
    pendingPage,
    setCurrentPage,
    setDashboard,
    setIsAuthGateOpen,
    setIsAuthReady,
    setPendingPage,
    setUser,
    setUserProfile
  });

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

  const finishTest = useCallback(
    (nextResult) => {
      const previousBest = Number(dashboard.modes[nextResult.modeLabel]?.bestWpm) || 0;
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
        !isInvalidShortCustomTest && Boolean(user) && nextResult.wpm > previousBest;

      const completedResult = {
        ...nextResult,
        bestWpm:
          user && !isInvalidShortCustomTest ? Math.max(previousBest, nextResult.wpm) : 0,
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

      updateDashboard((currentDashboard) =>
        addCompletedResultToDashboard(currentDashboard, completedResult)
      );

      if (user && isFirebaseConfigured) {
        saveCompletedResult(completedResult, { skipDashboardUpdate: true });
      } else if (isFirebaseConfigured) {
        setPendingResultSave({
          countStarted: true,
          result: completedResult
        });
        setIsAuthGateOpen(true);
      } else {
        console.error(
          'Typing performance was not saved because Firebase is not configured.'
        );
      }
    },
    [
      dashboard.modes,
      dashboard.results,
      notify,
      saveCompletedResult,
      updateDashboard,
      user
    ]
  );

  const handleTestStart = useCallback(
    (startedTest) => {
      if (activeAttemptRef.current) return;

      const modeLabel = getModeLabel(
        startedTest.testType,
        startedTest.testValue,
        startedTest.trainingMode,
        startedTest.language
      );
      const attempt = {
        id: createId(),
        modeLabel,
        targetText: startedTest.targetText || '',
        testType: startedTest.testType,
        testValue: startedTest.testValue,
        language: startedTest.language || 'english',
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
    },
    [updateDashboard, user]
  );

  const resetTest = useCallback(
    (options = {}) => {
      markIncompleteAttempt();
      setReplayTargetText(options.targetText || null);
      setResult(null);
      setIsActive(false);
      setRestartKey((key) => key + 1);
    },
    [markIncompleteAttempt]
  );

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

  const saveUserProfile = useCallback(
    async (nextProfile) => {
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

      await firebase.setDoc(getUserDocRef(firebase, user.uid), profilePayload, {
        merge: true
      });
      await firebase.setDoc(
        getPublicPlayerDocRef(firebase, user.uid),
        serializePublicPlayer(firebase, nextProfile, user),
        { merge: true }
      );
      setUserProfile((currentProfile) => ({
        ...currentProfile,
        ...nextProfile
      }));
    },
    [user]
  );

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

  const closeModals = useCallback(() => {
    setPendingPage(null);
    setIsAuthGateOpen(false);
    setIsSignOutConfirmOpen(false);
  }, []);

  useAppKeyboardShortcuts({
    currentPage,
    handleSettingsChange,
    isActive,
    isAuthGateOpen,
    isOnboardingOpen,
    isSignOutConfirmOpen,
    navigate,
    onCloseModals: closeModals,
    restart,
    result,
    tryAgain
  });

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

          <MobileTip
            currentPage={currentPage}
            isVisible={showMobileTip}
            onDismiss={dismissMobileTip}
          />

          <AnimatePresence>
            {isOnboardingOpen && !isAuthGateOpen && !isSignOutConfirmOpen && (
              <Onboarding onDismiss={dismissOnboarding} />
            )}
          </AnimatePresence>

          <AppPages
            currentPage={currentPage}
            dashboard={dashboard}
            leaderboard={leaderboard}
            navigate={navigate}
            notify={notify}
            onOpenPublicProfile={openPublicProfile}
            onRequestPasswordReset={requestPasswordReset}
            onSaveProfile={saveUserProfile}
            onSignOut={handleSignOut}
            publicProfile={publicProfile}
            settings={{
              accentColor,
              mistakeMode,
              onPreferencesChange: handlePreferencesChange,
              onSoundToggle: handleSoundToggle,
              onThemeChange: handleThemeChange,
              reducedMotion,
              showKeyboard,
              soundEnabled,
              soundStyle,
              soundVolume
            }}
            testPage={{
              customText,
              effectiveSoundStyle,
              finishTest,
              handleCustomTextChange,
              handleLanguageChange,
              handleSettingsChange,
              handleTestStart,
              handleTrainingModeChange,
              isActive,
              isGated: isAuthGateOpen || isSignOutConfirmOpen,
              mistakeMode,
              onActiveChange: setIsActive,
              replayTargetText,
              restart,
              restartKey,
              result,
              showKeyboard,
              soundEnabled,
              soundVolume,
              testType,
              timeMode,
              language,
              trainingMode,
              tryAgain,
              wordMode
            }}
            theme={theme}
            user={user}
            userProfile={userProfile}
          />

          <Footer onNavigate={navigate} />

          <AuthGateModal
            AuthPanel={AuthPanel}
            isOpen={isAuthGateOpen}
            notify={notify}
            onClose={closeModals}
            onSuccess={() => setIsAuthGateOpen(false)}
          />

          <SignOutConfirmModal
            isOpen={isSignOutConfirmOpen}
            onCancel={() => setIsSignOutConfirmOpen(false)}
            onConfirm={confirmSignOut}
          />
          <ToastStack onDismiss={dismissToast} toasts={toasts} />
        </motion.div>
      </LayoutGroup>
    </MotionConfig>
  );
}

export default App;
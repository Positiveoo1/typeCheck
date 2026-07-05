import { useEffect } from 'react';
import { createEmptyDashboard, normalizeProfile } from '../../appState.js';
import { isFirebaseConfigured } from '../../services/firebaseConfig.js';
import {
  getFirebaseRuntime,
  getPublicPlayerDocRef,
  loadFirebaseDashboard,
  loadFirebaseProfile,
  serializePublicPlayer
} from '../../services/typecheckData.js';
import { pushPageRoute } from '../app/useAppRouting.js';

export function useAuthSync({
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
}) {
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
      getFirebaseRuntime()
        .then((firebase) => {
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
                firebase
                  .setDoc(
                    getPublicPlayerDocRef(firebase, nextUser.uid),
                    serializePublicPlayer(firebase, nextProfile, nextUser),
                    { merge: true }
                  )
                  .catch((error) => {
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
        })
        .catch((error) => {
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
  }, [
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
  ]);
}

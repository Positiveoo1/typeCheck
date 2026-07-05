import { useCallback, useRef, useState } from 'react';
import { createEmptyDashboard, createModeStats } from '../appState.js';
import {
  getDashboardDocRef,
  getFirebaseRuntime,
  serializeDashboard
} from '../services/typecheckData.js';
import { isFirebaseConfigured } from '../services/firebaseConfig.js';

export function useDashboardPersistence({ notify, user }) {
  const [dashboard, setDashboard] = useState(createEmptyDashboard);
  const activeAttemptRef = useRef(null);

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

  return {
    activeAttemptRef,
    dashboard,
    markIncompleteAttempt,
    setDashboard,
    updateDashboard
  };
}

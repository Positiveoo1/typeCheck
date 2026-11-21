import { useCallback, useEffect, useRef, useState } from 'react';
import { addCompletedResultToDashboard } from '../../appState.js';
import {
  addLocalResult,
  getUnsyncedResults,
  loadLocalHistory,
  markResultsSynced,
  saveLocalHistory,
  shouldNudgeGuest,
  toLocalResult
} from '../../localHistory.js';
import { isFirebaseConfigured } from '../../services/firebaseConfig.js';
import {
  getFirebaseRuntime,
  getResultsCollectionRef,
  isCloudResultEligible,
  serializeResult
} from '../../services/typecheckData.js';

// Keeps a capped, compact result history in localStorage (guests and signed-in
// users) and uploads unsynced results to the account on sign-in.
export function useLocalHistory({ isAuthReady, notify, updateDashboard, user }) {
  const [localHistory, setLocalHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const historyRef = useRef([]);
  const migratedUidRef = useRef(null);

  const commit = useCallback((nextHistory) => {
    historyRef.current = nextHistory;
    setLocalHistory(nextHistory);
    saveLocalHistory(nextHistory);
  }, []);

  useEffect(() => {
    const loaded = loadLocalHistory();
    historyRef.current = loaded;
    setLocalHistory(loaded);
    setIsLoaded(true);
  }, []);

  const recordLocalResult = useCallback(
    (completedResult) => {
      const entry = toLocalResult(completedResult, { syncedToUid: user?.uid || null });
      const nextHistory = addLocalResult(historyRef.current, entry);
      commit(nextHistory);

      if (!user && isFirebaseConfigured && shouldNudgeGuest(nextHistory)) {
        notify({
          title: 'Keep your progress',
          message: 'Sign in to sync your results across devices.',
          type: 'info'
        });
      }
    },
    [commit, notify, user]
  );

  useEffect(() => {
    if (!isLoaded || !isAuthReady || !user || !isFirebaseConfigured) return;
    if (migratedUidRef.current === user.uid) return;

    const pending = getUnsyncedResults(historyRef.current);
    migratedUidRef.current = user.uid;
    if (!pending.length) return;

    let isCancelled = false;

    (async () => {
      try {
        const firebase = await getFirebaseRuntime();
        if (!firebase.db) {
          migratedUidRef.current = null;
          return;
        }

        const uploaded = [];
        const results = getResultsCollectionRef(firebase, user.uid);

        for (const entry of pending) {
          // Results outside Firestore rule bounds can never sync; mark them
          // done so they are not retried forever.
          if (isCloudResultEligible(entry)) {
            await firebase.addDoc(results, serializeResult(firebase, entry));
            uploaded.push(entry);
          }
        }

        commit(
          markResultsSynced(
            historyRef.current,
            pending.map((entry) => entry.id),
            user.uid
          )
        );

        if (uploaded.length) {
          // Keep the cloud dashboard aggregates in line with the uploaded results.
          updateDashboard((currentDashboard) =>
            [...uploaded]
              .reverse()
              .reduce(
                (nextDashboard, entry) => addCompletedResultToDashboard(nextDashboard, entry),
                currentDashboard
              )
          );

          if (!isCancelled) {
            notify({
              title: 'Progress synced',
              message: `${uploaded.length} saved ${uploaded.length === 1 ? 'result' : 'results'} added to your account.`,
              type: 'success'
            });
          }
        }
      } catch (error) {
        console.error('Failed to sync local history:', error);
        // Allow a retry on the next auth change; results stay unsynced.
        migratedUidRef.current = null;
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [commit, isAuthReady, isLoaded, notify, updateDashboard, user]);

  return { localHistory, recordLocalResult };
}

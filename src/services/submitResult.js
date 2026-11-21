import { checkResultPlausibility } from '../resultPlausibility.js';
import {
  getLeaderboardCollectionRef,
  getResultTestValue,
  getResultsCollectionRef,
  getUserDocRef,
  isCloudResultEligible,
  serializeLeaderboardResult,
  serializeResult
} from './typecheckData.js';

// Must be read as a literal so Next.js inlines it at build time.
export function isVerifiedSubmitEnabled() {
  return process.env.NEXT_PUBLIC_VERIFIED_SUBMIT === 'true';
}

export function isLeaderboardMode(result) {
  return (result?.trainingMode || 'standard') !== 'custom';
}

// Only the fields the submitResult Cloud Function reads; the stats are
// recomputed there from the keystroke log rather than trusted.
export function buildVerifiedPayload(result) {
  return {
    dailyKey: result.dailyKey || null,
    endedByAccuracyLock: Boolean(result.endedByAccuracyLock),
    keystrokeLog: (result.keystrokeLog || []).map((event) =>
      typeof event?.text === 'string' ? { t: event.t, text: event.text } : { len: event?.len ?? 0, t: event?.t }
    ),
    language: result.language || 'english',
    targetText: result.targetText || '',
    testType: result.testType,
    testValue: getResultTestValue(result),
    trainingMode: result.trainingMode || 'standard',
    typedText: result.typedText || ''
  };
}

function saveResultDirectly(firebase, result, userId, notify) {
  return firebase
    .addDoc(getResultsCollectionRef(firebase, userId), serializeResult(firebase, result))
    .catch((error) => {
      console.error('Failed to save result:', error);
      notify({
        title: 'Result not saved',
        message: 'Your local result is visible, but syncing failed.',
        type: 'error'
      });
    });
}

// Spark-plan path: the leaderboard entry and the users/{uid} rate-limit stamp
// are written in one batch so firestore.rules can check them together.
async function submitDirectLeaderboardEntry(firebase, result, userId) {
  const batch = firebase.writeBatch(firebase.db);

  batch.set(
    firebase.doc(getLeaderboardCollectionRef(firebase)),
    serializeLeaderboardResult(firebase, result, userId)
  );
  batch.set(
    getUserDocRef(firebase, userId),
    { lastLeaderboardSubmitAt: firebase.serverTimestamp() },
    { merge: true }
  );

  await batch.commit();
}

/**
 * Saves a completed result for a signed-in user and, when eligible, submits
 * it to the public leaderboard -- through the verified Cloud Function when
 * NEXT_PUBLIC_VERIFIED_SUBMIT=true, otherwise directly from the client.
 *
 * Resolves to { leaderboard: 'verified' | 'direct' | 'skipped' | 'failed' }.
 */
export async function submitCompletedResult({ firebase, notify, result, user }) {
  if (!isCloudResultEligible(result)) {
    console.warn(
      'Skipped Firebase result save because the result is outside Firestore rule bounds.'
    );
    return { leaderboard: 'skipped' };
  }

  if (isVerifiedSubmitEnabled() && isLeaderboardMode(result)) {
    try {
      const callable = firebase.httpsCallable(firebase.functions, 'submitResult');
      const response = await callable(buildVerifiedPayload(result));
      return {
        leaderboard: response.data?.leaderboardWritten ? 'verified' : 'skipped',
        response: response.data
      };
    } catch (error) {
      console.error('Verified result submission failed:', error);
      notify({
        title: 'Result not verified',
        message: 'This run was saved to your history but not to the leaderboard.',
        type: 'warning'
      });
      await saveResultDirectly(firebase, result, user.uid, notify);
      return { leaderboard: 'failed' };
    }
  }

  await saveResultDirectly(firebase, result, user.uid, notify);

  if (!isLeaderboardMode(result)) return { leaderboard: 'skipped' };

  const plausibility = checkResultPlausibility(result);
  if (!plausibility.ok) {
    console.warn(`Skipped leaderboard submission: ${plausibility.reason}`);
    return { leaderboard: 'skipped', reason: plausibility.reason };
  }

  try {
    await submitDirectLeaderboardEntry(firebase, result, user.uid);
    return { leaderboard: 'direct' };
  } catch (error) {
    // Most likely the 5 second per-user rate limit in firestore.rules.
    console.error('Failed to save public leaderboard result:', error);
    return { leaderboard: 'failed' };
  }
}

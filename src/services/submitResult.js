import { buildDailyChallengeText, getResultDailyKey } from '../dailyChallenge.js';
import { checkResultPlausibility } from '../resultPlausibility.js';
import {
  getDailyEntryDocRef,
  getDailyPlayerName,
  getDailyRank,
  getLeaderboardCollectionRef,
  getResultTestValue,
  getResultsCollectionRef,
  getUserDocRef,
  isCloudResultEligible,
  loadDailyLeaderboard,
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

export function isDailyResult(result) {
  return result?.trainingMode === 'daily';
}

// A daily run only counts if it was typed on that day's shared text (guards
// against a run that started before the UTC midnight rollover).
export function isGenuineDailyRun(result) {
  const dateKey = getResultDailyKey(result);
  return Boolean(
    dateKey &&
      result?.targetText ===
        buildDailyChallengeText({ dateKey, language: result.language || 'english' })
  );
}

async function getDailyRankForUser(dateKey, userId) {
  try {
    return getDailyRank(await loadDailyLeaderboard(dateKey), userId);
  } catch (error) {
    console.error('Failed to load daily rank:', error);
    return null;
  }
}

// Only the fields the submitResult Cloud Function reads; the stats are
// recomputed there from the keystroke log rather than trusted.
export function buildVerifiedPayload(result) {
  return {
    dailyKey: getResultDailyKey(result),
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

// Daily challenge: dailyLeaderboard/{dateKey}/entries/{uid} keeps the user's
// best run of the day plus an attempt counter (see firestore.rules).
async function submitDirectDailyEntry(firebase, result, user, userProfile) {
  const dateKey = getResultDailyKey(result);
  const entryRef = getDailyEntryDocRef(firebase, dateKey, user.uid);
  const snapshot = await firebase.getDoc(entryRef);
  const previous = snapshot.exists() ? snapshot.data() : null;
  const bestFields = {
    accuracy: result.accuracy,
    createdAt: firebase.serverTimestamp(),
    elapsedSeconds: Number(result.elapsedSeconds) || 0,
    language: result.language || 'english',
    playerName: getDailyPlayerName(userProfile, user),
    userId: user.uid,
    // Explicitly unverified, also downgrading an earlier verified best.
    verified: false,
    wpm: result.wpm
  };
  const batch = firebase.writeBatch(firebase.db);

  if (!previous) {
    batch.set(entryRef, { ...bestFields, attempts: 1 });
  } else if (result.wpm > (Number(previous.wpm) || 0)) {
    batch.update(entryRef, { ...bestFields, attempts: firebase.increment(1) });
  } else {
    batch.update(entryRef, { attempts: firebase.increment(1) });
  }

  batch.set(
    getUserDocRef(firebase, user.uid),
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
 * Daily challenge runs go to dailyLeaderboard instead of leaderboardResults.
 *
 * Resolves to { leaderboard: 'verified' | 'direct' | 'skipped' | 'failed',
 * dailyRank? }.
 */
export async function submitCompletedResult({
  firebase,
  notify,
  result,
  user,
  userProfile
}) {
  if (!isCloudResultEligible(result)) {
    console.warn(
      'Skipped Firebase result save because the result is outside Firestore rule bounds.'
    );
    return { leaderboard: 'skipped' };
  }

  const isDailyMismatch = isDailyResult(result) && !isGenuineDailyRun(result);

  if (isVerifiedSubmitEnabled() && isLeaderboardMode(result) && !isDailyMismatch) {
    try {
      const callable = firebase.httpsCallable(firebase.functions, 'submitResult');
      const response = await callable(buildVerifiedPayload(result));
      const leaderboardWritten = Boolean(response.data?.leaderboardWritten);
      const dailyKey = isDailyResult(result) ? getResultDailyKey(result) : null;
      return {
        dailyRank:
          dailyKey && leaderboardWritten
            ? await getDailyRankForUser(dailyKey, user.uid)
            : null,
        leaderboard: leaderboardWritten ? 'verified' : 'skipped',
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

  if (isDailyResult(result)) {
    if (isDailyMismatch) {
      console.warn("Skipped daily leaderboard: text doesn't match the day's challenge.");
      return { leaderboard: 'skipped', reason: 'daily-mismatch' };
    }

    try {
      await submitDirectDailyEntry(firebase, result, user, userProfile);
      const dailyKey = getResultDailyKey(result);
      return {
        dailyRank: await getDailyRankForUser(dailyKey, user.uid),
        leaderboard: 'direct'
      };
    } catch (error) {
      console.error('Failed to save daily leaderboard entry:', error);
      return { leaderboard: 'failed' };
    }
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

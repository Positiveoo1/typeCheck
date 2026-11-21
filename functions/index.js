const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { VerificationError, verifySubmission } = require('./verify.js');

initializeApp();
const db = getFirestore();

function getPlayerName(profile) {
  if (profile?.username) return `@${profile.username}`;
  if (profile?.displayName) return profile.displayName;
  if (profile?.fallbackName) return profile.fallbackName;
  return 'Anonymous typist';
}

/**
 * Verified result submission (opt-in, requires the Blaze plan).
 *
 * Re-validates the keystroke log, recomputes WPM/accuracy server-side and
 * writes the personal result, the global leaderboard entry and (for the
 * daily challenge) the daily leaderboard entry with `verified: true`.
 * The client enables this path with NEXT_PUBLIC_VERIFIED_SUBMIT=true.
 */
exports.submitResult = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;

  let verified;
  try {
    verified = verifySubmission(request.data || {});
  } catch (error) {
    if (error instanceof VerificationError) {
      throw new HttpsError(error.code, error.message);
    }
    throw error;
  }

  const isDaily = verified.trainingMode === 'daily';
  const resultPayload = {
    accuracy: verified.accuracy,
    correctChars: verified.correctChars,
    createdAt: FieldValue.serverTimestamp(),
    elapsedSeconds: verified.elapsedSeconds,
    endedByAccuracyLock: verified.endedByAccuracyLock,
    modeLabel: verified.modeLabel,
    netWpm: verified.wpm,
    rawWpm: verified.rawWpm,
    testType: verified.testType,
    trainingMode: verified.trainingMode,
    wpm: verified.wpm,
    wrongChars: verified.wrongChars
  };

  const userRef = db.collection('users').doc(uid);
  const resultRef = userRef.collection('results').doc();
  const leaderboardRef = db.collection('leaderboardResults').doc();
  const dailyRef = isDaily
    ? db.collection('dailyLeaderboard').doc(verified.dailyKey).collection('entries').doc(uid)
    : null;

  const outcome = await db.runTransaction(async (transaction) => {
    let dailyBest = null;
    let playerName = 'Anonymous typist';
    let dailySnapshot = null;

    if (dailyRef && verified.isLeaderboardEligible) {
      const [snapshot, playerSnapshot] = await Promise.all([
        transaction.get(dailyRef),
        transaction.get(db.collection('publicPlayers').doc(uid))
      ]);
      dailySnapshot = snapshot;
      playerName = getPlayerName(playerSnapshot.data());
    }

    transaction.set(resultRef, resultPayload);

    let leaderboardWritten = false;
    if (verified.isLeaderboardEligible && !isDaily) {
      transaction.set(leaderboardRef, {
        accuracy: verified.accuracy,
        createdAt: FieldValue.serverTimestamp(),
        elapsedSeconds: verified.elapsedSeconds,
        modeLabel: verified.modeLabel,
        testType: verified.testType,
        testValue: verified.testValue,
        trainingMode: verified.trainingMode,
        userId: uid,
        verified: true,
        wpm: verified.wpm
      });
      leaderboardWritten = true;
    }

    if (dailySnapshot) {
      const previous = dailySnapshot.exists ? dailySnapshot.data() : null;
      const attempts = (Number(previous?.attempts) || 0) + 1;

      if (!previous || verified.wpm > (Number(previous.wpm) || 0)) {
        transaction.set(dailyRef, {
          accuracy: verified.accuracy,
          attempts,
          createdAt: FieldValue.serverTimestamp(),
          elapsedSeconds: verified.elapsedSeconds,
          language: verified.language,
          playerName,
          userId: uid,
          verified: true,
          wpm: verified.wpm
        });
        dailyBest = verified.wpm;
      } else {
        transaction.update(dailyRef, { attempts });
        dailyBest = Number(previous.wpm) || 0;
      }
      leaderboardWritten = true;
    }

    transaction.set(
      userRef,
      { lastLeaderboardSubmitAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return { dailyBest, leaderboardWritten };
  });

  return {
    accuracy: verified.accuracy,
    correctChars: verified.correctChars,
    dailyBestWpm: outcome.dailyBest,
    elapsedSeconds: verified.elapsedSeconds,
    leaderboardWritten: outcome.leaderboardWritten,
    modeLabel: verified.modeLabel,
    netWpm: verified.wpm,
    rawWpm: verified.rawWpm,
    verified: true,
    wpm: verified.wpm,
    wrongChars: verified.wrongChars
  };
});

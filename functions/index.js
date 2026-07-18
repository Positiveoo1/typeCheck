const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const MAX_TEXT_LENGTH = 2000;
const MAX_LOG_EVENTS = 4000;
const MAX_CLOUD_WPM = 400;
// Minimum fraction of typedText.length that the keystroke log must cover.
// A legitimate run logs roughly one event per committed character (backspaces
// included), so a log that's far shorter than the final text implies the
// text was set programmatically rather than typed.
const MIN_LOG_COVERAGE_RATIO = 0.5;
// No single burst of characters may appear faster than this (ms per char),
// which blocks paste-like or scripted bulk inserts recorded as one event.
const MIN_MS_PER_BURST_CHAR = 15;

/**
 * Server-side port of src/typingLogic.js#calculateStats.
 * Deliberately duplicated here rather than imported so the Cloud Function
 * has no dependency on client bundling and cannot be swapped out from the
 * client side.
 */
function calculateStats(targetText, typedText, elapsedSeconds) {
  let correctChars = 0;
  let wrongChars = 0;

  for (let index = 0; index < typedText.length; index += 1) {
    if (typedText[index] === targetText[index]) {
      correctChars += 1;
    } else {
      wrongChars += 1;
    }
  }

  const safeElapsedSeconds = Math.max(0.1, Number(elapsedSeconds) || 0);
  const wpm = Math.round(correctChars / 5 / (safeElapsedSeconds / 60));
  const accuracy =
    typedText.length === 0
      ? 100
      : Math.round((correctChars / typedText.length) * 100);

  return { accuracy, correctChars, elapsedSeconds: safeElapsedSeconds, wpm, wrongChars };
}

function validateKeystrokeLog(log, typedTextLength) {
  if (!Array.isArray(log) || log.length === 0) {
    throw new HttpsError('invalid-argument', 'Missing keystroke log.');
  }
  if (log.length > MAX_LOG_EVENTS) {
    throw new HttpsError('invalid-argument', 'Keystroke log too long.');
  }
  if (log.length < typedTextLength * MIN_LOG_COVERAGE_RATIO) {
    throw new HttpsError('failed-precondition', 'Keystroke log does not match typed text.');
  }

  let prevT = -1;
  let prevLen = 0;
  for (const event of log) {
    if (
      typeof event !== 'object' ||
      !Number.isFinite(event.t) ||
      !Number.isFinite(event.len) ||
      event.t < 0 ||
      event.len < 0
    ) {
      throw new HttpsError('invalid-argument', 'Malformed keystroke event.');
    }
    if (event.t < prevT) {
      throw new HttpsError('failed-precondition', 'Keystroke log is not chronological.');
    }

    const dt = event.t - prevT;
    const dLen = Math.abs(event.len - prevLen);
    if (prevT >= 0 && dLen > 1 && dt < dLen * MIN_MS_PER_BURST_CHAR) {
      throw new HttpsError('failed-precondition', 'Keystroke burst inconsistent with typing.');
    }

    prevT = event.t;
    prevLen = event.len;
  }

  return prevT / 1000; // final timestamp = total elapsed seconds
}

exports.submitResult = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const data = request.data || {};

  const {
    targetText,
    typedText,
    testType,
    testValue,
    trainingMode,
    modeLabel,
    language,
    keystrokeLog,
    endedByAccuracyLock
  } = data;

  if (
    typeof targetText !== 'string' ||
    typeof typedText !== 'string' ||
    targetText.length === 0 ||
    targetText.length > MAX_TEXT_LENGTH ||
    typedText.length > targetText.length
  ) {
    throw new HttpsError('invalid-argument', 'Invalid target/typed text.');
  }
  if (typeof testType !== 'string' || !['time', 'words'].includes(testType)) {
    throw new HttpsError('invalid-argument', 'Invalid test type.');
  }
  if (typeof trainingMode !== 'string' || trainingMode.length > 40) {
    throw new HttpsError('invalid-argument', 'Invalid training mode.');
  }
  if (typeof modeLabel !== 'string' || modeLabel.length === 0 || modeLabel.length > 80) {
    throw new HttpsError('invalid-argument', 'Invalid mode label.');
  }

  const elapsedSecondsFromLog = validateKeystrokeLog(keystrokeLog, typedText.length);

  // For timed tests, the log's total duration must roughly match the test
  // length (a little slack for the final keypress/render tick).
  if (testType === 'time' && Number.isFinite(testValue)) {
    if (elapsedSecondsFromLog < testValue - 2 || elapsedSecondsFromLog > testValue + 3) {
      throw new HttpsError('failed-precondition', 'Elapsed time inconsistent with test type.');
    }
  }

  const stats = calculateStats(targetText, typedText, elapsedSecondsFromLog);

  if (stats.wpm < 0 || stats.wpm > MAX_CLOUD_WPM || !Number.isFinite(stats.wpm)) {
    throw new HttpsError('failed-precondition', 'Computed WPM out of range.');
  }

  const resultPayload = {
    accuracy: stats.accuracy,
    correctChars: stats.correctChars,
    createdAt: FieldValue.serverTimestamp(),
    elapsedSeconds: stats.elapsedSeconds,
    endedByAccuracyLock: Boolean(endedByAccuracyLock),
    modeLabel,
    netWpm: stats.wpm,
    rawWpm: Math.round((typedText.length / 5) / (stats.elapsedSeconds / 60)),
    testType,
    trainingMode,
    wpm: stats.wpm,
    wrongChars: stats.wrongChars
  };

  const batch = db.batch();

  const resultRef = db.collection('users').doc(uid).collection('results').doc();
  batch.set(resultRef, resultPayload);

  let leaderboardWritten = false;
  if (trainingMode !== 'custom') {
    const leaderboardRef = db.collection('leaderboardResults').doc();
    batch.set(leaderboardRef, {
      accuracy: stats.accuracy,
      createdAt: FieldValue.serverTimestamp(),
      modeLabel,
      testType,
      trainingMode,
      userId: uid,
      wpm: stats.wpm
    });
    leaderboardWritten = true;
  }

  await batch.commit();

  return {
    accuracy: stats.accuracy,
    correctChars: stats.correctChars,
    elapsedSeconds: stats.elapsedSeconds,
    leaderboardWritten,
    netWpm: stats.wpm,
    rawWpm: Math.round((typedText.length / 5) / (stats.elapsedSeconds / 60)),
    wpm: stats.wpm,
    wrongChars: stats.wrongChars
  };
});
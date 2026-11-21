// Pure verification helpers for the submitResult Cloud Function.
//
// Kept free of firebase-admin / firebase-functions imports so they can be
// unit-tested from the app's node:test suite (see src/verifyResult.test.js)
// without installing the functions' dependencies.

const LIMITS = {
  // Timed tests extend their target while you type, so allow plenty of room.
  MAX_TEXT_LENGTH: 6000,
  // Mirrors the client engine's cap (useTypingEngine keeps the last 4000).
  MAX_LOG_EVENTS: 4000,
  MAX_WPM: 300,
  MIN_LEADERBOARD_ACCURACY: 50,
  MIN_ELAPSED_SECONDS: 5,
  MIN_TIME_SECONDS: 5,
  MAX_TIME_SECONDS: 300,
  WORD_TEST_VALUES: [10, 30, 60],
  DAILY_WORD_COUNT: 40,
  // Minimum fraction of typedText.length that the keystroke log must cover.
  // A legitimate run logs roughly one event per committed character
  // (backspaces included), so a log far shorter than the final text implies
  // the text was set programmatically rather than typed.
  MIN_LOG_COVERAGE_RATIO: 0.5,
  // No multi-character jump may happen faster than this (ms per char), which
  // blocks paste-like or scripted bulk inserts recorded as one event.
  MIN_MS_PER_BURST_CHAR: 15,
  // Slack (seconds) allowed between a timed test's length and its last event.
  TIME_SLACK_SECONDS: 1.5
};

const LANGUAGE_IDS = ['english', 'uzbek', 'polish', 'spanish', 'russian', 'french'];
const DAILY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

class VerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VerificationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new VerificationError(code, message);
}

// The client engine logs `{ t, text, code }` (text = accepted typed text so
// far). The very first event is `{ t: 0, len: 0 }`. Older clients only sent
// `{ t, len }`, so accept that too.
function getEventLength(event) {
  if (typeof event?.text === 'string') return event.text.length;
  if (Number.isFinite(event?.len) && event.len >= 0) return event.len;
  return Number.NaN;
}

function getEventText(event) {
  return typeof event?.text === 'string' ? event.text : null;
}

/**
 * Validates the keystroke log against the final typed text.
 * Returns { finalSeconds, eventCount }.
 */
function analyzeKeystrokeLog(log, typedText) {
  if (!Array.isArray(log) || log.length === 0) {
    fail('invalid-argument', 'Missing keystroke log.');
  }
  if (log.length > LIMITS.MAX_LOG_EVENTS) {
    fail('invalid-argument', 'Keystroke log too long.');
  }

  // The log is truncated to the most recent MAX_LOG_EVENTS entries, so the
  // coverage requirement only applies to untruncated logs.
  const isTruncated = log.length >= LIMITS.MAX_LOG_EVENTS;
  if (!isTruncated && log.length < typedText.length * LIMITS.MIN_LOG_COVERAGE_RATIO) {
    fail('failed-precondition', 'Keystroke log does not match typed text.');
  }

  let prevT = -1;
  let prevLen = 0;
  let lastText = null;

  for (const event of log) {
    const len = getEventLength(event);
    if (
      typeof event !== 'object' ||
      event === null ||
      !Number.isFinite(event.t) ||
      event.t < 0 ||
      !Number.isFinite(len)
    ) {
      fail('invalid-argument', 'Malformed keystroke event.');
    }
    if (event.t < prevT) {
      fail('failed-precondition', 'Keystroke log is not chronological.');
    }

    // Only growth counts: deleting a whole word at once (Ctrl+Backspace) is
    // legitimate, while the engine accepts at most one new char per input.
    const dt = event.t - prevT;
    const dLen = len - prevLen;
    if (prevT >= 0 && dLen > 1 && dt < dLen * LIMITS.MIN_MS_PER_BURST_CHAR) {
      fail('failed-precondition', 'Keystroke burst inconsistent with typing.');
    }

    prevT = event.t;
    prevLen = len;
    const text = getEventText(event);
    if (text !== null) lastText = text;
  }

  if (typedText.length > 0) {
    if (lastText === null || lastText !== typedText || prevLen !== typedText.length) {
      fail('failed-precondition', 'Keystroke log does not end with the typed text.');
    }
  }

  return { eventCount: log.length, finalSeconds: prevT / 1000 };
}

/**
 * Counts character positions that were ever typed incorrectly, replaying the
 * text snapshots in the log (mirrors the client's historicalMistakeIndices).
 */
function countHistoricalMistakes(targetText, log) {
  const mistakes = new Set();
  let previousText = '';

  for (const event of Array.isArray(log) ? log : []) {
    const text = getEventText(event);
    if (text === null) continue;

    if (text.length > previousText.length) {
      for (let index = previousText.length; index < text.length; index += 1) {
        if (text[index] !== targetText[index]) mistakes.add(index);
      }
    }
    previousText = text;
  }

  return mistakes.size;
}

/**
 * Server-side port of src/typingLogic.js#calculateStats. Deliberately
 * duplicated so the function cannot be influenced by client bundling.
 */
function calculateStats(targetText, typedText, elapsedSeconds, historicalMistakeCount) {
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
  const effectiveWrong = Number.isFinite(historicalMistakeCount)
    ? Math.max(wrongChars, Math.min(historicalMistakeCount, typedText.length))
    : wrongChars;
  const accuracy =
    typedText.length === 0
      ? 100
      : Math.round(((typedText.length - effectiveWrong) / typedText.length) * 100);
  const rawWpm = Math.round(typedText.length / 5 / (safeElapsedSeconds / 60));

  return {
    accuracy,
    correctChars,
    elapsedSeconds: safeElapsedSeconds,
    rawWpm,
    wpm,
    wrongChars
  };
}

function countWords(text) {
  return String(text || '')
    .split(' ')
    .filter(Boolean).length;
}

/** Server-side port of src/typingLogic.js#getModeLabel. */
function buildModeLabel({ testType, testValue, trainingMode, language, dailyKey }) {
  if (trainingMode === 'daily') return `daily ${dailyKey}`;

  const baseLabel = testType === 'words' ? `${testValue} words` : `${testValue}s`;
  const prefix =
    trainingMode === 'standard'
      ? language === 'english'
        ? ''
        : language
      : trainingMode.replace(/-/g, ' ');

  return prefix ? `${prefix} ${baseLabel}` : baseLabel;
}

function getUtcDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Validates a submission and recomputes its stats.
 * Throws VerificationError on any problem; returns the verified result.
 */
function verifySubmission(data, { now = new Date() } = {}) {
  const {
    dailyKey,
    endedByAccuracyLock,
    keystrokeLog,
    language = 'english',
    targetText,
    testType,
    testValue,
    trainingMode,
    typedText
  } = data || {};

  if (
    typeof targetText !== 'string' ||
    typeof typedText !== 'string' ||
    targetText.length === 0 ||
    targetText.length > LIMITS.MAX_TEXT_LENGTH ||
    typedText.length > targetText.length
  ) {
    fail('invalid-argument', 'Invalid target/typed text.');
  }
  if (testType !== 'time' && testType !== 'words') {
    fail('invalid-argument', 'Invalid test type.');
  }
  if (typeof trainingMode !== 'string' || trainingMode.length === 0 || trainingMode.length > 40) {
    fail('invalid-argument', 'Invalid training mode.');
  }
  if (trainingMode === 'custom') {
    fail('failed-precondition', 'Custom texts are not leaderboard-eligible.');
  }
  if (!LANGUAGE_IDS.includes(language)) {
    fail('invalid-argument', 'Invalid language.');
  }
  if (!Number.isInteger(testValue)) {
    fail('invalid-argument', 'Invalid test value.');
  }

  const isDaily = trainingMode === 'daily';
  if (isDaily) {
    if (typeof dailyKey !== 'string' || !DAILY_KEY_PATTERN.test(dailyKey)) {
      fail('invalid-argument', 'Invalid daily key.');
    }
    // Allow a run started just before midnight UTC to finish after it.
    const today = getUtcDateKey(now);
    const yesterday = getUtcDateKey(new Date(now).getTime() - 10 * 60 * 1000);
    if (dailyKey !== today && dailyKey !== yesterday) {
      fail('failed-precondition', 'Daily challenge has expired.');
    }
    if (testType !== 'words' || testValue !== LIMITS.DAILY_WORD_COUNT) {
      fail('invalid-argument', 'Daily challenge must be a 40 word test.');
    }
  } else if (testType === 'words' && !LIMITS.WORD_TEST_VALUES.includes(testValue)) {
    fail('invalid-argument', 'Invalid word count.');
  } else if (
    testType === 'time' &&
    (testValue < LIMITS.MIN_TIME_SECONDS || testValue > LIMITS.MAX_TIME_SECONDS)
  ) {
    fail('invalid-argument', 'Invalid test duration.');
  }

  if (testType === 'words') {
    if (countWords(targetText) !== testValue) {
      fail('failed-precondition', 'Target text does not match the word count.');
    }
    if (!endedByAccuracyLock && typedText.length !== targetText.length) {
      fail('failed-precondition', 'Word test was not completed.');
    }
  }

  const log = analyzeKeystrokeLog(keystrokeLog, typedText);

  let elapsedSeconds;
  if (testType === 'time') {
    if (log.finalSeconds > testValue + LIMITS.TIME_SLACK_SECONDS) {
      fail('failed-precondition', 'Elapsed time inconsistent with test length.');
    }
    // A timed test always lasts its full length unless accuracy lock ended it.
    elapsedSeconds = endedByAccuracyLock ? log.finalSeconds : testValue;
  } else {
    elapsedSeconds = log.finalSeconds;
  }

  if (elapsedSeconds < LIMITS.MIN_ELAPSED_SECONDS) {
    fail('failed-precondition', 'Run too short.');
  }

  const stats = calculateStats(
    targetText,
    typedText,
    elapsedSeconds,
    countHistoricalMistakes(targetText, keystrokeLog)
  );

  if (!Number.isFinite(stats.wpm) || stats.wpm < 0 || stats.wpm > LIMITS.MAX_WPM) {
    fail('failed-precondition', 'Computed WPM out of range.');
  }

  return {
    ...stats,
    dailyKey: isDaily ? dailyKey : null,
    endedByAccuracyLock: Boolean(endedByAccuracyLock),
    isLeaderboardEligible: stats.accuracy >= LIMITS.MIN_LEADERBOARD_ACCURACY,
    language,
    modeLabel: buildModeLabel({ dailyKey, language, testType, testValue, trainingMode }),
    testType,
    testValue,
    trainingMode
  };
}

module.exports = {
  LIMITS,
  VerificationError,
  analyzeKeystrokeLog,
  buildModeLabel,
  calculateStats,
  countHistoricalMistakes,
  getEventLength,
  getUtcDateKey,
  verifySubmission
};

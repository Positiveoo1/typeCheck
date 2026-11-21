// Client-side plausibility checks for leaderboard submissions on the direct
// (Spark plan) path. These cannot stop a determined cheater -- the browser is
// under their control -- but they keep obviously scripted or pasted runs off
// the public board. The verified Cloud Function path (functions/verify.js)
// re-checks everything server-side.

export const PLAUSIBILITY_LIMITS = {
  MAX_WPM: 300,
  MIN_ACCURACY: 50,
  MIN_ELAPSED_SECONDS: 5,
  // The engine's keystroke log keeps only the most recent events.
  MAX_LOG_EVENTS: 4000,
  // A real run logs at least ~1 event per committed character.
  MIN_LOG_COVERAGE_RATIO: 0.5,
  // Multi-character insertions faster than this per char look like a paste.
  MIN_MS_PER_BURST_CHAR: 15,
  // Highest WPM allowed over any sliding window of SUSTAINED_WINDOW_MS.
  MAX_SUSTAINED_WPM: 350,
  SUSTAINED_WINDOW_MS: 2000
};

function getEventLength(event) {
  if (typeof event?.text === 'string') return event.text.length;
  if (Number.isFinite(event?.len) && event.len >= 0) return event.len;
  return Number.NaN;
}

/**
 * Returns { ok: true } or { ok: false, reason } for a completed result.
 * Expects the result shape produced by useTypingEngine (keystrokeLog of
 * `{ t, text, code }` events, the first one being `{ t: 0, len: 0 }`).
 */
export function checkResultPlausibility(result, limits = PLAUSIBILITY_LIMITS) {
  const wpm = Number(result?.wpm);
  const accuracy = Number(result?.accuracy);
  const elapsedSeconds = Number(result?.elapsedSeconds);
  const typedText = typeof result?.typedText === 'string' ? result.typedText : '';
  const log = result?.keystrokeLog;

  if (!Number.isFinite(wpm) || wpm < 0 || wpm > limits.MAX_WPM) {
    return { ok: false, reason: 'wpm-out-of-range' };
  }
  if (!Number.isFinite(accuracy) || accuracy < limits.MIN_ACCURACY || accuracy > 100) {
    return { ok: false, reason: 'low-accuracy' };
  }
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < limits.MIN_ELAPSED_SECONDS) {
    return { ok: false, reason: 'too-short' };
  }
  if (!Array.isArray(log) || log.length === 0) {
    return { ok: false, reason: 'missing-log' };
  }

  const isTruncated = log.length >= limits.MAX_LOG_EVENTS;
  if (!isTruncated && log.length < typedText.length * limits.MIN_LOG_COVERAGE_RATIO) {
    return { ok: false, reason: 'too-few-events' };
  }

  let prevT = -1;
  let prevLen = 0;
  // Sliding window of { t, gained } for the sustained-speed check.
  const window = [];
  let windowGain = 0;

  for (const event of log) {
    const len = getEventLength(event);
    if (!Number.isFinite(event?.t) || event.t < 0 || !Number.isFinite(len)) {
      return { ok: false, reason: 'malformed-log' };
    }
    if (event.t < prevT) {
      return { ok: false, reason: 'not-chronological' };
    }

    const gained = len - prevLen;
    if (prevT >= 0 && gained > 1 && event.t - prevT < gained * limits.MIN_MS_PER_BURST_CHAR) {
      return { ok: false, reason: 'paste-burst' };
    }

    if (gained > 0) {
      window.push({ gained, t: event.t });
      windowGain += gained;
    }
    while (window.length && event.t - window[0].t > limits.SUSTAINED_WINDOW_MS) {
      windowGain -= window.shift().gained;
    }
    // Only judge a full window, so a couple of quick keys at the start of a
    // burst don't count as an extreme rate.
    if (prevT >= limits.SUSTAINED_WINDOW_MS || event.t >= limits.SUSTAINED_WINDOW_MS) {
      const sustainedWpm = windowGain / 5 / (limits.SUSTAINED_WINDOW_MS / 60000);
      if (sustainedWpm > limits.MAX_SUSTAINED_WPM) {
        return { ok: false, reason: 'sustained-speed' };
      }
    }

    prevT = event.t;
    prevLen = len;
  }

  if (typedText.length > 0 && prevLen !== typedText.length) {
    return { ok: false, reason: 'log-mismatch' };
  }

  return { ok: true };
}

export function isPlausibleResult(result, limits) {
  return checkResultPlausibility(result, limits).ok;
}

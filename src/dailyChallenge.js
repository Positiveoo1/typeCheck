import { getWordListForLanguage } from './languages.js';
import { shuffleWords } from './typingLogic.js';

export const DAILY_CHALLENGE_MODE = 'daily';
export const DAILY_CHALLENGE_WORD_COUNT = 40;
export const DAILY_DONE_STORAGE_KEY = 'typecheck-daily-done';
const DAILY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** UTC calendar date `YYYY-MM-DD`: everyone shares the same challenge day. */
export function getDailyChallengeKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  return value.toISOString().slice(0, 10);
}

export function isDailyChallengeKey(value) {
  return typeof value === 'string' && DAILY_KEY_PATTERN.test(value);
}

/** Milliseconds until the next UTC midnight (when the challenge resets). */
export function getMsUntilDailyReset(now = new Date()) {
  const value = now instanceof Date ? now : new Date(now);
  const nextMidnight = Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate() + 1
  );
  return nextMidnight - value.getTime();
}

export function formatDailyResetCountdown(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// FNV-1a 32-bit string hash -> PRNG seed.
export function hashString(value) {
  let hash = 0x811c9dc5;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/** The fixed 40-word text for a given day and language. */
export function buildDailyChallengeText({
  dateKey = getDailyChallengeKey(),
  language = 'english'
} = {}) {
  const random = mulberry32(hashString(`typecheck-daily:${dateKey}:${language}`));
  return shuffleWords(
    DAILY_CHALLENGE_WORD_COUNT,
    getWordListForLanguage(language),
    random
  );
}

export function getDailyModeLabel(dateKey = getDailyChallengeKey()) {
  return `daily ${dateKey}`;
}

/** Extracts the day from a daily result (`dailyKey` or its mode label). */
export function getResultDailyKey(result) {
  if (isDailyChallengeKey(result?.dailyKey)) return result.dailyKey;
  const match = String(result?.modeLabel || '').match(/^daily (\d{4}-\d{2}-\d{2})$/);
  return match ? match[1] : null;
}

function getStorage(storage) {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Today's local completion record ({ dateKey, bestWpm, attempts }) or null. */
export function loadDailyDone({ now = new Date(), storage } = {}) {
  try {
    const raw = getStorage(storage)?.getItem(DAILY_DONE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.dateKey !== getDailyChallengeKey(now)) return null;
    return {
      attempts: Math.max(1, Number(parsed.attempts) || 1),
      bestWpm: Math.max(0, Number(parsed.bestWpm) || 0),
      dateKey: parsed.dateKey
    };
  } catch {
    return null;
  }
}

/** Records a finished daily run locally (guests included). */
export function recordDailyDone(result, { now = new Date(), storage } = {}) {
  const dateKey = getResultDailyKey(result);
  if (!dateKey) return null;

  const previous = loadDailyDone({ now: new Date(`${dateKey}T12:00:00Z`), storage });
  const next = {
    attempts: (previous?.attempts || 0) + 1,
    bestWpm: Math.max(previous?.bestWpm || 0, Number(result?.wpm) || 0),
    dateKey
  };

  // Don't overwrite today's record with a run that started yesterday.
  if (dateKey !== getDailyChallengeKey(now) && loadDailyDone({ now, storage })) {
    return null;
  }

  try {
    getStorage(storage)?.setItem(DAILY_DONE_STORAGE_KEY, JSON.stringify(next));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('typecheck-daily-done', { detail: next }));
    }
  } catch {
    // Storage may be unavailable (private mode); the challenge still works.
  }
  return next;
}

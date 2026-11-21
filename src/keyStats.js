import { shuffleWords } from './typingLogic.js';

export const KEY_STATS_KEY = 'typecheck-key-stats';
export const KEY_STATS_DECAY = 0.9;
export const MAX_STORED_BIGRAMS = 300;
export const MIN_DRILL_ATTEMPTS = 200;
export const MAX_BIGRAM_GAP_MS = 2000;
export const NORMAL_WORD_SHARE = 0.2;

const PRIOR_STRENGTH = 10;
const MIN_PRIOR_RATE = 0.03;
const MIN_BIGRAM_SAMPLES = 2;
const PRUNE_THRESHOLD = 0.05;
const LETTER = /^\p{L}$/u;

export function createEmptyKeyStats() {
  return { chars: {}, bigrams: {} };
}

function isLetter(character) {
  return LETTER.test(character || '');
}

function normalizeStats(stats) {
  return {
    chars: stats && typeof stats.chars === 'object' && stats.chars ? stats.chars : {},
    bigrams: stats && typeof stats.bigrams === 'object' && stats.bigrams ? stats.bigrams : {}
  };
}

/**
 * Per-character and per-bigram stats for one finished run.
 * Attempts/errors count the first attempt at each target position only.
 * Bigram time = ms between the keystroke that completed char i-1 and char i,
 * for letters typed correctly on the first try, ignoring gaps over 2s.
 */
export function extractRunKeyStats(result) {
  const stats = createEmptyKeyStats();
  const target = String(result?.targetText || '');
  const log = Array.isArray(result?.keystrokeLog)
    ? result.keystrokeLog.filter((event) => typeof event?.text === 'string')
    : [];

  if (!target || !log.length) return stats;

  const seen = new Set();
  const failed = new Set();
  let previousText = '';
  let times = [];

  log.forEach((event) => {
    const text = event.text;
    const time = Number(event.t) || 0;
    let shared = 0;
    const limit = Math.min(previousText.length, text.length);

    while (shared < limit && previousText[shared] === text[shared]) shared += 1;

    times = times.slice(0, shared);

    for (let index = shared; index < text.length && index < target.length; index += 1) {
      const expected = target[index].toLowerCase();
      const isCorrect = text[index] === target[index];
      times[index] = isCorrect ? time : undefined;

      if (expected !== ' ' && !seen.has(index)) {
        seen.add(index);
        const entry = stats.chars[expected] || { attempts: 0, errors: 0 };
        entry.attempts += 1;
        if (!isCorrect) entry.errors += 1;
        stats.chars[expected] = entry;
      }

      if (!isCorrect) {
        failed.add(index);
        continue;
      }

      if (
        index > 0 &&
        !failed.has(index) &&
        !failed.has(index - 1) &&
        times[index - 1] !== undefined &&
        isLetter(target[index]) &&
        isLetter(target[index - 1])
      ) {
        const gap = time - times[index - 1];

        if (gap > 0 && gap <= MAX_BIGRAM_GAP_MS) {
          const pair = (target[index - 1] + target[index]).toLowerCase();
          const entry = stats.bigrams[pair] || { count: 0, totalMs: 0 };
          entry.count += 1;
          entry.totalMs += gap;
          stats.bigrams[pair] = entry;
        }
      }
    }

    previousText = text;
  });

  return stats;
}

export function mergeKeyStats(
  stored,
  runStats,
  { decay = KEY_STATS_DECAY, maxBigrams = MAX_STORED_BIGRAMS } = {}
) {
  const base = normalizeStats(stored);
  const run = normalizeStats(runStats);
  const chars = {};
  const bigrams = {};

  Object.entries(base.chars).forEach(([key, value]) => {
    const attempts = (Number(value?.attempts) || 0) * decay;
    if (attempts < PRUNE_THRESHOLD) return;
    chars[key] = { attempts, errors: (Number(value?.errors) || 0) * decay };
  });

  Object.entries(run.chars).forEach(([key, value]) => {
    const entry = chars[key] || { attempts: 0, errors: 0 };
    entry.attempts += Number(value?.attempts) || 0;
    entry.errors += Number(value?.errors) || 0;
    chars[key] = entry;
  });

  Object.entries(base.bigrams).forEach(([key, value]) => {
    const count = (Number(value?.count) || 0) * decay;
    if (count < PRUNE_THRESHOLD) return;
    bigrams[key] = { count, totalMs: (Number(value?.totalMs) || 0) * decay };
  });

  Object.entries(run.bigrams).forEach(([key, value]) => {
    const entry = bigrams[key] || { count: 0, totalMs: 0 };
    entry.count += Number(value?.count) || 0;
    entry.totalMs += Number(value?.totalMs) || 0;
    bigrams[key] = entry;
  });

  const keptBigrams = Object.fromEntries(
    Object.entries(bigrams)
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .slice(0, maxBigrams)
  );

  return { chars, bigrams: keptBigrams };
}

export function getTotalAttempts(stats) {
  return Object.values(normalizeStats(stats).chars).reduce(
    (total, value) => total + (Number(value?.attempts) || 0),
    0
  );
}

export function hasEnoughKeyData(stats, minAttempts = MIN_DRILL_ATTEMPTS) {
  return getTotalAttempts(stats) >= minAttempts;
}

/** Letters ranked by Bayesian-smoothed error rate (descending). */
export function getWeakKeys(stats, n = 5) {
  const { chars } = normalizeStats(stats);
  const letters = Object.entries(chars).filter(([key]) => isLetter(key));
  const totals = letters.reduce(
    (sum, [, value]) => ({
      attempts: sum.attempts + (Number(value.attempts) || 0),
      errors: sum.errors + (Number(value.errors) || 0)
    }),
    { attempts: 0, errors: 0 }
  );
  const priorRate = Math.max(
    MIN_PRIOR_RATE,
    totals.attempts ? totals.errors / totals.attempts : 0
  );

  return letters
    .map(([key, value]) => {
      const attempts = Number(value.attempts) || 0;
      const errors = Number(value.errors) || 0;

      return {
        key,
        attempts,
        errors,
        errorRate: attempts ? errors / attempts : 0,
        score: (errors + PRIOR_STRENGTH * priorRate) / (attempts + PRIOR_STRENGTH)
      };
    })
    .filter((entry) => entry.errors > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, n);
}

function getMedian(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Bigrams slower than the user's median bigram time, slowest first. */
export function getSlowBigrams(stats, n = 5, { minSamples = MIN_BIGRAM_SAMPLES } = {}) {
  const entries = Object.entries(normalizeStats(stats).bigrams)
    .map(([bigram, value]) => {
      const count = Number(value.count) || 0;

      return { bigram, count, avgMs: count > 0 ? (Number(value.totalMs) || 0) / count : 0 };
    })
    .filter((entry) => entry.count >= minSamples && entry.avgMs > 0);
  const median = getMedian(entries.map((entry) => entry.avgMs));

  if (!median) return [];

  return entries
    .map((entry) => ({ ...entry, ratio: entry.avgMs / median }))
    .filter((entry) => entry.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio || a.bigram.localeCompare(b.bigram))
    .slice(0, n);
}

function pickWeighted(items, weights, total, random) {
  let threshold = random() * total;

  for (let index = 0; index < items.length; index += 1) {
    threshold -= weights[index];
    if (threshold < 0) return items[index];
  }

  return items[items.length - 1];
}

/**
 * Words weighted by how many weak letters / slow bigrams they contain, with
 * ~20% normal words mixed in. Falls back to `fallbackWords` (shuffled) when
 * there is not enough data to personalise.
 */
export function buildPersonalDrill({
  stats,
  wordList = [],
  wordCount = 30,
  random = Math.random,
  fallbackWords = wordList,
  minAttempts = MIN_DRILL_ATTEMPTS
} = {}) {
  if (wordCount <= 0) return '';

  const words = [...new Set(wordList)].filter(Boolean);
  const weakKeys = getWeakKeys(stats, 6);
  const slowBigrams = getSlowBigrams(stats, 8);

  if (
    !hasEnoughKeyData(stats, minAttempts) ||
    !words.length ||
    (!weakKeys.length && !slowBigrams.length)
  ) {
    return shuffleWords(wordCount, fallbackWords, random);
  }

  const weakLetters = new Map(weakKeys.map((entry, rank) => [entry.key, weakKeys.length - rank]));
  const slowPairs = new Map(
    slowBigrams.map((entry, rank) => [entry.bigram, slowBigrams.length - rank])
  );
  const candidates = [];
  const weights = [];

  words.forEach((word) => {
    const lower = word.toLowerCase();
    let weight = 0;

    for (const character of lower) weight += weakLetters.get(character) || 0;
    for (let index = 1; index < lower.length; index += 1) {
      weight += (slowPairs.get(lower.slice(index - 1, index + 1)) || 0) * 1.5;
    }

    if (weight > 0) {
      candidates.push(word);
      weights.push(weight);
    }
  });

  if (!candidates.length) return shuffleWords(wordCount, fallbackWords, random);

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const picked = [];

  while (picked.length < wordCount) {
    let word;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      word =
        random() < NORMAL_WORD_SHARE
          ? words[Math.floor(random() * words.length)]
          : pickWeighted(candidates, weights, totalWeight, random);
      if (word !== picked.at(-1)) break;
    }

    picked.push(word);
  }

  return picked.join(' ');
}

function readAll() {
  try {
    if (typeof localStorage === 'undefined') return {};

    const parsed = JSON.parse(localStorage.getItem(KEY_STATS_KEY));

    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadKeyStats(language = 'english') {
  return normalizeStats(readAll()[language]);
}

export function saveKeyStats(language = 'english', stats) {
  try {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(
      KEY_STATS_KEY,
      JSON.stringify({ ...readAll(), [language]: normalizeStats(stats) })
    );
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

/** Record a finished run into stored stats. Ignores invalid and custom-text runs. */
export function recordRunKeyStats(result) {
  if (!result || result.isInvalid || result.trainingMode === 'custom') return;

  const runStats = extractRunKeyStats(result);

  if (!Object.keys(runStats.chars).length) return;

  const language = result.language || 'english';

  saveKeyStats(language, mergeKeyStats(loadKeyStats(language), runStats));
}

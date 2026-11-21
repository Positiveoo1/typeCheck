// Browser-local result history. Works for guests and signed-in users and is the
// source for streaks. Stores only compact results (never keystroke logs/text).

export const LOCAL_HISTORY_KEY = 'typecheck-local-history';
export const LOCAL_HISTORY_LIMIT = 500;
export const LOCAL_MIGRATION_LIMIT = 100;
export const GUEST_NUDGE_INTERVAL = 5;

function createLocalId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function toMillis(value) {
  if (value === null || value === undefined) return null;

  const date = value?.toDate?.() || value;
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function numberOr(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

// Builds the compact stored shape. `syncedToUid` is the account the result is
// already stored under in Firestore (null = not synced).
export function toLocalResult(result, { now = Date.now(), id, syncedToUid = null } = {}) {
  const wpm = numberOr(result?.wpm);

  return {
    id: id || result?.id || createLocalId(),
    createdAt: toMillis(result?.createdAt) ?? now,
    wpm,
    rawWpm: numberOr(result?.rawWpm, wpm),
    accuracy: numberOr(result?.accuracy),
    correctChars: numberOr(result?.correctChars),
    wrongChars: numberOr(result?.wrongChars),
    elapsedSeconds: numberOr(result?.elapsedSeconds),
    modeLabel: String(result?.modeLabel || ''),
    testType: result?.testType === 'words' ? 'words' : 'time',
    trainingMode: result?.trainingMode || 'standard',
    language: result?.language || 'english',
    syncedToUid: syncedToUid || null
  };
}

function isStoredResult(entry) {
  return (
    Boolean(entry) &&
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    toMillis(entry.createdAt) !== null
  );
}

export function normalizeLocalHistory(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isStoredResult)
    .map((entry) => toLocalResult(entry, { id: entry.id, syncedToUid: entry.syncedToUid }))
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(0, LOCAL_HISTORY_LIMIT);
}

// Newest first, capped.
export function addLocalResult(history, result, limit = LOCAL_HISTORY_LIMIT) {
  return [result, ...(Array.isArray(history) ? history : [])].slice(0, limit);
}

export function getUnsyncedResults(history, limit = LOCAL_MIGRATION_LIMIT) {
  return (Array.isArray(history) ? history : [])
    .filter((entry) => !entry.syncedToUid)
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(0, limit);
}

export function markResultsSynced(history, ids, uid) {
  const idSet = new Set(ids);

  return (Array.isArray(history) ? history : []).map((entry) =>
    idSet.has(entry.id) ? { ...entry, syncedToUid: uid } : entry
  );
}

export function countUnsynced(history) {
  return (Array.isArray(history) ? history : []).filter((entry) => !entry.syncedToUid).length;
}

// True when a nudge to sign in should be shown after a guest result was added.
export function shouldNudgeGuest(history, interval = GUEST_NUDGE_INTERVAL) {
  const unsynced = countUnsynced(history);
  return unsynced > 0 && unsynced % interval === 0;
}

// Combine local and remote (dashboard) results, dropping duplicates of the same
// test (same stats on the same day). Newest first.
export function mergeResultSources(localResults, remoteResults) {
  const seen = new Set();
  const merged = [];
  const keyOf = (entry, time) =>
    [
      new Date(time).toDateString(),
      entry.modeLabel,
      entry.wpm,
      entry.accuracy,
      entry.correctChars,
      entry.elapsedSeconds
    ].join('|');

  for (const entry of [...(remoteResults || []), ...(localResults || [])]) {
    const time = toMillis(entry?.createdAt);
    if (time === null) continue;

    const key = keyOf(entry, time);
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(entry);
  }

  return merged.sort((first, second) => toMillis(second.createdAt) - toMillis(first.createdAt));
}

// Builds the shape Dashboard.jsx expects from local results.
export function buildDashboardFromLocal(history) {
  const results = (Array.isArray(history) ? history : [])
    .slice()
    .sort((first, second) => second.createdAt - first.createdAt);
  const modes = {};
  let totalTypingSeconds = 0;
  let estimatedWordsTyped = 0;

  for (const entry of results) {
    const mode = modes[entry.modeLabel] || {
      started: 0,
      completed: 0,
      incomplete: 0,
      bestWpm: 0,
      bestAccuracy: 0
    };
    modes[entry.modeLabel] = {
      ...mode,
      started: mode.started + 1,
      completed: mode.completed + 1,
      bestWpm: Math.max(mode.bestWpm, entry.wpm),
      bestAccuracy: Math.max(mode.bestAccuracy, entry.accuracy)
    };
    totalTypingSeconds += entry.elapsedSeconds;
    estimatedWordsTyped += Math.round(entry.correctChars / 5);
  }

  return {
    started: results.length,
    completed: results.length,
    incomplete: 0,
    modes,
    results: results.map((entry) => ({ ...entry, createdAt: new Date(entry.createdAt) })),
    estimatedWordsTyped,
    totalTypingSeconds
  };
}

function getStorage(storage) {
  try {
    if (storage) return storage;
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadLocalHistory(storage) {
  try {
    const target = getStorage(storage);
    if (!target) return [];

    return normalizeLocalHistory(JSON.parse(target.getItem(LOCAL_HISTORY_KEY)));
  } catch {
    return [];
  }
}

export function saveLocalHistory(history, storage) {
  try {
    const target = getStorage(storage);
    if (!target) return false;

    target.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history.slice(0, LOCAL_HISTORY_LIMIT)));
    return true;
  } catch {
    // Storage can be unavailable or full in private/restricted contexts.
    return false;
  }
}

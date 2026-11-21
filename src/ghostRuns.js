// Ghost runs: compact replays of earlier runs (personal best + last run per
// mode label) used to race a "ghost" caret during a new run.
//
// A ghost is { wpm, accuracy, createdAt, positions: [[tMs, typedLength], ...] }.

export const GHOST_RUNS_KEY = 'typecheck-ghost-runs';
export const GHOST_MODES = ['off', 'best', 'last'];
export const MAX_GHOST_POINTS = 600;
export const MAX_GHOST_MODE_LABELS = 40;

// Result -> comparison against the ghosts that existed before the run was
// recorded. Keyed by object identity so Results can look it up without
// threading extra state through App.
const comparisons = new WeakMap();

export function normalizeGhostMode(value, fallback = 'off') {
  return GHOST_MODES.includes(value) ? value : fallback;
}

function getDefaultStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readStore(storage) {
  try {
    const raw = storage?.getItem(GHOST_RUNS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(storage, store) {
  try {
    storage?.setItem(GHOST_RUNS_KEY, JSON.stringify(store));
  } catch {
    // Storage can be unavailable or full; ghosts are a nice-to-have.
  }
}

function isValidGhost(ghost) {
  return (
    Boolean(ghost) &&
    Array.isArray(ghost.positions) &&
    ghost.positions.length >= 2 &&
    ghost.positions.every(
      (point) =>
        Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])
    )
  );
}

// keystrokeLog entries are { t, text, code }, plus an initial { t: 0, len: 0 }.
export function compactPositions(keystrokeLog, maxPoints = MAX_GHOST_POINTS) {
  const points = [];
  let lastT = 0;

  for (const entry of Array.isArray(keystrokeLog) ? keystrokeLog : []) {
    if (!entry) continue;

    const length =
      typeof entry.text === 'string' ? entry.text.length : Number(entry.len);
    const time = Number(entry.t);

    if (!Number.isFinite(length) || !Number.isFinite(time)) continue;

    lastT = Math.max(lastT, Math.round(time));
    points.push([lastT, Math.max(0, Math.round(length))]);
  }

  if (points.length === 0 || points[0][0] !== 0) points.unshift([0, 0]);

  const limit = Math.max(2, Math.floor(maxPoints));

  if (points.length <= limit) return points;

  const sampled = [];
  const step = (points.length - 1) / (limit - 1);

  for (let index = 0; index < limit; index += 1) {
    sampled.push(points[Math.round(index * step)]);
  }

  return sampled;
}

export function isGhostRecordable(result) {
  return Boolean(
    result &&
      !result.isInvalid &&
      !result.isReplay &&
      result.trainingMode !== 'custom' &&
      (result.testType === 'time' || result.testType === 'words') &&
      typeof result.modeLabel === 'string' &&
      result.modeLabel &&
      Number(result.wpm) > 0 &&
      Array.isArray(result.keystrokeLog) &&
      result.keystrokeLog.length >= 2
  );
}

export function buildGhost(result, now = Date.now()) {
  if (!isGhostRecordable(result)) return null;

  const positions = compactPositions(result.keystrokeLog);

  if (positions.length < 2) return null;

  return {
    accuracy: Number(result.accuracy) || 0,
    createdAt: now,
    positions,
    wpm: Number(result.wpm) || 0
  };
}

// Number of typed characters the ghost had at elapsedMs (binary search for the
// last point at or before that time).
export function getGhostPositionAt(ghost, elapsedMs) {
  const positions = ghost?.positions;

  if (!Array.isArray(positions) || positions.length === 0) return 0;

  const time = Number(elapsedMs);

  if (!Number.isFinite(time) || time < positions[0][0]) return 0;

  let low = 0;
  let high = positions.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if (positions[middle][0] <= time) low = middle;
    else high = middle - 1;
  }

  return positions[low][1];
}

export function loadGhost(modeLabel, kind, storage = getDefaultStorage()) {
  if (kind !== 'best' && kind !== 'last') return null;

  const ghost = readStore(storage)[modeLabel]?.[kind];

  return isValidGhost(ghost) ? ghost : null;
}

function summarize(ghost) {
  return isValidGhost(ghost)
    ? { accuracy: ghost.accuracy, wpm: ghost.wpm }
    : null;
}

// Stores the result as the "last" ghost and, if faster, the "best" ghost.
// Returns { best, last } summaries of the ghosts as they were BEFORE this run
// (or null when the result is not recordable).
export function recordGhostRun(result, options = {}, storage = getDefaultStorage()) {
  const ghost = buildGhost(
    { ...result, isReplay: result?.isReplay || options.isReplay },
    options.now
  );

  if (!ghost || !storage) return null;

  const store = readStore(storage);
  const previous = store[result.modeLabel] || {};
  const previousBest = isValidGhost(previous.best) ? previous.best : null;
  const comparison = { best: summarize(previousBest), last: summarize(previous.last) };

  store[result.modeLabel] = {
    best: !previousBest || ghost.wpm > previousBest.wpm ? ghost : previousBest,
    last: ghost,
    updatedAt: ghost.createdAt
  };

  // Keep storage bounded: drop the least recently updated mode labels.
  const labels = Object.keys(store);

  if (labels.length > MAX_GHOST_MODE_LABELS) {
    labels
      .sort((a, b) => (store[a]?.updatedAt || 0) - (store[b]?.updatedAt || 0))
      .slice(0, labels.length - MAX_GHOST_MODE_LABELS)
      .forEach((label) => {
        delete store[label];
      });
  }

  writeStore(storage, store);
  comparisons.set(result, comparison);

  return comparison;
}

export function getGhostComparison(result, ghostMode) {
  const comparison = result && typeof result === 'object' ? comparisons.get(result) : null;
  const reference = comparison?.[ghostMode];

  if (!reference) return null;

  const wpmDelta = Math.round((Number(result.wpm) || 0) - reference.wpm);

  return { kind: ghostMode, reference, wpmDelta };
}

export function formatGhostComparison(comparison) {
  if (!comparison) return '';

  const target = comparison.kind === 'best' ? 'your best' : 'your last run';
  const { wpmDelta } = comparison;

  if (wpmDelta > 0) return `vs ghost: you beat ${target} by ${wpmDelta} WPM`;
  if (wpmDelta < 0) return `vs ghost: you finished ${-wpmDelta} WPM behind ${target}`;

  return `vs ghost: you matched ${target}`;
}

export function formatGhostLead(difference) {
  if (!difference) return 'level with ghost';

  const count = Math.abs(difference);
  const noun = count === 1 ? 'char' : 'chars';

  return difference > 0
    ? `${count} ${noun} ahead of ghost`
    : `${count} ${noun} behind ghost`;
}

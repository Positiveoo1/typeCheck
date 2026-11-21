// Daily goal + streak logic. Pure functions; days are in the local timezone.
//
// Streak definition (chosen: "goal met"): a day counts toward a streak only if
// that day's tests/minutes reached the daily goal. The current streak is the
// run of consecutive goal-met days ending today, or ending yesterday when
// today's goal is not met yet (so a streak is not "lost" until the day ends).
// The goal is evaluated with the *current* goal setting for every past day.

export const GOAL_TYPES = ['tests', 'minutes'];
export const GOAL_LIMITS = {
  tests: { min: 1, max: 50, fallback: 5 },
  minutes: { min: 1, max: 120, fallback: 10 }
};
export const DEFAULT_DAILY_GOAL_TYPE = 'tests';
export const DEFAULT_DAILY_GOAL_VALUE = GOAL_LIMITS.tests.fallback;
export const GOAL_CELEBRATED_KEY = 'typecheck-goal-celebrated-day';

export function normalizeGoalType(type) {
  return GOAL_TYPES.includes(type) ? type : DEFAULT_DAILY_GOAL_TYPE;
}

export function normalizeGoalValue(type, value) {
  const limits = GOAL_LIMITS[normalizeGoalType(type)];
  const numericValue = Number(value);

  if (value === null || value === undefined || value === '' || !Number.isFinite(numericValue)) {
    return limits.fallback;
  }

  return Math.min(limits.max, Math.max(limits.min, Math.round(numericValue)));
}

export function normalizeDailyGoal(goal = {}) {
  const type = normalizeGoalType(goal?.type);

  return { type, value: normalizeGoalValue(type, goal?.value) };
}

function toTimestamp(value) {
  if (value === null || value === undefined) return null;

  const date = value?.toDate?.() || value;
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function pad(number) {
  return String(number).padStart(2, '0');
}

export function getDayKey(value) {
  const timestamp = toTimestamp(value);
  if (timestamp === null) return null;

  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDayKey(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number);
  // Noon avoids DST edge cases when stepping whole days.
  return new Date(year, month - 1, day, 12);
}

export function shiftDayKey(dayKey, days) {
  const date = parseDayKey(dayKey);
  date.setDate(date.getDate() + days);
  return getDayKey(date);
}

export function getDayTotals(results) {
  const totals = new Map();

  for (const result of Array.isArray(results) ? results : []) {
    const dayKey = getDayKey(result?.createdAt);
    if (!dayKey) continue;

    const day = totals.get(dayKey) || { tests: 0, seconds: 0 };
    day.tests += 1;
    day.seconds += Math.max(0, Number(result.elapsedSeconds) || 0);
    totals.set(dayKey, day);
  }

  return totals;
}

export function isGoalMet(day, goal) {
  if (!day) return false;

  const { type, value } = normalizeDailyGoal(goal);
  return type === 'minutes' ? day.seconds / 60 >= value : day.tests >= value;
}

export function getTodayProgress(results, goal, now = Date.now()) {
  const normalizedGoal = normalizeDailyGoal(goal);
  const day = getDayTotals(results).get(getDayKey(now)) || { tests: 0, seconds: 0 };
  const minutes = Math.floor(day.seconds / 60);
  const exact = normalizedGoal.type === 'minutes' ? day.seconds / 60 : day.tests;

  return {
    goalType: normalizedGoal.type,
    goalValue: normalizedGoal.value,
    tests: day.tests,
    minutes,
    current: normalizedGoal.type === 'minutes' ? minutes : day.tests,
    fraction: Math.min(1, exact / normalizedGoal.value),
    met: exact >= normalizedGoal.value
  };
}

export function getStreaks(results, goal, now = Date.now()) {
  const totals = getDayTotals(results);
  const metDays = [...totals.keys()].filter((key) => isGoalMet(totals.get(key), goal)).sort();
  const metSet = new Set(metDays);

  let best = 0;
  let run = 0;
  let previous = null;
  for (const dayKey of metDays) {
    run = previous && shiftDayKey(previous, 1) === dayKey ? run + 1 : 1;
    best = Math.max(best, run);
    previous = dayKey;
  }

  const today = getDayKey(now);
  let cursor = metSet.has(today) ? today : shiftDayKey(today, -1);
  let current = 0;
  while (metSet.has(cursor)) {
    current += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  return { current, best };
}

export function getDailyProgress(results, goal, now = Date.now()) {
  const today = getTodayProgress(results, goal, now);
  const streaks = getStreaks(results, goal, now);

  return {
    ...today,
    currentStreak: streaks.current,
    bestStreak: Math.max(streaks.best, streaks.current)
  };
}

export function formatProgressLabel(progress) {
  const dayWord = progress.currentStreak === 1 ? 'day' : 'days';
  const unit = progress.goalType === 'minutes' ? 'minutes' : 'tests';

  return `${progress.currentStreak} ${dayWord} streak, ${progress.current} of ${progress.goalValue} ${unit} today`;
}

function getStorage(storage) {
  try {
    if (storage) return storage;
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadCelebratedDay(storage) {
  try {
    return getStorage(storage)?.getItem(GOAL_CELEBRATED_KEY) || null;
  } catch {
    return null;
  }
}

export function saveCelebratedDay(dayKey, storage) {
  try {
    getStorage(storage)?.setItem(GOAL_CELEBRATED_KEY, dayKey);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

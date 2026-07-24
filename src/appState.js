import { getThemeIds, normalizeAccentColor } from './themePersonalities.js';
import { DEFAULT_LANGUAGE, getLanguageIds } from './languages.js';
import { getTrainingModeIds } from './trainingModes.js';

export const SETTINGS_KEY = 'typecheck-settings';
export const THEME_KEY = 'typecheck-theme';
export const ONBOARDING_KEY = 'typecheck-onboarding-complete';
export const ONBOARDING_VERSION = '2026-06-training-leaderboard-profile';
export const THEMES = getThemeIds();
export const MODE_LABELS = ['15s', '30s', '60s', '10 words', '30 words', '60 words'];
export const SHORTCUT_TIME_MODES = [15, 30, 60];
export const SHORTCUT_WORD_MODES = [10, 30, 60];
export const PROFILE_RESULTS_LIMIT = 400;
export const LEADERBOARD_RESULTS_LIMIT = 500;
export const ACCOUNT_SECURITY_WINDOW_DAYS = 30;
export const PASSWORD_RESET_EMAIL_LIMIT = 4;
export const MISTAKE_MODES = ['backspace', 'strict'];
export const SOUND_STYLES = ['click', 'soft', 'bright', 'cream'];
export const TRAINING_MODE_IDS = getTrainingModeIds();
export const LANGUAGE_IDS = getLanguageIds();
export const MIN_CUSTOM_TIME = 5;
export const MAX_CUSTOM_TIME = 300;
export const MAX_CUSTOM_TEXT_LENGTH = 1200;
export const MIN_CUSTOM_TEST_CHARACTERS = 10;

export const DEFAULT_SETTINGS = {
  customText: 'Small steady practice makes typing feel effortless.',
  language: DEFAULT_LANGUAGE,
  mistakeMode: 'backspace',
  reducedMotion: false,
  showKeyboard: true,
  soundEnabled: true,
  soundStyle: 'theme',
  soundVolume: 0.9,
  testType: 'time',
  timeMode: 30,
  trainingMode: 'standard',
  accentColor: '',
  wordMode: 10
};

export function normalizeTimeMode(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return DEFAULT_SETTINGS.timeMode;

  return Math.min(
    MAX_CUSTOM_TIME,
    Math.max(MIN_CUSTOM_TIME, Math.round(numericValue))
  );
}

export function normalizeCustomTextSetting(value) {
  const normalizedValue = String(value || '').replace(/\s+/g, ' ').trim();

  return normalizedValue.slice(0, MAX_CUSTOM_TEXT_LENGTH) || DEFAULT_SETTINGS.customText;
}

export function isTooShortCustomTest(test) {
  return (
    test?.trainingMode === 'custom' &&
    String(test?.targetText || '').replace(/\s/g, '').length < MIN_CUSTOM_TEST_CHARACTERS
  );
}

export function loadTheme() {
  try {
    if (typeof localStorage === 'undefined') return 'matrix';

    const savedTheme = localStorage.getItem(THEME_KEY);
    return THEMES.includes(savedTheme) ? savedTheme : 'matrix';
  } catch {
    return 'matrix';
  }
}

export function saveTheme(theme) {
  try {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function loadSettings() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;

    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    return {
      mistakeMode: MISTAKE_MODES.includes(savedSettings?.mistakeMode)
        ? savedSettings.mistakeMode
        : DEFAULT_SETTINGS.mistakeMode,
      reducedMotion:
        typeof savedSettings?.reducedMotion === 'boolean'
          ? savedSettings.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
      accentColor: normalizeAccentColor(
        savedSettings?.accentColor,
        DEFAULT_SETTINGS.accentColor
      ),
      customText: normalizeCustomTextSetting(savedSettings?.customText),
      language: LANGUAGE_IDS.includes(savedSettings?.language)
        ? savedSettings.language
        : DEFAULT_SETTINGS.language,
      showKeyboard:
        typeof savedSettings?.showKeyboard === 'boolean'
          ? savedSettings.showKeyboard
          : DEFAULT_SETTINGS.showKeyboard,
      testType:
        savedSettings?.testType === 'words' || savedSettings?.testType === 'time'
          ? savedSettings.testType
          : DEFAULT_SETTINGS.testType,
      timeMode: normalizeTimeMode(savedSettings?.timeMode),
      trainingMode: TRAINING_MODE_IDS.includes(savedSettings?.trainingMode)
        ? savedSettings.trainingMode
        : DEFAULT_SETTINGS.trainingMode,
      wordMode: [10, 30, 60].includes(savedSettings?.wordMode)
        ? savedSettings.wordMode
        : DEFAULT_SETTINGS.wordMode,
      soundEnabled:
        typeof savedSettings?.soundEnabled === 'boolean'
          ? savedSettings.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      soundStyle: [...SOUND_STYLES, 'theme'].includes(savedSettings?.soundStyle)
        ? savedSettings.soundStyle
        : DEFAULT_SETTINGS.soundStyle,
      soundVolume:
        Number.isFinite(Number(savedSettings?.soundVolume))
          ? Math.min(1, Math.max(0, Number(savedSettings.soundVolume)))
          : DEFAULT_SETTINGS.soundVolume
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function loadOnboardingComplete() {
  try {
    if (typeof localStorage === 'undefined') return true;

    return localStorage.getItem(ONBOARDING_KEY) === ONBOARDING_VERSION;
  } catch {
    return true;
  }
}

export function saveOnboardingComplete() {
  try {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function createModeStats() {
  return {
    started: 0,
    completed: 0,
    incomplete: 0,
    bestWpm: 0,
    bestAccuracy: 0
  };
}

export function createEmptyDashboard() {
  return {
    started: 0,
    completed: 0,
    incomplete: 0,
    modes: Object.fromEntries(MODE_LABELS.map((label) => [label, createModeStats()])),
    results: [],
    estimatedWordsTyped: 0,
    totalTypingSeconds: 0
  };
}

export function normalizeDashboard(savedDashboard, results = savedDashboard?.results) {
  const emptyDashboard = createEmptyDashboard();
  const normalizedResults = Array.isArray(results)
    ? results.slice(0, PROFILE_RESULTS_LIMIT)
    : [];
  const fallbackTypingSeconds = normalizedResults.reduce(
    (totalSeconds, result) => totalSeconds + (Number(result.elapsedSeconds) || 0),
    0
  );
  const fallbackEstimatedWords = normalizedResults.reduce(
    (totalWords, result) => totalWords + Math.round((Number(result.correctChars) || 0) / 5),
    0
  );

  if (!savedDashboard) {
    return {
      ...emptyDashboard,
      estimatedWordsTyped: fallbackEstimatedWords,
      results: normalizedResults,
      totalTypingSeconds: fallbackTypingSeconds
    };
  }

  return {
    started: Number(savedDashboard.started) || 0,
    completed: Number(savedDashboard.completed) || 0,
    estimatedWordsTyped:
      Number(savedDashboard.estimatedWordsTyped) || fallbackEstimatedWords,
    incomplete: Number(savedDashboard.incomplete) || 0,
    modes: {
      ...Object.fromEntries(
        MODE_LABELS.map((label) => [
          label,
          {
            ...createModeStats(),
            ...(savedDashboard.modes?.[label] || {})
          }
        ])
      ),
      ...Object.fromEntries(
        Object.entries(savedDashboard.modes || {}).map(([label, mode]) => [
          label,
          {
            ...createModeStats(),
            ...mode
          }
        ])
      )
    },
    results: normalizedResults,
    totalTypingSeconds:
      Number(savedDashboard.totalTypingSeconds) || fallbackTypingSeconds
  };
}

export function addCompletedResultToDashboard(dashboard, completedResult, options = {}) {
  const mode = dashboard.modes[completedResult.modeLabel] || createModeStats();
  const nextMode = {
    ...mode,
    started: mode.started + (options.countStarted ? 1 : 0),
    completed: mode.completed + 1,
    bestWpm: Math.max(mode.bestWpm || 0, completedResult.wpm),
    bestAccuracy: Math.max(mode.bestAccuracy || 0, completedResult.accuracy)
  };

  return {
    ...dashboard,
    started: dashboard.started + (options.countStarted ? 1 : 0),
    completed: dashboard.completed + 1,
    modes: {
      ...dashboard.modes,
      [completedResult.modeLabel]: nextMode
    },
    results: [
      {
        id: createId(),
        accuracy: completedResult.accuracy,
        correctChars: completedResult.correctChars,
        createdAt: new Date(),
        elapsedSeconds: completedResult.elapsedSeconds,
        endedByAccuracyLock: Boolean(completedResult.endedByAccuracyLock),
        modeLabel: completedResult.modeLabel,
        netWpm: Number(completedResult.netWpm) || Number(completedResult.wpm) || 0,
        rawWpm: Number(completedResult.rawWpm) || Number(completedResult.wpm) || 0,
        testType: completedResult.testType,
        trainingMode: completedResult.trainingMode || 'standard',
        wpm: completedResult.wpm,
        wrongChars: completedResult.wrongChars
      },
      ...dashboard.results
    ].slice(0, PROFILE_RESULTS_LIMIT),
    estimatedWordsTyped:
      (Number(dashboard.estimatedWordsTyped) || 0) +
      Math.round((Number(completedResult.correctChars) || 0) / 5),
    totalTypingSeconds:
      (Number(dashboard.totalTypingSeconds) || 0) +
      (Number(completedResult.elapsedSeconds) || 0)
  };
}

export function toDate(value) {
  const date = value?.toDate?.() || value;
  if (!date) return null;

  const normalizedDate = date instanceof Date ? date : new Date(date);
  return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
}

export function normalizeDateArray(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map(toDate)
    .filter(Boolean)
    .sort((firstDate, secondDate) => secondDate - firstDate);
}

export function getAccountSecurityWindowStart() {
  return new Date(Date.now() - ACCOUNT_SECURITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function getRecentAccountEvents(events) {
  const windowStart = getAccountSecurityWindowStart();

  return normalizeDateArray(events).filter((eventDate) => eventDate >= windowStart);
}

export function normalizeProfile(savedProfile, user) {
  const joinedAt =
    savedProfile?.createdAt?.toDate?.() ||
    savedProfile?.createdAt ||
    user?.metadata?.creationTime ||
    null;

  return {
    accountSecurity: {
      passwordChangedAt: normalizeDateArray(
        savedProfile?.accountSecurity?.passwordChangedAt
      ),
      resetEmailSentAt: normalizeDateArray(
        savedProfile?.accountSecurity?.resetEmailSentAt
      )
    },
    city: savedProfile?.city || '',
    github: savedProfile?.github || '',
    joinedAt,
    occupation: savedProfile?.occupation || '',
    username: savedProfile?.username || '',
    website: savedProfile?.website || ''
  };
}

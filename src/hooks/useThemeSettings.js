import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  MAX_CUSTOM_TEXT_LENGTH,
  MISTAKE_MODES,
  normalizeTimeMode,
  saveSettings,
  loadSettings,
  loadTheme,
  saveTheme,
  SOUND_STYLES,
  THEMES,
  TRAINING_MODE_IDS
} from '../appState.js';
import {
  getThemePersonality,
  getUnlockedThemeIds,
  hexToRgbParts,
  normalizeAccentColor
} from '../themePersonalities.js';

export function useThemeSettings({
  dashboard,
  markIncompleteAttempt,
  setReplayTargetText,
  setRestartKey,
  setResult
}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState('matrix');

  const {
    accentColor,
    reducedMotion,
    soundStyle
  } = settings;
  const themePersonality = getThemePersonality(theme);
  const effectiveSoundStyle =
    soundStyle === 'theme' ? themePersonality.soundStyle : soundStyle;

  useEffect(() => {
    setTheme(loadTheme());
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.resultMotion = themePersonality.resultMotion;
  }, [theme, themePersonality.resultMotion]);

  useEffect(() => {
    const rootStyle = document.documentElement.style;
    const normalizedAccent = normalizeAccentColor(accentColor);
    const accentRgb = hexToRgbParts(normalizedAccent);

    if (!normalizedAccent || !accentRgb) {
      rootStyle.removeProperty('--accent-2');
      rootStyle.removeProperty('--accent-2-rgb');
      rootStyle.removeProperty('--accent-3');
      rootStyle.removeProperty('--caret');
      rootStyle.removeProperty('--caret-rgb');
      return;
    }

    rootStyle.setProperty('--accent-2', normalizedAccent);
    rootStyle.setProperty('--accent-2-rgb', accentRgb.join(', '));
    rootStyle.setProperty('--accent-3', normalizedAccent);
    rootStyle.setProperty('--caret', normalizedAccent);
    rootStyle.setProperty('--caret-rgb', accentRgb.join(', '));
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);

  const handleSettingsChange = useCallback((nextType, nextValue) => {
    markIncompleteAttempt();
    setReplayTargetText(null);

    const nextSettings = {
      ...settings,
      testType: nextType,
      ...(nextType === 'time'
        ? { timeMode: normalizeTimeMode(nextValue) }
        : { wordMode: nextValue })
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
    setResult(null);
    setRestartKey((key) => key + 1);
  }, [markIncompleteAttempt, setReplayTargetText, setRestartKey, setResult, settings]);

  const handleTrainingModeChange = useCallback((nextTrainingMode) => {
    if (!TRAINING_MODE_IDS.includes(nextTrainingMode)) return;

    markIncompleteAttempt();
    setReplayTargetText(null);

    const nextSettings = {
      ...settings,
      trainingMode: nextTrainingMode
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
    setResult(null);
    setRestartKey((key) => key + 1);
  }, [markIncompleteAttempt, setReplayTargetText, setRestartKey, setResult, settings]);

  const handleCustomTextChange = useCallback((nextCustomText) => {
    const trimmedCustomText = String(nextCustomText || '').slice(0, MAX_CUSTOM_TEXT_LENGTH);
    const nextSettings = {
      ...settings,
      customText: trimmedCustomText
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);

    if (settings.trainingMode !== 'custom') return;

    markIncompleteAttempt();
    setReplayTargetText(null);
    setResult(null);
    setRestartKey((key) => key + 1);
  }, [markIncompleteAttempt, setReplayTargetText, setRestartKey, setResult, settings]);

  const handleSoundToggle = useCallback((nextSoundEnabled) => {
    const nextSettings = {
      ...settings,
      soundEnabled: nextSoundEnabled
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
  }, [settings]);

  const handlePreferencesChange = useCallback((nextOptions) => {
    const nextSettings = {
      ...settings,
      ...nextOptions,
      mistakeMode: MISTAKE_MODES.includes(nextOptions.mistakeMode)
        ? nextOptions.mistakeMode
        : settings.mistakeMode,
      reducedMotion:
        typeof nextOptions.reducedMotion === 'boolean'
          ? nextOptions.reducedMotion
          : settings.reducedMotion,
      accentColor:
        typeof nextOptions.accentColor === 'string'
          ? normalizeAccentColor(nextOptions.accentColor, settings.accentColor)
          : settings.accentColor,
      showKeyboard:
        typeof nextOptions.showKeyboard === 'boolean'
          ? nextOptions.showKeyboard
          : settings.showKeyboard,
      soundStyle: [...SOUND_STYLES, 'theme'].includes(nextOptions.soundStyle)
        ? nextOptions.soundStyle
        : settings.soundStyle,
      soundVolume:
        Number.isFinite(Number(nextOptions.soundVolume))
          ? Math.min(1, Math.max(0, Number(nextOptions.soundVolume)))
          : settings.soundVolume
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
  }, [settings]);

  const handleThemeChange = useCallback((nextTheme) => {
    if (!THEMES.includes(nextTheme)) return;
    if (!getUnlockedThemeIds(dashboard).includes(nextTheme) && nextTheme !== theme) return;
    setTheme(nextTheme);
    saveTheme(nextTheme);
  }, [dashboard, theme]);

  return {
    effectiveSoundStyle,
    handleCustomTextChange,
    handlePreferencesChange,
    handleSettingsChange,
    handleSoundToggle,
    handleThemeChange,
    handleTrainingModeChange,
    settings,
    theme
  };
}

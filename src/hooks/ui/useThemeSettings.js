import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  LANGUAGE_IDS,
  loadSettings,
  loadTheme,
  MAX_CUSTOM_TEXT_LENGTH,
  MISTAKE_MODES,
  normalizeReducedMotion,
  normalizeTimeMode,
  normalizeTypingFont,
  normalizeTypingFontSize,
  SOUND_STYLES,
  saveSettings,
  saveTheme,
  THEMES,
  TRAINING_MODE_IDS
} from '../../appState.js';
import {
  getThemePersonality,
  getUnlockedThemeIds,
  hexToRgbParts,
  normalizeAccentColor
} from '../../themePersonalities.js';

export function useThemeSettings({
  dashboard,
  markIncompleteAttempt,
  setReplayTargetText,
  setRestartKey,
  setResult
}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState('matrix');

  const { accentColor, reducedMotion, soundStyle, typingFont, typingFontSize } =
    settings;
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
    // 'system' is resolved in CSS via prefers-reduced-motion; 'on'/'off' force it.
    document.documentElement.dataset.reducedMotion =
      reducedMotion === 'on' ? 'true' : reducedMotion === 'off' ? 'false' : 'system';
  }, [reducedMotion]);

  useEffect(() => {
    const root = document.documentElement;
    const fontFamilies = {
      default: 'inherit',
      readable: 'var(--font-readable, "Atkinson Hyperlegible", system-ui, sans-serif)',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
    };
    const fontScales = { small: '0.85', medium: '1', large: '1.2', xlarge: '1.45' };

    root.dataset.typingFont = typingFont;
    root.dataset.typingFontSize = typingFontSize;
    root.style.setProperty('--typing-font-family', fontFamilies[typingFont]);
    root.style.setProperty('--typing-font-scale', fontScales[typingFontSize]);
  }, [typingFont, typingFontSize]);

  const handleSettingsChange = useCallback(
    (nextType, nextValue) => {
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
    },
    [markIncompleteAttempt, setReplayTargetText, setRestartKey, setResult, settings]
  );

  const handleTrainingModeChange = useCallback(
    (nextTrainingMode) => {
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
    },
    [markIncompleteAttempt, setReplayTargetText, setRestartKey, setResult, settings]
  );

  const handleLanguageChange = useCallback(
    (nextLanguage) => {
      if (!LANGUAGE_IDS.includes(nextLanguage)) return;

      markIncompleteAttempt();
      setReplayTargetText(null);

      const nextSettings = {
        ...settings,
        language: nextLanguage
      };

      setSettings(nextSettings);
      saveSettings(nextSettings);
      setResult(null);
      setRestartKey((key) => key + 1);
    },
    [markIncompleteAttempt, setReplayTargetText, setRestartKey, setResult, settings]
  );

  const handleCustomTextChange = useCallback(
    (nextCustomText) => {
      const trimmedCustomText = String(nextCustomText || '').slice(
        0,
        MAX_CUSTOM_TEXT_LENGTH
      );
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
    },
    [markIncompleteAttempt, setReplayTargetText, setRestartKey, setResult, settings]
  );

  const handleSoundToggle = useCallback(
    (nextSoundEnabled) => {
      const nextSettings = {
        ...settings,
        soundEnabled: nextSoundEnabled
      };

      setSettings(nextSettings);
      saveSettings(nextSettings);
    },
    [settings]
  );

  const handlePreferencesChange = useCallback(
    (nextOptions) => {
      const nextSettings = {
        ...settings,
        ...nextOptions,
        mistakeMode: MISTAKE_MODES.includes(nextOptions.mistakeMode)
          ? nextOptions.mistakeMode
          : settings.mistakeMode,
        reducedMotion: normalizeReducedMotion(
          nextOptions.reducedMotion,
          settings.reducedMotion
        ),
        typingFont: normalizeTypingFont(nextOptions.typingFont, settings.typingFont),
        typingFontSize: normalizeTypingFontSize(
          nextOptions.typingFontSize,
          settings.typingFontSize
        ),
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
        soundVolume: Number.isFinite(Number(nextOptions.soundVolume))
          ? Math.min(1, Math.max(0, Number(nextOptions.soundVolume)))
          : settings.soundVolume
      };

      setSettings(nextSettings);
      saveSettings(nextSettings);
    },
    [settings]
  );

  const handleThemeChange = useCallback(
    (nextTheme) => {
      if (!THEMES.includes(nextTheme)) return;
      if (!getUnlockedThemeIds(dashboard).includes(nextTheme) && nextTheme !== theme)
        return;
      setTheme(nextTheme);
      saveTheme(nextTheme);
    },
    [dashboard, theme]
  );

  return {
    effectiveSoundStyle,
    handleCustomTextChange,
    handleLanguageChange,
    handlePreferencesChange,
    handleSettingsChange,
    handleSoundToggle,
    handleThemeChange,
    handleTrainingModeChange,
    settings,
    theme
  };
}

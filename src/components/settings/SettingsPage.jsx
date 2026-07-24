import { motion } from 'framer-motion';
import {
  ACCENT_COLORS,
  getDashboardThemeStats,
  getUnlockedThemeIds,
  THEME_PERSONALITIES
} from '../../themePersonalities.js';

const SOUND_STYLES = [
  {
    id: 'theme',
    label: 'Theme',
    description: 'Use the sound personality from the active theme.'
  },
  {
    id: 'click',
    label: 'Click',
    description: 'Classic mechanical key sound.'
  },
  {
    id: 'soft',
    label: 'Soft',
    description: 'Lower tone for quieter sessions.'
  },
  {
    id: 'bright',
    label: 'Bright',
    description: 'Sharper tone with faster feedback.'
  },
  {
    id: 'cream',
    label: 'Cream',
    description: 'NK Cream soundpack with per-key audio clips.',
  }
];
const MISTAKE_MODES = [
  {
    id: 'backspace',
    label: 'Allow backspace',
    description: 'Correct mistakes during a test.'
  },
  {
    id: 'strict',
    label: 'Strict mode',
    description: 'Keep mistakes locked in once typed.'
  }
];

function ToggleSetting({ checked, description, label, onChange }) {
  return (
    <div className="setting-toggle-row">
      <div>
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
      <button
        aria-pressed={checked}
        className={checked ? 'sound-toggle active' : 'sound-toggle'}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className="sound-toggle-track" aria-hidden="true">
          <span />
        </span>
        <span>{checked ? 'on' : 'off'}</span>
      </button>
    </div>
  );
}

function SettingsPage({
  accentColor,
  dashboard,
  mistakeMode,
  reducedMotion,
  showKeyboard,
  soundEnabled,
  soundStyle,
  soundVolume,
  onPreferencesChange,
  onSoundToggle,
  onThemeChange,
  theme
}) {
  const unlockedThemeIds = getUnlockedThemeIds(dashboard);
  const themeStats = getDashboardThemeStats(dashboard);

  return (
    <motion.main
      className="settings-page"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <section className="settings-page-hero">
        <div>
          <p className="eyebrow">settings</p>
          <h2>Preferences</h2>
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="theme-settings-title">
        <div className="settings-panel-heading">
          <div>
            <span>appearance</span>
            <strong id="theme-settings-title">Theme</strong>
          </div>
        </div>

        <div className="theme-choice-grid" role="radiogroup" aria-label="Theme">
          {THEME_PERSONALITIES.map((themeOption) => {
            const isActive = theme === themeOption.id;
            const isUnlocked = unlockedThemeIds.includes(themeOption.id) || isActive;

            return (
              <button
                aria-checked={theme === themeOption.id}
                aria-disabled={!isUnlocked}
                className={[
                  'settings-theme-choice',
                  isActive ? 'active' : '',
                  !isUnlocked ? 'locked' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={themeOption.id}
                onClick={() => onThemeChange(themeOption.id)}
                role="radio"
                type="button"
              >
                <span className="theme-preview-window" aria-hidden="true">
                  <span className="theme-preview-text">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="theme-preview-caret" />
                </span>
                <span className="theme-swatches" aria-hidden="true">
                  {themeOption.colors.map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </span>
                <strong>{themeOption.label}</strong>
                <small>{themeOption.description}</small>
                <em>{isUnlocked ? themeOption.soundStyle : themeOption.unlock.label}</em>
              </button>
            );
          })}
        </div>

        <div className="theme-unlock-summary">
          <span>{themeStats.completed} tests</span>
          <span>{themeStats.bestWpm} best WPM</span>
          <span>{themeStats.bestAccuracy}% best accuracy</span>
        </div>

        <div className="accent-customizer" aria-label="Accent color">
          <div>
            <span>accent</span>
            <strong>User-selected accent color</strong>
          </div>
          <div className="accent-choice-row">
            {ACCENT_COLORS.map((color) => (
              <button
                aria-label={`Use ${color} accent`}
                className={
                  accentColor === color ? 'accent-choice active' : 'accent-choice'
                }
                key={color}
                onClick={() => onPreferencesChange({ accentColor: color })}
                style={{ background: color }}
                type="button"
              />
            ))}
            <label className="accent-picker">
              <span>custom</span>
              <input
                aria-label="Custom accent color"
                onChange={(event) =>
                  onPreferencesChange({ accentColor: event.target.value })
                }
                type="color"
                value={accentColor || '#b9dc6d'}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="behavior-settings-title">
        <div className="settings-panel-heading">
          <div>
            <span>behavior</span>
            <strong id="behavior-settings-title">Typing rules</strong>
          </div>
        </div>

        <div
          className="sound-style-cards"
          role="radiogroup"
          aria-label="Mistake behavior"
        >
          {MISTAKE_MODES.map((mode) => (
            <button
              aria-checked={mistakeMode === mode.id}
              className={
                mistakeMode === mode.id ? 'sound-style-card active' : 'sound-style-card'
              }
              key={mode.id}
              onClick={() => onPreferencesChange({ mistakeMode: mode.id })}
              role="radio"
              type="button"
            >
              <span>{mode.label}</span>
              <small>{mode.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="display-settings-title">
        <div className="settings-panel-heading">
          <div>
            <span>display</span>
            <strong id="display-settings-title">Interface</strong>
          </div>
        </div>

        <div className="setting-toggle-list">
          <ToggleSetting
            checked={showKeyboard}
            description="Show the on-screen keyboard under the typing area."
            label="Visual keyboard"
            onChange={(nextValue) => onPreferencesChange({ showKeyboard: nextValue })}
          />
          <ToggleSetting
            checked={reducedMotion}
            description="Reduce page transitions and animated movement."
            label="Reduced motion"
            onChange={(nextValue) => onPreferencesChange({ reducedMotion: nextValue })}
          />
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="sound-settings-title">
        <div className="settings-panel-heading">
          <div>
            <span>sound</span>
            <strong id="sound-settings-title">Keyboard feedback</strong>
          </div>
          <button
            aria-pressed={soundEnabled}
            className={soundEnabled ? 'sound-toggle active' : 'sound-toggle'}
            onClick={() => onSoundToggle(!soundEnabled)}
            type="button"
          >
            <span className="sound-toggle-track" aria-hidden="true">
              <span />
            </span>
            <span>{soundEnabled ? 'on' : 'off'}</span>
          </button>
        </div>

        <div className="sound-style-cards" role="radiogroup" aria-label="Sound style">
          {SOUND_STYLES.map((style) => (
            <button
              aria-checked={soundStyle === style.id}
              className={
                soundStyle === style.id ? 'sound-style-card active' : 'sound-style-card'
              }
              disabled={!soundEnabled}
              key={style.id}
              onClick={() => onPreferencesChange({ soundStyle: style.id })}
              role="radio"
              type="button"
            >
              <span>{style.label}</span>
              <small>{style.description}</small>
            </button>
          ))}
        </div>

        <label className="settings-volume">
          <span>Volume</span>
          <strong>{Math.round(soundVolume * 100)}%</strong>
          <input
            aria-label="Sound volume"
            disabled={!soundEnabled}
            max="1"
            min="0"
            onChange={(event) => {
              onPreferencesChange({ soundVolume: Number(event.target.value) });
            }}
            step="0.05"
            type="range"
            value={soundVolume}
          />
        </label>
      </section>
    </motion.main>
  );
}

export default SettingsPage;

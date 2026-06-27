import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TRAINING_MODES } from '../trainingModes.js';
import { SettingsIcon } from './MaterialIcons.jsx';

const TIME_MODES = [15, 30, 60];
const WORD_MODES = [10, 30, 60];
const MIN_CUSTOM_TIME = 5;
const MAX_CUSTOM_TIME = 300;

const buttonMotion = {
  hover: { y: -1, scale: 1.03 },
  tap: { scale: 0.96 }
};

const TRAINING_MODE_META = {
  standard: {
    difficulty: 'easy',
    focus: 'baseline',
    icon: 'Aa'
  },
  weak: {
    difficulty: 'hard',
    focus: 'awkward keys',
    icon: 'W'
  },
  quotes: {
    difficulty: 'medium',
    focus: 'rhythm',
    icon: '"'
  },
  code: {
    difficulty: 'hard',
    focus: 'symbols',
    icon: '{}'
  },
  numbers: {
    difficulty: 'medium',
    focus: 'digits',
    icon: '#'
  },
  'accuracy-lock': {
    difficulty: 'hard',
    focus: 'precision',
    icon: '!'
  }
};
const TRAINING_CARD_MODES = TRAINING_MODES.filter((mode) => mode.id !== 'standard');
const DEFAULT_ENABLED_TRAINING_MODE = TRAINING_CARD_MODES[0]?.id || 'weak';

function TestSettings({
  selectedType,
  selectedTrainingMode = 'standard',
  selectedValue,
  onSettingsChange,
  onTrainingModeChange,
  disabled
}) {
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false);
  const [customTime, setCustomTime] = useState(String(selectedValue));
  const [lastTrainingMode, setLastTrainingMode] = useState(DEFAULT_ENABLED_TRAINING_MODE);
  const customTimeRef = useRef(null);
  const isCustomTimeSelected =
    selectedType === 'time' && !TIME_MODES.includes(selectedValue);
  const isTrainingEnabled = selectedTrainingMode !== 'standard';

  useEffect(() => {
    if (selectedType === 'time') {
      setCustomTime(String(selectedValue));
    }
  }, [selectedType, selectedValue]);

  useEffect(() => {
    if (!isCustomTimeOpen) return undefined;

    const closeCustomTime = (event) => {
      if (customTimeRef.current?.contains(event.target)) return;

      setIsCustomTimeOpen(false);
    };

    document.addEventListener('pointerdown', closeCustomTime);
    return () => document.removeEventListener('pointerdown', closeCustomTime);
  }, [isCustomTimeOpen]);

  useEffect(() => {
    if (selectedTrainingMode !== 'standard') {
      setLastTrainingMode(selectedTrainingMode);
    }
  }, [selectedTrainingMode]);

  const applyCustomTime = () => {
    const normalizedTime = Math.min(
      MAX_CUSTOM_TIME,
      Math.max(MIN_CUSTOM_TIME, Math.round(Number(customTime)))
    );

    if (!Number.isFinite(normalizedTime)) return;

    setCustomTime(String(normalizedTime));
    setIsCustomTimeOpen(false);
    onSettingsChange('time', normalizedTime);
  };

  const toggleTraining = () => {
    if (disabled) return;

    onTrainingModeChange(
      isTrainingEnabled ? 'standard' : lastTrainingMode
    );
  };

  return (
    <motion.section
      className="settings"
      aria-label="Test settings"
      layout
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div className="settings-primary">
        <div className="settings-row">
          <span className="settings-label">time</span>
          <div className="mode-group" role="group" aria-label="Choose time mode">
            {TIME_MODES.map((mode) => (
              <motion.button
                className={
                  selectedType === 'time' && mode === selectedValue
                    ? 'mode active'
                    : 'mode'
                }
                disabled={disabled}
                key={mode}
                onClick={() => onSettingsChange('time', mode)}
                type="button"
                whileHover={disabled ? undefined : buttonMotion.hover}
                whileTap={disabled ? undefined : buttonMotion.tap}
              >
                {selectedType === 'time' && mode === selectedValue && (
                  <motion.span
                    className="mode-active-bg"
                    layoutId="active-mode"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="mode-text">{mode}s</span>
              </motion.button>
            ))}

            <div className="custom-time" ref={customTimeRef}>
              <motion.button
                aria-expanded={isCustomTimeOpen}
                aria-label="Custom time"
                className={
                  isCustomTimeSelected
                    ? 'mode custom-time-toggle active'
                    : 'mode custom-time-toggle'
                }
                disabled={disabled}
                onClick={() => setIsCustomTimeOpen((current) => !current)}
                type="button"
                whileHover={disabled ? undefined : buttonMotion.hover}
                whileTap={disabled ? undefined : buttonMotion.tap}
              >
                {isCustomTimeSelected && (
                  <motion.span
                    className="mode-active-bg"
                    layoutId="active-mode"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <SettingsIcon />
                {isCustomTimeSelected && (
                  <span className="mode-text custom-time-value">{selectedValue}s</span>
                )}
              </motion.button>

              <AnimatePresence>
                {isCustomTimeOpen && !disabled && (
                  <motion.form
                    className="custom-time-panel"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyCustomTime();
                    }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    <label htmlFor="custom-time-input">seconds</label>
                    <input
                      id="custom-time-input"
                      inputMode="numeric"
                      max={MAX_CUSTOM_TIME}
                      min={MIN_CUSTOM_TIME}
                      onChange={(event) => setCustomTime(event.target.value)}
                      type="number"
                      value={customTime}
                    />
                    <button type="submit">Set</button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="settings-divider" aria-hidden="true" />

        <div className="settings-row">
          <span className="settings-label">words</span>
          <div className="mode-group" role="group" aria-label="Choose word count">
            {WORD_MODES.map((mode) => (
              <motion.button
                className={
                  selectedType === 'words' && mode === selectedValue
                    ? 'mode active'
                    : 'mode'
                }
                disabled={disabled}
                key={mode}
                onClick={() => onSettingsChange('words', mode)}
                type="button"
                whileHover={disabled ? undefined : buttonMotion.hover}
                whileTap={disabled ? undefined : buttonMotion.tap}
              >
                {selectedType === 'words' && mode === selectedValue && (
                  <motion.span
                    className="mode-active-bg"
                    layoutId="active-mode"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="mode-text">{mode}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={isTrainingEnabled ? 'training-rail' : 'training-rail training-off'}
        data-onboarding-target="training"
      >
        <div className="training-rail-top">
          <span className="training-rail-label">training</span>
          <button
            aria-label={isTrainingEnabled ? 'Turn training off' : 'Turn training on'}
            aria-pressed={isTrainingEnabled}
            className="training-toggle"
            disabled={disabled}
            onClick={toggleTraining}
            type="button"
          >
            <span className="training-toggle-track" aria-hidden="true">
              <span />
            </span>
            <strong>{isTrainingEnabled ? 'on' : 'off'}</strong>
          </button>
        </div>
        <AnimatePresence initial={false}>
          {isTrainingEnabled && (
            <motion.div
              className="training-mode-grid"
              role="group"
              aria-label="Choose training mode"
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {TRAINING_CARD_MODES.map((mode) => {
                const meta = TRAINING_MODE_META[mode.id];
                const isActive = selectedTrainingMode === mode.id;

                return (
                  <motion.button
                    aria-label={`${mode.label}: ${mode.description}. ${meta.focus} focus, ${meta.difficulty} difficulty.`}
                    className={
                      isActive
                        ? 'training-mode-card active'
                        : 'training-mode-card'
                    }
                    disabled={disabled}
                    key={mode.id}
                    onClick={() => onTrainingModeChange(mode.id)}
                    title={mode.description}
                    type="button"
                    whileHover={disabled ? undefined : buttonMotion.hover}
                    whileTap={disabled ? undefined : buttonMotion.tap}
                  >
                    {isActive && (
                      <motion.span
                        className="training-mode-active-bg"
                        layoutId="active-training-mode-card"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="training-mode-icon" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <span className="training-mode-copy">
                      <strong>{mode.shortLabel}</strong>
                      <small>{meta.focus}</small>
                    </span>
                    <span className={`training-mode-difficulty difficulty-${meta.difficulty}`}>
                      {meta.difficulty}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

export default TestSettings;

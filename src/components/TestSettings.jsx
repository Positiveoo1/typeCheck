import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TIME_MODES = [15, 30, 60];
const WORD_MODES = [10, 30, 60];
const MIN_CUSTOM_TIME = 5;
const MAX_CUSTOM_TIME = 300;

const buttonMotion = {
  hover: { y: -1, scale: 1.03 },
  tap: { scale: 0.96 }
};

function TestSettings({ selectedType, selectedValue, onSettingsChange, disabled }) {
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false);
  const [customTime, setCustomTime] = useState(String(selectedValue));
  const isCustomTimeSelected =
    selectedType === 'time' && !TIME_MODES.includes(selectedValue);

  useEffect(() => {
    if (selectedType === 'time') {
      setCustomTime(String(selectedValue));
    }
  }, [selectedType, selectedValue]);

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

  return (
    <motion.section
      className="settings"
      aria-label="Test settings"
      layout
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
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

          <div className="custom-time">
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
              <span className="settings-gear" aria-hidden="true" />
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
    </motion.section>
  );
}

export default TestSettings;

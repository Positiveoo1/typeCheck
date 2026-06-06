import { motion } from 'framer-motion';

const TIME_MODES = [15, 30, 60];
const WORD_MODES = [10, 30, 60];

const buttonMotion = {
  hover: { y: -1, scale: 1.03 },
  tap: { scale: 0.96 }
};

function TestSettings({ selectedType, selectedValue, onSettingsChange, disabled }) {
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

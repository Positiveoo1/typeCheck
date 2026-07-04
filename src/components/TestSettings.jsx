import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TRAINING_MODES } from '../trainingModes.js';

const TIME_MODES = [15, 30, 60];
const WORD_MODES = [10, 30, 60];

const TRAINING_CARD_MODES = TRAINING_MODES.filter((mode) => mode.id !== 'standard');
const TRAINING_LABELS = {
  'accuracy-lock': 'lock',
  code: 'code',
  custom: 'custom',
  numbers: 'numbers',
  quotes: 'quote',
  standard: 'standard',
  weak: 'weak'
};

function TestSettings({
  customText = '',
  selectedType,
  selectedTrainingMode = 'standard',
  selectedValue,
  onCustomTextChange,
  onSettingsChange,
  onTrainingModeChange,
  disabled
}) {
  const [isCustomTextOpen, setIsCustomTextOpen] = useState(false);
  const [customTextDraft, setCustomTextDraft] = useState(customText);
  const isCustomTimeSelected =
    selectedType === 'time' && !TIME_MODES.includes(selectedValue);

  useEffect(() => {
    setCustomTextDraft(customText);
  }, [customText]);

  const selectTrainingMode = (modeId) => {
    if (disabled) return;

    if (modeId === 'custom') {
      setCustomTextDraft(customText);
      setIsCustomTextOpen(true);
    }

    onTrainingModeChange(modeId);
  };

  const applyCustomText = () => {
    onCustomTextChange(customTextDraft);
    setIsCustomTextOpen(false);
  };

  return (
    <>
      <motion.section
        className="settings settings-inline"
        aria-label="Test settings"
        layout
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="inline-mode-group" role="group" aria-label="Choose training mode" data-onboarding-target="training">
          <span className="inline-mode-title">training</span>
          <button
            className={selectedTrainingMode === 'standard' ? 'inline-mode active' : 'inline-mode'}
            disabled={disabled}
            onClick={() => onTrainingModeChange('standard')}
            title="Standard mode"
            type="button"
          >
            standard
          </button>
          {TRAINING_CARD_MODES.map((mode) => (
            <button
              className={selectedTrainingMode === mode.id ? 'inline-mode active' : 'inline-mode'}
              disabled={disabled}
              key={mode.id}
              onClick={() => selectTrainingMode(mode.id)}
              title={mode.label}
              type="button"
            >
              {TRAINING_LABELS[mode.id] || mode.shortLabel}
            </button>
          ))}
        </div>

        <span className="inline-divider" aria-hidden="true" />

        <div className="inline-mode-group" role="group" aria-label="Choose test type">
          <span className="inline-mode-title">test</span>
          <button
            className={selectedType === 'time' ? 'inline-mode active' : 'inline-mode'}
            disabled={disabled}
            onClick={() => onSettingsChange('time', selectedType === 'time' ? selectedValue : TIME_MODES[1])}
            title="Timed test"
            type="button"
          >
            time
          </button>
          <button
            className={selectedType === 'words' ? 'inline-mode active' : 'inline-mode'}
            disabled={disabled}
            onClick={() => onSettingsChange('words', selectedType === 'words' ? selectedValue : WORD_MODES[0])}
            title="Word-count test"
            type="button"
          >
            words
          </button>
        </div>

        <span className="inline-divider" aria-hidden="true" />

        <div className="inline-mode-group" role="group" aria-label="Choose test length">
          <span className="inline-mode-title">length</span>
          {(selectedType === 'time' ? TIME_MODES : WORD_MODES).map((mode) => (
            <button
              className={mode === selectedValue ? 'inline-mode active' : 'inline-mode'}
              disabled={disabled}
              key={`${selectedType}-${mode}`}
              onClick={() => onSettingsChange(selectedType, mode)}
              title={selectedType === 'time' ? `${mode} seconds` : `${mode} words`}
              type="button"
            >
              {selectedType === 'time' ? `${mode}s` : mode}
            </button>
          ))}

          {isCustomTimeSelected && (
            <span className="inline-mode inline-mode-static active" title="Custom time">
              {selectedValue}s
            </span>
          )}
        </div>
      </motion.section>

      <AnimatePresence>
        {isCustomTextOpen && (
          <motion.div
            className="custom-text-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <button
              aria-label="Close custom text"
              className="custom-text-backdrop"
              onClick={() => setIsCustomTextOpen(false)}
              type="button"
            />
            <motion.form
              aria-labelledby="custom-text-title"
              className="custom-text-panel"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onSubmit={(event) => {
                event.preventDefault();
                applyCustomText();
              }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <label id="custom-text-title" htmlFor="custom-text-input">custom text</label>
              <textarea
                autoFocus
                id="custom-text-input"
                maxLength={1200}
                onChange={(event) => setCustomTextDraft(event.target.value)}
                placeholder="Paste or type the text you want to practice."
                value={customTextDraft}
              />
              <div className="custom-text-actions">
                <span>{customTextDraft.trim().length}/1200</span>
                <button type="button" onClick={() => setIsCustomTextOpen(false)}>Cancel</button>
                <button type="submit">Apply</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default TestSettings;

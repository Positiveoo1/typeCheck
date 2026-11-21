import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  DAILY_CHALLENGE_MODE,
  DAILY_CHALLENGE_WORD_COUNT,
  formatDailyResetCountdown,
  getMsUntilDailyReset,
  loadDailyDone
} from '../../dailyChallenge.js';
import { TRAINING_MODES } from '../../trainingModes.js';
import {
  CalendarIcon,
  CheckIcon,
  CodeIcon,
  KeyboardIcon,
  LockIcon,
  NumbersIcon,
  QuoteIcon,
  StarIcon,
  TextFieldsIcon,
  TimerIcon,
  TuneIcon
} from '../common/MaterialIcons.jsx';

const TIME_MODES = [15, 30, 60];
const WORD_MODES = [10, 30, 60];

// Daily has its own entry point (DailyChallengeChip) above the mode row.
const TRAINING_CARD_MODES = TRAINING_MODES.filter(
  (mode) => mode.id !== 'standard' && mode.id !== DAILY_CHALLENGE_MODE
);
const TRAINING_LABELS = {
  'accuracy-lock': 'lock',
  code: 'code',
  daily: 'daily',
  custom: 'custom',
  numbers: 'numbers',
  quotes: 'quote',
  standard: 'standard',
  weak: 'weak'
};
const TRAINING_ICONS = {
  'accuracy-lock': LockIcon,
  code: CodeIcon,
  custom: TextFieldsIcon,
  numbers: NumbersIcon,
  quotes: QuoteIcon,
  standard: KeyboardIcon,
  weak: StarIcon
};

function useDailyStatus() {
  const [status, setStatus] = useState({ done: null, resetMs: 0 });

  useEffect(() => {
    const refresh = () =>
      setStatus({ done: loadDailyDone(), resetMs: getMsUntilDailyReset() });

    refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('typecheck-daily-done', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('typecheck-daily-done', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return status;
}

function DailyChallengeChip({ disabled, isSelected, onSelect }) {
  const { done, resetMs } = useDailyStatus();
  const statusText = done
    ? `done today · best ${done.bestWpm} wpm`
    : `${DAILY_CHALLENGE_WORD_COUNT} words · same for everyone`;

  return (
    <div className="daily-challenge-entry" data-onboarding-target="daily-challenge">
      <button
        aria-pressed={isSelected}
        className={[
          'daily-challenge-chip',
          isSelected ? 'active' : '',
          done ? 'done' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        onClick={onSelect}
        title="Same 40 words for everyone today"
        type="button"
      >
        {done ? <CheckIcon /> : <CalendarIcon />}
        <span className="daily-challenge-chip-title">Daily challenge</span>
        <span className="daily-challenge-chip-status">{statusText}</span>
      </button>
      {resetMs > 0 && (
        <span className="daily-challenge-reset">
          resets in {formatDailyResetCountdown(resetMs)}
        </span>
      )}
    </div>
  );
}

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

  const isDaily = selectedTrainingMode === DAILY_CHALLENGE_MODE;

  return (
    <>
      <DailyChallengeChip
        disabled={disabled}
        isSelected={isDaily}
        onSelect={() => onTrainingModeChange(isDaily ? 'standard' : DAILY_CHALLENGE_MODE)}
      />
      <motion.section
        className="settings settings-inline"
        aria-label="Test settings"
        layout
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div
          className="inline-mode-group"
          role="group"
          aria-label="Choose training mode"
          data-onboarding-target="training"
        >
          <span className="inline-mode-title">training</span>
          <button
            className={
              selectedTrainingMode === 'standard' ? 'inline-mode active' : 'inline-mode'
            }
            disabled={disabled}
            onClick={() => onTrainingModeChange('standard')}
            title="Standard mode"
            type="button"
          >
            <KeyboardIcon />
            <span>standard</span>
          </button>
          {TRAINING_CARD_MODES.map((mode) => {
            const ModeIcon = TRAINING_ICONS[mode.id] || TuneIcon;

            return (
              <button
                className={
                  selectedTrainingMode === mode.id ? 'inline-mode active' : 'inline-mode'
                }
                disabled={disabled}
                key={mode.id}
                onClick={() => selectTrainingMode(mode.id)}
                title={mode.label}
                type="button"
              >
                <ModeIcon />
                <span>{TRAINING_LABELS[mode.id] || mode.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {isDaily ? (
          <>
            <span className="inline-divider" aria-hidden="true" />
            <div
              className="inline-mode-group"
              role="group"
              aria-label="Daily challenge length"
            >
              <span className="inline-mode-title">test</span>
              <span
                className="inline-mode inline-mode-static active"
                title="Daily challenge"
              >
                <TextFieldsIcon />
                <span>{DAILY_CHALLENGE_WORD_COUNT} words</span>
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="inline-divider" aria-hidden="true" />

            <div className="inline-mode-group" role="group" aria-label="Choose test type">
              <span className="inline-mode-title">test</span>
              <button
                className={selectedType === 'time' ? 'inline-mode active' : 'inline-mode'}
                disabled={disabled}
                onClick={() =>
                  onSettingsChange(
                    'time',
                    selectedType === 'time' ? selectedValue : TIME_MODES[1]
                  )
                }
                title="Timed test"
                type="button"
              >
                <TimerIcon />
                <span>time</span>
              </button>
              <button
                className={
                  selectedType === 'words' ? 'inline-mode active' : 'inline-mode'
                }
                disabled={disabled}
                onClick={() =>
                  onSettingsChange(
                    'words',
                    selectedType === 'words' ? selectedValue : WORD_MODES[0]
                  )
                }
                title="Word-count test"
                type="button"
              >
                <TextFieldsIcon />
                <span>words</span>
              </button>
            </div>

            <span className="inline-divider" aria-hidden="true" />

            <div
              className="inline-mode-group"
              role="group"
              aria-label="Choose test length"
            >
              <span className="inline-mode-title">length</span>
              {(selectedType === 'time' ? TIME_MODES : WORD_MODES).map((mode) => (
                <button
                  className={
                    mode === selectedValue ? 'inline-mode active' : 'inline-mode'
                  }
                  disabled={disabled}
                  key={`${selectedType}-${mode}`}
                  onClick={() => onSettingsChange(selectedType, mode)}
                  title={selectedType === 'time' ? `${mode} seconds` : `${mode} words`}
                  type="button"
                >
                  {selectedType === 'time' ? <TimerIcon /> : <TextFieldsIcon />}
                  <span>{selectedType === 'time' ? `${mode}s` : mode}</span>
                </button>
              ))}

              {isCustomTimeSelected && (
                <span
                  className="inline-mode inline-mode-static active"
                  title="Custom time"
                >
                  <TimerIcon />
                  <span>{selectedValue}s</span>
                </span>
              )}
            </div>
          </>
        )}
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
              <label id="custom-text-title" htmlFor="custom-text-input">
                custom text
              </label>
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
                <button type="button" onClick={() => setIsCustomTextOpen(false)}>
                  Cancel
                </button>
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

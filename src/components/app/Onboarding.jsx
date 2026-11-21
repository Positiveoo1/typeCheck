import { motion } from 'framer-motion';
import { useLayoutEffect, useState } from 'react';

// `isNew` marks steps added in the current ONBOARDING_VERSION. People who
// finished an older tour only see these, as a short "what's new".
export const ONBOARDING_ITEMS = [
  {
    selector: '[data-onboarding-target="settings"]',
    title: 'Choose your test',
    text: 'Pick a time limit, word count, or custom time before you start.'
  },
  {
    selector: '[data-onboarding-target="training"]',
    title: 'Train a weak spot',
    text: 'Weak keys builds drills from the letters you miss and the letter pairs that slow you down. Quotes, code, numbers and accuracy lock are here too.',
    isNew: true
  },
  {
    selector: '[data-onboarding-target="daily-challenge"]',
    title: 'Take the daily challenge',
    text: 'The same 40 words for everyone, new every day. Sign in to get on the daily leaderboard.',
    isNew: true
  },
  {
    selector: '[data-onboarding-target="typing"]',
    title: 'Type in the text area',
    text: 'Start typing the visible words. The test begins on your first key.'
  },
  {
    selector: '[data-onboarding-target="restart-shortcut"]',
    title: 'Restart in one key',
    text: 'Press Esc (or Cmd/Ctrl + Enter) to restart without reaching for the mouse.'
  },
  {
    selector: '[data-onboarding-target="ghost"]',
    title: 'Race your ghost',
    text: 'Turn on the ghost to race a caret that replays your personal best or your last run.',
    isNew: true
  },
  {
    selector: '[data-onboarding-target="daily-goal"]',
    title: 'Keep your streak',
    text: 'Hit your daily goal to grow your streak. Change the goal in settings.',
    isNew: true
  },
  {
    selector: '[data-onboarding-target="leaderboard"]',
    title: 'Compare rankings',
    text: 'See all-time scores by mode, or switch to today\'s daily challenge ranking.',
    isNew: true
  },
  {
    selector: '[data-onboarding-target="app-settings"]',
    title: 'Make it yours',
    text: 'Themes (including high-contrast and colour-blind friendly), a readable font, text size, sound and motion.',
    isNew: true
  },
  {
    selector: '[data-onboarding-target="account-dashboard"]',
    title: 'Your progress is saved',
    text: 'Results are kept in this browser, even without an account. Sign in to sync them across devices and appear on the leaderboard.',
    isNew: true
  }
];

export function getOnboardingSteps(status) {
  return status === 'outdated'
    ? ONBOARDING_ITEMS.filter((item) => item.isNew)
    : ONBOARDING_ITEMS;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function Onboarding({ onDismiss, status = 'new' }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const steps = getOnboardingSteps(status);
  const isWhatsNew = status === 'outdated';
  const step = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  useLayoutEffect(() => {
    const updateSpotlight = () => {
      const target = document.querySelector(step.selector);

      if (!target) {
        setSpotlight(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const padding = 10;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = Math.min(320, viewportWidth - 28);
      const spaceBelow = viewportHeight - rect.bottom;
      const panelTop = spaceBelow > 220 ? rect.bottom + 16 : Math.max(14, rect.top - 232);

      setSpotlight({
        height: rect.height + padding * 2,
        left: clampNumber(rect.left - padding, 14, viewportWidth - 48),
        panelLeft: clampNumber(rect.left, 14, viewportWidth - panelWidth - 14),
        panelTop: clampNumber(panelTop, 14, viewportHeight - 220),
        top: clampNumber(rect.top - padding, 14, viewportHeight - 48),
        width: Math.min(rect.width + padding * 2, viewportWidth - 28)
      });
    };

    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [step.selector]);

  return (
    <motion.div
      className="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <button
        aria-label="Close onboarding"
        className="onboarding-backdrop"
        onClick={onDismiss}
        type="button"
      />
      {spotlight && (
        <motion.div
          className="onboarding-spotlight"
          animate={{
            height: spotlight.height,
            left: spotlight.left,
            top: spotlight.top,
            width: spotlight.width
          }}
          initial={false}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
      <motion.section
        className="onboarding-panel"
        aria-labelledby="onboarding-title"
        style={
          spotlight
            ? {
                left: spotlight.panelLeft,
                top: spotlight.panelTop
              }
            : {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }
        }
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <p className="eyebrow">
          {isWhatsNew ? "what's new" : 'quick start'} {stepIndex + 1}/{steps.length}
        </p>
        <h2 id="onboarding-title">{step.title}</h2>
        <p>{step.text}</p>
        <div className="onboarding-progress" aria-hidden="true">
          {steps.map((item, index) => (
            <span className={index === stepIndex ? 'active' : ''} key={item.title} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="secondary-action" onClick={onDismiss} type="button">
            Skip
          </button>
          <button
            className="secondary-action"
            disabled={isFirstStep}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            type="button"
          >
            Back
          </button>
          <button
            className="primary-action"
            onClick={() => {
              if (isLastStep) {
                onDismiss();
                return;
              }

              setStepIndex((current) => current + 1);
            }}
            type="button"
          >
            {isLastStep ? (isWhatsNew ? 'Got it' : 'Start typing') : 'Next'}
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}

export default Onboarding;

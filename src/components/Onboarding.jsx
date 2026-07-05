import { useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ONBOARDING_ITEMS = [
  {
    selector: '[data-onboarding-target="settings"]',
    title: 'Choose your test',
    text: 'Pick a time limit, word count, or custom time before you start.'
  },
  {
    selector: '[data-onboarding-target="training"]',
    title: 'Train a weak spot',
    text: 'Turn on training modes for awkward keys, quotes, code, numbers, or accuracy practice.'
  },
  {
    selector: '[data-onboarding-target="typing"]',
    title: 'Type in the text area',
    text: 'Start typing the visible words. The test begins on your first key.'
  },
  {
    selector: '[data-onboarding-target="restart-shortcut"]',
    title: 'Use the restart shortcut',
    text: 'Press Cmd or Ctrl plus Enter to restart without reaching for the mouse.'
  },
  {
    selector: '[data-onboarding-target="leaderboard"]',
    title: 'Compare rankings',
    text: 'Open the leaderboard to filter scores by time, words, and specific modes.'
  },
  {
    selector: '[data-onboarding-target="app-settings"]',
    title: 'Tune the app',
    text: 'Use settings for themes, keyboard display, sound, motion, and typing rules.'
  },
  {
    selector: '[data-onboarding-target="account-dashboard"]',
    title: 'Save your progress',
    text: 'Sign in to keep your dashboard, profile, public stats, and eligible leaderboard results synced.'
  }
];

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function Onboarding({ onDismiss }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const step = ONBOARDING_ITEMS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === ONBOARDING_ITEMS.length - 1;

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
      const panelTop =
        spaceBelow > 220
          ? rect.bottom + 16
          : Math.max(14, rect.top - 232);

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
        <p className="eyebrow">quick start {stepIndex + 1}/{ONBOARDING_ITEMS.length}</p>
        <h2 id="onboarding-title">{step.title}</h2>
        <p>{step.text}</p>
        <div className="onboarding-progress" aria-hidden="true">
          {ONBOARDING_ITEMS.map((item, index) => (
            <span
              className={index === stepIndex ? 'active' : ''}
              key={item.title}
            />
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
            {isLastStep ? 'Start typing' : 'Next'}
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}

export default Onboarding;

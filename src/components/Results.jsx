import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';

function AnimatedNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1]
    });

    return () => controls.stop();
  }, [count, value]);

  return <motion.span>{rounded}</motion.span>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 }
};

function formatSeconds(seconds) {
  return seconds < 10 ? seconds.toFixed(1) : Math.round(seconds);
}

function SpeedReplay({ history = [] }) {
  const speedHistory =
    Array.isArray(history) && history.length > 0
      ? history
      : [
          { elapsedSeconds: 0, wpm: 0 },
          { elapsedSeconds: 1, wpm: 0 }
        ];
  const peakWpm = Math.max(...speedHistory.map((point) => point.wpm), 1);

  return (
    <motion.div
      className="speed-replay"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.28, ease: 'easeOut' }}
    >
      <div className="speed-replay-top">
        <span>speed replay</span>
        <strong>{statsLabel(speedHistory.at(-1)?.wpm || 0)} WPM</strong>
      </div>
      <div className="speed-track" aria-hidden="true">
        {speedHistory.map((point, index) => (
          <motion.span
            className="speed-bar"
            key={`${point.elapsedSeconds}-${index}`}
            style={{
              height: `${Math.max(8, (point.wpm / peakWpm) * 100)}%`
            }}
            initial={{ scaleY: 0.12, opacity: 0.42 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{
              delay: 0.2 + index * Math.min(0.035, 0.7 / speedHistory.length),
              duration: 0.26,
              ease: 'easeOut'
            }}
          />
        ))}
        <motion.span
          className="speed-cursor"
          initial={{ left: '0%' }}
          animate={{ left: '100%' }}
          transition={{ delay: 0.2, duration: 1.5, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}

function statsLabel(value) {
  return Math.round(value);
}

function RecordCelebration() {
  const particles = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    x: 150 + (index % 6) * 24,
    y: -78 + (index % 9) * 18,
    top: 8 + (index % 6) * 17
  }));

  return (
    <div className="record-celebration" aria-hidden="true">
      <div className="record-glow" />
      <div className="record-burst record-burst-left">
        {particles.map((particle) => (
          <span
            key={`left-${particle.id}`}
            style={{
              '--particle-index': particle.id,
              '--particle-top': `${particle.top}px`,
              '--particle-x': `${particle.x}px`,
              '--particle-y': `${particle.y}px`
            }}
          />
        ))}
      </div>
      <div className="record-burst record-burst-right">
        {particles.map((particle) => (
          <span
            key={`right-${particle.id}`}
            style={{
              '--particle-index': particle.id,
              '--particle-top': `${particle.top}px`,
              '--particle-x': `${particle.x}px`,
              '--particle-y': `${particle.y}px`
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Results({ stats, onNextGame, onTryAgain }) {
  return (
    <motion.section
      className="results"
      aria-live="polite"
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
    >
      {stats.isPersonalBest && (
        <>
          <RecordCelebration />
          <motion.div
            className="best-burst"
            initial={{ opacity: 0, scale: 0.82, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          >
            Personal best
          </motion.div>
        </>
      )}

      <p className="eyebrow">result</p>
      <motion.h2
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <AnimatedNumber value={stats.wpm} /> WPM
      </motion.h2>

      <motion.div
        className="result-grid"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.065 } } }}
      >
        <motion.div variants={cardVariants} whileHover={{ y: -3 }}>
          <span>accuracy</span>
          <strong>{stats.accuracy}%</strong>
        </motion.div>
        <motion.div variants={cardVariants} whileHover={{ y: -3 }}>
          <span>correct chars</span>
          <strong>{stats.correctChars}</strong>
        </motion.div>
        <motion.div variants={cardVariants} whileHover={{ y: -3 }}>
          <span>wrong chars</span>
          <strong>{stats.wrongChars}</strong>
        </motion.div>
        <motion.div variants={cardVariants} whileHover={{ y: -3 }}>
          <span>mode</span>
          <strong>{stats.modeLabel}</strong>
        </motion.div>
        <motion.div variants={cardVariants} whileHover={{ y: -3 }}>
          <span>elapsed</span>
          <strong>{formatSeconds(stats.elapsedSeconds)}s</strong>
        </motion.div>
      </motion.div>

      <SpeedReplay history={stats.speedHistory} />

      <div className="result-actions">
        <motion.button
          className="primary-action"
          onClick={onTryAgain}
          type="button"
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.93, rotate: -3 }}
        >
          Try again
        </motion.button>
        <motion.button
          className="secondary-action"
          onClick={onNextGame}
          type="button"
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.93, rotate: 3 }}
        >
          Next game
        </motion.button>
      </div>
    </motion.section>
  );
}

export default Results;

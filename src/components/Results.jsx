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

function Results({ stats, onRestart }) {
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
        <motion.div
          className="best-burst"
          initial={{ opacity: 0, scale: 0.82, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        >
          Personal best
        </motion.div>
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

      <motion.button
        className="primary-action"
        onClick={onRestart}
        type="button"
        whileHover={{ y: -2, scale: 1.04 }}
        whileTap={{ scale: 0.93, rotate: -3 }}
      >
        Try again
      </motion.button>
    </motion.section>
  );
}

export default Results;

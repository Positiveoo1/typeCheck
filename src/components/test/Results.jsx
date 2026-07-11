import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { getTypingStyle } from '../../typingIdentity.js';
import { ArrowForwardIcon, ReplayIcon } from '../common/MaterialIcons.jsx';

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
  const slowdown = getSlowdownMarker(speedHistory);

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
        {slowdown && (
          <span
            className="slowdown-marker"
            style={{ left: `${slowdown.position}%` }}
            title={`You slowed down near ${formatSeconds(slowdown.elapsedSeconds)}s`}
          />
        )}
      </div>
      {slowdown && (
        <p className="speed-note">
          You slowed down near {formatSeconds(slowdown.elapsedSeconds)}s
        </p>
      )}
    </motion.div>
  );
}

function statsLabel(value) {
  return Math.round(value);
}

function getSlowdownMarker(history = []) {
  if (!Array.isArray(history) || history.length < 3) return null;

  const usableHistory = history.filter((point) => Number(point.elapsedSeconds) > 0);
  if (usableHistory.length < 2) return null;

  let slowdown = null;

  for (let index = 1; index < usableHistory.length; index += 1) {
    const previousPoint = usableHistory[index - 1];
    const point = usableHistory[index];
    const drop = Number(previousPoint.wpm) - Number(point.wpm);

    if (drop <= 0) continue;
    if (!slowdown || drop > slowdown.drop) {
      slowdown = {
        drop,
        elapsedSeconds: point.elapsedSeconds
      };
    }
  }

  if (!slowdown) return null;

  const totalSeconds = Math.max(usableHistory.at(-1)?.elapsedSeconds || 1, 1);

  return {
    ...slowdown,
    position: Math.min(100, Math.max(0, (slowdown.elapsedSeconds / totalSeconds) * 100))
  };
}

function getWordHeatmap(targetText = '', typedText = '') {
  let startIndex = 0;

  return targetText
    .split(' ')
    .map((word, wordIndex, words) => {
      const endIndex = startIndex + word.length;
      let mistakes = 0;
      let typedCount = 0;

      for (let index = startIndex; index < endIndex; index += 1) {
        if (typedText[index] === undefined) continue;

        typedCount += 1;
        if (typedText[index] !== targetText[index]) mistakes += 1;
      }

      const heat =
        mistakes === 0
          ? 'clean'
          : mistakes === 1
            ? 'warm'
            : mistakes <= 3
              ? 'hot'
              : 'burn';

      startIndex = endIndex + (wordIndex < words.length - 1 ? 1 : 0);

      return {
        heat,
        id: `${word}-${wordIndex}`,
        mistakes,
        typedCount,
        word
      };
    })
    .filter((item) => item.typedCount > 0 || item.mistakes > 0);
}

function getSegmentInsights(history = []) {
  const usableHistory = history.filter((point) => Number(point.elapsedSeconds) > 0);
  if (usableHistory.length < 3) return null;

  const labels = ['start', 'middle', 'finish'];
  const segments = labels.map((label, index) => {
    const start = Math.floor((usableHistory.length / labels.length) * index);
    const end = Math.max(
      start + 1,
      Math.floor((usableHistory.length / labels.length) * (index + 1))
    );
    const points = usableHistory.slice(start, end);
    const averageWpm = Math.round(
      points.reduce((total, point) => total + (Number(point.wpm) || 0), 0) / points.length
    );

    return {
      averageWpm,
      label
    };
  });
  const sortedSegments = [...segments].sort(
    (first, second) => second.averageWpm - first.averageWpm
  );

  return {
    best: sortedSegments[0],
    worst: sortedSegments.at(-1)
  };
}

function getNextGoal(stats) {
  const averageWpm = Number(stats.personalAverageWpm) || 0;
  const wpmTarget = Math.max(
    Math.ceil((Number(stats.wpm) + 4) / 5) * 5,
    averageWpm ? Math.ceil((averageWpm + 4) / 5) * 5 : 0
  );
  const accuracyTarget =
    Number(stats.accuracy) >= 95 ? Math.min(100, Number(stats.accuracy) + 1) : 95;

  return `Reach ${wpmTarget} WPM with ${accuracyTarget}% accuracy`;
}

function ResultInsights({ stats }) {
  const heatmap = getWordHeatmap(stats.targetText, stats.typedText);
  const segments = getSegmentInsights(stats.speedHistory || []);
  const averageWpm = Number(stats.personalAverageWpm) || 0;
  const averageAccuracy = Number(stats.personalAverageAccuracy) || 0;
  const wpmDelta = averageWpm ? Number(stats.wpm) - averageWpm : 0;
  const accuracyDelta = averageAccuracy ? Number(stats.accuracy) - averageAccuracy : 0;

  return (
    <motion.div
      className="result-insights"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.28, ease: 'easeOut' }}
    >
      <div className="result-insight-grid">
        <div>
          <span>best segment</span>
          <strong>{segments ? `${segments.best.averageWpm} WPM` : 'Pending'}</strong>
          <small>{segments ? segments.best.label : 'Need more speed data'}</small>
        </div>
        <div>
          <span>worst segment</span>
          <strong>{segments ? `${segments.worst.averageWpm} WPM` : 'Pending'}</strong>
          <small>{segments ? segments.worst.label : 'Need more speed data'}</small>
        </div>
        <div>
          <span>vs average</span>
          <strong>
            {averageWpm ? `${wpmDelta >= 0 ? '+' : ''}${wpmDelta} WPM` : 'New baseline'}
          </strong>
          <small>
            {averageAccuracy
              ? `${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta}% accuracy`
              : 'Sign in to build comparison'}
          </small>
        </div>
        <div>
          <span>next goal</span>
          <strong>{getNextGoal(stats)}</strong>
          <small>Based on this run</small>
        </div>
      </div>

      <div className="mistake-heatmap">
        <div className="speed-replay-top">
          <span>mistake heatmap</span>
          <strong>{stats.wrongChars} wrong</strong>
        </div>
        <div className="heatmap-words" aria-label="Mistake heatmap by word">
          {heatmap.length > 0 ? (
            heatmap.slice(0, 44).map((item) => (
              <span
                data-heat={item.heat}
                key={item.id}
                title={`${item.mistakes} mistakes`}
              >
                {item.word}
              </span>
            ))
          ) : (
            <small>No typed words to analyze.</small>
          )}
        </div>
      </div>
    </motion.div>
  );
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
  const typingStyle = getTypingStyle(stats);
  const isInvalid = Boolean(stats.isInvalid);

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
        {isInvalid ? (
          'Invalid test'
        ) : (
          <>
            <AnimatedNumber value={stats.wpm} /> WPM
          </>
        )}
      </motion.h2>

      {isInvalid && (
        <motion.div
          className="accuracy-lock-result"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          This custom text is too short for a valid speed result.
        </motion.div>
      )}

      {stats.endedByAccuracyLock && (
        <motion.div
          className="accuracy-lock-result"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          Accuracy lock ended this run
        </motion.div>
      )}

      {!isInvalid && (
        <motion.div
          className="typing-style-card"
          data-tone={typingStyle.tone}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.24, ease: 'easeOut' }}
        >
          <span>typing style</span>
          <strong>{typingStyle.label}</strong>
          <small>{typingStyle.description}</small>
        </motion.div>
      )}

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

      {!isInvalid && <SpeedReplay history={stats.speedHistory} />}

      {!isInvalid && <ResultInsights stats={stats} />}

      <div className="result-actions">
        <motion.button
          className="primary-action"
          onClick={onTryAgain}
          type="button"
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.93, rotate: -3 }}
        >
          <ReplayIcon />
          <span>Try again</span>
        </motion.button>
        <motion.button
          className="secondary-action"
          onClick={onNextGame}
          type="button"
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.93, rotate: 3 }}
        >
          <ArrowForwardIcon />
          <span>Next game</span>
        </motion.button>
      </div>
    </motion.section>
  );
}

export default Results;

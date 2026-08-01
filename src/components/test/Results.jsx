import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getTypingStyle } from '../../typingIdentity.js';
import { buildMistakeKeyCounts, calculateStats } from '../../typingLogic.js';
import { ArrowForwardIcon, CloseIcon, ReplayIcon } from '../common/MaterialIcons.jsx';
import KeyboardHeatmap from './KeyboardHeatmap.jsx';
import { playKeySound } from './utils/keySound.js';

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

function TypingReplay({
  stats,
  onClose,
  soundEnabled,
  soundStyle,
  soundVolume,
  keySoundPoolRef,
  audioContextRef
}) {
  const events = useMemo(() => {
    const log = Array.isArray(stats.keystrokeLog) ? stats.keystrokeLog : [];
    return log
      .filter((event) => Number.isFinite(Number(event.t)) && typeof event.text === 'string')
      .sort((first, second) => Number(first.t) - Number(second.t));
  }, [stats.keystrokeLog]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [playbackMs, setPlaybackMs] = useState(0);
  const startedAtRef = useRef(null);
  const accumulatedMsRef = useRef(0);
  const frameRef = useRef(null);
  const lastSoundEventIndexRef = useRef(-1);
  const durationMs = Math.max(events.at(-1)?.t || 0, Number(stats.elapsedSeconds || 0) * 1000);
  const replayText = useMemo(() => {
    const activeEvent = events.findLast((event) => Number(event.t) <= playbackMs);
    return activeEvent?.text || '';
  }, [events, playbackMs]);
  const liveWpm = useMemo(
    () => calculateStats(
      stats.targetText || '',
      replayText,
      Math.max(playbackMs / 1000, 0.1)
    ).wpm,
    [playbackMs, replayText, stats.targetText]
  );

  useEffect(() => {
    if (!isPlaying || durationMs === 0) return undefined;

    startedAtRef.current = performance.now();
    frameRef.current = window.requestAnimationFrame(function tick(now) {
      const nextMs = Math.min(
        durationMs,
        accumulatedMsRef.current + (now - startedAtRef.current) * speed
      );
      setPlaybackMs(nextMs);

      if (nextMs >= durationMs) {
        accumulatedMsRef.current = durationMs;
        setIsPlaying(false);
        return;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    });

    return () => window.cancelAnimationFrame(frameRef.current);
  }, [durationMs, isPlaying, speed]);

  useEffect(() => {
    if (!soundEnabled) return;

    const lastEventIndex = events.findLastIndex(
      (event) => Number(event.t) <= playbackMs
    );

    for (
      let index = lastSoundEventIndexRef.current + 1;
      index <= lastEventIndex;
      index += 1
    ) {
      if (events[index]?.text.length > 0) {
        playKeySound(
          keySoundPoolRef,
          audioContextRef,
          soundVolume,
          soundStyle,
          events[index]?.code ? { code: events[index].code } : undefined
        );
      }
    }

    lastSoundEventIndexRef.current = lastEventIndex;
  }, [events, playbackMs, soundEnabled, soundStyle, soundVolume]);

  const togglePlayback = () => {
    if (playbackMs >= durationMs) {
      accumulatedMsRef.current = 0;
      lastSoundEventIndexRef.current = -1;
      setPlaybackMs(0);
    } else {
      accumulatedMsRef.current = playbackMs;
    }
    setIsPlaying((playing) => !playing);
  };

  const restartPlayback = () => {
    accumulatedMsRef.current = 0;
    startedAtRef.current = performance.now(); 
    lastSoundEventIndexRef.current = -1;
    setPlaybackMs(0);
    setIsPlaying(true);
  };

  const setPlaybackSpeed = (nextSpeed) => {
    accumulatedMsRef.current = playbackMs;
    setSpeed(nextSpeed);
  };

  return (
    <div className="typing-replay-backdrop">
      <button
        aria-label="Close typing replay"
        className="typing-replay-dismiss"
        onClick={onClose}
        type="button"
      />
      <motion.section
        aria-label="Typing replay"
        aria-modal="true"
        className="typing-replay-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <div className="typing-replay-header">
          <div>
            <span>typing replay</span>
            <strong>
              {formatSeconds(playbackMs / 1000)}s / {formatSeconds(durationMs / 1000)}s · {liveWpm} WPM
            </strong>
          </div>
          <button aria-label="Close typing replay" className="replay-close" onClick={onClose} type="button">
            <CloseIcon />
          </button>
        </div>

        <div className="typing-replay-text" aria-live="off">
          {Array.from(stats.targetText || '').map((character, index) => {
            const typedCharacter = replayText[index];
            const state = typedCharacter === undefined ? 'pending' : typedCharacter === character ? 'correct' : 'wrong';
            return <span className={`replay-character ${state}`} key={index}>{character === ' ' ? '\u00a0' : character}</span>;
          })}
        </div>

        <input
          aria-label="Replay position"
          className="replay-scrubber"
          max={durationMs}
          min="0"
          onChange={(event) => {
            const nextMs = Number(event.target.value);
            accumulatedMsRef.current = nextMs;
            setPlaybackMs(nextMs);
          }}
          step="10"
          type="range"
          value={playbackMs}
        />
        <div className="typing-replay-controls">
          <button className="primary-action" onClick={togglePlayback} type="button">
            <span>{isPlaying ? 'Pause' : playbackMs >= durationMs ? 'Play again' : 'Play'}</span>
          </button>
          <button className="secondary-action" onClick={restartPlayback} type="button">Restart</button>
          <div className="replay-speed" aria-label="Replay speed">
            {[1, 2].map((value) => <button className={speed === value ? 'active' : ''} key={value} onClick={() => setPlaybackSpeed(value)} type="button">{value}×</button>)}
          </div>
        </div>
        {events.length === 0 && <p className="replay-unavailable">This test was completed before detailed replay data was available.</p>}
      </motion.section>
    </div>
  );
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

const HISTORY_LIMIT = 50;
const HISTORY_RANGE_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null
};

function toTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value || 0);
  const timestamp = date.getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildHistorySeries(historyResults = [], stats = {}, range = '30d') {
  const now = Date.now();
  const windowDays = HISTORY_RANGE_DAYS[range] ?? 30;
  const cutoff = windowDays ? now - windowDays * 24 * 60 * 60 * 1000 : 0;
  const recentResults = [...historyResults, {
    accuracy: stats.accuracy,
    createdAt: new Date(),
    netWpm: Number(stats.netWpm ?? stats.wpm) || 0,
    rawWpm: Number(stats.rawWpm ?? stats.wpm) || 0,
    wpm: Number(stats.wpm) || 0
  }]
    .map((result) => ({
      createdAt: result.createdAt,
      netWpm: Number(result.netWpm ?? result.wpm) || 0,
      rawWpm: Number(result.rawWpm ?? result.wpm) || 0,
      timestamp: toTimestamp(result.createdAt)
    }))
    .filter((result) => result.timestamp > 0 && result.timestamp >= cutoff)
    .sort((first, second) => first.timestamp - second.timestamp)
    .slice(-HISTORY_LIMIT);

  return recentResults;
}

function toLinePath(points) {
  if (points.length === 0) return '';

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function getChartGeometry(series) {
  const width = 620;
  const height = 220;
  const padding = { bottom: 28, left: 14, right: 14, top: 12 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const peak = Math.max(
    1,
    ...series.map((result) => Math.max(result.rawWpm, result.netWpm))
  );
  const points = series.map((result, index) => {
    const x = padding.left + (series.length === 1
      ? graphWidth
      : (index / (series.length - 1)) * graphWidth);
    const netY = padding.top + (1 - result.netWpm / peak) * graphHeight;
    const rawY = padding.top + (1 - result.rawWpm / peak) * graphHeight;

    return {
      ...result,
      index,
      netY,
      rawY,
      x
    };
  });

  return {
    height,
    netPath: toLinePath(points.map((point) => ({ x: point.x, y: point.netY }))),
    peak,
    points,
    rawPath: toLinePath(points.map((point) => ({ x: point.x, y: point.rawY }))),
    width
  };
}

function WpmHistoryChart({ historyResults, stats }) {
  const [range, setRange] = useState('30d');
  const series = useMemo(
    () => buildHistorySeries(historyResults, stats, range),
    [historyResults, range, stats]
  );

  if (series.length < 2) {
    return (
      <motion.div
        className="wpm-history"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.28, ease: 'easeOut' }}
      >
        <div className="speed-replay-top">
          <span>wpm over time</span>
          <strong>Need more tests</strong>
        </div>
        <p className="speed-note">Complete at least two saved tests to unlock trend lines.</p>
      </motion.div>
    );
  }

  const chart = getChartGeometry(series);

  return (
    <motion.div
      className="wpm-history"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.28, ease: 'easeOut' }}
    >
      <div className="speed-replay-top">
        <span>wpm over time</span>
        <strong>last {series.length} tests</strong>
      </div>

      <div className="history-toolbar" role="group" aria-label="WPM history range">
        {Object.keys(HISTORY_RANGE_DAYS).map((option) => (
          <button
            className={option === range ? 'active' : ''}
            key={option}
            onClick={() => setRange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>

      <svg aria-label="WPM history" className="history-chart" viewBox={`0 0 ${chart.width} ${chart.height}`}>
        <line className="history-baseline" x1="0" y1={chart.height - 28} x2={chart.width} y2={chart.height - 28} />
        <path className="history-line-raw" d={chart.rawPath} />
        <path className="history-line-net" d={chart.netPath} />
        {chart.points.map((point) => (
          <g key={`${point.timestamp}-${point.index}`}>
            <circle className="history-dot-raw" cx={point.x} cy={point.rawY} r="2" />
            <circle className="history-dot-net" cx={point.x} cy={point.netY} r="2.5" />
          </g>
        ))}
      </svg>

      <div className="history-legend">
        <span><i className="line-raw" /> raw WPM</span>
        <span><i className="line-net" /> net WPM</span>
        <strong>peak {Math.round(chart.peak)} WPM</strong>
      </div>
    </motion.div>
  );
}

function ErrorProneKeys({ stats }) {
  const keyMistakeCounts = useMemo(
    () => buildMistakeKeyCounts(stats.targetText, stats.typedText, stats.keystrokeLog),
    [stats.keystrokeLog, stats.targetText, stats.typedText]
  );
  const totalTrackedMistakes = Object.values(keyMistakeCounts)
    .reduce((total, count) => total + (Number(count) || 0), 0);

  return (
    <motion.div
      className="result-key-heatmap"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.28, ease: 'easeOut' }}
    >
      <div className="speed-replay-top">
        <span>error-prone keys</span>
        <strong>{totalTrackedMistakes} tracked</strong>
      </div>
      <KeyboardHeatmap keyMistakeCounts={keyMistakeCounts} mode="mistakes" />
    </motion.div>
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function createShareCard(stats, sectionElement) {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 630;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');

  const styles = sectionElement ? getComputedStyle(sectionElement) : getComputedStyle(document.body);
  const bg = styles.getPropertyValue('--bg') || '#111';
  const bgSoft = styles.getPropertyValue('--bg-soft') || '#1b1b1b';
  const heading = styles.getPropertyValue('--heading') || '#fff';
  const text = styles.getPropertyValue('--text') || '#eee';
  const accent = styles.getPropertyValue('--accent') || '#74c365';
  const accent2 = styles.getPropertyValue('--accent-2') || '#9de16c';

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, bg.trim());
  gradient.addColorStop(1, bgSoft.trim());
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const orb = context.createRadialGradient(width * 0.8, height * 0.2, 20, width * 0.8, height * 0.2, 280);
  orb.addColorStop(0, `${accent2.trim()}66`);
  orb.addColorStop(1, 'transparent');
  context.fillStyle = orb;
  context.fillRect(0, 0, width, height);

  context.fillStyle = accent.trim();
  context.font = '700 28px "IBM Plex Sans", sans-serif';
  context.fillText('TypeCheck', 92, 94);
  context.fillStyle = heading.trim();
  context.font = '800 128px "IBM Plex Sans", sans-serif';
  context.fillText(`${Math.round(Number(stats.wpm) || 0)}`, 88, 252);
  context.font = '700 52px "IBM Plex Sans", sans-serif';
  context.fillText('WPM', 424, 252);

  context.fillStyle = text.trim();
  context.font = '600 34px "IBM Plex Sans", sans-serif';
  context.fillText(`Accuracy ${Math.round(Number(stats.accuracy) || 0)}%`, 92, 324);
  context.fillText(`Mode ${stats.modeLabel}`, 92, 374);
  context.fillText(`Elapsed ${formatSeconds(Number(stats.elapsedSeconds) || 0)}s`, 92, 424);

  context.fillStyle = accent2.trim();
  context.font = '700 28px "IBM Plex Sans", sans-serif';
  context.fillText('Raw vs Net', 92, 504);
  context.fillStyle = text.trim();
  context.font = '600 28px "IBM Plex Sans", sans-serif';
  context.fillText(
    `${Math.round(Number(stats.rawWpm ?? stats.wpm) || 0)} / ${Math.round(Number(stats.netWpm ?? stats.wpm) || 0)} WPM`,
    250,
    504
  );

  try {
    const logo = await loadImage('/logo.png');
    context.drawImage(logo, width - 220, 56, 140, 88);
  } catch {
    // Keep the card shareable even if logo loading fails.
  }

  return canvas;
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

function Results({
  historyResults = [],
  stats,
  onNextGame,
  onTryAgain,
  soundEnabled,
  soundStyle,
  soundVolume
}) {
  const typingStyle = getTypingStyle(stats);
  const isInvalid = Boolean(stats.isInvalid);
  const [isSharing, setIsSharing] = useState(false);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const resultsRef = useRef(null);
  const keySoundPoolRef = useRef([]);
  const audioContextRef = useRef(null);

  useEffect(
    () => () => {
      Object.values(keySoundPoolRef.current).flat().forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      audioContextRef.current?.close?.();
    },
    []
  );

  const openReplay = () => {
    if (soundEnabled) {
      playKeySound(keySoundPoolRef, audioContextRef, soundVolume, soundStyle);
    }
    setIsReplayOpen(true);
  };

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      const canvas = await createShareCard(stats, resultsRef.current);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Could not generate image.');
      }

      const file = new File([blob], `typecheck-${Date.now()}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `${Math.round(Number(stats.wpm) || 0)} WPM at ${Math.round(Number(stats.accuracy) || 0)}% accuracy on TypeCheck`,
          title: 'TypeCheck result'
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to share result card:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <motion.section
      className="results"
      aria-live="polite"
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
      ref={resultsRef}
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

      {!isInvalid && <WpmHistoryChart historyResults={historyResults} stats={stats} />}

      {!isInvalid && <ErrorProneKeys stats={stats} />}

      {!isInvalid && <ResultInsights stats={stats} />}

      <div className="result-actions">
        <motion.button
          className="secondary-action"
          disabled={!stats.keystrokeLog?.some((event) => typeof event.text === 'string')}
          onClick={openReplay}
          type="button"
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.93, rotate: -2 }}
        >
          <ReplayIcon />
          <span>Watch replay</span>
        </motion.button>
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
        <motion.button
          className="secondary-action"
          disabled={isSharing}
          onClick={handleShare}
          type="button"
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.93, rotate: 2 }}
        >
          <span>{isSharing ? 'Preparing...' : 'Share card'}</span>
        </motion.button>
      </div>
      <AnimatePresence>
        {isReplayOpen && (
          <TypingReplay
            audioContextRef={audioContextRef}
            keySoundPoolRef={keySoundPoolRef}
            onClose={() => setIsReplayOpen(false)}
            soundEnabled={soundEnabled}
            soundStyle={soundStyle}
            soundVolume={soundVolume}
            stats={stats}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default Results;
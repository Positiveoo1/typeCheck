import { animate, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const MAX_CHART_RESULTS = 30;

function toTimestamp(value) {
  const date = value?.toDate?.() || value;
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(value) {
  const date = value?.toDate?.() || value;
  if (!date) return 'Recent';

  const normalized = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(normalized.getTime())) return 'Recent';

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: normalized.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  }).format(normalized);
}

function getModeName(result) {
  if (result.trainingMode && result.trainingMode !== 'standard') {
    return `${result.trainingMode.replace(/-/g, ' ')} · ${result.modeLabel}`;
  }

  return result.modeLabel || 'Standard';
}

function AnimatedNumber({ value, suffix = '' }) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(prefersReducedMotion ? value : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return undefined;
    }

    const controls = animate(0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplayValue(latest)
    });
    return controls.stop;
  }, [prefersReducedMotion, value]);

  return (
    <motion.span>
      {Math.round(displayValue).toLocaleString()}
      {suffix}
    </motion.span>
  );
}

function Trend({ results }) {
  if (results.length < 2)
    return <span className="dashboard-trend neutral">Keep building</span>;

  const latest = results.slice(0, 5);
  const previous = results.slice(5, 10);
  if (!previous.length)
    return <span className="dashboard-trend neutral">First sessions</span>;

  const average = (items) =>
    items.reduce((sum, item) => sum + (Number(item.wpm) || 0), 0) / items.length;
  const difference = Math.round(average(latest) - average(previous));
  const direction = difference > 0 ? 'up' : difference < 0 ? 'down' : 'neutral';
  const symbol = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

  return (
    <span className={`dashboard-trend ${direction}`}>
      {symbol} {Math.abs(difference)} WPM <small>vs prior 5</small>
    </span>
  );
}

function buildSmoothPath(points) {
  if (points.length < 2) {
    const [x, y] = points[0] || [0, 0];
    return `M ${x} ${y}`;
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const midX = (x0 + x1) / 2;
    const midY = (y0 + y1) / 2;
    d += ` Q ${x0} ${y0} ${midX} ${midY}`;
  }
  const [lastX, lastY] = points[points.length - 1];
  d += ` L ${lastX} ${lastY}`;
  return d;
}

function ProgressChart({ results }) {
  const [metric, setMetric] = useState('wpm');
  const prefersReducedMotion = useReducedMotion();
  const chartResults = useMemo(
    () =>
      results
        .slice(0, MAX_CHART_RESULTS)
        .reverse()
        .map((result, index) => ({
          index: index + 1,
          wpm: Number(result.wpm) || 0,
          accuracy: Number(result.accuracy) || 0
        })),
    [results]
  );
  const values = chartResults.map((point) => point[metric]);
  const min =
    metric === 'accuracy'
      ? Math.min(80, ...values)
      : Math.max(0, Math.min(...values) - 10);
  const max = metric === 'accuracy' ? 100 : Math.max(...values, min + 10) + 5;
  const range = max - min || 1;
  const points = chartResults.map((point, index) => {
    const x = chartResults.length === 1 ? 50 : (index / (chartResults.length - 1)) * 100;
    const y = 92 - ((point[metric] - min) / range) * 78;
    return [x, y];
  });
  const line = buildSmoothPath(points);
  const area = `${line} L 100 100 L 0 100 Z`;
  const latestValue = values.at(-1) || 0;

  return (
    <section className="dashboard-chart-section" aria-labelledby="progress-heading">
      <div className="dashboard-section-heading">
        <div>
          <p className="eyebrow">progress</p>
          <h3 id="progress-heading">Your pace, test by test</h3>
        </div>
        <div className="dashboard-chart-controls" role="group" aria-label="Chart metric">
          {['wpm', 'accuracy'].map((option) => (
            <button
              className={metric === option ? 'active' : ''}
              key={option}
              onClick={() => setMetric(option)}
              type="button"
            >
              {option === 'wpm' ? 'WPM' : 'Accuracy'}
            </button>
          ))}
        </div>
      </div>
      <div className="dashboard-chart-summary">
        <strong>
          <AnimatedNumber value={latestValue} suffix={metric === 'wpm' ? ' WPM' : '%'} />
        </strong>
        <span>latest result · last {chartResults.length} tests</span>
      </div>
      <div
        className="dashboard-chart"
        aria-label={`${metric} over the last ${chartResults.length} tests`}
      >
        <span className="dashboard-chart-bound top">
          {Math.round(max)}
          {metric === 'accuracy' ? '%' : ''}
        </span>
        <span className="dashboard-chart-bound bottom">
          {Math.round(min)}
          {metric === 'accuracy' ? '%' : ''}
        </span>
        {/* svg handles line + fill only — no circles here anymore */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
          <title>{`${metric} over the last ${chartResults.length} tests`}</title>
          <defs>
            <linearGradient id="dashboard-chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="dashboard-chart-grid"
            d="M 0 14 H 100 M 0 53 H 100 M 0 92 H 100"
          />
          <motion.path
            animate={{ pathLength: 1, opacity: 1 }}
            className="dashboard-chart-area"
            d={area}
            fill="url(#dashboard-chart-fill)"
            initial={{ opacity: 0, pathLength: prefersReducedMotion ? 1 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: 'easeOut' }}
          />
          <motion.path
            animate={{ pathLength: 1 }}
            className="dashboard-chart-line"
            d={line}
            fill="none"
            stroke="var(--accent-2)"
            initial={{ pathLength: prefersReducedMotion ? 1 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.9, ease: 'easeOut' }}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* dots rendered as HTML overlay so they stay perfect circles
            regardless of the SVG's non-uniform stretch */}
        <div className="dashboard-chart-dots">
          {points.map(([x, y], index) => (
            <span
              className="dashboard-chart-dot"
              key={index}
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentTests({ results }) {
  const [expandedId, setExpandedId] = useState(null);
  const recentResults = results.slice(0, 8);
  const bestWpm = Math.max(...results.map((result) => Number(result.wpm) || 0));

  return (
    <section className="dashboard-recent" aria-labelledby="recent-tests-heading">
      <div className="dashboard-section-heading">
        <div>
          <p className="eyebrow">history</p>
          <h3 id="recent-tests-heading">Recent tests</h3>
        </div>
        <span className="dashboard-result-count">{results.length} total</span>
      </div>
      <div className="dashboard-results-table">
        <div className="dashboard-results-head" aria-hidden="true">
          <span>Date</span>
          <span>Mode</span>
          <span>Speed</span>
          <span>Accuracy</span>
        </div>
        {recentResults.map((result) => {
          const isExpanded = expandedId === result.id;
          const isBest = Number(result.wpm) === bestWpm;
          return (
            <div
              className={`dashboard-result-row ${isBest ? 'is-best' : ''}`}
              key={result.id}
            >
              <button
                aria-expanded={isExpanded}
                onClick={() => setExpandedId(isExpanded ? null : result.id)}
                type="button"
              >
                <span>{formatDate(result.createdAt)}</span>
                <span className="dashboard-result-mode">
                  {getModeName(result)}
                  {isBest && <em>Personal best</em>}
                </span>
                <strong>
                  {result.wpm} <small>WPM</small>
                </strong>
                <span>{result.accuracy}%</span>
              </button>
              {isExpanded && (
                <div className="dashboard-result-detail">
                  {result.wrongChars || 0} mistakes ·{' '}
                  {Math.round(result.elapsedSeconds || 0)} seconds typed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Dashboard({ dashboard, onNavigate }) {
  const results = useMemo(
    () =>
      [...(dashboard.results || [])].sort(
        (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
      ),
    [dashboard.results]
  );
  const prefersReducedMotion = useReducedMotion();
  const completed = Number(dashboard.completed) || results.length;
  const bestWpm = Math.max(
    0,
    ...results.map((result) => Number(result.wpm) || 0),
    ...Object.values(dashboard.modes || {}).map((mode) => Number(mode.bestWpm) || 0)
  );
  const averageWpm =
    Math.round(
      results.reduce((sum, result) => sum + (Number(result.wpm) || 0), 0) / results.length
    ) || 0;
  const averageAccuracy =
    Math.round(
      results.reduce((sum, result) => sum + (Number(result.accuracy) || 0), 0) /
        results.length
    ) || 0;
  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 14 },
    visible: { opacity: 1, y: 0 }
  };

  if (!results.length) {
    return (
      <motion.main
        className="dashboard-page dashboard-empty"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={itemVariants}
      >
        <section className="dashboard-empty-panel">
          <p className="eyebrow">your dashboard</p>
          <h2>Your first benchmark is waiting.</h2>
          <p>
            Take a test to start tracking your speed, accuracy, and improvement over time.
          </p>
          <button
            className="primary-action"
            onClick={() => onNavigate?.('test')}
            type="button"
          >
            Take your first test
          </button>
        </section>
      </motion.main>
    );
  }

  return (
    <motion.main
      animate="visible"
      className="dashboard-page dashboard-analytics"
      exit="hidden"
      initial="hidden"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.09 } }
      }}
    >
      <motion.section className="dashboard-performance-hero" variants={itemVariants}>
        <div>
          <p className="eyebrow">performance overview</p>
          <p className="dashboard-hero-label">Personal best</p>
          <div className="dashboard-best-number">
            <AnimatedNumber value={bestWpm} />
            <span>WPM</span>
          </div>
          <Trend results={results} />
        </div>
        <p className="dashboard-hero-copy">
          Every test is a signal. Your fastest run is the benchmark—now make it feel
          routine.
        </p>
      </motion.section>

      <motion.section
        className="dashboard-secondary-stats"
        aria-label="Key statistics"
        variants={itemVariants}
      >
        <div>
          <span>Average accuracy</span>
          <strong>
            <AnimatedNumber value={averageAccuracy} suffix="%" />
          </strong>
        </div>
        <div>
          <span>Tests completed</span>
          <strong>
            <AnimatedNumber value={completed} />
          </strong>
        </div>
        <div>
          <span>Average speed</span>
          <strong>
            <AnimatedNumber value={averageWpm} suffix=" WPM" />
          </strong>
        </div>
      </motion.section>

      <motion.div variants={itemVariants}>
        <ProgressChart results={results} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <RecentTests results={results} />
      </motion.div>
    </motion.main>
  );
}

export default Dashboard;

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { getSlowBigrams, getWeakKeys, loadKeyStats } from '../../keyStats.js';
import { ArrowForwardIcon } from '../common/MaterialIcons.jsx';

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

// Straight segments through every point: the line is the data, so it must
// pass through each dot rather than smoothing between midpoints.
function buildLinePath(points) {
  if (!points.length) return '';
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
}

const CHART_TIMEFRAMES = [
  { id: '7d', label: '7 days' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' }
];
const WEEKLY_BUCKET_COUNT = 12;
const MONTHLY_BUCKET_COUNT = 12;
const YEARLY_BUCKET_COUNT = 8;
const CUSTOM_RANGE_MAX_POINTS = 90;

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diffToMonday = (day + 6) % 7;
  next.setDate(next.getDate() - diffToMonday);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date);
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date);
}

function formatYearLabel(date) {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(date);
}

function toInputDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Groups results into date buckets (week/month/year) and averages wpm/accuracy
// per bucket, keeping only the most recent `bucketCount` buckets that actually
// have data.
function buildAggregatedChartData(results, bucketStartFn, labelFn, bucketCount) {
  const buckets = new Map();

  results.forEach((result) => {
    const timestamp = toTimestamp(result.createdAt);
    if (!timestamp) return;

    const bucketDate = bucketStartFn(new Date(timestamp));
    const key = bucketDate.getTime();

    if (!buckets.has(key)) {
      buckets.set(key, { date: bucketDate, wpmSum: 0, accuracySum: 0, count: 0 });
    }

    const bucket = buckets.get(key);
    bucket.wpmSum += Number(result.wpm) || 0;
    bucket.accuracySum += Number(result.accuracy) || 0;
    bucket.count += 1;
  });

  return [...buckets.values()]
    .sort((a, b) => a.date - b.date)
    .slice(-bucketCount)
    .map((bucket) => ({
      label: labelFn(bucket.date),
      wpm: Math.round(bucket.wpmSum / bucket.count),
      accuracy: Math.round(bucket.accuracySum / bucket.count),
      testCount: bucket.count
    }));
}

// Raw (non-aggregated) points for a bounded date range, used by "7 Days" and
// "Custom" — each test is its own point rather than an average.
function buildRawChartData(results, startTime, endTime) {
  return results
    .filter((result) => {
      const timestamp = toTimestamp(result.createdAt);
      return timestamp >= startTime && timestamp <= endTime;
    })
    .sort((a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt))
    .slice(-CUSTOM_RANGE_MAX_POINTS)
    .map((result) => ({
      label: formatShortDate(new Date(toTimestamp(result.createdAt))),
      wpm: Number(result.wpm) || 0,
      accuracy: Number(result.accuracy) || 0,
      testCount: 1
    }));
}


const DAY_MS = 24 * 60 * 60 * 1000;

function average(items, key) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0) / items.length;
}

// Compares the last 7 days with the 7 before; falls back to the latest five
// tests against the five before them when a week is too thin to compare.
function getWeeklyComparison(results) {
  const now = Date.now();
  const thisWeek = results.filter((result) => now - toTimestamp(result.createdAt) < 7 * DAY_MS);
  const lastWeek = results.filter((result) => {
    const age = now - toTimestamp(result.createdAt);
    return age >= 7 * DAY_MS && age < 14 * DAY_MS;
  });

  if (thisWeek.length && lastWeek.length) {
    return {
      delta: Math.round(average(thisWeek, 'wpm') - average(lastWeek, 'wpm')),
      period: 'week'
    };
  }

  if (results.length >= 6) {
    return {
      delta: Math.round(average(results.slice(0, 5), 'wpm') - average(results.slice(5, 10), 'wpm')),
      period: 'tests'
    };
  }

  return { delta: null, period: 'start' };
}

function getHeadline({ delta, period }) {
  if (delta === null) return 'You’re setting your baseline.';
  const comparison = period === 'week' ? 'than last week' : 'than in the five tests before';
  const subject = period === 'week' ? 'This week you’re' : 'Lately you’re';
  if (delta > 0) return `${subject} ${delta} WPM faster ${comparison}.`;
  if (delta < 0) return `${subject} ${Math.abs(delta)} WPM slower ${comparison}.`;
  return `${subject} holding the same pace ${comparison}.`;
}

function Keycaps({ keys }) {
  return (
    <span className="coach-keycaps">
      {keys.map((key) => (
        <kbd className="coach-keycap" key={key}>
          {key}
        </kbd>
      ))}
    </span>
  );
}

function CoachReport({ language, onPractice, onTakeTest, results, stats }) {
  const comparison = useMemo(() => getWeeklyComparison(results), [results]);
  const { slowBigrams, weakKeys } = useMemo(() => {
    const keyStats = loadKeyStats(language);
    return {
      slowBigrams: getSlowBigrams(keyStats, 2),
      weakKeys: getWeakKeys(keyStats, 3).filter((entry) => entry.errors > 0)
    };
  }, [language]);
  const hasDrill = weakKeys.length > 0 || slowBigrams.length > 0;
  const trendClass =
    comparison.delta > 0 ? 'is-up' : comparison.delta < 0 ? 'is-down' : 'is-flat';

  return (
    <section className="coach-report" aria-labelledby="coach-heading">
      <h2 className={`coach-headline ${trendClass}`} id="coach-heading">
        {getHeadline(comparison)}
      </h2>

      {hasDrill ? (
        <p className="coach-advice">
          {weakKeys.length > 0 && (
            <>
              You miss <Keycaps keys={weakKeys.map((entry) => entry.key)} /> most often
            </>
          )}
          {weakKeys.length > 0 && slowBigrams.length > 0 && ', and '}
          {slowBigrams.length > 0 && (
            <>
              {weakKeys.length === 0 ? 'Your ' : 'your '}slowest{' '}
              {slowBigrams.length === 1 ? 'pair is' : 'pairs are'}{' '}
              <Keycaps keys={slowBigrams.map((entry) => entry.bigram)} />
            </>
          )}
          . A short drill in Weak letters mode targets exactly these.
        </p>
      ) : (
        <p className="coach-advice">
          A few more tests and TypeCheck will point out the keys and letter pairs that
          slow you down.
        </p>
      )}

      <div className="coach-actions">
        <button
          className="page-cta"
          onClick={hasDrill ? onPractice : onTakeTest}
          type="button"
        >
          {hasDrill ? 'Practise these keys' : 'Take a test'}
          <ArrowForwardIcon />
        </button>
      </div>

      <dl className="coach-stats">
        <div>
          <dt>Personal best</dt>
          <dd>
            {stats.bestWpm}
            <small>WPM</small>
          </dd>
        </div>
        <div>
          <dt>{stats.windowLabel} speed</dt>
          <dd>
            {stats.averageWpm}
            <small>WPM</small>
          </dd>
        </div>
        <div>
          <dt>{stats.windowLabel} accuracy</dt>
          <dd>
            {stats.averageAccuracy}
            <small>%</small>
          </dd>
        </div>
        <div>
          <dt>Tests completed</dt>
          <dd>{stats.completed.toLocaleString()}</dd>
        </div>
      </dl>
    </section>
  );
}

function SegmentedControl({ label, onChange, options, value }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          aria-pressed={value === option.id}
          className={value === option.id ? 'active' : ''}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ProgressChart({ results }) {
  const [metric, setMetric] = useState('wpm');
  const [timeframe, setTimeframe] = useState('7d');
  const [customStart, setCustomStart] = useState(() =>
    toInputDateValue(startOfDay(new Date(Date.now() - 6 * DAY_MS)))
  );
  const [customEnd, setCustomEnd] = useState(() => toInputDateValue(new Date()));

  const chartResults = useMemo(() => {
    const now = new Date();

    if (timeframe === '7d') {
      const start = startOfDay(new Date(now.getTime() - 6 * DAY_MS));
      return buildRawChartData(results, start.getTime(), now.getTime());
    }
    if (timeframe === 'weekly') {
      return buildAggregatedChartData(
        results,
        startOfWeek,
        (date) => `Week of ${formatShortDate(date)}`,
        WEEKLY_BUCKET_COUNT
      );
    }
    if (timeframe === 'monthly') {
      return buildAggregatedChartData(results, startOfMonth, formatMonthLabel, MONTHLY_BUCKET_COUNT);
    }
    if (timeframe === 'yearly') {
      return buildAggregatedChartData(results, startOfYear, formatYearLabel, YEARLY_BUCKET_COUNT);
    }

    const start = customStart ? startOfDay(new Date(customStart)) : startOfDay(now);
    const end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
    return buildRawChartData(results, start.getTime(), end.getTime());
  }, [results, timeframe, customStart, customEnd]);

  const unit = metric === 'wpm' ? ' WPM' : '%';
  const axisUnit = metric === 'accuracy' ? '%' : '';
  const values = chartResults.map((point) => point[metric]);
  const lowest = values.length ? Math.min(...values) : 0;
  const highest = values.length ? Math.max(...values) : 0;
  const min =
    metric === 'accuracy'
      ? Math.min(80, Math.floor(lowest / 5) * 5)
      : Math.max(0, Math.floor((lowest - 5) / 10) * 10);
  const max = metric === 'accuracy' ? 100 : Math.ceil((Math.max(highest, min + 10) + 5) / 10) * 10;
  const range = max - min || 1;
  const middle = Math.round((min + max) / 2);
  const points = chartResults.map((point, index) => {
    const x = chartResults.length === 1 ? 50 : (index / (chartResults.length - 1 || 1)) * 100;
    const y = 96 - ((point[metric] - min) / range) * 88;
    return [x, y];
  });
  const line = buildLinePath(points);
  const area = points.length
    ? `${line} L ${points.at(-1)[0]} 100 L ${points[0][0]} 100 Z`
    : '';
  const rangeSummaryLabel =
    timeframe === '7d'
      ? 'Last 7 days, each test'
      : timeframe === 'weekly'
        ? `Weekly average, last ${chartResults.length} weeks`
        : timeframe === 'monthly'
          ? `Monthly average, last ${chartResults.length} months`
          : timeframe === 'yearly'
            ? `Yearly average, last ${chartResults.length} years`
            : 'Custom range, each test';
  const mean = values.length ? Math.round(average(chartResults, metric)) : 0;

  return (
    <section className="dash-section" aria-labelledby="progress-heading">
      <div className="dash-section-head">
        <div>
          <h3 id="progress-heading">Progress</h3>
          <p className="dash-section-sub">
            {rangeSummaryLabel}
            {values.length > 0 && (
              <>
                {' '}
                · average{' '}
                <strong>
                  {mean}
                  {unit}
                </strong>
              </>
            )}
          </p>
        </div>
        <SegmentedControl
          label="Chart metric"
          onChange={setMetric}
          options={[
            { id: 'wpm', label: 'WPM' },
            { id: 'accuracy', label: 'Accuracy' }
          ]}
          value={metric}
        />
      </div>

      <div className="dash-chart-toolbar">
        <SegmentedControl
          label="Chart timeframe"
          onChange={setTimeframe}
          options={CHART_TIMEFRAMES}
          value={timeframe}
        />
        {timeframe === 'custom' && (
          <div className="dash-chart-range">
            <label>
              <span>From</span>
              <input
                max={customEnd}
                onChange={(event) => setCustomStart(event.target.value)}
                type="date"
                value={customStart}
              />
            </label>
            <label>
              <span>To</span>
              <input
                max={toInputDateValue(new Date())}
                min={customStart}
                onChange={(event) => setCustomEnd(event.target.value)}
                type="date"
                value={customEnd}
              />
            </label>
          </div>
        )}
      </div>

      {chartResults.length === 0 ? (
        <div className="dash-chart-empty">
          <p>No tests in this range.</p>
          <span>Pick a longer timeframe, or take a test to add a point here.</span>
        </div>
      ) : (
        <div className="dash-chart">
          <div className="dash-chart-axis" aria-hidden="true">
            <span>{`${max}${axisUnit}`}</span>
            <span>{`${middle}${axisUnit}`}</span>
            <span>{`${min}${axisUnit}`}</span>
          </div>
          <div className="dash-chart-plot">
            <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path className="dash-chart-grid" d="M 0 8 H 100 M 0 52 H 100 M 0 96 H 100" />
              <path className="dash-chart-area" d={area} />
              <path className="dash-chart-line" d={line} />
            </svg>
            <ol
              aria-label={`${metric === 'wpm' ? 'Speed' : 'Accuracy'}: ${rangeSummaryLabel}`}
              className="dash-chart-points"
            >
              {points.map(([x, y], index) => {
                const point = chartResults[index];
                const valueLabel = `${point[metric]}${unit}`;
                const edgeClass = x < 10 ? 'edge-start' : x > 90 ? 'edge-end' : '';

                return (
                  <li
                    className={['dash-chart-point', edgeClass].filter(Boolean).join(' ')}
                    key={`${point.label}-${index}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <button aria-label={`${point.label}: ${valueLabel}`} type="button">
                      <span className="dash-chart-dot" />
                    </button>
                    <span aria-hidden="true" className="dash-chart-tooltip">
                      <strong>{valueLabel}</strong>
                      <small>
                        {point.label}
                        {point.testCount > 1 ? ` · ${point.testCount} tests` : ''}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="dash-chart-xaxis" aria-hidden="true">
            {[0, Math.floor((chartResults.length - 1) / 2), chartResults.length - 1]
              .filter((index, position, list) => list.indexOf(index) === position)
              .map((index) => (
                <span key={index} style={{ left: `${points[index][0]}%` }}>
                  {chartResults[index].label}
                </span>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RecentTests({ bestWpm, results }) {
  const [expandedId, setExpandedId] = useState(null);
  const recentResults = results.slice(0, 8);

  return (
    <section className="dash-section" aria-labelledby="recent-tests-heading">
      <div className="dash-section-head">
        <div>
          <h3 id="recent-tests-heading">Recent tests</h3>
          <p className="dash-section-sub">
            Latest {recentResults.length} of {results.length.toLocaleString()}. Open a row
            for mistakes and time.
          </p>
        </div>
      </div>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Mode</th>
              <th className="num" scope="col">
                Speed
              </th>
              <th className="num" scope="col">
                Accuracy
              </th>
            </tr>
          </thead>
          <tbody>
            {recentResults.map((result) => {
              const isExpanded = expandedId === result.id;
              const isBest = Number(result.wpm) === bestWpm;
              const mistakes = Number(result.wrongChars) || 0;

              return (
                <tr
                  className={[isBest ? 'is-best' : '', isExpanded ? 'is-open' : '']
                    .filter(Boolean)
                    .join(' ')}
                  key={result.id}
                >
                  <td className="dash-table-date">
                    <button
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedId(isExpanded ? null : result.id)}
                      type="button"
                    >
                      {formatDate(result.createdAt)}
                    </button>
                  </td>
                  <td>
                    <span className="dash-table-mode">{getModeName(result)}</span>
                    {isBest && <span className="page-pill dash-pill">Personal best</span>}
                    {isExpanded && (
                      <span className="dash-table-detail">
                        {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'} ·{' '}
                        {Math.round(result.elapsedSeconds || 0)} s typed
                      </span>
                    )}
                  </td>
                  <td className="num">
                    <strong>{result.wpm}</strong> <small>WPM</small>
                  </td>
                  <td className="num">{result.accuracy}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Dashboard({ dashboard, onNavigate, onPracticeWeakKeys }) {
  const results = useMemo(
    () =>
      [...(dashboard.results || [])].sort(
        (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
      ),
    [dashboard.results]
  );
  const prefersReducedMotion = useReducedMotion();
  const stats = useMemo(() => {
    // Same 7-day window the Progress chart opens on, so the two averages agree.
    const weekStart = startOfDay(new Date(Date.now() - 6 * DAY_MS)).getTime();
    const lastWeek = results.filter((result) => toTimestamp(result.createdAt) >= weekStart);
    const windowResults = lastWeek.length ? lastWeek : results;

    return {
      windowLabel: lastWeek.length ? '7-day avg.' : 'All-time avg.',
      averageAccuracy: Math.round(average(windowResults, 'accuracy')),
      averageWpm: Math.round(average(windowResults, 'wpm')),
      bestWpm: Math.max(
        0,
        ...results.map((result) => Number(result.wpm) || 0),
        ...Object.values(dashboard.modes || {}).map((mode) => Number(mode.bestWpm) || 0)
      ),
      completed: Number(dashboard.completed) || results.length
    };
  }, [dashboard.completed, dashboard.modes, results]);
  const pageMotion = {
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    initial: { opacity: 0, y: prefersReducedMotion ? 0 : 8 },
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
  };
  const takeTest = () => onNavigate?.('test');

  if (!results.length) {
    return (
      <motion.main className="dashboard-page" {...pageMotion}>
        <section className="coach-report" aria-labelledby="coach-heading">
          <h2 className="coach-headline" id="coach-heading">
            Your coach needs a first test.
          </h2>
          <p className="coach-advice">
            Finish one test and this page starts tracking your speed and accuracy. After a
            few more, it shows the keys and letter pairs that slow you down, with a drill
            for them.
          </p>
          <div className="coach-actions">
            <button className="page-cta" onClick={takeTest} type="button">
              Take your first test
              <ArrowForwardIcon />
            </button>
          </div>
        </section>
      </motion.main>
    );
  }

  return (
    <motion.main className="dashboard-page" {...pageMotion}>
      <CoachReport
        language={results[0]?.language || 'english'}
        onPractice={onPracticeWeakKeys || takeTest}
        onTakeTest={takeTest}
        results={results}
        stats={stats}
      />
      <ProgressChart results={results} />
      <RecentTests bestWpm={stats.bestWpm} results={results} />
    </motion.main>
  );
}

export default Dashboard;

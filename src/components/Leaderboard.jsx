import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const DEFAULT_MODE_FILTER = '10 words';
const CATEGORY_FILTERS = [
  { id: 'all', label: 'all' },
  { id: 'time', label: 'time' },
  { id: 'words', label: 'words' }
];

function formatDate(value) {
  if (!value) return 'Pending';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return 'Pending';

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function sortLeaderboardEntries(firstEntry, secondEntry) {
  return (
    secondEntry.wpm - firstEntry.wpm ||
    secondEntry.accuracy - firstEntry.accuracy ||
    (new Date(secondEntry.createdAt || 0) - new Date(firstEntry.createdAt || 0))
  );
}

function getEntryTestType(entry) {
  if (entry.testType === 'time' || entry.testType === 'words') return entry.testType;

  return String(entry.modeLabel || '').includes('words') ? 'words' : 'time';
}

function getModeOptions(entries) {
  const priority = ['15s', '30s', '60s', '10 words', '30 words', '60 words'];

  return [...new Set(entries.map((entry) => entry.modeLabel).filter(Boolean))]
    .sort((firstMode, secondMode) => {
      const firstPriority = priority.indexOf(firstMode);
      const secondPriority = priority.indexOf(secondMode);

      if (firstPriority !== -1 || secondPriority !== -1) {
        return (
          (firstPriority === -1 ? priority.length : firstPriority) -
          (secondPriority === -1 ? priority.length : secondPriority)
        );
      }

      return firstMode.localeCompare(secondMode);
    });
}

function getBestEntryByUser(entries) {
  const bestByUser = new Map();

  entries.forEach((entry) => {
    if (!entry.userId) return;

    const currentBest = bestByUser.get(entry.userId);
    if (!currentBest || sortLeaderboardEntries(entry, currentBest) < 0) {
      bestByUser.set(entry.userId, entry);
    }
  });

  return [...bestByUser.values()];
}

function Podium({ entries, onOpenProfile, currentUserId }) {
  if (entries.length === 0) return null;

  const podiumEntries = entries.slice(0, 3);

  return (
    <div className="leaderboard-podium" aria-label="Top three players">
      {podiumEntries.map((entry, index) => {
        const rank = index + 1;
        const isCurrentUser = currentUserId && entry.userId === currentUserId;

        return (
          <motion.button
            className={[
              'podium-card',
              `podium-rank-${rank}`,
              isCurrentUser ? 'current-user' : ''
            ].filter(Boolean).join(' ')}
            key={`podium-${entry.id}-${rank}`}
            onClick={() => onOpenProfile(entry.userId)}
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, delay: index * 0.05, ease: 'easeOut' }}
          >
            <span className="podium-rank">#{rank}</span>
            <strong>{entry.playerName}</strong>
            <span>{entry.wpm} WPM</span>
            <small>{entry.accuracy}% accuracy &middot; {entry.modeLabel}</small>
            {isCurrentUser && <em>you</em>}
          </motion.button>
        );
      })}
    </div>
  );
}

function Leaderboard({ currentUserId, entries, error, isLoading, onOpenProfile }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState(DEFAULT_MODE_FILTER);
  const rankedEntries = useMemo(
    () => [...entries].sort(sortLeaderboardEntries),
    [entries]
  );
  const categoryEntries = useMemo(
    () => rankedEntries.filter((entry) => (
      categoryFilter === 'all' || getEntryTestType(entry) === categoryFilter
    )),
    [categoryFilter, rankedEntries]
  );
  const modeOptions = useMemo(() => getModeOptions(categoryEntries), [categoryEntries]);
  const effectiveModeFilter = modeOptions.includes(modeFilter) ? modeFilter : 'all';
  const filteredEntries = useMemo(
    () => getBestEntryByUser(
      categoryEntries.filter((entry) => (
        effectiveModeFilter === 'all' || entry.modeLabel === effectiveModeFilter
      ))
    )
      .sort(sortLeaderboardEntries)
      .slice(0, 50),
    [categoryEntries, effectiveModeFilter]
  );
  const activeFilterLabel =
    effectiveModeFilter === 'all'
      ? `${categoryFilter === 'all' ? 'all modes' : `${categoryFilter} modes`}`
      : effectiveModeFilter;

  return (
    <motion.main
      className="leaderboard-page"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <section className="leaderboard-hero">
        <div>
          <p className="eyebrow">leaderboard</p>
          <h2>{activeFilterLabel} rankings</h2>
        </div>
        <div className="leaderboard-ring">
          <strong>{filteredEntries.length}</strong>
          <span>players</span>
        </div>
      </section>

      <section className="leaderboard-panel">
        <div className="section-heading">
          <span>top players</span>
          <strong>Ranked by WPM, accuracy, then date</strong>
        </div>

        <div className="leaderboard-filters" aria-label="Leaderboard filters">
          <div className="leaderboard-filter-group" role="group" aria-label="Filter by test type">
            {CATEGORY_FILTERS.map((filter) => (
              <button
                className={categoryFilter === filter.id ? 'active' : ''}
                key={filter.id}
                onClick={() => {
                  setCategoryFilter(filter.id);
                  setModeFilter('all');
                }}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="leaderboard-filter-group mode-filter-group" role="group" aria-label="Filter by mode">
            <button
              className={effectiveModeFilter === 'all' ? 'active' : ''}
              onClick={() => setModeFilter('all')}
              type="button"
            >
              all modes
            </button>
            {modeOptions.map((mode) => (
              <button
                className={effectiveModeFilter === mode ? 'active' : ''}
                key={mode}
                onClick={() => setModeFilter(mode)}
                type="button"
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="leaderboard-message">Loading leaderboard...</p>
        ) : error ? (
          <p className="leaderboard-message error">{error}</p>
        ) : filteredEntries.length === 0 ? (
          <p className="leaderboard-message">No saved results match this filter yet.</p>
        ) : (
          <>
            <Podium
              currentUserId={currentUserId}
              entries={filteredEntries}
              onOpenProfile={onOpenProfile}
            />
            <div className="leaderboard-table" role="table" aria-label="Global typing leaderboard">
              <div className="leaderboard-row leaderboard-head" role="row">
                <span role="columnheader">rank</span>
                <span role="columnheader">player</span>
                <span role="columnheader">wpm</span>
                <span role="columnheader">accuracy</span>
                <span role="columnheader">mode</span>
                <span role="columnheader">date</span>
              </div>
              {filteredEntries.map((entry, index) => {
                const isCurrentUser = currentUserId && entry.userId === currentUserId;

                return (
                  <motion.button
                    className={
                      isCurrentUser
                        ? 'leaderboard-row leaderboard-row-button current-user'
                        : 'leaderboard-row leaderboard-row-button'
                    }
                    key={`${entry.id}-${index}`}
                    onClick={() => onOpenProfile(entry.userId)}
                    role="row"
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.24) }}
                  >
                    <span className="leaderboard-rank" data-label="rank" role="cell">
                      #{index + 1}
                    </span>
                    <strong data-label="player" role="cell">
                      {entry.playerName}
                      {isCurrentUser && <span className="leaderboard-you">you</span>}
                    </strong>
                    <span data-label="wpm" role="cell">{entry.wpm}</span>
                    <span data-label="accuracy" role="cell">{entry.accuracy}%</span>
                    <span data-label="mode" role="cell">{entry.modeLabel}</span>
                    <span data-label="date" role="cell">{formatDate(entry.createdAt)}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </section>
    </motion.main>
  );
}

export default Leaderboard;

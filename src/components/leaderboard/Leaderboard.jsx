import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  CATEGORY_FILTERS,
  DEFAULT_MODE_FILTER,
  formatLeaderboardDate,
  getBestEntryPerPlayer,
  getEntryTestType,
  getLeaderboardSummary,
  getModeOptions,
  getPlayerInitials,
  sortLeaderboardEntries
} from '../../leaderboardLogic.js';
import { EmojiEventsIcon } from '../common/MaterialIcons.jsx';

const TIER_LABELS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function RankRow({ entry, rank, topWpm, isCurrentUser, onOpenProfile, index }) {
  const tier = rank <= 3 ? rank : 0;
  const barPct = topWpm > 0 ? Math.max(6, Math.round((entry.wpm / topWpm) * 100)) : 0;

  return (
    <motion.button
      className={['rank-row', isCurrentUser ? 'current-user' : ''].filter(Boolean).join(' ')}
      data-tier={tier || undefined}
      key={`${entry.id}-${rank}`}
      onClick={() => onOpenProfile(entry.userId)}
      role="row"
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.3) }}
    >
      <span className="rank-num" data-label="rank" role="cell">
        {tier === 1 ? <EmojiEventsIcon /> : null}#{rank}
      </span>
      <span className="rank-player" data-label="player" role="cell">
        <span className="rank-avatar" aria-hidden="true">
          {getPlayerInitials(entry.playerName)}
        </span>
        <span className="rank-player-name">
          {entry.playerName}
          {isCurrentUser && <span className="rank-you">you</span>}
        </span>
        {tier > 0 && <em className={`rank-medal tier-${tier}`}>{TIER_LABELS[tier]}</em>}
      </span>
      <span className="rank-wpm" data-label="wpm" role="cell">
        <span className="rank-wpm-bar" style={{ width: `${barPct}%` }} aria-hidden="true" />
        <b>{entry.wpm}</b>
      </span>
      <span className="rank-accuracy" data-label="accuracy" role="cell">
        {entry.accuracy}%
      </span>
      <span className="rank-mode" data-label="mode" role="cell">
        {entry.modeLabel}
      </span>
      <span className="rank-date" data-label="date" role="cell">
        {formatLeaderboardDate(entry.createdAt)}
      </span>
    </motion.button>
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
    () =>
      rankedEntries.filter(
        (entry) => categoryFilter === 'all' || getEntryTestType(entry) === categoryFilter
      ),
    [categoryFilter, rankedEntries]
  );
  const modeOptions = useMemo(() => getModeOptions(categoryEntries), [categoryEntries]);
  const effectiveModeFilter = modeOptions.includes(modeFilter) ? modeFilter : 'all';
  const filteredEntries = useMemo(
    () =>
      getBestEntryPerPlayer(
        categoryEntries.filter(
          (entry) =>
            effectiveModeFilter === 'all' || entry.modeLabel === effectiveModeFilter
        )
      ).slice(0, 50),
    [categoryEntries, effectiveModeFilter]
  );
  const activeFilterLabel =
    effectiveModeFilter === 'all'
      ? `${categoryFilter === 'all' ? 'all modes' : `${categoryFilter} modes`}`
      : effectiveModeFilter;
  const activeCategoryLabel =
    CATEGORY_FILTERS.find((filter) => filter.id === categoryFilter)?.label ?? 'all';
  const summary = useMemo(
    () => getLeaderboardSummary(filteredEntries),
    [filteredEntries]
  );

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
        <div className="leaderboard-hero-copy">
          <p className="eyebrow">leaderboard</p>
          <h2>{activeFilterLabel} rankings</h2>
          <p>Fast scores, clean comparisons, and the best public runs from every mode.</p>
        </div>
        {/* entries ring folded into the same summary grid as the other stats,
            instead of floating separately with empty space around it */}
        <div className="leaderboard-summary-grid" aria-label="Leaderboard summary">
          <span>
            <strong>{summary.topWpm}</strong>
            <small>top wpm</small>
          </span>
          <span>
            <strong>{summary.averageAccuracy}%</strong>
            <small>avg accuracy</small>
          </span>
          <span>
            <strong>{summary.modeCount}</strong>
            <small>modes played</small>
          </span>
          <span className="leaderboard-summary-entries">
            <EmojiEventsIcon />
            <strong>{summary.totalEntries}</strong>
            <small>entries</small>
          </span>
        </div>
      </section>

      <section className="leaderboard-panel">
        <div className="section-heading">
          <span>top players</span>
          <strong>Ranked by WPM, accuracy, then date</strong>
        </div>

        {/* Type and Mode are now one visual unit: Mode is nested under Type
            with a connecting label, making the parent/child relationship
            explicit instead of two flat, unrelated-looking button rows */}
        <div className="leaderboard-filters" aria-label="Leaderboard filters">
          <div className="leaderboard-filter-card">
            <span>type</span>
            <div
              className="leaderboard-filter-group"
              role="group"
              aria-label="Filter by test type"
            >
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
          </div>
          <div className="leaderboard-filter-card mode-filter-card nested-filter">
            <span>
              mode <small className="filter-scope-hint">for {activeCategoryLabel}</small>
            </span>
            <div
              className="leaderboard-filter-group mode-filter-group"
              role="group"
              aria-label="Filter by mode"
            >
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
        </div>

        {!currentUserId && (
          <div className="leaderboard-auth-prompt">
            <strong>Want to see yourself here?</strong>
            <span>
              Log in or create an account, finish a test, and claim your spot on the
              board.
            </span>
          </div>
        )}

        {isLoading ? (
          <p className="leaderboard-message">Loading leaderboard...</p>
        ) : error ? (
          <p className="leaderboard-message error">{error}</p>
        ) : filteredEntries.length === 0 ? (
          <p className="leaderboard-message">No saved results match this filter yet.</p>
        ) : (
          <div className="rank-board" role="table" aria-label="Global typing leaderboard">
            <div className="rank-board-head" role="row">
              <span role="columnheader">rank</span>
              <span role="columnheader">player</span>
              <span role="columnheader">wpm</span>
              <span role="columnheader">accuracy</span>
              <span role="columnheader">mode</span>
              <span role="columnheader">date</span>
            </div>
            {filteredEntries.map((entry, index) => (
              <RankRow
                entry={entry}
                index={index}
                isCurrentUser={Boolean(currentUserId && entry.userId === currentUserId)}
                key={`${entry.id}-${index + 1}`}
                onOpenProfile={onOpenProfile}
                rank={index + 1}
                topWpm={summary.topWpm}
              />
            ))}
          </div>
        )}
      </section>
    </motion.main>
  );
}

export default Leaderboard;
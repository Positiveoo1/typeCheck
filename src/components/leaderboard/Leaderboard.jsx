import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CheckIcon, ChevronDownIcon, EmojiEventsIcon } from '../common/MaterialIcons.jsx';

const TIER_LABELS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function FilterDropdown({ hint, id, label, onSelect, options, value }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeOption = options.find((option) => option.value === value);
  const labelId = `${id}-label`;
  const buttonId = `${id}-trigger`;

  return (
    <div className="filter-dropdown" ref={rootRef}>
      <span className="filter-dropdown-label" id={labelId}>
        {label}
        {hint && <small className="filter-scope-hint">{hint}</small>}
      </span>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${labelId} ${buttonId}`}
        className={isOpen ? 'filter-dropdown-trigger open' : 'filter-dropdown-trigger'}
        id={buttonId}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{activeOption?.label ?? value}</span>
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <ul aria-labelledby={labelId} className="filter-dropdown-menu" role="listbox">
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <li key={option.value}>
                <button
                  aria-selected={isActive}
                  className={isActive ? 'active' : ''}
                  onClick={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {isActive && <CheckIcon />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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

        {/* Type and Mode are two dropdowns instead of two rows of pill
            buttons — Mode's option list still depends on the active Type,
            shown via the "for <type>" hint next to its label. */}
        <div className="leaderboard-filters" aria-label="Leaderboard filters">
          <FilterDropdown
            id="type-filter"
            label="type"
            onSelect={(next) => {
              setCategoryFilter(next);
              setModeFilter('all');
            }}
            options={CATEGORY_FILTERS.map((filter) => ({
              label: filter.label,
              value: filter.id
            }))}
            value={categoryFilter}
          />
          <FilterDropdown
            hint={`for ${activeCategoryLabel}`}
            id="mode-filter"
            label="mode"
            onSelect={setModeFilter}
            options={[
              { label: 'all modes', value: 'all' },
              ...modeOptions.map((mode) => ({ label: mode, value: mode }))
            ]}
            value={effectiveModeFilter}
          />
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
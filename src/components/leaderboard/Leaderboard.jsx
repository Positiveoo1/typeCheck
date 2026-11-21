import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_MODE_FILTER,
  formatLeaderboardDate,
  getBestEntryPerPlayer,
  getModeOptions,
  getPlayerInitials,
  sortLeaderboardEntries
} from '../../leaderboardLogic.js';
import { getRankTier } from '../../typingIdentity.js';
import {
  formatDailyResetCountdown,
  getDailyChallengeKey,
  getMsUntilDailyReset
} from '../../dailyChallenge.js';
import { loadDailyLeaderboard } from '../../services/typecheckData.js';
import { ArrowForwardIcon, CheckIcon } from '../common/MaterialIcons.jsx';

const EMPTY_DAILY = { dateKey: '', entries: [], error: '', isLoading: false };

// Loads today's daily-challenge board when the Daily tab is open, and keeps
// the "resets in" countdown (and the day itself) current.
function useDailyLeaderboard(isActive) {
  const [daily, setDaily] = useState(EMPTY_DAILY);
  const [now, setNow] = useState(() => new Date());
  const dateKey = getDailyChallengeKey(now);

  useEffect(() => {
    if (!isActive) return undefined;
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;

    let isSubscribed = true;
    setDaily((current) => ({ ...current, dateKey, error: '', isLoading: true }));

    loadDailyLeaderboard(dateKey)
      .then((entries) => {
        if (isSubscribed) setDaily({ dateKey, entries, error: '', isLoading: false });
      })
      .catch((error) => {
        console.error('Failed to load daily leaderboard:', error);
        if (isSubscribed) {
          setDaily({
            dateKey,
            entries: [],
            error: "Could not load today's ranking.",
            isLoading: false
          });
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [dateKey, isActive]);

  return { ...daily, dateKey, resetMs: getMsUntilDailyReset(now) };
}

function useIsNarrow(query = '(max-width: 900px)') {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return isNarrow;
}

function playerKey(entry) {
  return entry.userId || `name:${entry.playerName}`;
}

function VerifiedMark() {
  return (
    <span
      aria-label="Verified result"
      className="lb-verified"
      role="img"
      title="Verified: stats recomputed on the server"
    >
      <CheckIcon className="material-icon" />
    </span>
  );
}

function PlayerPane({ allEntries, entry, isDaily, modeLabel, onOpenProfile, rank }) {
  const bestByMode = useMemo(() => {
    if (!entry || isDaily) return [];
    const key = playerKey(entry);
    const own = allEntries.filter((item) => playerKey(item) === key);
    const best = getBestEntryPerPlayer(
      [...own].sort(sortLeaderboardEntries).map((item) => ({ ...item, userId: item.modeLabel }))
    );
    const order = getModeOptions(best);
    return order.map((mode) => best.find((item) => item.modeLabel === mode));
  }, [allEntries, entry, isDaily]);

  if (!entry) return null;

  const overallBest = Math.max(entry.wpm, ...bestByMode.map((item) => item.wpm));
  // Bars start near the slowest mode, not at zero, so the differences show.
  const barFloor = Math.max(
    0,
    Math.floor((Math.min(...bestByMode.map((item) => item.wpm), overallBest) - 10) / 10) * 10
  );
  const tier = getRankTier(overallBest);

  return (
    <aside className="lb-pane" aria-label={`${entry.playerName} preview`}>
      <div className="lb-pane-identity">
        <span className="lb-avatar lb-avatar-large" aria-hidden="true">
          {getPlayerInitials(entry.playerName)}
        </span>
        <div>
          <h3>
            {entry.playerName}
            {entry.verified && <VerifiedMark />}
          </h3>
          <p>
            Level {tier.level} · {tier.label}
          </p>
        </div>
      </div>

      <dl className="lb-pane-figures">
        <div>
          <dt>Rank</dt>
          <dd>#{rank}</dd>
        </div>
        <div>
          <dt>{isDaily ? 'Best today' : modeLabel}</dt>
          <dd>
            {entry.wpm}
            <small>WPM</small>
          </dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>
            {entry.accuracy}
            <small>%</small>
          </dd>
        </div>
      </dl>

      {isDaily ? (
        <p className="lb-pane-note">
          {entry.attempts} {entry.attempts === 1 ? 'attempt' : 'attempts'} today
          {entry.language ? ` · ${entry.language}` : ''}.
        </p>
      ) : (
        bestByMode.length > 0 && (
          <div className="lb-pane-modes">
            <h4>Best by mode</h4>
            <ul>
              {bestByMode.map((item) => (
                <li
                  className={item.modeLabel === modeLabel ? 'is-current' : ''}
                  key={item.modeLabel}
                >
                  <span>{item.modeLabel}</span>
                  <span className="lb-pane-bar" aria-hidden="true">
                    <i
                      style={{
                        width: `${Math.max(4, Math.round(((item.wpm - barFloor) / (overallBest - barFloor || 1)) * 100))}%`
                      }}
                    />
                  </span>
                  <strong>{item.wpm}</strong>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      <button
        className="page-quiet-button lb-pane-action"
        onClick={() => onOpenProfile(entry.userId)}
        type="button"
      >
        View full profile
        <ArrowForwardIcon />
      </button>
    </aside>
  );
}

function SkeletonRows() {
  return (
    <tbody aria-hidden="true" className="lb-skeleton">
      {Array.from({ length: 8 }, (_, index) => (
        <tr key={index}>
          <td colSpan={5}>
            <span style={{ width: `${70 - index * 5}%` }} />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function Leaderboard({
  currentUserId,
  entries,
  error: allTimeError,
  isLoading: isAllTimeLoading,
  onOpenProfile
}) {
  const [view, setView] = useState('all');
  const isDailyView = view === 'daily';
  const daily = useDailyLeaderboard(isDailyView);
  const [modeFilter, setModeFilter] = useState(DEFAULT_MODE_FILTER);
  const [selectedKey, setSelectedKey] = useState(null);
  const isNarrow = useIsNarrow();
  const prefersReducedMotion = useReducedMotion();
  const rankedEntries = useMemo(() => [...entries].sort(sortLeaderboardEntries), [entries]);
  const modeOptions = useMemo(() => getModeOptions(rankedEntries), [rankedEntries]);
  const effectiveModeFilter =
    modeFilter === 'all' || modeOptions.includes(modeFilter)
      ? modeFilter
      : modeOptions.includes(DEFAULT_MODE_FILTER)
        ? DEFAULT_MODE_FILTER
        : 'all';
  const allTimeEntries = useMemo(
    () =>
      getBestEntryPerPlayer(
        rankedEntries.filter(
          (entry) => effectiveModeFilter === 'all' || entry.modeLabel === effectiveModeFilter
        )
      ).slice(0, 50),
    [effectiveModeFilter, rankedEntries]
  );
  const filteredEntries = isDailyView ? daily.entries : allTimeEntries;
  const isLoading = isDailyView ? daily.isLoading : isAllTimeLoading;
  const error = isDailyView ? daily.error : allTimeError;
  const selectedIndex = Math.max(
    0,
    filteredEntries.findIndex((entry) => playerKey(entry) === selectedKey)
  );
  const selectedEntry = filteredEntries[selectedIndex] || null;
  const modeLabel = effectiveModeFilter === 'all' ? 'Best run' : effectiveModeFilter;
  const showPane = !isNarrow && filteredEntries.length > 0 && !isLoading && !error;

  const handleRowSelect = (entry) => {
    if (isNarrow) {
      onOpenProfile(entry.userId);
      return;
    }
    setSelectedKey(playerKey(entry));
  };

  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="leaderboard-page"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="lb-toolbar">
        <div className="lb-title">
          <h2>Leaderboard</h2>
          <p>
            {isDailyView
              ? `Daily challenge ${daily.dateKey}: the same 40 words for everyone, best run per player. Resets in ${formatDailyResetCountdown(daily.resetMs)}.`
              : 'Each player’s best run, ranked by WPM, then accuracy, then date.'}
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Leaderboard view">
          {[
            { id: 'all', label: 'All-time' },
            { id: 'daily', label: 'Daily challenge' }
          ].map((tab) => (
            <button
              aria-pressed={view === tab.id}
              className={view === tab.id ? 'active' : ''}
              key={tab.id}
              onClick={() => {
                setView(tab.id);
                setSelectedKey(null);
              }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {!isDailyView && (
        <nav aria-label="Leaderboard mode" className="lb-modes">
          {[...modeOptions, 'all'].map((mode) => (
            <button
              aria-pressed={effectiveModeFilter === mode}
              className={effectiveModeFilter === mode ? 'active' : ''}
              key={mode}
              onClick={() => {
                setModeFilter(mode);
                setSelectedKey(null);
              }}
              type="button"
            >
              {mode === 'all' ? 'All modes' : mode}
            </button>
          ))}
        </nav>
      )}

      {!currentUserId && (
        <p className="lb-auth-prompt">
          <strong>Want to see yourself here?</strong> Sign in, finish a test, and your best
          run is ranked automatically.
        </p>
      )}

      <div className={showPane ? 'lb-layout has-pane' : 'lb-layout'}>
        <div className="lb-board">
          {error ? (
            <div className="lb-state is-error">
              <p>{error}</p>
              <span>Check your connection and open the leaderboard again.</span>
            </div>
          ) : !isLoading && filteredEntries.length === 0 ? (
            <div className="lb-state">
              <p>
                {isDailyView
                  ? 'No one has finished today’s challenge yet.'
                  : 'No ranked runs in this mode yet.'}
              </p>
              <span>
                {isDailyView
                  ? 'Take the daily challenge and be first on the board.'
                  : 'Pick another mode, or set the first score here.'}
              </span>
            </div>
          ) : (
            <table className="lb-table" aria-busy={isLoading || undefined}>
              <caption className="sr-only">
                {isDailyView ? 'Daily challenge ranking' : `${modeLabel} ranking`}
              </caption>
              <thead>
                <tr>
                  <th className="lb-col-rank" scope="col">
                    Rank
                  </th>
                  <th scope="col">Player</th>
                  <th className="num" scope="col">
                    WPM
                  </th>
                  <th className="num" scope="col">
                    Accuracy
                  </th>
                  <th className="num lb-col-date" scope="col">
                    {isDailyView ? 'Attempts' : effectiveModeFilter === 'all' ? 'Mode' : 'Date'}
                  </th>
                </tr>
              </thead>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                <tbody>
                  {filteredEntries.map((entry, index) => {
                    const rank = index + 1;
                    const isCurrentUser = Boolean(currentUserId && entry.userId === currentUserId);
                    const isSelected = showPane && index === selectedIndex;

                    return (
                      <tr
                        aria-selected={showPane ? isSelected : undefined}
                        className={[
                          isSelected ? 'is-selected' : '',
                          isCurrentUser ? 'is-you' : '',
                          rank <= 3 ? 'is-podium' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        key={`${entry.id}-${rank}`}
                        onClick={() => handleRowSelect(entry)}
                      >
                        <td className="lb-col-rank">{rank}</td>
                        <td>
                          <button
                            className="lb-player"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRowSelect(entry);
                            }}
                            type="button"
                          >
                            <span className="lb-avatar" aria-hidden="true">
                              {getPlayerInitials(entry.playerName)}
                            </span>
                            <span className="lb-player-name">{entry.playerName}</span>
                            {entry.verified && <VerifiedMark />}
                            {isCurrentUser && <span className="page-pill">You</span>}
                          </button>
                        </td>
                        <td className="num lb-wpm">{entry.wpm}</td>
                        <td className="num">{entry.accuracy}%</td>
                        <td className="num lb-col-date">
                          {isDailyView
                            ? entry.attempts
                            : effectiveModeFilter === 'all'
                              ? entry.modeLabel
                              : formatLeaderboardDate(entry.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          )}
        </div>

        {showPane && (
          <PlayerPane
            allEntries={rankedEntries}
            entry={selectedEntry}
            isDaily={isDailyView}
            modeLabel={modeLabel}
            onOpenProfile={onOpenProfile}
            rank={selectedIndex + 1}
          />
        )}
      </div>
    </motion.main>
  );
}

export default Leaderboard;

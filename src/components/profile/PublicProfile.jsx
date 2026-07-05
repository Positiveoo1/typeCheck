import { motion } from 'framer-motion';
import {
  getAchievementBadges,
  getAverageAccuracy,
  getAverageWpm,
  getConsistencyScore,
  getPlayerInitials,
  getRankTier,
  getTypingStyle
} from '../../typingIdentity.js';

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

function PublicProfile({ error, isLoading, onBack, playerName, results }) {
  const bestResult = results[0] || null;
  const recentResults = [...results]
    .sort(
      (first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
    )
    .slice(0, 10);
  const averageAccuracy = getAverageAccuracy(results);
  const averageWpm = getAverageWpm(results);
  const bestAccuracy = Math.max(
    ...results.map((result) => Number(result.accuracy) || 0),
    0
  );
  const consistency = getConsistencyScore(results);
  const rank = getRankTier(bestResult?.wpm || 0);
  const typingStyle = getTypingStyle(bestResult || {}, {
    consistency,
    previousAverageWpm: averageWpm
  });
  const achievements = getAchievementBadges({
    bestAccuracy,
    bestWpm: bestResult?.wpm || 0,
    completed: results.length,
    consistency,
    results
  }).slice(0, 5);
  const graphPeak = Math.max(...recentResults.map((result) => result.wpm), 1);

  return (
    <motion.main
      className="public-profile-page"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <section className="public-profile-hero">
        <div className="public-profile-identity">
          <div className="public-profile-avatar" aria-hidden="true">
            {getPlayerInitials(playerName)}
          </div>
          <div>
            <p className="eyebrow">player profile</p>
            <h2>{playerName}</h2>
            <p>
              {rank.label} typist - {typingStyle.label}
            </p>
          </div>
        </div>
        <button className="secondary-action" onClick={onBack} type="button">
          Back to leaderboard
        </button>
      </section>

      <section className="public-profile-panel">
        {isLoading ? (
          <p className="leaderboard-message">Loading player profile...</p>
        ) : error ? (
          <p className="leaderboard-message error">{error}</p>
        ) : (
          <>
            <div className="public-profile-player-card">
              <div className="public-profile-rank">
                <span>rank</span>
                <strong>{rank.level}</strong>
                <small>
                  {rank.label} - {rank.progress}% to next tier
                </small>
              </div>
              <div className="public-profile-style" data-tone={typingStyle.tone}>
                <span>typing style</span>
                <strong>{typingStyle.label}</strong>
                <small>{typingStyle.description}</small>
              </div>
              <div
                className="public-profile-graph"
                aria-label="Recent public WPM results"
              >
                <div>
                  <span>recent form</span>
                  <strong>{averageWpm} avg WPM</strong>
                </div>
                <div className="mini-bars" aria-hidden="true">
                  {recentResults.length === 0 ? (
                    <i />
                  ) : (
                    recentResults.map((result, index) => (
                      <i
                        key={`${result.id}-bar`}
                        style={{
                          height: `${Math.max(12, (result.wpm / graphPeak) * 100)}%`
                        }}
                        title={`${result.wpm} WPM run ${index + 1}`}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="public-profile-stats">
              <div>
                <span>best wpm</span>
                <strong>{bestResult?.wpm || 0}</strong>
              </div>
              <div>
                <span>best accuracy</span>
                <strong>{bestAccuracy}%</strong>
              </div>
              <div>
                <span>avg accuracy</span>
                <strong>{averageAccuracy}%</strong>
              </div>
              <div>
                <span>consistency</span>
                <strong>{consistency}%</strong>
              </div>
              <div>
                <span>10 words runs</span>
                <strong>{results.length}</strong>
              </div>
            </div>

            <div className="public-profile-achievements">
              <div className="section-heading">
                <span>badges</span>
                <strong>Public achievements</strong>
              </div>
              <div className="achievement-grid compact">
                {achievements.map((badge) => (
                  <div
                    className={
                      badge.isUnlocked
                        ? 'achievement-badge unlocked'
                        : 'achievement-badge'
                    }
                    key={badge.id}
                  >
                    <span>{badge.label.slice(0, 2)}</span>
                    <strong>{badge.label}</strong>
                    <small>{badge.detail}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="public-profile-results">
              <div className="section-heading">
                <span>10 words</span>
                <strong>Public results</strong>
              </div>
              {results.length === 0 ? (
                <p className="leaderboard-message">No public 10 words results yet.</p>
              ) : (
                <div className="recent-list">
                  {results.slice(0, 12).map((result) => (
                    <div className="recent-item" key={result.id}>
                      <strong>{result.wpm} WPM</strong>
                      <small>{result.accuracy}% accuracy</small>
                      <small>{formatDate(result.createdAt)}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </motion.main>
  );
}

export default PublicProfile;

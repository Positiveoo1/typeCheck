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
import { BadgeList, StatRow, TierRail, getTierCaption } from './ProfileParts.jsx';

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
  });

  return (
    <motion.main
      className="profile-page public-profile-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <section className="prof-identity">
        <div className="profile-avatar" aria-hidden="true">
          <span>{getPlayerInitials(playerName)}</span>
        </div>
        <div className="prof-identity-text">
          <h2>{playerName}</h2>
          {!isLoading && !error && (
            <p className="prof-meta">
              <span>
                Level {rank.level} · {rank.label}
              </span>
              <span>{typingStyle.label} typist</span>
            </p>
          )}
        </div>
        <div className="prof-actions">
          <button className="page-quiet-button" onClick={onBack} type="button">
            Back to leaderboard
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="prof-loading" aria-busy="true">
          <span />
          <span />
          <span />
          <p className="sr-only">Loading player profile</p>
        </div>
      ) : error ? (
        <div className="lb-state is-error">
          <p>{error}</p>
          <span>Go back to the leaderboard and open the profile again.</span>
        </div>
      ) : (
        <>
          <section className="prof-journey" aria-labelledby="level-heading">
            <div className="prof-journey-head">
              <h3 id="level-heading">
                Level {rank.level} · {rank.label}
              </h3>
              <p>{getTierCaption(bestResult?.wpm || 0)}</p>
            </div>
            <TierRail bestWpm={bestResult?.wpm || 0} label={`${playerName}'s best`} />
            <p className="prof-style">
              Typing style: <strong>{typingStyle.label}</strong>. {typingStyle.description}
            </p>
          </section>

          <StatRow
            label="Public stats"
            items={[
              { label: 'Best speed', value: bestResult?.wpm || 0, unit: 'WPM' },
              { label: 'Average speed', value: averageWpm, unit: 'WPM' },
              { label: 'Best accuracy', value: bestAccuracy, unit: '%' },
              { label: 'Average accuracy', value: averageAccuracy, unit: '%' },
              { label: 'Consistency', value: consistency, unit: '%' },
              { label: 'Public runs', value: results.length, note: '10 words' }
            ]}
          />

          <BadgeList badges={achievements} />

          <section className="prof-section" aria-labelledby="public-results-heading">
            <div className="prof-section-head">
              <h3 id="public-results-heading">Recent 10-word runs</h3>
              <p>
                {recentResults.length} of {results.length}
              </p>
            </div>
            {results.length === 0 ? (
              <div className="lb-state">
                <p>No public 10-word runs yet.</p>
                <span>Runs appear here once this player is ranked.</span>
              </div>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th className="num" scope="col">
                        Speed
                      </th>
                      <th className="num" scope="col">
                        Accuracy
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((result) => (
                      <tr className={result === bestResult ? 'is-best' : ''} key={result.id}>
                        <td>
                          {formatDate(result.createdAt)}
                          {result === bestResult && (
                            <span className="page-pill dash-pill">Best run</span>
                          )}
                        </td>
                        <td className="num">
                          <strong>{result.wpm}</strong> <small>WPM</small>
                        </td>
                        <td className="num">{result.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </motion.main>
  );
}

export default PublicProfile;

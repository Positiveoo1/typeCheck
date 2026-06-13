import { motion } from 'framer-motion';

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
  const averageAccuracy = results.length
    ? Math.round(results.reduce((total, result) => total + result.accuracy, 0) / results.length)
    : 0;

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
        <div>
          <p className="eyebrow">player profile</p>
          <h2>{playerName}</h2>
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
            <div className="public-profile-stats">
              <div>
                <span>best wpm</span>
                <strong>{bestResult?.wpm || 0}</strong>
              </div>
              <div>
                <span>best accuracy</span>
                <strong>{bestResult?.accuracy || 0}%</strong>
              </div>
              <div>
                <span>avg accuracy</span>
                <strong>{averageAccuracy}%</strong>
              </div>
              <div>
                <span>10 words runs</span>
                <strong>{results.length}</strong>
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

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

function Leaderboard({ entries, error, isLoading, onOpenProfile }) {
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
          <h2>10 words rankings</h2>
        </div>
        <div className="leaderboard-ring">
          <strong>{entries.length}</strong>
          <span>players</span>
        </div>
      </section>

      <section className="leaderboard-panel">
        <div className="section-heading">
          <span>top players</span>
          <strong>Best 10 words result ranked by WPM, accuracy, then date</strong>
        </div>

        {isLoading ? (
          <p className="leaderboard-message">Loading leaderboard...</p>
        ) : error ? (
          <p className="leaderboard-message error">{error}</p>
        ) : entries.length === 0 ? (
          <p className="leaderboard-message">No saved 10 words results yet.</p>
        ) : (
          <div className="leaderboard-table" role="table" aria-label="Global typing leaderboard">
            <div className="leaderboard-row leaderboard-head" role="row">
              <span role="columnheader">rank</span>
              <span role="columnheader">player</span>
              <span role="columnheader">wpm</span>
              <span role="columnheader">accuracy</span>
              <span role="columnheader">mode</span>
              <span role="columnheader">date</span>
            </div>
            {entries.map((entry, index) => (
              <motion.button
                className="leaderboard-row leaderboard-row-button"
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
                <strong data-label="player" role="cell">{entry.playerName}</strong>
                <span data-label="wpm" role="cell">{entry.wpm}</span>
                <span data-label="accuracy" role="cell">{entry.accuracy}%</span>
                <span data-label="mode" role="cell">{entry.modeLabel}</span>
                <span data-label="date" role="cell">{formatDate(entry.createdAt)}</span>
              </motion.button>
            ))}
          </div>
        )}
      </section>
    </motion.main>
  );
}

export default Leaderboard;

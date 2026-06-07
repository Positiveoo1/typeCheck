import { motion } from 'framer-motion';

const TIME_MODES = ['15s', '30s', '60s'];
const WORD_MODES = ['10 words', '30 words', '60 words'];

function BestModeCard({ label, mode }) {
  return (
    <motion.div className="best-card" layout whileHover={{ y: -3 }}>
      <span>{label}</span>
      <strong>{mode.bestWpm || 0}</strong>
      <small>WPM</small>
      <div className="best-card-meta">
        <small>{mode.bestAccuracy || 0}% best accuracy</small>
      </div>
    </motion.div>
  );
}

function Dashboard({ dashboard }) {
  const recentResults = dashboard.results.slice(0, 6);
  const completionRate =
    dashboard.started === 0
      ? 0
      : Math.round((dashboard.completed / dashboard.started) * 100);

  return (
    <motion.main
      className="dashboard-page"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">dashboard</p>
          <h2>Typing performance</h2>
        </div>
        <div className="dashboard-ring">
          <strong>{completionRate}%</strong>
          <span>completion</span>
        </div>
      </section>

      <section className="dashboard-totals" aria-label="Test totals">
        <div>
          <span>started</span>
          <strong>{dashboard.started}</strong>
        </div>
        <div>
          <span>completed</span>
          <strong>{dashboard.completed}</strong>
        </div>
        <div>
          <span>incomplete</span>
          <strong>{dashboard.incomplete}</strong>
        </div>
      </section>

      <section className="best-section">
        <div className="section-heading">
          <span>time modes</span>
          <strong>Best speed by seconds</strong>
        </div>
        <div className="best-grid">
          {TIME_MODES.map((modeLabel) => (
            <BestModeCard
              key={modeLabel}
              label={modeLabel}
              mode={dashboard.modes[modeLabel]}
            />
          ))}
        </div>
      </section>

      <section className="best-section">
        <div className="section-heading">
          <span>word modes</span>
          <strong>Best speed by word count</strong>
        </div>
        <div className="best-grid">
          {WORD_MODES.map((modeLabel) => (
            <BestModeCard
              key={modeLabel}
              label={modeLabel}
              mode={dashboard.modes[modeLabel]}
            />
          ))}
        </div>
      </section>

      <section className="recent-results">
        <div className="section-heading">
          <span>recent</span>
          <strong>Completed tests</strong>
        </div>
        {recentResults.length > 0 ? (
          <div className="recent-list">
            {recentResults.map((result) => (
              <div className="recent-item" key={result.id}>
                <strong>{result.wpm} WPM</strong>
                <small>{result.accuracy}% accuracy</small>
                <small>{result.modeLabel}</small>
              </div>
            ))}
          </div>
        ) : (
          <p>No completed tests yet.</p>
        )}
      </section>
    </motion.main>
  );
}

export default Dashboard;

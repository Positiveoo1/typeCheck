function Results({ stats, onRestart }) {
  return (
    <section className="results" aria-live="polite">
      <p className="eyebrow">result</p>
      <h2>{stats.wpm} WPM</h2>

      <div className="result-grid">
        <div>
          <span>accuracy</span>
          <strong>{stats.accuracy}%</strong>
        </div>
        <div>
          <span>correct chars</span>
          <strong>{stats.correctChars}</strong>
        </div>
        <div>
          <span>wrong chars</span>
          <strong>{stats.wrongChars}</strong>
        </div>
        <div>
          <span>mode</span>
          <strong>{stats.modeLabel}</strong>
        </div>
        <div>
          <span>elapsed</span>
          <strong>{stats.elapsedSeconds}s</strong>
        </div>
      </div>

      <button className="primary-action" onClick={onRestart} type="button">
        Try again
      </button>
    </section>
  );
}

export default Results;

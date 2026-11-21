import { useMemo } from 'react';
import { getSlowBigrams, getWeakKeys, loadKeyStats } from '../../keyStats.js';

function WeakKeysPanel({ language = 'english', onPractice }) {
  const { weakKeys, slowBigrams } = useMemo(() => {
    const stats = loadKeyStats(language);

    return { weakKeys: getWeakKeys(stats, 5), slowBigrams: getSlowBigrams(stats, 5) };
  }, [language]);

  if (!weakKeys.length && !slowBigrams.length) return null;

  return (
    <section className="weak-keys-panel" aria-label="Your weak keys">
      <div className="weak-keys-grid">
        <div>
          <span>your weakest keys</span>
          <ul>
            {weakKeys.map((entry) => (
              <li key={entry.key}>
                <strong>{entry.key}</strong>
                <small>{Math.round(entry.errorRate * 100)}% errors</small>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span>slowest pairs</span>
          <ul>
            {slowBigrams.map((entry) => (
              <li key={entry.bigram}>
                <strong>{entry.bigram}</strong>
                <small>{Math.round(entry.avgMs)}ms</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {onPractice && (
        <button className="secondary-action" type="button" onClick={onPractice}>
          Practice these
        </button>
      )}
    </section>
  );
}

export default WeakKeysPanel;

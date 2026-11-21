import { formatGhostComparison, getGhostComparison } from '../../ghostRuns.js';

function GhostResultLine({ ghostMode, stats }) {
  const text = formatGhostComparison(getGhostComparison(stats, ghostMode));

  if (!text) return null;

  return <p className="ghost-result-line">{text}</p>;
}

export default GhostResultLine;

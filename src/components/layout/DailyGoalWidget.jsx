import { formatProgressLabel } from '../../dailyProgress.js';
import { FlameIcon } from '../common/MaterialIcons.jsx';

const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function DailyGoalWidget({ progress }) {
  if (!progress) return null;

  const label = formatProgressLabel(progress);
  const unit = progress.goalType === 'minutes' ? 'min' : 'tests';

  return (
    <div
      aria-label={label}
      className={progress.met ? 'daily-goal met' : 'daily-goal'}
      data-tooltip={label}
      role="img"
    >
      <span className={progress.currentStreak > 0 ? 'daily-goal-streak lit' : 'daily-goal-streak'}>
        <FlameIcon />
        <b>{progress.currentStreak}</b>
      </span>
      <span className="daily-goal-ring">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <circle className="daily-goal-ring-track" cx="12" cy="12" r={RING_RADIUS} />
          <circle
            className="daily-goal-ring-value"
            cx="12"
            cy="12"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress.fraction)}
          />
        </svg>
        <small>
          {progress.current}/{progress.goalValue}
          <span className="daily-goal-unit"> {unit}</span>
        </small>
      </span>
    </div>
  );
}

export default DailyGoalWidget;

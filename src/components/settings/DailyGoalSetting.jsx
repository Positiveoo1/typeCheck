import { GOAL_LIMITS, GOAL_TYPES, normalizeGoalValue } from '../../dailyProgress.js';

const GOAL_TYPE_LABELS = { tests: 'Tests per day', minutes: 'Minutes per day' };

function DailyGoalSetting({ dailyGoalType, dailyGoalValue, onPreferencesChange }) {
  const limits = GOAL_LIMITS[dailyGoalType];

  return (
    <div className="daily-goal-setting">
      <div className="sound-style-cards" role="radiogroup" aria-label="Daily goal type">
        {GOAL_TYPES.map((type) => (
          <button
            aria-checked={dailyGoalType === type}
            className={dailyGoalType === type ? 'sound-style-card active' : 'sound-style-card'}
            key={type}
            onClick={() =>
              onPreferencesChange({
                dailyGoalType: type,
                dailyGoalValue: normalizeGoalValue(type, GOAL_LIMITS[type].fallback)
              })
            }
            role="radio"
            type="button"
          >
            <span>{GOAL_TYPE_LABELS[type]}</span>
            <small>
              {type === 'tests'
                ? 'Complete a number of tests each day.'
                : 'Type for a number of minutes each day.'}
            </small>
          </button>
        ))}
      </div>
      <div className="daily-goal-setting-controls">
        <label htmlFor="daily-goal-value">
          Goal ({limits.min}-{limits.max})
        </label>
        <input
          id="daily-goal-value"
          max={limits.max}
          min={limits.min}
          onChange={(event) =>
            onPreferencesChange({
              dailyGoalValue: normalizeGoalValue(dailyGoalType, event.target.value)
            })
          }
          type="number"
          value={dailyGoalValue}
        />
      </div>
    </div>
  );
}

export default DailyGoalSetting;

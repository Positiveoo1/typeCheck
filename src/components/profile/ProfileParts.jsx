import { getRankTier } from '../../typingIdentity.js';
import { CheckIcon, LockIcon } from '../common/MaterialIcons.jsx';

// Tier floors mirror getRankTier in typingIdentity.js, lowest first.
const TIERS = [
  { label: 'Rookie', level: 'E', minimumWpm: 0 },
  { label: 'Bronze', level: 'D', minimumWpm: 40 },
  { label: 'Silver', level: 'C', minimumWpm: 60 },
  { label: 'Gold', level: 'B', minimumWpm: 80 },
  { label: 'Diamond', level: 'A', minimumWpm: 100 },
  { label: 'Elite', level: 'S', minimumWpm: 120 }
];
const RAIL_MAX_WPM = 140;

function railPercent(wpm, railMax) {
  return Math.min(100, Math.max(0, (wpm / railMax) * 100));
}

export function getTierCaption(bestWpm) {
  const rank = getRankTier(bestWpm);
  if (!rank.nextWpm) return 'Top level reached';
  const next = getRankTier(rank.nextWpm);
  return `${rank.wpmToNext} WPM to Level ${next.level} · ${next.label}`;
}

// The level journey: every tier on one rail, with the typist's best run marked.
export function TierRail({ bestWpm, label = 'Your best' }) {
  const wpm = Math.max(0, Math.round(Number(bestWpm) || 0));
  const rank = getRankTier(wpm);
  const railMax = Math.max(RAIL_MAX_WPM, Math.ceil((wpm + 10) / 10) * 10);
  const position = railPercent(wpm, railMax);

  return (
    <div className="tier-rail">
      <div
        aria-label={`${label}: ${wpm} WPM, Level ${rank.level} ${rank.label}. ${getTierCaption(wpm)}.`}
        aria-valuemax={railMax}
        aria-valuemin={0}
        aria-valuenow={wpm}
        className="tier-rail-track"
        role="meter"
      >
        <span className="tier-rail-fill" style={{ width: `${position}%` }} />
        {TIERS.map((tier) => (
          <span
            className={wpm >= tier.minimumWpm ? 'tier-rail-tick is-reached' : 'tier-rail-tick'}
            key={tier.level}
            style={{ left: `${railPercent(tier.minimumWpm, railMax)}%` }}
          />
        ))}
        <span className="tier-rail-marker" style={{ left: `${position}%` }}>
          <span className="tier-rail-flag">
            {wpm}
            <small>WPM</small>
          </span>
        </span>
      </div>
      <ol className="tier-rail-labels" aria-hidden="true">
        {TIERS.map((tier, index) => {
          const end = TIERS[index + 1]?.minimumWpm ?? railMax;
          const isCurrent = tier.level === rank.level;

          return (
            <li
              className={isCurrent ? 'is-current' : wpm >= tier.minimumWpm ? 'is-reached' : ''}
              key={tier.level}
              style={{
                left: `${railPercent(tier.minimumWpm, railMax)}%`,
                width: `${railPercent(end - tier.minimumWpm, railMax)}%`
              }}
            >
              <strong>{tier.level}</strong>
              <span>{tier.label}</span>
              <small>{tier.minimumWpm}+</small>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function BadgeList({ badges }) {
  const earned = badges.filter((badge) => badge.isUnlocked).length;
  const locked = badges.filter((badge) => !badge.isUnlocked);

  return (
    <section className="prof-section" aria-labelledby="badges-heading">
      <div className="prof-section-head">
        <h3 id="badges-heading">Badges</h3>
        <p>
          {earned} of {badges.length} earned
        </p>
      </div>
      <ul className="badge-strip">
        {badges.map((badge) => (
          <li
            className={badge.isUnlocked ? 'is-earned' : ''}
            key={badge.id}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: focus reveals the badge detail
            tabIndex={0}
          >
            {badge.isUnlocked ? (
              <CheckIcon className="material-icon" />
            ) : (
              <LockIcon className="material-icon" />
            )}
            <strong>{badge.label}</strong>
            <span className="badge-tip" role="tooltip">
              <span className="sr-only">{badge.isUnlocked ? 'Earned. ' : 'Locked. '}</span>
              {badge.detail}
            </span>
          </li>
        ))}
      </ul>
      {locked.length > 0 && (
        <p className="badge-todo">
          Still to earn:{' '}
          {locked.map((badge, index) => (
            <span key={badge.id}>
              {index > 0 && ' · '}
              <strong>{badge.label}</strong>: {badge.detail.replace(/\.$/, '')}
            </span>
          ))}
          .
        </p>
      )}
    </section>
  );
}

export function StatRow({ items, label }) {
  return (
    <dl className="prof-stats" aria-label={label}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>
            {item.value}
            {item.unit && <small>{item.unit}</small>}
          </dd>
          {item.note && <span className="prof-stats-note">{item.note}</span>}
        </div>
      ))}
    </dl>
  );
}

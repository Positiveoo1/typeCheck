import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const PROFILE_FIELDS = [
  { id: 'username', label: 'Username', placeholder: 'typechecker' },
  { id: 'city', label: 'City', placeholder: 'Warsaw' },
  { id: 'occupation', label: 'What you do', placeholder: 'Frontend developer' },
  { id: 'github', label: 'GitHub profile', placeholder: 'https://github.com/you' },
  { id: 'website', label: 'Website', placeholder: 'https://example.com' }
];
const CONTRIBUTION_WEEKS = 53;
const DAY_LABELS = ['', 'monday', '', 'wednesday', '', 'friday', ''];

function formatDate(value) {
  if (!value) return 'Unknown';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown';

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

function normalizeUrl(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return '';
  if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue;

  return `https://${trimmedValue}`;
}

function normalizeUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function getUtcDayKey(value) {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
}

function StatCard({ label, value }) {
  return (
    <div className="profile-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActivityGrid({ results }) {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ));
  const startDate = new Date(todayUtc);
  startDate.setUTCDate(
    todayUtc.getUTCDate() - (CONTRIBUTION_WEEKS - 1) * 7 - todayUtc.getUTCDay()
  );
  const countsByDay = results.reduce((counts, result) => {
    const key = getUtcDayKey(result.createdAt);

    if (!key) return counts;

    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
  const days = Array.from({ length: CONTRIBUTION_WEEKS * 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);

    const key = getUtcDayKey(date);
    const count = date > todayUtc ? 0 : countsByDay.get(key) || 0;
    const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / 2));

    return { count, date, key, level };
  });
  const testsInRange = days.reduce((total, day) => total + day.count, 0);

  return (
    <div className="profile-contrib" aria-label="Typing activity in the last 12 months">
      <div className="profile-contrib-top">
        <button type="button">last 12 months</button>
        <strong>{testsInRange} tests</strong>
        <div className="profile-contrib-legend" aria-hidden="true">
          <span>less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i data-level={level} key={level} />
          ))}
          <span>more</span>
        </div>
      </div>
      <div className="profile-contrib-body">
        <div className="profile-contrib-labels" aria-hidden="true">
          {DAY_LABELS.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className="profile-contrib-grid">
          {days.map((day) => (
            <span
              data-level={day.level}
              key={day.key}
              title={`${day.count} tests on ${day.key}`}
            />
          ))}
        </div>
      </div>
      <p>Note: All activity data is using UTC time.</p>
    </div>
  );
}

function Profile({ dashboard, onSaveProfile, onSignOut, profile, user }) {
  const [formValues, setFormValues] = useState({
    city: profile.city || '',
    github: profile.github || '',
    occupation: profile.occupation || '',
    username: profile.username || '',
    website: profile.website || ''
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  useEffect(() => {
    setFormValues({
      city: profile.city || '',
      github: profile.github || '',
      occupation: profile.occupation || '',
      username: profile.username || '',
      website: profile.website || ''
    });
  }, [profile]);

  useEffect(() => {
    if (!isEditOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsEditOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isEditOpen]);

  const stats = useMemo(() => {
    const bestWpm = Math.max(
      ...Object.values(dashboard.modes || {}).map((mode) => Number(mode.bestWpm) || 0),
      0
    );

    return {
      bestWpm,
      completed: dashboard.completed || 0,
      estimatedWords: Math.round(Number(dashboard.estimatedWordsTyped) || 0),
      totalTypingSeconds: Number(dashboard.totalTypingSeconds) || 0
    };
  }, [dashboard]);

  const profileName = profile.username ? `@${profile.username}` : user.displayName || user.email;
  const avatarInitial = (profile.username || user.displayName || user.email || 'U').slice(0, 1);

  const openEditProfile = () => {
    setFormValues({
      city: profile.city || '',
      github: profile.github || '',
      occupation: profile.occupation || '',
      username: profile.username || '',
      website: profile.website || ''
    });
    setSaveStatus('idle');
    setIsEditOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveStatus('saving');

    try {
      await onSaveProfile({
        city: formValues.city.trim(),
        github: normalizeUrl(formValues.github),
        occupation: formValues.occupation.trim(),
        username: normalizeUsername(formValues.username),
        website: normalizeUrl(formValues.website)
      });
      setSaveStatus('saved');
      setIsEditOpen(false);
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <motion.main
      className="profile-page"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">
            {user.photoURL ? (
              <img alt="" src={user.photoURL} />
            ) : (
              <span>{avatarInitial}</span>
            )}
          </div>
          <div>
            <p className="eyebrow">profile</p>
            <h2>{profileName}</h2>
            {profile.username && user.displayName && <p>{user.displayName}</p>}
            <p>Joined {formatDate(profile.joinedAt)}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button
            aria-label="Edit profile"
            className="profile-edit-button"
            onClick={openEditProfile}
            type="button"
          >
            <span className="pencil-icon" aria-hidden="true" />
          </button>
          <button className="sign-out" onClick={onSignOut} type="button">
            Sign out
          </button>
        </div>
      </section>

      <section className="profile-grid">
        <div className="profile-stats-panel">
          <div className="section-heading">
            <span>typing stats</span>
            <strong>Lifetime snapshot</strong>
          </div>
          <div className="profile-stats-grid">
            <StatCard label="best wpm" value={stats.bestWpm} />
            <StatCard label="completed" value={stats.completed} />
            <StatCard label="typing time" value={formatDuration(stats.totalTypingSeconds)} />
            <StatCard label="estimated words" value={stats.estimatedWords} />
          </div>
          <ActivityGrid results={dashboard.results || []} />
          <div className="profile-links">
            {profile.github && (
              <a href={profile.github} rel="noreferrer" target="_blank">
                GitHub
              </a>
            )}
            {profile.website && (
              <a href={profile.website} rel="noreferrer" target="_blank">
                Website
              </a>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isEditOpen && (
          <motion.div
            className="profile-edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <button
              aria-label="Close profile editor"
              className="auth-gate-backdrop"
              onClick={() => setIsEditOpen(false)}
              type="button"
            />
            <motion.form
              className="profile-form profile-form-modal"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              onSubmit={handleSubmit}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="profile-modal-top">
                <div className="section-heading">
                  <span>setup</span>
                  <strong>Public details</strong>
                </div>
                <button
                  aria-label="Close profile editor"
                  className="auth-close"
                  onClick={() => setIsEditOpen(false)}
                  type="button"
                >
                  x
                </button>
              </div>
              {PROFILE_FIELDS.map((field) => (
                <label key={field.id}>
                  <span>{field.label}</span>
                  <input
                    onChange={(event) => {
                      const nextValue =
                        field.id === 'username'
                          ? normalizeUsername(event.target.value)
                          : event.target.value;

                      setFormValues((currentValues) => ({
                        ...currentValues,
                        [field.id]: nextValue
                      }));
                    }}
                    placeholder={field.placeholder}
                    type="text"
                    value={formValues[field.id]}
                  />
                </label>
              ))}
              <button className="primary-action" disabled={saveStatus === 'saving'} type="submit">
                {saveStatus === 'saving' ? 'Saving' : 'Save profile'}
              </button>
              {saveStatus === 'error' && (
                <p className="profile-status error">Could not save profile.</p>
              )}
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

export default Profile;

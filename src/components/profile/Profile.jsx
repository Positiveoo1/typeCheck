import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { getStreaks } from "../../dailyProgress.js";
import { CloseIcon, EditIcon } from "../common/MaterialIcons.jsx";
import { BadgeList, StatRow, TierRail, getTierCaption } from "./ProfileParts.jsx";

import {
  getAchievementBadges,
  getAverageWpm,
  getConsistencyScore,
  getRankTier,
  getTypingStyle,
} from "../../typingIdentity.js";

const PROFILE_FIELDS = [
  { id: "username", label: "Username", placeholder: "typechecker" },
  { id: "city", label: "City", placeholder: "Warsaw" },
  { id: "occupation", label: "What you do", placeholder: "Frontend developer" },
  {
    id: "github",
    label: "GitHub profile",
    placeholder: "https://github.com/you",
  },
  { id: "website", label: "Website", placeholder: "https://example.com" },
];
const CONTRIBUTION_WEEKS = 53;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const ACCOUNT_SECURITY_WINDOW_DAYS = 30;
const PASSWORD_RESET_EMAIL_LIMIT = 4;

function formatDate(value) {
  if (!value) return "Unknown";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatJoinedAge(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));

  return days === 0 ? 'Joined today' : `Joined ${days} ${days === 1 ? 'day' : 'days'} ago`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) return { value: `${hours} h ${minutes}`, unit: "min" };
  if (minutes > 0) return { value: String(minutes), unit: "min" };
  return { value: String(safeSeconds), unit: "s" };
}

function normalizeUrl(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";
  if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue;

  return `https://${trimmedValue}`;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

function getUtcDayKey(value) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

// Fallback when no goal-aware streak is supplied: any day with >= 1 test counts.
function getCurrentStreak(results) {
  return getStreaks(results, { type: "tests", value: 1 }).current;
}

function getRecentEvents(events) {
  if (!Array.isArray(events)) return [];

  const windowStart = new Date(
    Date.now() - ACCOUNT_SECURITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  return events
    .map((value) => {
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    })
    .filter((date) => date && date >= windowStart);
}

function ActivityGrid({ results }) {
  const scrollRef = useRef(null);

  // Narrow screens can't show a whole year: open on the most recent weeks.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, []);
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const startDate = new Date(todayUtc);
  startDate.setUTCDate(
    todayUtc.getUTCDate() - (CONTRIBUTION_WEEKS - 1) * 7 - todayUtc.getUTCDay(),
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
    <section className="prof-section" aria-labelledby="activity-heading">
      <div className="prof-section-head">
        <h3 id="activity-heading">Activity</h3>
        <p>
          {testsInRange.toLocaleString()} {testsInRange === 1 ? "test" : "tests"} in the
          last 12 months · days in UTC
        </p>
      </div>
      <div className="profile-contrib" ref={scrollRef}>
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
      </div>
      <div className="profile-contrib-legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i data-level={level} key={level} />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

function Profile({
  currentStreak,
  dashboard,
  onNotify,
  onRequestPasswordReset,
  onSaveProfile,
  onSignOut,
  profile,
  user,
}) {
  const [formValues, setFormValues] = useState({
    city: profile.city || "",
    github: profile.github || "",
    occupation: profile.occupation || "",
    username: profile.username || "",
    website: profile.website || "",
  });
  const [resetStatus, setResetStatus] = useState("idle");
  const [resetMessage, setResetMessage] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false); // new
  const [saveStatus, setSaveStatus] = useState("idle");

  useEffect(() => {
    if (!isEditOpen && !isAvatarPreviewOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsEditOpen(false);
        setIsAvatarPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isEditOpen, isAvatarPreviewOpen]);

  useEffect(() => {
    setFormValues({
      city: profile.city || "",
      github: profile.github || "",
      occupation: profile.occupation || "",
      username: profile.username || "",
      website: profile.website || "",
    });
  }, [profile]);

  useEffect(() => {
    if (!isEditOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsEditOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isEditOpen]);

  const stats = useMemo(() => {
    const modes = Object.values(dashboard.modes || {});
    const bestWpm = Math.max(
      ...modes.map((mode) => Number(mode.bestWpm) || 0),
      0,
    );
    const bestAccuracy = Math.max(
      ...modes.map((mode) => Number(mode.bestAccuracy) || 0),
      0,
    );
    const results = dashboard.results || [];
    const consistency = getConsistencyScore(results);

    return {
      bestWpm,
      bestAccuracy,
      completed: dashboard.completed || 0,
      consistency,
      estimatedWords: Math.round(Number(dashboard.estimatedWordsTyped) || 0),
      incomplete: Number(dashboard.incomplete) || 0,
      rank: getRankTier(bestWpm),
      started: Number(dashboard.started) || 0,
      streak: currentStreak ?? getCurrentStreak(results),
      style: getTypingStyle(
        results[0] || { accuracy: bestAccuracy, wpm: bestWpm },
        {
          consistency,
          previousAverageWpm: getAverageWpm(results.slice(1)),
        },
      ),
      totalTypingSeconds: Number(dashboard.totalTypingSeconds) || 0,
    };
  }, [currentStreak, dashboard]);
  const achievementBadges = getAchievementBadges({
    bestAccuracy: stats.bestAccuracy,
    bestWpm: stats.bestWpm,
    completed: stats.completed,
    consistency: stats.consistency,
    estimatedWords: stats.estimatedWords,
    results: dashboard.results || [],
    totalTypingSeconds: stats.totalTypingSeconds,
  });

  const profileName = profile.username
    ? `@${profile.username}`
    : user.displayName || user.email;
  const joinedAge = formatJoinedAge(profile.joinedAt);
  const avatarInitial = (
    profile.username ||
    user.displayName ||
    user.email ||
    "U"
  ).slice(0, 1);
  const recentResetEmails = getRecentEvents(
    profile.accountSecurity?.resetEmailSentAt,
  );
  const isPasswordProvider = user.providerData?.some(
    (provider) => provider.providerId === "password",
  );
  const resetEmailsRemaining = Math.max(
    0,
    PASSWORD_RESET_EMAIL_LIMIT - recentResetEmails.length,
  );

  const openEditProfile = () => {
    setFormValues({
      city: profile.city || "",
      github: profile.github || "",
      occupation: profile.occupation || "",
      username: profile.username || "",
      website: profile.website || "",
    });
    setSaveStatus("idle");
    setIsEditOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveStatus("saving");

    try {
      await onSaveProfile({
        city: formValues.city.trim(),
        github: normalizeUrl(formValues.github),
        occupation: formValues.occupation.trim(),
        username: normalizeUsername(formValues.username),
        website: normalizeUrl(formValues.website),
      });
      setSaveStatus("saved");
      setIsEditOpen(false);
    } catch {
      setSaveStatus("error");
      onNotify?.({
        title: "Profile not saved",
        message: "Could not update your public details.",
        type: "error",
      });
    }
  };

  const requestResetEmail = async () => {
    setResetStatus("sending");
    setResetMessage("");

    try {
      await onRequestPasswordReset();
      setResetStatus("sent");
      setResetMessage(`Reset email sent to ${user.email}.`);
    } catch (error) {
      setResetStatus("error");
      setResetMessage(error.message || "Could not send reset email.");
      onNotify?.({
        title: "Reset email failed",
        message: error.message || "Could not send reset email.",
        type: "error",
      });
    }
  };

  const typingTime = formatDuration(stats.totalTypingSeconds);
  const metaParts = [
    profile.username && user.displayName ? user.displayName : "",
    profile.occupation,
    profile.city,
  ].filter(Boolean);

  return (
    <motion.main
      className="profile-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <section className="prof-identity">
        <button
          aria-label="View profile photo"
          className="profile-avatar"
          onClick={() => setIsAvatarPreviewOpen(true)}
          type="button"
        >
          {user.photoURL ? (
            <img alt="" src={user.photoURL} />
          ) : (
            <span aria-hidden="true">{avatarInitial}</span>
          )}
        </button>
        <div className="prof-identity-text">
          <h2
            className={!profile.username ? "is-fallback" : ""}
            title={!profile.username ? profileName : undefined}
          >
            {profileName}
          </h2>
          <p className="prof-meta">
            {metaParts.map((part) => (
              <span key={part}>{part}</span>
            ))}
            <span
              aria-label={joinedAge ? `Account created ${joinedAge.toLowerCase()}` : undefined}
              className="profile-joined"
              data-tooltip={joinedAge || ""}
              tabIndex={joinedAge ? 0 : undefined}
            >
              Joined {formatDate(profile.joinedAt)}
            </span>
          </p>
          {(profile.github || profile.website) && (
            <p className="prof-links">
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
            </p>
          )}
        </div>
        <div className="prof-actions">
          <button className="page-quiet-button" onClick={openEditProfile} type="button">
            <EditIcon className="material-icon" />
            Edit profile
          </button>
          <button className="page-quiet-button" onClick={onSignOut} type="button">
            Sign out
          </button>
        </div>
      </section>

      <section className="prof-journey" aria-labelledby="level-heading">
        <div className="prof-journey-head">
          <h3 id="level-heading">
            Level {stats.rank.level} · {stats.rank.label}
          </h3>
          <p>{getTierCaption(stats.bestWpm)}</p>
        </div>
        <TierRail bestWpm={stats.bestWpm} />
        <p className="prof-style">
          Typing style: <strong>{stats.style.label}</strong>. {stats.style.description}
        </p>
      </section>

      <StatRow
        label="Lifetime stats"
        items={[
          { label: "Best speed", value: stats.bestWpm, unit: "WPM" },
          {
            label: "Tests completed",
            value: stats.completed.toLocaleString(),
            note: stats.incomplete ? `${stats.incomplete} not finished` : undefined,
          },
          {
            label: "Streak",
            value: stats.streak,
            unit: stats.streak === 1 ? "day" : "days",
          },
          { label: "Typing time", value: typingTime.value, unit: typingTime.unit },
          { label: "Words typed", value: stats.estimatedWords.toLocaleString(), note: "Estimated" },
          { label: "Consistency", value: stats.consistency, unit: "%" },
        ]}
      />

      <BadgeList badges={achievementBadges} />
      <ActivityGrid results={dashboard.results || []} />

      <section className="prof-section prof-account" aria-labelledby="account-heading">
        <div className="prof-section-head">
          <h3 id="account-heading">Account</h3>
          <p>{user.email}</p>
        </div>
        <div className="prof-account-row">
          <div>
            <strong>Password reset email</strong>
            <span>
              {isPasswordProvider
                ? `${resetEmailsRemaining} of ${PASSWORD_RESET_EMAIL_LIMIT} left in the last ${ACCOUNT_SECURITY_WINDOW_DAYS} days.`
                : "Not available: you signed in with a provider that manages its own password."}
            </span>
            {resetMessage && (
              <span
                className={resetStatus === "error" ? "profile-status error" : "profile-status"}
                role="status"
              >
                {resetMessage}
              </span>
            )}
          </div>
          <button
            className="page-quiet-button"
            disabled={
              resetStatus === "sending" ||
              resetEmailsRemaining === 0 ||
              !isPasswordProvider
            }
            onClick={requestResetEmail}
            type="button"
          >
            {resetStatus === "sending" ? "Sending…" : "Send reset email"}
          </button>
        </div>
      </section>

      <AnimatePresence>
        {isEditOpen && (
          <motion.div
            className="profile-edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
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
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="profile-modal-top">
                <h3 className="profile-modal-title">Edit public details</h3>
                <button
                  aria-label="Close profile editor"
                  className="auth-close"
                  onClick={() => setIsEditOpen(false)}
                  type="button"
                >
                  <CloseIcon />
                </button>
              </div>
              {PROFILE_FIELDS.map((field) => (
                <label key={field.id}>
                  <span>{field.label}</span>
                  <div className="field-with-caps">
                    <input
                      onChange={(event) => {
                        const nextValue =
                          field.id === "username"
                            ? normalizeUsername(event.target.value)
                            : event.target.value;

                        setFormValues((currentValues) => ({
                          ...currentValues,
                          [field.id]: nextValue,
                        }));
                      }}
                      placeholder={field.placeholder}
                      type="text"
                      value={formValues[field.id]}
                    />
                  </div>
                </label>
              ))}
              <button
                className="page-cta"
                disabled={saveStatus === "saving"}
                type="submit"
              >
                {saveStatus === "saving" ? "Saving…" : "Save profile"}
              </button>
              {saveStatus === "error" && (
                <p className="profile-status error">Could not save profile.</p>
              )}
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAvatarPreviewOpen && (
          <motion.div
            className="avatar-preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <button
              aria-label="Close photo preview"
              className="auth-gate-backdrop"
              onClick={() => setIsAvatarPreviewOpen(false)}
              type="button"
            />
            <motion.div
              className="avatar-preview-card"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <button
                aria-label="Close photo preview"
                className="auth-close avatar-preview-close"
                onClick={() => setIsAvatarPreviewOpen(false)}
                type="button"
              >
                <CloseIcon />
              </button>
              {user.photoURL ? (
                <img alt="Your avatar" src={user.photoURL} />
              ) : (
                <span aria-hidden="true">{avatarInitial}</span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

export default Profile;

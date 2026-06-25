import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthPanel from './AuthPanel.jsx';
import {
  DashboardIcon,
  EmojiEventsIcon,
  KeyboardIcon,
  PersonIcon,
  SettingsIcon
} from './MaterialIcons.jsx';

function Header({
  currentPage,
  onNotify,
  profile,
  user,
  onNavigate
}) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    if (user) {
      setIsAuthOpen(false);
    }
  }, [user]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (!navRef.current || navRef.current.contains(event.target)) return;

      setIsAuthOpen(false);
    };

    document.addEventListener('pointerdown', closeMenus);
    return () => document.removeEventListener('pointerdown', closeMenus);
  }, []);

  const accountLabel = profile?.username
    ? `@${profile.username}`
    : user?.displayName || user?.email;

  return (
    <header className="header">
      <motion.button
        className="brand brand-button"
        onClick={() => onNavigate('test', { restart: true })}
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        <div>
          <p className="eyebrow">typing speed test</p>
          <h1>TypeCheck</h1>
        </div>
      </motion.button>

      <nav
        className="nav-actions"
        aria-label="Primary"
        data-onboarding-target="account-dashboard"
        ref={navRef}
      >
        <motion.button
          aria-label="Typing test"
          className={currentPage === 'test' ? 'nav-icon active' : 'nav-icon'}
          data-tooltip="Typing test"
          onClick={() => onNavigate('test')}
          type="button"
          whileHover={{ y: -1, scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
        >
          <KeyboardIcon />
        </motion.button>
        <motion.button
          aria-label="Dashboard"
          className={currentPage === 'dashboard' ? 'nav-icon active' : 'nav-icon'}
          data-tooltip="Dashboard"
          onClick={() => onNavigate('dashboard')}
          type="button"
          whileHover={{ y: -1, scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
        >
          <DashboardIcon />
        </motion.button>
        <motion.button
          aria-label="Leaderboard"
          className={currentPage === 'leaderboard' ? 'nav-icon active' : 'nav-icon'}
          data-tooltip="Leaderboard"
          onClick={() => onNavigate('leaderboard')}
          type="button"
          whileHover={{ y: -1, scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
        >
          <EmojiEventsIcon />
        </motion.button>
        <motion.button
          aria-label="Settings"
          className={currentPage === 'settings' ? 'nav-icon active' : 'nav-icon'}
          data-tooltip="Settings"
          onClick={() => onNavigate('settings')}
          type="button"
          whileHover={{ y: -1, scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
        >
          <SettingsIcon className="material-icon" />
        </motion.button>
        {user ? (
          <>
            <motion.button
              aria-label="Profile"
              className={currentPage === 'profile' ? 'nav-icon active' : 'nav-icon'}
              data-tooltip="Profile"
              onClick={() => onNavigate('profile')}
              type="button"
              whileHover={{ y: -1, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
            >
              <PersonIcon />
            </motion.button>
            <div className="user-menu">
              <span>{accountLabel}</span>
            </div>
          </>
        ) : (
          <div className="profile-menu">
            <motion.button
              aria-expanded={isAuthOpen}
              aria-label="Open account menu"
              className="profile-button"
              data-tooltip="Account"
              onClick={() => {
                setIsAuthOpen((current) => !current);
              }}
              type="button"
              whileHover={{ y: -1, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
            >
              <PersonIcon />
            </motion.button>

            <AnimatePresence>
              {isAuthOpen && (
                <AuthPanel
                  onNotify={onNotify}
                  onClose={() => setIsAuthOpen(false)}
                  onSuccess={() => setIsAuthOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthPanel from './AuthPanel.jsx';

const THEMES = [
  { id: 'matrix', label: 'Matrix', colors: ['#10120f', '#b9dc6d', '#d6ca62'] },
  { id: 'serika', label: 'Serika', colors: ['#e1dcc9', '#d0a542', '#2f3329'] },
  { id: 'botanical', label: 'Botanical', colors: ['#102019', '#72d49a', '#e4d66c'] },
  { id: 'midnight', label: 'Midnight', colors: ['#0c1020', '#76a9ff', '#f0c86a'] },
  { id: 'rose', label: 'Rose', colors: ['#21151b', '#ff8fab', '#f6d365'] }
];

function Header({
  currentPage,
  profile,
  theme,
  user,
  onNavigate,
  onThemeChange
}) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
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
      setIsThemeOpen(false);
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
          <span className="keyboard-icon" aria-hidden="true" />
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
          <span className="dashboard-icon" aria-hidden="true" />
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
          <span className="leaderboard-icon" aria-hidden="true" />
        </motion.button>
        <div className="theme-menu">
          <motion.button
            aria-expanded={isThemeOpen}
            aria-label="Choose theme"
            className="nav-icon"
            data-tooltip="Theme"
            onClick={() => {
              setIsAuthOpen(false);
              setIsThemeOpen((current) => !current);
            }}
            type="button"
            whileHover={{ y: -1, scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
          >
            <span className="palette-icon" aria-hidden="true" />
          </motion.button>

          <AnimatePresence>
            {isThemeOpen && (
              <motion.div
                className="theme-panel"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {THEMES.map((themeOption) => (
                  <button
                    className={
                      theme === themeOption.id
                        ? 'theme-choice active'
                        : 'theme-choice'
                    }
                    key={themeOption.id}
                    onClick={() => {
                      onThemeChange(themeOption.id);
                      setIsThemeOpen(false);
                    }}
                    type="button"
                  >
                    <span className="theme-swatches" aria-hidden="true">
                      {themeOption.colors.map((color) => (
                        <i key={color} style={{ background: color }} />
                      ))}
                    </span>
                    {themeOption.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
              <span className="profile-icon" aria-hidden="true" />
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
                setIsThemeOpen(false);
                setIsAuthOpen((current) => !current);
              }}
              type="button"
              whileHover={{ y: -1, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
            >
              <span aria-hidden="true" />
            </motion.button>

            <AnimatePresence>
              {isAuthOpen && (
                <AuthPanel
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

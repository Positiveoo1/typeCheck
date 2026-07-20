import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import TestPage from '../test/TestPage.jsx';

const Dashboard = lazy(() => import('../dashboard/Dashboard.jsx'));
const Leaderboard = lazy(() => import('../leaderboard/Leaderboard.jsx'));
const LegalPage = lazy(() => import('../legal/LegalPage.jsx'));
const Profile = lazy(() => import('../profile/Profile.jsx'));
const PublicProfile = lazy(() => import('../profile/PublicProfile.jsx'));
const SettingsPage = lazy(() => import('../settings/SettingsPage.jsx'));

function AppPages({
  currentPage,
  dashboard,
  leaderboard,
  navigate,
  notify,
  onOpenPublicProfile,
  onRequestPasswordReset,
  onSaveProfile,
  onSignOut,
  publicProfile,
  settings,
  testPage,
  theme,
  user,
  userProfile
}) {
  const pageContentClass = testPage.isGated ? 'page-content gated-blur' : 'page-content';

  return (
    <div className={pageContentClass}>
      <Suspense fallback={null}>
        <AnimatePresence mode="wait">
          {currentPage === 'dashboard' && user ? (
            <Dashboard key="dashboard" dashboard={dashboard} onNavigate={navigate} />
          ) : currentPage === 'leaderboard' ? (
            <Leaderboard
              key="leaderboard"
              entries={leaderboard.entries}
              error={leaderboard.error}
              isLoading={leaderboard.isLoading}
              currentUserId={user?.uid || ''}
              onOpenProfile={onOpenPublicProfile}
            />
          ) : currentPage === 'public-profile' ? (
            <PublicProfile
              key={`public-profile-${publicProfile.userId}`}
              error={publicProfile.error}
              isLoading={publicProfile.isLoading}
              onBack={() => navigate('leaderboard')}
              playerName={publicProfile.playerName}
              results={publicProfile.results}
            />
          ) : currentPage === 'profile' && user ? (
            <Profile
              key="profile"
              onNotify={notify}
              onRequestPasswordReset={onRequestPasswordReset}
              dashboard={dashboard}
              onSaveProfile={onSaveProfile}
              onSignOut={onSignOut}
              profile={userProfile}
              user={user}
            />
          ) : currentPage === 'settings' ? (
            <SettingsPage
              key="settings"
              accentColor={settings.accentColor}
              dashboard={dashboard}
              mistakeMode={settings.mistakeMode}
              onPreferencesChange={settings.onPreferencesChange}
              onSoundToggle={settings.onSoundToggle}
              onThemeChange={settings.onThemeChange}
              reducedMotion={settings.reducedMotion}
              showKeyboard={settings.showKeyboard}
              soundEnabled={settings.soundEnabled}
              soundStyle={settings.soundStyle}
              soundVolume={settings.soundVolume}
              theme={theme}
            />
          ) : currentPage === 'privacy' || currentPage === 'terms' ? (
            <LegalPage
              key={currentPage}
              onBack={() => navigate('test')}
              type={currentPage}
            />
          ) : (
            <TestPage {...testPage} />
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}

export default AppPages;

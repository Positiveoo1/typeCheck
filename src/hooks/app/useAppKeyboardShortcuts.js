import { useEffect } from 'react';
import { SHORTCUT_TIME_MODES, SHORTCUT_WORD_MODES } from '../../appState.js';

function isEditableTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  const isFormField =
    tagName === 'input' || tagName === 'textarea' || tagName === 'select';

  return isFormField || target?.isContentEditable;
}

export function useAppKeyboardShortcuts({
  currentPage,
  handleSettingsChange,
  isActive,
  isAuthGateOpen,
  isOnboardingOpen,
  isSignOutConfirmOpen,
  navigate,
  onCloseModals,
  restart,
  result,
  tryAgain
}) {
  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      const hasModifier = event.altKey || event.ctrlKey || event.metaKey;
      const normalizedKey = event.key.toLowerCase();

      if (isOnboardingOpen) return;

      if (isAuthGateOpen || isSignOutConfirmOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCloseModals();
        }

        return;
      }

      if (isEditableTarget(event.target) && !hasModifier && event.key !== 'Escape') {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        restart();
        return;
      }

      if (result && event.key === 'Enter' && !hasModifier) {
        event.preventDefault();

        if (event.shiftKey) {
          tryAgain();
        } else {
          restart();
        }

        return;
      }

      if (event.key === 'Escape' && currentPage === 'test') {
        event.preventDefault();
        restart();
        return;
      }

      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      if (normalizedKey === 't') {
        event.preventDefault();
        navigate('test');
        return;
      }

      if (normalizedKey === 'd') {
        event.preventDefault();
        navigate('dashboard');
        return;
      }

      if (normalizedKey === 'l') {
        event.preventDefault();
        navigate('leaderboard');
        return;
      }

      if (normalizedKey === 'p') {
        event.preventDefault();
        navigate('profile');
        return;
      }

      if (normalizedKey === 's') {
        event.preventDefault();
        navigate('settings');
        return;
      }

      if (currentPage !== 'test' || isActive) return;

      const shortcutIndex = Number(event.key) - 1;

      if (!Number.isInteger(shortcutIndex)) return;

      if (shortcutIndex >= 0 && shortcutIndex < SHORTCUT_TIME_MODES.length) {
        event.preventDefault();
        handleSettingsChange('time', SHORTCUT_TIME_MODES[shortcutIndex]);
        return;
      }

      const wordModeIndex = shortcutIndex - SHORTCUT_TIME_MODES.length;

      if (wordModeIndex >= 0 && wordModeIndex < SHORTCUT_WORD_MODES.length) {
        event.preventDefault();
        handleSettingsChange('words', SHORTCUT_WORD_MODES[wordModeIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [
    currentPage,
    handleSettingsChange,
    isActive,
    isAuthGateOpen,
    isOnboardingOpen,
    isSignOutConfirmOpen,
    navigate,
    onCloseModals,
    restart,
    result,
    tryAgain
  ]);
}

import { useEffect } from 'react';

function isTextInput(element) {
  const tagName = element?.tagName?.toLowerCase();

  return tagName === 'input' || tagName === 'textarea' || element?.isContentEditable;
}

function clearCapsLockIndicators() {
  document.querySelectorAll('[data-caps-lock="true"]').forEach((element) => {
    element.dataset.capsLock = 'false';
  });
}

function getInputWrapper(element) {
  return (
    element?.closest?.('.field-with-caps, .password-field') ||
    document.querySelector('.word-display.typing-focused')
  );
}

export function useCapsLockIndicator() {
  useEffect(() => {
    const updateCapsLock = (event) => {
      if (!isTextInput(document.activeElement)) {
        clearCapsLockIndicators();
        return;
      }

      if (typeof event.getModifierState !== 'function') return;

      clearCapsLockIndicators();
      const wrapper = getInputWrapper(document.activeElement);

      if (wrapper) {
        wrapper.dataset.capsLock = String(event.getModifierState('CapsLock'));
      }
    };

    const handleFocusIn = (event) => {
      clearCapsLockIndicators();

      if (!isTextInput(event.target)) return;

      const wrapper = getInputWrapper(event.target);
      if (wrapper) {
        wrapper.dataset.capsLock = 'false';
      }
    };

    const handleFocusOut = () => {
      window.requestAnimationFrame(() => {
        if (isTextInput(document.activeElement)) return;

        clearCapsLockIndicators();
      });
    };

    window.addEventListener('keydown', updateCapsLock);
    window.addEventListener('keyup', updateCapsLock);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('keydown', updateCapsLock);
      window.removeEventListener('keyup', updateCapsLock);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);
}

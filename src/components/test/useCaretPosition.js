import { useLayoutEffect, useState } from 'react';

export function useCaretPosition(currentLetterRef, wordDisplayRef, deps) {
  const [caretPosition, setCaretPosition] = useState({
    height: 0,
    left: 0,
    top: 0,
    visible: false
  });

  useLayoutEffect(() => {
    const currentElement = currentLetterRef.current;
    const wordDisplay = wordDisplayRef.current;

    if (!currentElement || !wordDisplay) {
      setCaretPosition((currentPos) =>
        currentPos.visible ? { ...currentPos, visible: false } : currentPos
      );
      return;
    }

    const updateCaretPosition = () => {
      const currentRect = currentElement.getBoundingClientRect();
      const displayRect = wordDisplay.getBoundingClientRect();
      const currentCenter = currentRect.top + currentRect.height / 2;
      const targetCenter = displayRect.top + displayRect.height * 0.5;
      const centerTolerance = displayRect.height * 0.12;
      const centerDelta = currentCenter - targetCenter;

      if (Math.abs(centerDelta) > centerTolerance) {
        wordDisplay.scrollTo({
          behavior: 'smooth',
          top: wordDisplay.scrollTop + centerDelta
        });
      }

      const nextCurrentRect = currentElement.getBoundingClientRect();
      const nextDisplayRect = wordDisplay.getBoundingClientRect();

      setCaretPosition({
        height: nextCurrentRect.height,
        left: nextCurrentRect.left - nextDisplayRect.left + wordDisplay.scrollLeft - 2,
        top: nextCurrentRect.top - nextDisplayRect.top + wordDisplay.scrollTop,
        visible: true
      });
    };

    updateCaretPosition();

    const animationFrameId = window.requestAnimationFrame(updateCaretPosition);
    window.addEventListener('resize', updateCaretPosition);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCaretPosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return caretPosition;
}
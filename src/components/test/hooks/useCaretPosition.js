import { useLayoutEffect, useState } from 'react';

// Position of an element relative to the scrolling word display, in the
// coordinate space of the absolutely positioned carets.
export function measureCaretPosition(element, wordDisplay) {
  const elementRect = element.getBoundingClientRect();
  const displayRect = wordDisplay.getBoundingClientRect();

  return {
    height: elementRect.height,
    left: elementRect.left - displayRect.left + wordDisplay.scrollLeft - 2,
    top: elementRect.top - displayRect.top + wordDisplay.scrollTop,
    visible: true
  };
}

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

      setCaretPosition(measureCaretPosition(currentElement, wordDisplay));
    };

    updateCaretPosition();

    const animationFrameId = window.requestAnimationFrame(updateCaretPosition);
    window.addEventListener('resize', updateCaretPosition);

    // Re-measure when typing font or size settings change layout.
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateCaretPosition);
    resizeObserver?.observe(currentElement);
    resizeObserver?.observe(wordDisplay);

    const rootAttributeObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => window.requestAnimationFrame(updateCaretPosition));
    rootAttributeObserver?.observe(document.documentElement, {
      attributeFilter: ['data-typing-font', 'data-typing-font-size'],
      attributes: true
    });

    const fontSet = document.fonts;
    fontSet?.addEventListener?.('loadingdone', updateCaretPosition);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCaretPosition);
      resizeObserver?.disconnect();
      rootAttributeObserver?.disconnect();
      fontSet?.removeEventListener?.('loadingdone', updateCaretPosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return caretPosition;
}
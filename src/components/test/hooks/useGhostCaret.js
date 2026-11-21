import { useEffect, useLayoutEffect, useState } from 'react';
import { getGhostPositionAt } from '../../../ghostRuns.js';
import { measureCaretPosition } from './useCaretPosition.js';

// Replays a stored ghost against the engine clock. Returns the ghost's typed
// length and, once measured, the position of the matching character in the
// current target text (same index, not the same words).
export function useGhostCaret({
  enabled,
  getElapsedMs,
  ghost,
  hasStarted,
  targetText,
  wordDisplayRef
}) {
  const active = Boolean(enabled && ghost && hasStarted);
  const [ghostLength, setGhostLength] = useState(0);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!active) {
      setGhostLength(0);
      return undefined;
    }

    let frameId = 0;
    const tick = () => {
      setGhostLength(getGhostPositionAt(ghost, getElapsedMs()));
      frameId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => window.cancelAnimationFrame(frameId);
  }, [active, getElapsedMs, ghost]);

  useLayoutEffect(() => {
    const wordDisplay = wordDisplayRef.current;

    if (!active || !wordDisplay || !targetText) {
      setPosition(null);
      return undefined;
    }

    const index = Math.min(ghostLength, targetText.length - 1);
    const measure = () => {
      const element = wordDisplay.querySelector(`[data-char-index="${index}"]`);

      setPosition(element ? measureCaretPosition(element, wordDisplay) : null);
    };

    measure();
    window.addEventListener('resize', measure);

    return () => window.removeEventListener('resize', measure);
  }, [active, ghostLength, targetText, wordDisplayRef]);

  return { ghostLength, position: active ? position : null };
}

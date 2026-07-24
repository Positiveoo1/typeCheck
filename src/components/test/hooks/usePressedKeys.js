import { useEffect, useRef, useState } from "react";
import { playKeySound } from "../utils/keySound.js";

export function usePressedKeys({
  isTypingFocusedRef,
  inputRef,
  targetText,
  typedTextRef,
  soundEnabled,
  soundStyle,
  soundVolume,
}) {
  const [pressedKeys, setPressedKeys] = useState(() => new Set());
  const [pressedKeyStates, setPressedKeyStates] = useState({});
const keySoundPoolRef = useRef([]);
  const audioContextRef = useRef(null);

  useEffect(() => {
    const getKeyState = (event) => {
      if (!isTypingFocusedRef.current) return "";
      if (event.key.length !== 1) return "";

      const expectedChar = targetText[typedTextRef.current.length];
      if (expectedChar === undefined) return "";

      return event.key === expectedChar ? "correct" : "wrong";
    };

    const isTypingInputEvent = (event) =>
      isTypingFocusedRef.current && event.target === inputRef.current;

    const handleKeyDown = (event) => {
      if (!isTypingInputEvent(event)) return;

      if (soundEnabled && !event.repeat) {
        playKeySound(
          keySoundPoolRef,
          audioContextRef,
          soundVolume,
          soundStyle,
          event,
        );
      }

      const keyState = getKeyState(event);

      setPressedKeys((currentKeys) => {
        if (currentKeys.has(event.code)) return currentKeys;

        const nextKeys = new Set(currentKeys);
        nextKeys.add(event.code);
        return nextKeys;
      });

      if (keyState) {
        setPressedKeyStates((currentStates) => ({
          ...currentStates,
          [event.code]: keyState,
        }));
      }
    };

    const handleKeyUp = (event) => {
      if (!isTypingInputEvent(event)) return;

      setPressedKeys((currentKeys) => {
        if (!currentKeys.has(event.code)) return currentKeys;

        const nextKeys = new Set(currentKeys);
        nextKeys.delete(event.code);
        return nextKeys;
      });

      setPressedKeyStates((currentStates) => {
        if (!currentStates[event.code]) return currentStates;

        const nextStates = { ...currentStates };
        delete nextStates[event.code];
        return nextStates;
      });
    };

    const clearPressedKeys = () => {
      setPressedKeys(new Set());
      setPressedKeyStates({});
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearPressedKeys);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearPressedKeys);
      keySoundPoolRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      keySoundPoolRef.current = [];
      audioContextRef.current?.close?.();
      audioContextRef.current = null;
    };
  }, [
    inputRef,
    isTypingFocusedRef,
    soundEnabled,
    soundStyle,
    soundVolume,
    targetText,
    typedTextRef,
  ]);

  return {
    pressedKeys,
    pressedKeyStates,
    resetPressedKeyStates: setPressedKeyStates,
  };
}

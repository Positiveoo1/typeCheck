import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  buildWordTokens,
  calculateStats,
  getModeLabel,
  getNextTypedText,
  getTargetWordCount,
  getTimeLeft,
  shuffleWords
} from '../typingLogic.js';

const KEYBOARD_ROWS = [
  [
    { code: 'KeyQ', label: 'q' },
    { code: 'KeyW', label: 'w' },
    { code: 'KeyE', label: 'e' },
    { code: 'KeyR', label: 'r' },
    { code: 'KeyT', label: 't' },
    { code: 'KeyY', label: 'y' },
    { code: 'KeyU', label: 'u' },
    { code: 'KeyI', label: 'i' },
    { code: 'KeyO', label: 'o' },
    { code: 'KeyP', label: 'p' },
    { code: 'Backspace', label: 'backspace', size: 'wide' }
  ],
  [
    { code: 'KeyA', label: 'a' },
    { code: 'KeyS', label: 's' },
    { code: 'KeyD', label: 'd' },
    { code: 'KeyF', label: 'f' },
    { code: 'KeyG', label: 'g' },
    { code: 'KeyH', label: 'h' },
    { code: 'KeyJ', label: 'j' },
    { code: 'KeyK', label: 'k' },
    { code: 'KeyL', label: 'l' }
  ],
  [
    { code: 'KeyZ', label: 'z' },
    { code: 'KeyX', label: 'x' },
    { code: 'KeyC', label: 'c' },
    { code: 'KeyV', label: 'v' },
    { code: 'KeyB', label: 'b' },
    { code: 'KeyN', label: 'n' },
    { code: 'KeyM', label: 'm' }
  ]
];
const KEY_SOUND_SRC = '/audio/kSound.mp3';
const KEY_SOUND_POOL_SIZE = 8;

function createKeyAudio(volume) {
  const audio = new Audio(KEY_SOUND_SRC);
  audio.preload = 'auto';
  audio.volume = volume;
  return audio;
}

function playToneSound(audioContextRef, volume, style) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContext();
  }

  const audioContext = audioContextRef.current;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startedAt = audioContext.currentTime;
  const isBright = style === 'bright';

  oscillator.type = isBright ? 'square' : 'sine';
  oscillator.frequency.setValueAtTime(isBright ? 980 : 420, startedAt);
  oscillator.frequency.exponentialRampToValueAtTime(isBright ? 520 : 260, startedAt + 0.055);
  gain.gain.setValueAtTime(Math.max(0.001, volume * (isBright ? 0.08 : 0.12)), startedAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startedAt + (isBright ? 0.035 : 0.06));

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startedAt);
  oscillator.stop(startedAt + (isBright ? 0.04 : 0.07));
}

function playKeySound(audioPoolRef, audioContextRef, volume, style) {
  if (volume <= 0) return;
  if (style !== 'click') {
    playToneSound(audioContextRef, volume, style);
    return;
  }

  if (typeof Audio === 'undefined') return;

  if (audioPoolRef.current.length === 0) {
    audioPoolRef.current.push(createKeyAudio(volume));
  }

  const availableAudio = audioPoolRef.current.find((audio) => audio.paused || audio.ended);
  const audio =
    availableAudio ||
    (audioPoolRef.current.length < KEY_SOUND_POOL_SIZE
      ? createKeyAudio(volume)
      : audioPoolRef.current[0]);

  if (!audioPoolRef.current.includes(audio)) {
    audioPoolRef.current.push(audio);
  }

  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function VisualKeyboard({ keyboardRef, pressedKeyStates, pressedKeys }) {
  return (
    <div className="visual-keyboard" aria-hidden="true" ref={keyboardRef}>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={`row-${rowIndex}`}>
          {row.map((key) => {
            const keyState = pressedKeyStates[key.code];

            return (
              <span
                className={[
                  'keyboard-key',
                  key.size ? `keyboard-key-${key.size}` : '',
                  pressedKeys.has(key.code) ? 'pressed' : '',
                  keyState ? `pressed-${keyState}` : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={key.code}
              >
                {key.label}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ShortcutHints() {
  const   hint =  { label: 'restart', keys: ['Esc'] };

  return (
    <section
      className="shortcut-hints"
      aria-label="Keyboard shortcuts"
      data-onboarding-target="restart-shortcut"
    >
      <div className="shortcut-chip">
        <strong>{hint.label}</strong>
        <span className="shortcut-keys">
          {hint.keys.map((key) => (
            <kbd key={key}>{key}</kbd>
          ))}
        </span>
      </div>
    </section>
  );
}

function isLastWordFullyCorrect(targetText, typedText) {
  const lastWordStart = targetText.lastIndexOf(' ') + 1;

  return typedText.slice(lastWordStart) === targetText.slice(lastWordStart);
}

function TypingTest({
  testType,
  testValue,
  onFinish,
  restartKey,
  onRestart,
  onStart,
  onActiveChange,
  mistakeMode,
  showKeyboard,
  soundEnabled,
  soundStyle,
  soundVolume,
  targetTextOverride
}) {
  const [targetText, setTargetText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState(testType === 'time' ? testValue : 0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isTypingFocused, setIsTypingFocused] = useState(false);
  const [pressedKeys, setPressedKeys] = useState(() => new Set());
  const [pressedKeyStates, setPressedKeyStates] = useState({});
  const [caretPosition, setCaretPosition] = useState({
    height: 0,
    left: 0,
    top: 0,
    visible: false
  });
  const inputRef = useRef(null);
  const wordDisplayRef = useRef(null);
  const keyboardRef = useRef(null);
  const keySoundPoolRef = useRef([]);
  const audioContextRef = useRef(null);
  const currentLetterRef = useRef(null);
  const typedTextRef = useRef('');
  const startedAtRef = useRef(null);
  const accumulatedElapsedRef = useRef(0);
  const isTypingFocusedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const hasFinishedRef = useRef(false);
  const tabArmedRef = useRef(false);
  const speedHistoryRef = useRef([]);

  const focusInput = useCallback(() => {
    isTypingFocusedRef.current = true;
    setIsTypingFocused(true);
    inputRef.current?.focus();
  }, []);

  const wordTokens = useMemo(() => buildWordTokens(targetText), [targetText]);
  const isIdle = typedText.length === 0 && !isRunning;
  const isReplay = Boolean(targetTextOverride);

  useEffect(() => {
    const wordDisplay = wordDisplayRef.current;
    if (!wordDisplay) return undefined;

    const preventUserScroll = (event) => {
      event.preventDefault();
    };

    wordDisplay.addEventListener('wheel', preventUserScroll, { passive: false });
    wordDisplay.addEventListener('touchmove', preventUserScroll, { passive: false });

    return () => {
      wordDisplay.removeEventListener('wheel', preventUserScroll);
      wordDisplay.removeEventListener('touchmove', preventUserScroll);
    };
  }, []);

  const recordSpeedSnapshot = (elapsedSeconds, nextTypedText) => {
    const normalizedElapsedSeconds = Math.max(0, elapsedSeconds);
    const snapshot = calculateStats(
      targetText,
      nextTypedText,
      normalizedElapsedSeconds
    );
    const lastSnapshot = speedHistoryRef.current.at(-1);

    if (
      lastSnapshot &&
      normalizedElapsedSeconds - lastSnapshot.elapsedSeconds < 0.45 &&
      snapshot.wpm === lastSnapshot.wpm
    ) {
      return;
    }

    speedHistoryRef.current = [
      ...speedHistoryRef.current,
      {
        elapsedSeconds: normalizedElapsedSeconds,
        wpm: snapshot.wpm
      }
    ].slice(-90);
  };

  const createResult = (nextTypedText, elapsedSeconds) => {
    const finalStats = calculateStats(targetText, nextTypedText, elapsedSeconds);
    const speedHistory = [...speedHistoryRef.current];
    const lastSnapshot = speedHistory.at(-1);

    if (
      !lastSnapshot ||
      lastSnapshot.elapsedSeconds !== finalStats.elapsedSeconds ||
      lastSnapshot.wpm !== finalStats.wpm
    ) {
      speedHistory.push({
        elapsedSeconds: finalStats.elapsedSeconds,
        wpm: finalStats.wpm
      });
    }

    return {
      ...finalStats,
      modeLabel: getModeLabel(testType, testValue),
      speedHistory,
      targetText,
      testType
    };
  };

  const pauseWordTimer = useCallback(() => {
    if (testType !== 'words') return;
    if (!isRunning || !startedAtRef.current || hasFinishedRef.current) return;

    const elapsed = (performance.now() - startedAtRef.current) / 1000;
    accumulatedElapsedRef.current += elapsed;
    startedAtRef.current = null;
    setElapsedTime(accumulatedElapsedRef.current);
    setIsRunning(false);
    onActiveChange(false);
  }, [isRunning, onActiveChange, testType]);

  useEffect(() => {
    setTargetText(
      targetTextOverride || shuffleWords(getTargetWordCount(testType, testValue))
    );
    setTypedText('');
    setPressedKeyStates({});
    setTimeLeft(testType === 'time' ? testValue : 0);
    setElapsedTime(0);
    setIsRunning(false);
    startedAtRef.current = null;
    accumulatedElapsedRef.current = 0;
    hasStartedRef.current = false;
    hasFinishedRef.current = false;
    isTypingFocusedRef.current = true;
    setIsTypingFocused(true);
    typedTextRef.current = '';
    speedHistoryRef.current = [];
    onActiveChange(false);

    window.requestAnimationFrame(() => {
      focusInput();
    });
  }, [testType, testValue, restartKey, focusInput, onActiveChange, targetTextOverride]);

  useEffect(() => {
    typedTextRef.current = typedText;
  }, [typedText]);

  useEffect(() => {
    if (!isRunning) return undefined;

    const interval = setInterval(() => {
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      const totalElapsed =
        testType === 'words'
          ? accumulatedElapsedRef.current + elapsed
          : elapsed;
      setElapsedTime(totalElapsed);
      recordSpeedSnapshot(totalElapsed, typedTextRef.current);

      if (testType !== 'time') return;

      const nextTimeLeft = getTimeLeft(testValue, totalElapsed);
      setTimeLeft(nextTimeLeft);

      if (nextTimeLeft === 0) {
        clearInterval(interval);
        setIsRunning(false);
        onActiveChange(false);
        onFinish(createResult(typedTextRef.current, testValue));
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, onActiveChange, onFinish, targetText, testType, testValue]);

  useLayoutEffect(() => {
    const currentElement = currentLetterRef.current;
    const wordDisplay = wordDisplayRef.current;

    if (!currentElement || !wordDisplay) {
      setCaretPosition((currentPosition) =>
        currentPosition.visible
          ? { ...currentPosition, visible: false }
          : currentPosition
      );
      return;
    }

    const updateCaretPosition = () => {
      const currentRect = currentElement.getBoundingClientRect();
      const displayRect = wordDisplay.getBoundingClientRect();
      const upperScrollEdge = displayRect.top + displayRect.height * 0.28;
      const lowerScrollEdge = displayRect.top + displayRect.height * 0.68;

      if (currentRect.top < upperScrollEdge) {
        wordDisplay.scrollTop -= upperScrollEdge - currentRect.top;
      } else if (currentRect.bottom > lowerScrollEdge) {
        wordDisplay.scrollTop += currentRect.bottom - lowerScrollEdge;
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
  }, [targetText, typedText]);

  useEffect(() => {
    const handleShortcut = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isFormField =
        tagName === 'input' || tagName === 'textarea' || tagName === 'select';

      if (isFormField || event.target?.isContentEditable) {
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        tabArmedRef.current = true;
        return;
      }

      if (event.key === 'Enter' && tabArmedRef.current) {
        event.preventDefault();
        tabArmedRef.current = false;
        onRestart();
        return;
      }

      tabArmedRef.current = false;
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [onRestart]);

  useEffect(() => {
    const getKeyState = (event) => {
      if (!isTypingFocusedRef.current) return '';
      if (event.key.length !== 1) return '';

      const expectedChar = targetText[typedTextRef.current.length];
      if (expectedChar === undefined) return '';

      return event.key === expectedChar ? 'correct' : 'wrong';
    };

    const isTypingInputEvent = (event) => (
      isTypingFocusedRef.current &&
      event.target === inputRef.current
    );

    const handleKeyDown = (event) => {
      if (!isTypingInputEvent(event)) return;

      if (soundEnabled && !event.repeat) {
        playKeySound(keySoundPoolRef, audioContextRef, soundVolume, soundStyle);
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
          [event.code]: keyState
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearPressedKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearPressedKeys);
      keySoundPoolRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      keySoundPoolRef.current = [];
      audioContextRef.current?.close?.();
      audioContextRef.current = null;
    };
  }, [soundEnabled, soundStyle, soundVolume, targetText]);

  useEffect(() => {
    const blurTypingArea = () => {
      pauseWordTimer();
      isTypingFocusedRef.current = false;
      setIsTypingFocused(false);
      inputRef.current?.blur();
      wordDisplayRef.current?.blur();
    };

    const blurWhenClickingOutside = (event) => {
      if (wordDisplayRef.current?.contains(event.target)) return;
      if (keyboardRef.current?.contains(event.target)) return;
      if (event.target === inputRef.current) return;

      blurTypingArea();
    };

    document.addEventListener('pointerdown', blurWhenClickingOutside);
    window.addEventListener('blur', pauseWordTimer);
    return () => {
      document.removeEventListener('pointerdown', blurWhenClickingOutside);
      window.removeEventListener('blur', pauseWordTimer);
    };
  }, [pauseWordTimer]);

  const applyTypedValue = (value) => {
    if (testType === 'time' && timeLeft === 0) return;
    if (hasFinishedRef.current) return;
    if (!isTypingFocusedRef.current) {
      return;
    }

    const currentTypedText = typedTextRef.current;

    if (!hasStartedRef.current && value.length > 0) {
      startedAtRef.current = performance.now();
      hasStartedRef.current = true;
      speedHistoryRef.current = [{ elapsedSeconds: 0, wpm: 0 }];
      setIsRunning(true);
      onActiveChange(true);
      onStart({ testType, testValue });
    } else if (
      testType === 'words' &&
      hasStartedRef.current &&
      !isRunning &&
      value !== currentTypedText
    ) {
      startedAtRef.current = performance.now();
      setIsRunning(true);
      onActiveChange(true);
    }

    const nextTypedText = getNextTypedText(
      targetText,
      currentTypedText,
      value,
      mistakeMode !== 'strict'
    );
    typedTextRef.current = nextTypedText;
    setTypedText(nextTypedText);

    if (
      testType === 'words' &&
      nextTypedText.length === targetText.length &&
      isLastWordFullyCorrect(targetText, nextTypedText)
    ) {
      const currentRunElapsed = startedAtRef.current
        ? (performance.now() - startedAtRef.current) / 1000
        : 0;
      const elapsed = accumulatedElapsedRef.current + currentRunElapsed;
      hasFinishedRef.current = true;
      accumulatedElapsedRef.current = elapsed;
      setElapsedTime(elapsed);
      setIsRunning(false);
      onActiveChange(false);
      recordSpeedSnapshot(elapsed, nextTypedText);
      onFinish(createResult(nextTypedText, elapsed));
    }
  };

  useEffect(() => {
    const focusTypingFromKey = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isFormField =
        tagName === 'input' || tagName === 'textarea' || tagName === 'select';

      if (isTypingFocusedRef.current) return;
      if (isFormField || event.target?.isContentEditable) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Tab' || event.key === 'Escape') return;

      focusInput();

      if (event.key.length === 1) {
        event.preventDefault();
        applyTypedValue(`${typedTextRef.current}${event.key}`);
      }
    };

    window.addEventListener('keydown', focusTypingFromKey, { capture: true });
    return () => {
      window.removeEventListener('keydown', focusTypingFromKey, { capture: true });
    };
  }, [focusInput, applyTypedValue]);

  const handleChange = (event) => {
    if (!isTypingFocusedRef.current) {
      event.target.value = typedText;
      return;
    }

    applyTypedValue(event.target.value);
  };

  const handleWordDisplayKeyDown = (event) => {
    if (
      [
        ' ',
        'ArrowDown',
        'ArrowUp',
        'End',
        'Home',
        'PageDown',
        'PageUp',
        'Spacebar'
      ].includes(event.key)
    ) {
      event.preventDefault();
    }

    focusInput();
  };

  return (
    <motion.main
      className="test-shell"
      data-test-type={testType}
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      {isReplay && (
        <div className="replay-badge" aria-label="Repeated game">
          <span className="replay-icon" aria-hidden="true" />
          <span>Repeated</span>
        </div>
      )}

      <motion.div
        className={[
          'word-display',
          isIdle ? 'idle' : '',
          isTypingFocused ? 'typing-focused' : '',
          !isTypingFocused ? 'typing-unfocused' : '',
          isRunning ? 'caret-active' : 'caret-idle'
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDown={(event) => {
          event.preventDefault();
          focusInput();
        }}
        onKeyDown={handleWordDisplayKeyDown}
        data-onboarding-target="typing"
        ref={wordDisplayRef}
        role="button"
        tabIndex="0"
      >
        {!isTypingFocused && (
          <div className="focus-prompt" aria-hidden="true">
            <span className="focus-pointer" />
            <span>Click here or press any key to focus</span>
          </div>
        )}

        <span
          className="typing-caret"
          style={{
            height: `${caretPosition.height}px`,
            left: `${caretPosition.left}px`,
            top: `${caretPosition.top}px`
          }}
          aria-hidden="true"
          data-visible={caretPosition.visible && isTypingFocused}
        />

        {wordTokens.map((word) => (
          <span className="word" key={word.id}>
            {word.letters.map(({ char, index }) => {
              const typedChar = typedText[index];
              const isCurrent = index === typedText.length;
              let className = 'letter';

              if (typedChar !== undefined) {
                className += typedChar === char ? ' correct' : ' wrong';
              }

              if (isCurrent) {
                className += ' current';
              }

              return (
                <span
                  className={className}
                  key={`${char}-${index}`}
                  ref={isCurrent ? currentLetterRef : null}
                >
                  {char}
                </span>
              );
            })}

            {word.space && (
              <span
                className={
                  word.space.index === typedText.length
                    ? 'word-space current'
                    : 'word-space'
                }
                ref={word.space.index === typedText.length ? currentLetterRef : null}
              >
                {' '}
              </span>
            )}
          </span>
        ))}
      </motion.div>

      <textarea
        aria-label="Typing input"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="hidden-input"
        onChange={handleChange}
        onBlur={() => {
          pauseWordTimer();
          isTypingFocusedRef.current = false;
          setIsTypingFocused(false);
          wordDisplayRef.current?.blur();
        }}
        onDrop={(event) => event.preventDefault()}
        onPaste={(event) => event.preventDefault()}
        readOnly={!isTypingFocused}
        ref={inputRef}
        spellCheck="false"
        value={typedText}
      />

      {showKeyboard && (
        <VisualKeyboard
          keyboardRef={keyboardRef}
          pressedKeyStates={pressedKeyStates}
          pressedKeys={pressedKeys}
        />
      )}

      <ShortcutHints />
    </motion.main>
  );
}

export default TypingTest;

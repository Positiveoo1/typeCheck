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

function playKeySound(audioContextRef) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) return;

  if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
    audioContextRef.current = new AudioContext();
  }

  const audioContext = audioContextRef.current;
  const startSound = () => {
    const now = audioContext.currentTime;
    const output = audioContext.createGain();
    const clickGain = audioContext.createGain();
    const thockGain = audioContext.createGain();
    const noiseBuffer = audioContext.createBuffer(
      1,
      Math.floor(audioContext.sampleRate * 0.018),
      audioContext.sampleRate
    );
    const noiseData = noiseBuffer.getChannelData(0);

    for (let index = 0; index < noiseData.length; index += 1) {
      const fade = 1 - index / noiseData.length;
      noiseData[index] = (Math.random() * 2 - 1) * fade;
    }

    const click = audioContext.createBufferSource();
    const clickFilter = audioContext.createBiquadFilter();
    const thock = audioContext.createOscillator();

    output.gain.setValueAtTime(0.72, now);
    output.connect(audioContext.destination);

    click.buffer = noiseBuffer;
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(2600 + Math.random() * 420, now);
    clickFilter.Q.setValueAtTime(1.8, now);

    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.105, now + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);

    thock.type = 'triangle';
    thock.frequency.setValueAtTime(165 + Math.random() * 26, now);
    thock.frequency.exponentialRampToValueAtTime(92, now + 0.044);

    thockGain.gain.setValueAtTime(0.0001, now);
    thockGain.gain.exponentialRampToValueAtTime(0.04, now + 0.006);
    thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.052);

    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(output);

    thock.connect(thockGain);
    thockGain.connect(output);

    click.start(now);
    click.stop(now + 0.026);
    thock.start(now);
    thock.stop(now + 0.056);
  };

  if (audioContext.state === 'suspended') {
    audioContext.resume().then(startSound).catch(() => {});
    return;
  }

  startSound();
}

function VisualKeyboard({ keyboardRef, pressedKeys }) {
  return (
    <div className="visual-keyboard" aria-hidden="true" ref={keyboardRef}>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={`row-${rowIndex}`}>
          {row.map((key) => (
            <span
              className={[
                'keyboard-key',
                key.size ? `keyboard-key-${key.size}` : '',
                pressedKeys.has(key.code) ? 'pressed' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              key={key.code}
            >
              {key.label}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function ShortcutHints() {
  const primaryKey =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? 'Cmd'
      : 'Ctrl';
  const hint = { label: 'restart', keys: [primaryKey, 'Enter'] };

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
  targetTextOverride
}) {
  const [targetText, setTargetText] = useState(() =>
    targetTextOverride || shuffleWords(getTargetWordCount(testType, testValue))
  );
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState(testType === 'time' ? testValue : 0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isTypingFocused, setIsTypingFocused] = useState(false);
  const [pressedKeys, setPressedKeys] = useState(() => new Set());
  const [caretPosition, setCaretPosition] = useState({
    height: 0,
    left: 0,
    top: 0,
    visible: false
  });
  const inputRef = useRef(null);
  const wordDisplayRef = useRef(null);
  const keyboardRef = useRef(null);
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

  useEffect(() => {
    currentLetterRef.current?.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'smooth'
    });
  }, [typedText]);

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

      setCaretPosition({
        height: currentRect.height,
        left: currentRect.left - displayRect.left + wordDisplay.scrollLeft - 2,
        top: currentRect.top - displayRect.top + wordDisplay.scrollTop,
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
    const handleKeyDown = (event) => {
      if (!event.repeat) {
        playKeySound(audioContextRef);
      }

      setPressedKeys((currentKeys) => {
        if (currentKeys.has(event.code)) return currentKeys;

        const nextKeys = new Set(currentKeys);
        nextKeys.add(event.code);
        return nextKeys;
      });
    };

    const handleKeyUp = (event) => {
      setPressedKeys((currentKeys) => {
        if (!currentKeys.has(event.code)) return currentKeys;

        const nextKeys = new Set(currentKeys);
        nextKeys.delete(event.code);
        return nextKeys;
      });
    };

    const clearPressedKeys = () => {
      setPressedKeys(new Set());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearPressedKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearPressedKeys);
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

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

    const nextTypedText = getNextTypedText(targetText, currentTypedText, value);
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

  return (
    <motion.main
      className="test-shell"
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
        onKeyDown={focusInput}
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

      <VisualKeyboard keyboardRef={keyboardRef} pressedKeys={pressedKeys} />

      <ShortcutHints />
    </motion.main>
  );
}

export default TypingTest;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import {
  buildWordTokens,
  calculateStats,
  getModeLabel,
  getNextTypedText,
  getTargetWordCount,
  getTimeLeft,
  shuffleWords
} from '../typingLogic.js';

function TypingTest({
  testType,
  testValue,
  onFinish,
  restartKey,
  restartPulse,
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
  const inputRef = useRef(null);
  const wordDisplayRef = useRef(null);
  const currentLetterRef = useRef(null);
  const typedTextRef = useRef('');
  const startedAtRef = useRef(null);
  const accumulatedElapsedRef = useRef(0);
  const isTypingFocusedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const hasFinishedRef = useRef(false);
  const tabArmedRef = useRef(false);
  const speedHistoryRef = useRef([]);
  const restartControls = useAnimationControls();

  const elapsedSeconds =
    typedText.length === 0
      ? 0
      : elapsedTime;

  const stats = useMemo(
    () => calculateStats(targetText, typedText, elapsedSeconds),
    [elapsedSeconds, targetText, typedText]
  );
  const wordTokens = useMemo(() => buildWordTokens(targetText), [targetText]);
  const isIdle = typedText.length === 0 && !isRunning;

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
    isTypingFocusedRef.current = false;
    setIsTypingFocused(false);
    typedTextRef.current = '';
    speedHistoryRef.current = [];
    onActiveChange(false);
  }, [testType, testValue, restartKey, onActiveChange, targetTextOverride]);

  useEffect(() => {
    if (restartPulse === 0) return;

    restartControls.start({
      rotate: [0, -7, 7, 0],
      scale: [1, 0.94, 1.04, 1],
      transition: { duration: 0.38, ease: 'easeOut' }
    });
  }, [restartControls, restartPulse]);

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
    const blurTypingArea = () => {
      pauseWordTimer();
      isTypingFocusedRef.current = false;
      setIsTypingFocused(false);
      inputRef.current?.blur();
      wordDisplayRef.current?.blur();
    };

    const blurWhenClickingOutside = (event) => {
      if (wordDisplayRef.current?.contains(event.target)) return;
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

  const handleChange = (event) => {
    if (testType === 'time' && timeLeft === 0) return;
    if (hasFinishedRef.current) return;
    if (!isTypingFocusedRef.current) {
      event.target.value = typedText;
      return;
    }

    const value = event.target.value;
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
      value !== typedText
    ) {
      startedAtRef.current = performance.now();
      setIsRunning(true);
      onActiveChange(true);
    }

    const nextTypedText = getNextTypedText(targetText, typedText, value);
    setTypedText(nextTypedText);

    if (testType === 'words' && nextTypedText.length === targetText.length) {
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

  const focusInput = () => {
    isTypingFocusedRef.current = true;
    setIsTypingFocused(true);
    inputRef.current?.focus();
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
      <motion.div
        className="stats-row"
        aria-label="Live typing stats"
        layout
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.055 } }
        }}
      >
        <motion.div
          layout
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <span>wpm</span>
          <strong>{stats.wpm}</strong>
        </motion.div>
        <motion.div
          layout
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <span>acc</span>
          <strong>{stats.accuracy}%</strong>
        </motion.div>
        <motion.div
          layout
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <span>mistakes</span>
          <strong>{stats.mistakes}</strong>
        </motion.div>
        <motion.div
          layout
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <span>{testType === 'time' ? 'time' : 'elapsed'}</span>
          <strong>
            {testType === 'time' ? timeLeft : elapsedTime.toFixed(1)}s
          </strong>
        </motion.div>
      </motion.div>

      <motion.div
        className={[
          'word-display',
          isIdle ? 'idle' : '',
          isTypingFocused ? 'typing-focused' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDown={(event) => {
          event.preventDefault();
          focusInput();
        }}
        onKeyDown={focusInput}
        ref={wordDisplayRef}
        role="button"
        tabIndex="0"
      >
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

      <div className="test-actions">
        <motion.button
          animate={restartControls}
          className="restart"
          onClick={onRestart}
          type="button"
          whileHover={{ y: -1, scale: 1.03 }}
          whileTap={{ scale: 0.92, rotate: -4 }}
        >
          Restart
        </motion.button>
      </div>
    </motion.main>
  );
}

export default TypingTest;

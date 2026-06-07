import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { words } from '../words.js';

const DEFAULT_WORD_COUNT = 90;

function shuffleWords(wordCount = DEFAULT_WORD_COUNT) {
  return Array.from({ length: wordCount }, () => {
    const index = Math.floor(Math.random() * words.length);
    return words[index];
  }).join(' ');
}

function calculateStats(targetText, typedText, elapsedSeconds) {
  let correctChars = 0;
  let wrongChars = 0;

  for (let index = 0; index < typedText.length; index += 1) {
    if (typedText[index] === targetText[index]) {
      correctChars += 1;
    } else {
      wrongChars += 1;
    }
  }

  const safeElapsedSeconds = Math.max(0.1, elapsedSeconds);
  const wpm = Math.round(correctChars / 5 / (safeElapsedSeconds / 60));
  const accuracy =
    typedText.length === 0
      ? 100
      : Math.round((correctChars / typedText.length) * 100);

  return {
    accuracy,
    correctChars,
    elapsedSeconds: safeElapsedSeconds,
    mistakes: wrongChars,
    wpm,
    wrongChars
  };
}

function buildWordTokens(text) {
  let charIndex = 0;

  return text.split(' ').map((word, wordIndex, wordArray) => {
    const letters = word.split('').map((char) => {
      const token = { char, index: charIndex };
      charIndex += 1;
      return token;
    });

    const space =
      wordIndex < wordArray.length - 1
        ? {
            char: ' ',
            index: charIndex++
          }
        : null;

    return {
      id: `${word}-${wordIndex}`,
      letters,
      space
    };
  });
}

function getTargetWordCount(testType, testValue) {
  return testType === 'words' ? testValue : DEFAULT_WORD_COUNT;
}

function getModeLabel(testType, testValue) {
  return testType === 'words' ? `${testValue} words` : `${testValue}s`;
}

function TypingTest({
  testType,
  testValue,
  onFinish,
  restartKey,
  restartPulse,
  onRestart,
  onStart,
  onActiveChange
}) {
  const [targetText, setTargetText] = useState(() =>
    shuffleWords(getTargetWordCount(testType, testValue))
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
  const isTypingFocusedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const hasFinishedRef = useRef(false);
  const tabArmedRef = useRef(false);
  const previousMistakesRef = useRef(0);
  const mistakeControls = useAnimationControls();
  const restartControls = useAnimationControls();

  const elapsedSeconds =
    typedText.length === 0
      ? 0
      : testType === 'time'
        ? testValue - timeLeft
        : elapsedTime;

  const stats = useMemo(
    () => calculateStats(targetText, typedText, elapsedSeconds),
    [elapsedSeconds, targetText, typedText]
  );
  const wordTokens = useMemo(() => buildWordTokens(targetText), [targetText]);
  const isIdle = typedText.length === 0 && !isRunning;

  useEffect(() => {
    setTargetText(shuffleWords(getTargetWordCount(testType, testValue)));
    setTypedText('');
    setTimeLeft(testType === 'time' ? testValue : 0);
    setElapsedTime(0);
    setIsRunning(false);
    startedAtRef.current = null;
    hasStartedRef.current = false;
    hasFinishedRef.current = false;
    isTypingFocusedRef.current = false;
    setIsTypingFocused(false);
    typedTextRef.current = '';
    previousMistakesRef.current = 0;
    onActiveChange(false);
  }, [testType, testValue, restartKey, onActiveChange]);

  useEffect(() => {
    if (stats.mistakes > previousMistakesRef.current) {
      mistakeControls.start({
        x: [0, -10, 9, -6, 4, 0],
        transition: { duration: 0.34, ease: 'easeOut' }
      });
    }

    previousMistakesRef.current = stats.mistakes;
  }, [mistakeControls, stats.mistakes]);

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
      setElapsedTime(elapsed);

      if (testType !== 'time') return;

      const nextTimeLeft = Math.max(0, testValue - Math.floor(elapsed));
      setTimeLeft(nextTimeLeft);

      if (nextTimeLeft === 0) {
        clearInterval(interval);
        setIsRunning(false);
        onActiveChange(false);
        onFinish(
          {
            ...calculateStats(targetText, typedTextRef.current, testValue),
            modeLabel: getModeLabel(testType, testValue),
            testType
          }
        );
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
    const blurWhenClickingOutside = (event) => {
      if (wordDisplayRef.current?.contains(event.target)) return;
      if (event.target === inputRef.current) return;

      isTypingFocusedRef.current = false;
      setIsTypingFocused(false);
      inputRef.current?.blur();
    };

    document.addEventListener('pointerdown', blurWhenClickingOutside);
    return () => {
      document.removeEventListener('pointerdown', blurWhenClickingOutside);
    };
  }, []);

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
      setIsRunning(true);
      onActiveChange(true);
      onStart({ testType, testValue });
    }

    const hasJumpedForward = value.length > typedText.length + 1;
    const nextTypedText = hasJumpedForward
      ? value.slice(0, typedText.length + 1)
      : value.slice(0, targetText.length);
    setTypedText(nextTypedText);

    if (testType === 'words' && nextTypedText.length === targetText.length) {
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      hasFinishedRef.current = true;
      setElapsedTime(elapsed);
      setIsRunning(false);
      onActiveChange(false);
      onFinish({
        ...calculateStats(targetText, nextTypedText, elapsed),
        modeLabel: getModeLabel(testType, testValue),
        testType
      });
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
          animate={mistakeControls}
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
        animate={mistakeControls}
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
          isTypingFocusedRef.current = false;
          setIsTypingFocused(false);
        }}
        onDrop={(event) => event.preventDefault()}
        onPaste={(event) => event.preventDefault()}
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

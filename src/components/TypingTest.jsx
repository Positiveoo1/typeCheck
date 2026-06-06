import { useEffect, useMemo, useRef, useState } from 'react';
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

  const safeElapsedSeconds = Math.max(1, elapsedSeconds);
  const wpm = Math.round(correctChars / 5 / (safeElapsedSeconds / 60));
  const accuracy =
    typedText.length === 0
      ? 100
      : Math.round((correctChars / typedText.length) * 100);

  return {
    accuracy,
    correctChars,
    elapsedSeconds: Math.round(safeElapsedSeconds),
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
  onRestart,
  onActiveChange
}) {
  const [targetText, setTargetText] = useState(() =>
    shuffleWords(getTargetWordCount(testType, testValue))
  );
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState(testType === 'time' ? testValue : 0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef(null);
  const currentLetterRef = useRef(null);
  const typedTextRef = useRef('');
  const startedAtRef = useRef(null);
  const tabArmedRef = useRef(false);

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

  useEffect(() => {
    setTargetText(shuffleWords(getTargetWordCount(testType, testValue)));
    setTypedText('');
    setTimeLeft(testType === 'time' ? testValue : 0);
    setElapsedTime(0);
    setIsRunning(false);
    startedAtRef.current = null;
    typedTextRef.current = '';
    onActiveChange(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [testType, testValue, restartKey, onActiveChange]);

  useEffect(() => {
    typedTextRef.current = typedText;
  }, [typedText]);

  useEffect(() => {
    if (!isRunning) return undefined;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsedTime(elapsed);

      if (testType !== 'time') return;

      const nextTimeLeft = Math.max(0, testValue - elapsed);
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
      inline: 'nearest'
    });
  }, [typedText]);

  useEffect(() => {
    const handleShortcut = (event) => {
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

  const handleChange = (event) => {
    if (testType === 'time' && timeLeft === 0) return;

    const value = event.target.value;
    if (!isRunning && value.length > 0) {
      startedAtRef.current = Date.now();
      setIsRunning(true);
      onActiveChange(true);
    }

    const nextTypedText = value.slice(0, targetText.length);
    setTypedText(nextTypedText);

    if (testType === 'words' && nextTypedText.length === targetText.length) {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
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
    inputRef.current?.focus();
  };

  return (
    <main className="test-shell">
      <div className="stats-row" aria-label="Live typing stats">
        <div>
          <span>wpm</span>
          <strong>{stats.wpm}</strong>
        </div>
        <div>
          <span>acc</span>
          <strong>{stats.accuracy}%</strong>
        </div>
        <div>
          <span>mistakes</span>
          <strong>{stats.mistakes}</strong>
        </div>
        <div>
          <span>{testType === 'time' ? 'time' : 'elapsed'}</span>
          <strong>
            {testType === 'time' ? timeLeft : Math.round(elapsedTime)}s
          </strong>
        </div>
      </div>

      <div
        className="word-display"
        onClick={focusInput}
        onKeyDown={focusInput}
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
      </div>

      <textarea
        aria-label="Typing input"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="hidden-input"
        onChange={handleChange}
        ref={inputRef}
        spellCheck="false"
        value={typedText}
      />

      <div className="test-actions">
        <button className="restart" onClick={onRestart} type="button">
          Restart
        </button>
      </div>
    </main>
  );
}

export default TypingTest;

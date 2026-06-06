import { useCallback, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import Header from './components/Header.jsx';
import Results from './components/Results.jsx';
import TestSettings from './components/TestSettings.jsx';
import TypingTest from './components/TypingTest.jsx';

function App() {
  const [testType, setTestType] = useState('time');
  const [timeMode, setTimeMode] = useState(30);
  const [wordMode, setWordMode] = useState(10);
  const [restartKey, setRestartKey] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState(null);
  const [restartPulse, setRestartPulse] = useState(0);

  const finishTest = useCallback((nextResult) => {
    const bestKey = `typecheck-best-${nextResult.testType}-${nextResult.modeLabel}`;
    let previousBest = 0;

    try {
      previousBest = Number(localStorage.getItem(bestKey)) || 0;
    } catch {
      previousBest = 0;
    }

    const isPersonalBest = nextResult.wpm > previousBest;

    if (isPersonalBest && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(bestKey, String(nextResult.wpm));
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
    }

    setResult({
      ...nextResult,
      bestWpm: Math.max(previousBest, nextResult.wpm),
      isPersonalBest
    });
  }, []);

  const restart = useCallback(() => {
    setRestartPulse((pulse) => pulse + 1);
    setResult(null);
    setIsActive(false);
    setRestartKey((key) => key + 1);
  }, []);

  const handleSettingsChange = (nextType, nextValue) => {
    setTestType(nextType);
    if (nextType === 'time') {
      setTimeMode(nextValue);
    } else {
      setWordMode(nextValue);
    }

    setResult(null);
    setRestartKey((key) => key + 1);
  };

  return (
    <LayoutGroup>
      <motion.div className="app" layout>
        <Header />

        <TestSettings
          disabled={isActive}
          onSettingsChange={handleSettingsChange}
          selectedType={testType}
          selectedValue={testType === 'time' ? timeMode : wordMode}
        />

        <AnimatePresence mode="wait">
          {result ? (
            <Results key="results" onRestart={restart} stats={result} />
          ) : (
            <TypingTest
              key="test"
              onActiveChange={setIsActive}
              onFinish={finishTest}
              onRestart={restart}
              restartPulse={restartPulse}
              restartKey={restartKey}
              testType={testType}
              testValue={testType === 'time' ? timeMode : wordMode}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}

export default App;

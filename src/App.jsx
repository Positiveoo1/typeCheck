import { useCallback, useState } from 'react';
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

  const restart = useCallback(() => {
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
    <div className="app">
      <Header />

      <TestSettings
        disabled={isActive}
        onSettingsChange={handleSettingsChange}
        selectedType={testType}
        selectedValue={testType === 'time' ? timeMode : wordMode}
      />

      {result ? (
        <Results onRestart={restart} stats={result} />
      ) : (
        <TypingTest
          onActiveChange={setIsActive}
          onFinish={setResult}
          onRestart={restart}
          restartKey={restartKey}
          testType={testType}
          testValue={testType === 'time' ? timeMode : wordMode}
        />
      )}
    </div>
  );
}

export default App;

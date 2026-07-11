import { AnimatePresence, motion } from 'framer-motion';
import LanguagePicker from './LanguagePicker.jsx';
import Results from './Results.jsx';
import TestSettings from './TestSettings.jsx';
import TypingTest from './TypingTest.jsx';

function TestPage({
  customText,
  effectiveSoundStyle,
  finishTest,
  handleCustomTextChange,
  handleLanguageChange,
  handleSettingsChange,
  handleTestStart,
  handleTrainingModeChange,
  isActive,
  mistakeMode,
  onActiveChange,
  restart,
  restartKey,
  result,
  showKeyboard,
  soundEnabled,
  soundVolume,
  testType,
  timeMode,
  language,
  trainingMode,
  tryAgain,
  wordMode,
  replayTargetText
}) {
  return (
    <motion.div
      key="test-page"
      className="home-page"
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <AnimatePresence initial={false}>
        {!result && (
          <motion.div
            data-onboarding-target="settings"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <TestSettings
              customText={customText}
              disabled={isActive}
              onCustomTextChange={handleCustomTextChange}
              onSettingsChange={handleSettingsChange}
              onTrainingModeChange={handleTrainingModeChange}
              selectedType={testType}
              selectedTrainingMode={trainingMode}
              selectedValue={testType === 'time' ? timeMode : wordMode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {result ? (
          <Results
            key="results"
            onNextGame={restart}
            onTryAgain={tryAgain}
            stats={result}
          />
        ) : (
          <motion.div
            key="test"
            className="test-runner"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <LanguagePicker
              disabled={isActive}
              onLanguageChange={handleLanguageChange}
              selectedLanguage={language}
            />
            <TypingTest
              onActiveChange={onActiveChange}
              onFinish={finishTest}
              onRestart={restart}
              onStart={handleTestStart}
              mistakeMode={mistakeMode}
              restartKey={restartKey}
              showKeyboard={showKeyboard}
              soundEnabled={soundEnabled}
              soundStyle={effectiveSoundStyle}
              soundVolume={soundVolume}
              testType={testType}
              testValue={testType === 'time' ? timeMode : wordMode}
              targetTextOverride={replayTargetText}
              customText={customText}
              language={language}
              trainingMode={trainingMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TestPage;

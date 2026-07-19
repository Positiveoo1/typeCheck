import { motion } from 'framer-motion';
import KeyboardHeatmap from './KeyboardHeatmap.jsx';
import ShortcutHints from '../test/components/ShortcutHints.jsx';
import WordDisplay from '../test/components/WordDisplay.jsx';
import { useCaretPosition } from '../test/hooks/useCaretPosition.js';
import { usePressedKeys } from '../test/hooks/usePressedKeys.js';
import { useTypingEngine } from '../test/hooks/useTypingEngine.js';

const ACCURACY_LOCK_MISTAKE_LIMIT = 5;

function TypingTest({
  customText,
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
  targetTextOverride,
  language = 'english',
  trainingMode = 'standard'
}) {
  const engine = useTypingEngine({
    customText,
    language,
    mistakeMode,
    onActiveChange,
    onFinish,
    onRestart,
    onStart,
    restartKey,
    targetTextOverride,
    testType,
    testValue,
    trainingMode
  });

  const caretPosition = useCaretPosition(engine.currentLetterRef, engine.wordDisplayRef, [
    engine.targetText,
    engine.typedText
  ]);

  const { pressedKeys, pressedKeyStates } = usePressedKeys({
    inputRef: engine.inputRef,
    isTypingFocusedRef: engine.isTypingFocusedRef,
    soundEnabled,
    soundStyle,
    soundVolume,
    targetText: engine.targetText,
    typedTextRef: engine.typedTextRef
  });

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
      {engine.isReplay && (
        <div className="replay-badge" aria-label="Repeated game">
          <span className="replay-icon" aria-hidden="true" />
          <span>Repeated</span>
        </div>
      )}

      <WordDisplay
        activeTrainingMode={engine.activeTrainingMode}
        accuracyLockMistakeLimit={ACCURACY_LOCK_MISTAKE_LIMIT}
        caretPosition={caretPosition}
        currentLetterRef={engine.currentLetterRef}
        currentMistakes={engine.currentMistakes}
        isAccuracyLock={engine.isAccuracyLock}
        isIdle={engine.isIdle}
        isReplay={engine.isReplay}
        isRunning={engine.isRunning}
        isTypingFocused={engine.isTypingFocused}
        onFocus={engine.focusInput}
        onKeyDown={engine.handleWordDisplayKeyDown}
        targetText={engine.targetText}
        trainingMode={trainingMode}
        typedText={engine.typedText}
        wordDisplayRef={engine.wordDisplayRef}
        wordTokens={engine.wordTokens}
      />

      <textarea
        aria-label="Typing input"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="hidden-input"
        onChange={engine.handleChange}
        onBlur={engine.handleInputBlur}
        onDrop={(event) => event.preventDefault()}
        onPaste={(event) => event.preventDefault()}
        readOnly={!engine.isTypingFocused}
        ref={engine.inputRef}
        spellCheck="false"
        value={engine.typedText}
      />

      {showKeyboard && (
        <KeyboardHeatmap
          keyboardRef={engine.keyboardRef}
          mode="live"
          pressedKeyStates={pressedKeyStates}
          pressedKeys={pressedKeys}
        />
      )}

      <ShortcutHints />
    </motion.main>
  );
}

export default TypingTest;
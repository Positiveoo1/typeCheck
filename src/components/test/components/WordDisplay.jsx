import {
  getUnresolvedSpaceMistakeIndex,
  getWordStateClassName
} from '../utils/wordDisplayHelpers.js';

function WordDisplay({
  activeTrainingMode,
  caretPosition,
  currentLetterRef,
  currentMistakes,
  isAccuracyLock,
  isIdle,
  isReplay,
  isRunning,
  isTypingFocused,
  onFocus,
  onKeyDown,
  targetText,
  trainingMode,
  typedText,
  wordDisplayRef,
  wordTokens,
  accuracyLockMistakeLimit
}) {
  const unresolvedSpaceMistakeIndex = getUnresolvedSpaceMistakeIndex(
    targetText,
    typedText
  );

  return (
    <div
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
        onFocus();
      }}
      onKeyDown={onKeyDown}
      data-onboarding-target="typing"
      data-training-mode={trainingMode}
      ref={wordDisplayRef}
      role="button"
      tabIndex="0"
    >
      <span className="typing-caps-lock" aria-live="polite">
        Caps Lock is on
      </span>

      {trainingMode !== 'standard' && !isReplay && (
        <div
          className="training-badge"
          aria-label={`${activeTrainingMode.label} training mode`}
        >
          <span>{activeTrainingMode.shortLabel}</span>
          {isAccuracyLock && (
            <strong>
              {Math.max(0, accuracyLockMistakeLimit - currentMistakes)} left
            </strong>
          )}
        </div>
      )}

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
        <span
          className={getWordStateClassName(
            word,
            typedText.length,
            typedText,
            unresolvedSpaceMistakeIndex
          )}
          key={word.id}
        >
          {word.letters.map(({ char, index }) => {
            const isAfterUnresolvedSpaceMistake =
              unresolvedSpaceMistakeIndex !== -1 && index > unresolvedSpaceMistakeIndex;
            const typedChar = isAfterUnresolvedSpaceMistake
              ? undefined
              : typedText[index];
            const isCurrent =
              unresolvedSpaceMistakeIndex === -1 && index === typedText.length;
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

          {word.space &&
            (() => {
              const typedSpaceChar = typedText[word.space.index];
              const isWrongSpace =
                typedSpaceChar !== undefined && typedSpaceChar !== ' ';
              const isCurrent = word.space.index === typedText.length || isWrongSpace;
              const wrongSpaceText = isWrongSpace
                ? typedText.slice(word.space.index)
                : '';

              return (
                <span
                  className={[
                    'word-space',
                    isWrongSpace ? 'wrong current' : '',
                    !isWrongSpace && isCurrent ? 'current' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  ref={isCurrent ? currentLetterRef : null}
                >
                  {isWrongSpace ? wrongSpaceText : ' '}
                </span>
              );
            })()}
        </span>
      ))}
    </div>
  );
}

export default WordDisplay;
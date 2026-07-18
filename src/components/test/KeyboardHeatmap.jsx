import { memo } from 'react';

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
    { code: 'KeyM', label: 'm' },
    { code: 'Space', label: 'space', size: 'extra' }
  ]
];

function getMistakeLevel(count, peakCount) {
  if (!count || peakCount <= 0) return '';

  const intensity = count / peakCount;
  if (intensity >= 0.75) return 'mistake-level-4';
  if (intensity >= 0.5) return 'mistake-level-3';
  if (intensity >= 0.25) return 'mistake-level-2';

  return 'mistake-level-1';
}

function KeyboardHeatmap({
  keyboardRef,
  keyMistakeCounts = {},
  mode = 'live',
  pressedKeyStates = {},
  pressedKeys = new Set()
}) {
  const isMistakeMode = mode === 'mistakes';
  const maxMistakeCount = Math.max(
    0,
    ...Object.values(keyMistakeCounts)
      .map((value) => Number(value) || 0)
  );

  return (
    <div
      aria-hidden={isMistakeMode ? undefined : 'true'}
      className={[
        'visual-keyboard',
        isMistakeMode ? 'visual-keyboard-results' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      ref={keyboardRef}
      role={isMistakeMode ? 'img' : undefined}
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={`row-${rowIndex}`}>
          {row.map((key) => {
            const keyState = pressedKeyStates[key.code];
            const mistakeCount = Number(keyMistakeCounts[key.code]) || 0;
            const keyClassName = [
              'keyboard-key',
              key.size ? `keyboard-key-${key.size}` : '',
              !isMistakeMode && pressedKeys.has(key.code) ? 'pressed' : '',
              !isMistakeMode && keyState ? `pressed-${keyState}` : '',
              isMistakeMode ? 'keyboard-key-mistake' : '',
              isMistakeMode ? getMistakeLevel(mistakeCount, maxMistakeCount) : ''
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <span
                className={keyClassName}
                key={key.code}
                title={
                  isMistakeMode
                    ? `${mistakeCount} mistakes`
                    : undefined
                }
              >
                <span>{key.label}</span>
                {isMistakeMode && mistakeCount > 0 && (
                  <small>{mistakeCount}</small>
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default memo(KeyboardHeatmap);

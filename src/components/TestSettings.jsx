const TIME_MODES = [15, 30, 60];
const WORD_MODES = [10, 30, 60];

function TestSettings({ selectedType, selectedValue, onSettingsChange, disabled }) {
  return (
    <section className="settings" aria-label="Test settings">
      <div className="settings-row">
        <span className="settings-label">time</span>
        <div className="mode-group" role="group" aria-label="Choose time mode">
          {TIME_MODES.map((mode) => (
            <button
              className={
                selectedType === 'time' && mode === selectedValue
                  ? 'mode active'
                  : 'mode'
              }
              disabled={disabled}
              key={mode}
              onClick={() => onSettingsChange('time', mode)}
              type="button"
            >
              {mode}s
            </button>
          ))}
        </div>
      </div>

      <div className="settings-divider" aria-hidden="true" />

      <div className="settings-row">
        <span className="settings-label">words</span>
        <div className="mode-group" role="group" aria-label="Choose word count">
          {WORD_MODES.map((mode) => (
            <button
              className={
                selectedType === 'words' && mode === selectedValue
                  ? 'mode active'
                  : 'mode'
              }
              disabled={disabled}
              key={mode}
              onClick={() => onSettingsChange('words', mode)}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TestSettings;

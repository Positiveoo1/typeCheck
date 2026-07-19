function ShortcutHints() {
  const hint = { label: 'restart', keys: ['Esc'] };

  return (
    <section
      className="shortcut-hints"
      aria-label="Keyboard shortcuts"
      data-onboarding-target="restart-shortcut"
    >
      <div className="shortcut-chip">
        <strong>{hint.label}</strong>
        <span className="shortcut-keys">
          {hint.keys.map((key) => (
            <kbd key={key}>{key}</kbd>
          ))}
        </span>
      </div>
    </section>
  );
}

export default ShortcutHints;
function MaterialIcon({ children, className = 'material-icon' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export function KeyboardIcon() {
  return (
    <MaterialIcon>
      <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2ZM8 8h2v2H8V8Zm0 3h2v2H8v-2Zm-3-3h2v2H5V8Zm0 3h2v2H5v-2Zm10 6H9v-2h6v2Zm0-4h-2v-2h2v2Zm0-3h-2V8h2v2Zm4 3h-2v-2h2v2Zm0-3h-2V8h2v2Z" />
    </MaterialIcon>
  );
}

export function DashboardIcon() {
  return (
    <MaterialIcon>
      <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />
    </MaterialIcon>
  );
}

export function EmojiEventsIcon() {
  return (
    <MaterialIcon>
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H8v2h8v-2h-3v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2ZM5 8V7h2v3.82A3.01 3.01 0 0 1 5 8Zm14 0c0 1.3-.84 2.42-2 2.82V7h2v1Z" />
    </MaterialIcon>
  );
}

export function PaletteIcon() {
  return (
    <MaterialIcon>
      <path d="M12 3C7.03 3 3 6.58 3 11c0 3.31 2.69 6 6 6h1.5c.83 0 1.5.67 1.5 1.5S12.67 20 13.5 20H15c3.31 0 6-2.69 6-6 0-6.08-4.03-11-9-11ZM6.5 11C5.67 11 5 10.33 5 9.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11Zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7Zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4 16 4.67 16 5.5 15.33 7 14.5 7Zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8 19 8.67 19 9.5 18.33 11 17.5 11Z" />
    </MaterialIcon>
  );
}

export function PersonIcon() {
  return (
    <MaterialIcon>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
    </MaterialIcon>
  );
}

export function SettingsIcon() {
  return (
    <MaterialIcon className="material-icon settings-material-icon">
      <path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.28 7.28 0 0 0-1.69-.98L14.5 2.42A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.5.42L9.12 5.07c-.61.24-1.18.56-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46c-.12.22-.07.49.12.64l2.11 1.65c-.04.32-.08.65-.08.98s.03.66.08.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.13.22.39.31.61.22l2.49-1c.51.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.61-.25 1.18-.58 1.69-.98l2.49 1c.23.08.48 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
    </MaterialIcon>
  );
}

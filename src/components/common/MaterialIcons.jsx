function MaterialIcon({ children, className = 'material-icon' }) {
  return (
    <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 24 24">
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

export function GlobeIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 9h-3.04a15.64 15.64 0 0 0-1.15-5.16A8.03 8.03 0 0 1 18.93 11ZM12 4.04c.83 1.2 1.54 3.1 1.84 5.04H10.16C10.46 7.14 11.17 5.24 12 4.04ZM4.26 13h3.85c.12 1.53.46 3.02.98 4.25A8.03 8.03 0 0 1 4.26 13Zm3.85-2H4.26a8.03 8.03 0 0 1 4.83-4.25A15.3 15.3 0 0 0 8.11 11ZM12 19.96c-.83-1.2-1.54-3.1-1.84-5.04h3.68C13.54 16.86 12.83 18.76 12 19.96Zm2.25-7.04h-4.5a13.76 13.76 0 0 1 0-1.84h4.5a13.76 13.76 0 0 1 0 1.84Zm.66 4.33c.52-1.23.86-2.72.98-4.25h3.85a8.03 8.03 0 0 1-4.83 4.25Z" />
    </MaterialIcon>
  );
}

export function ReplayIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M12 5V2L7 7l5 5V8c2.76 0 5 2.24 5 5a5 5 0 0 1-8.66 3.4l-1.42 1.42A7 7 0 1 0 12 5Z" />
    </MaterialIcon>
  );
}

export function ArrowForwardIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="m12 4-1.41 1.41L15.17 10H4v2h11.17l-4.58 4.59L12 18l7-7-7-7Z" />
    </MaterialIcon>
  );
}

export function CloseIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M18.3 5.71 16.89 4.3 12 9.17 7.11 4.3 5.7 5.71 10.59 10.6 5.7 15.49l1.41 1.41L12 12.01l4.89 4.89 1.41-1.41-4.89-4.89 4.89-4.89Z" />
    </MaterialIcon>
  );
}

export function LoginIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59ZM19 3H5c-1.1 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Z" />
    </MaterialIcon>
  );
}

export function PersonAddIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm-8-2V7H4V5h3V2h2v3h3v2H9v3H7Zm8 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
    </MaterialIcon>
  );
}

export function TimerIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M15 1H9v2h6V1Zm-2 13h-2V8h2v6Zm-1-10a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
    </MaterialIcon>
  );
}

export function TextFieldsIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M2.5 4v3h5v13h3V7h5V4h-13Zm19 5h-9v3h3v8h3v-8h3V9Z" />
    </MaterialIcon>
  );
}

export function TuneIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M3 17v2h6v-2H3Zm0-12v2h10V5H3Zm10 16v-2h8v-2h-8v-2h-2v6h2ZM7 9v2H3v2h4v2h2V9H7Zm14 4v-2H11v2h10Zm-6-4h2V7h4V5h-4V3h-2v6Z" />
    </MaterialIcon>
  );
}

export function LockIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm3 9.73V18h-2v-1.27A2 2 0 1 1 13 16.73Z" />
    </MaterialIcon>
  );
}

export function CodeIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4Zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4Z" />
    </MaterialIcon>
  );
}

export function NumbersIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="m20 10 .5-2H17l.75-3H15.7l-.75 3h-4l.75-3H9.65L8.9 8H5l-.5 2h3.9l-1 4H4l-.5 2h3.4l-.75 3H8.2l.75-3h4l-.75 3h2.05l.75-3H19l.5-2h-4l1-4H20Zm-6.55 4h-4l1-4h4l-1 4Z" />
    </MaterialIcon>
  );
}

export function QuoteIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M7.17 6C4.74 7.38 3.5 9.04 3.5 11.35V18h7v-7h-4c0-1.31.74-2.42 2.5-3.44L7.17 6Zm10 0c-2.43 1.38-3.67 3.04-3.67 5.35V18h7v-7h-4c0-1.31.74-2.42 2.5-3.44L17.17 6Z" />
    </MaterialIcon>
  );
}

export function StarIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
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
      <path d="M12 3C7.03 3 3 6.58 3 11c0 3.31 2.69 6 6 6h1.5c.83 0 1.5.67 1.5 1.5S12.67 20 13.5 20H15c3.31 0 6-2.69 6-6 0-6.08-4.03-11-9-11ZM6.5 11C5.67 11 5 10.33 5 9.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11.6.6 11Zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7Zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4 16 4.67 16 5.5 15.33 7 14.5 7Zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8 19 8.67 19 9.5 18.33 11 17.5 11Z" />
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

export function VisibilityIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </MaterialIcon>
  );
}

export function VisibilityOffIcon({ className = 'material-icon' } = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M2.1 3.16 3.37 1.9 22.1 20.63l-1.27 1.27-3.1-3.1A12.13 12.13 0 0 1 12 20C7 20 2.73 16.89 1 12a13.36 13.36 0 0 1 4.12-5.22L2.1 3.16ZM7.53 9.2A5 5 0 0 0 12 17a5 5 0 0 0 2.8-.86l-2.04-2.04A3 3 0 0 1 9.9 11.24L7.53 9.2ZM12 4c5 0 9.27 3.11 11 8a13.4 13.4 0 0 1-3.33 4.53l-2.84-2.84A5 5 0 0 0 10.31 7.17L8.15 5.01A12.07 12.07 0 0 1 12 4Zm0 3a5 5 0 0 1 5 5c0 .43-.05.84-.16 1.23l-1.7-1.7A3 3 0 0 0 12.47 8.86l-1.7-1.7C11.16 7.05 11.57 7 12 7Z" />
    </MaterialIcon>
  );
}

export function SettingsIcon({
  className = 'material-icon settings-material-icon'
} = {}) {
  return (
    <MaterialIcon className={className}>
      <path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.28 7.28 0 0 0-1.69-.98L14.5 2.42A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.5.42L9.12 5.07c-.61.24-1.18.56-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46c-.12.22-.07.49.12.64l2.11 1.65c-.04.32-.08.65-.08.98s.03.66.08.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.13.22.39.31.61.22l2.49-1c.51.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.61-.25 1.18-.58 1.69-.98l2.49 1c.23.08.48 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
    </MaterialIcon>
  );
}

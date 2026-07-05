import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { createId } from '../../appState.js';

const TOAST_LIFETIME_MS = 4200;

export function ToastStack({ onDismiss, toasts }) {
  return (
    <div className="toast-region" aria-live="polite" aria-label="Notifications">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            className={`toast toast-${toast.type}`}
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 28, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 28, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div>
              <strong>{toast.title}</strong>
              {toast.message && <span>{toast.message}</span>}
            </div>
            <button
              aria-label={`Dismiss ${toast.title}`}
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              x
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((toastId) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
  }, []);

  const notify = useCallback(
    ({ message = '', title, type = 'info' }) => {
      const toastId = createId();

      setToasts((currentToasts) =>
        [
          ...currentToasts,
          {
            id: toastId,
            message,
            title,
            type
          }
        ].slice(-4)
      );

      window.setTimeout(() => {
        dismissToast(toastId);
      }, TOAST_LIFETIME_MS);
    },
    [dismissToast]
  );

  return {
    dismissToast,
    notify,
    toasts
  };
}

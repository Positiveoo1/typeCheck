import { AnimatePresence, motion } from 'framer-motion';

function SignOutConfirmModal({ isOpen, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="auth-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <button
            aria-label="Close sign out confirmation"
            className="auth-gate-backdrop"
            onClick={onCancel}
            type="button"
          />
          <motion.section
            className="confirm-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <p className="eyebrow">account</p>
            <h2>Sign out?</h2>
            <p className="confirm-copy">
              Your saved typing performance stays in your account.
            </p>
            <div className="confirm-actions">
              <button className="confirm-secondary" onClick={onCancel} type="button">
                Cancel
              </button>
              <button className="confirm-primary" onClick={onConfirm} type="button">
                Sign out
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SignOutConfirmModal;

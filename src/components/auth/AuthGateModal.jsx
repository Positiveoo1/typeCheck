import { AnimatePresence, motion } from 'framer-motion';
import { Suspense } from 'react';

function AuthGateModal({ AuthPanel, isOpen, notify, onClose, onSuccess }) {
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
            aria-label="Close sign in prompt"
            className="auth-gate-backdrop"
            onClick={onClose}
            type="button"
          />
          <Suspense fallback={null}>
            <AuthPanel
              className="auth-panel auth-panel-modal"
              message="Sign in to save results and view your typing performance."
              onNotify={notify}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          </Suspense>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AuthGateModal;

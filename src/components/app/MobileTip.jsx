import { AnimatePresence, motion } from 'framer-motion';

function MobileTip({ currentPage, isVisible, onDismiss }) {
  return (
    <AnimatePresence>
      {isVisible && currentPage === 'test' && (
        <motion.div
          className="mobile-tip"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <span>Best with a physical keyboard. Mobile testing still works.</span>
          <button
            aria-label="Dismiss mobile typing tip"
            onClick={onDismiss}
            type="button"
          >
            x
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MobileTip;

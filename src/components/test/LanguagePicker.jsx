import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { LANGUAGES, getLanguage } from '../../languages.js';
import { GlobeIcon } from '../common/MaterialIcons.jsx';

function LanguagePicker({
  disabled = false,
  onLanguageChange,
  selectedLanguage = 'english'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeLanguage = getLanguage(selectedLanguage);

  const openPicker = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const selectLanguage = (languageId) => {
    onLanguageChange(languageId);
    setIsOpen(false);
  };

  return (
    <>
      <div className="language-picker" aria-label="Typing language">
        <button
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="language-trigger "
          disabled={disabled}
          onClick={openPicker}
          title="Choose language"
          type="button"
        >
          <GlobeIcon />
          <span>{activeLanguage.label}</span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            aria-modal="true"
            className="language-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <button
              aria-label="Close language picker"
              className="language-modal-backdrop"
              onClick={() => setIsOpen(false)}
              type="button"
            />
            <motion.section
              aria-label="Choose typing language"
              className="language-modal-panel"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {LANGUAGES.map((language) => (
                <button
                  className={
                    selectedLanguage === language.id
                      ? 'language-option active'
                      : 'language-option'
                  }
                  key={language.id}
                  onClick={() => selectLanguage(language.id)}
                  type="button"
                >
                  <span>{language.label}</span>
                  <strong>{language.shortLabel}</strong>
                </button>
              ))}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LanguagePicker;

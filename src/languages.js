import { englishWords } from './languages/english.js';
import { frenchWords } from './languages/french.js';
import { polishWords } from './languages/polish.js';
import { russianWords } from './languages/russian.js';
import { spanishWords } from './languages/spanish.js';
import { uzbekWords } from './languages/uzbek.js';

export const LANGUAGES = [
  {
    id: 'english',
    label: 'English',
    shortLabel: 'en',
    words: englishWords
  },
  {
    id: 'uzbek',
    label: 'Uzbek',
    shortLabel: 'uz',
    words: uzbekWords
  },
  {
    id: 'polish',
    label: 'Polish',
    shortLabel: 'pl',
    words: polishWords
  },
  {
    id: 'spanish',
    label: 'Spanish',
    shortLabel: 'es',
    words: spanishWords
  },
  {
    id: 'russian',
    label: 'Russian',
    shortLabel: 'ru',
    words: russianWords
  },
  {
    id: 'french',
    label: 'French',
    shortLabel: 'fr',
    words: frenchWords
  }
];

export const DEFAULT_LANGUAGE = 'english';

export function getLanguage(languageId) {
  return LANGUAGES.find((language) => language.id === languageId) || LANGUAGES[0];
}

export function getLanguageIds() {
  return LANGUAGES.map((language) => language.id);
}

export function getWordListForLanguage(languageId) {
  return getLanguage(languageId).words;
}

export function getLanguageModeLabel(languageId) {
  const language = getLanguage(languageId);

  return language.id === DEFAULT_LANGUAGE ? '' : language.label.toLowerCase();
}

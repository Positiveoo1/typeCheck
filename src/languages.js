import { words } from './words.js';

export const uzbekWords = [
  'aka',
  'anor',
  'ariq',
  'asal',
  'avval',
  'ayol',
  'aziz',
  'bahor',
  'baliq',
  'baraka',
  'bayram',
  'besh',
  'bilim',
  'bola',
  'bog',
  'bozor',
  'bugun',
  'bulut',
  'buloq',
  'daraxt',
  'daryo',
  'daftar',
  'dala',
  'dam',
  'doira',
  'doim',
  'dost',
  'eshik',
  'ertalab',
  'ertak',
  'farzand',
  'foyda',
  'gul',
  'hafta',
  'hayot',
  'havo',
  'hovli',
  'ijod',
  'ikki',
  'ish',
  'ism',
  'javob',
  'joy',
  'kitob',
  'kocha',
  'kok',
  'kulgi',
  'kun',
  'kuz',
  'maktab',
  'maydon',
  'mehnat',
  'mehmon',
  'mehr',
  'non',
  'ona',
  'ota',
  'oy',
  'oila',
  'olam',
  'olma',
  'oltin',
  'osmon',
  'ovqat',
  'paxta',
  'piyola',
  'qalam',
  'qish',
  'qiz',
  'quloq',
  'qum',
  'qush',
  'quyosh',
  'rang',
  'reja',
  'rost',
  'sabr',
  'sahifa',
  'salom',
  'savol',
  'sayohat',
  'sevinch',
  'sinf',
  'soat',
  'sohil',
  'soy',
  'suhbat',
  'suv',
  'tabiat',
  'taom',
  'tez',
  'tin',
  'tong',
  'tosh',
  'tuproq',
  'uy',
  'ustoz',
  'vaqt',
  'vatan',
  'xabar',
  'xona',
  'yaxshi',
  'yil',
  'yol',
  'yomgir',
  'yulduz',
  'yurak',
  'zamin'
];

export const LANGUAGES = [
  {
    id: 'english',
    label: 'English',
    shortLabel: 'en',
    words
  },
  {
    id: 'uzbek',
    label: 'Uzbek',
    shortLabel: 'uz',
    words: uzbekWords
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

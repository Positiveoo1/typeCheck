import { shuffleWords } from './typingLogic.js';
import { words } from './words.js';

export const TRAINING_MODES = [
  {
    id: 'standard',
    label: 'Standard',
    shortLabel: 'standard',
    description: 'Balanced common words.'
  },
  {
    id: 'weak',
    label: 'Weak letters',
    shortLabel: 'weak',
    description: 'Awkward letters and same-hand patterns.'
  },
  {
    id: 'quotes',
    label: 'Quotes',
    shortLabel: 'quotes',
    description: 'Capital letters, commas, and sentence rhythm.'
  },
  {
    id: 'code',
    label: 'Code',
    shortLabel: 'code',
    description: 'Developer-style symbols and casing.'
  },
  {
    id: 'numbers',
    label: 'Numbers',
    shortLabel: 'numbers',
    description: 'Digits, punctuation, and compact tokens.'
  },
  {
    id: 'accuracy-lock',
    label: 'Accuracy lock',
    shortLabel: 'lock',
    description: 'The run ends at five live mistakes.'
  },
  {
    id: 'custom',
    label: 'Custom',
    shortLabel: 'custom',
    description: 'Practice with your own text.'
  }
];

const WEAK_WORDS = [
  'quiz',
  'quick',
  'jazz',
  'fuzzy',
  'oxygen',
  'vivid',
  'awkward',
  'zigzag',
  'buzz',
  'pixel',
  'queue',
  'syntax',
  'object',
  'jumper',
  'vortex',
  'boxing',
  'zebra',
  'query',
  'wax',
  'complex',
  'keyboard',
  'public',
  'value',
  'private',
  'glyph',
  'hyphen',
  'jinx',
  'jockey',
  'luxury',
  'matrix',
  'opaque',
  'proxy',
  'rhythm',
  'sphinx',
  'squeeze',
  'twelfth',
  'wizard',
  'zephyr'
];

const QUOTES = [
  'Small steps, typed cleanly, become speed later.',
  'Focus is a quiet room you build one word at a time.',
  'Fast hands are useful; calm hands are dangerous.',
  'Practice does not need drama, only a return key.',
  'Accuracy first, velocity follows.',
  'The cleanest run begins before the first key moves.',
  'Slow is smooth until smooth becomes fast.',
  'Every missed letter is a useful little map.',
  'Good rhythm is built from patient repeats.',
  'Speed arrives when attention stops rushing.'
];

const CODE_SNIPPETS = [
  'const total = items.reduce((sum, item) => sum + item.count, 0);',
  'function formatUser(name) { return name.trim().toLowerCase(); }',
  'if (event.key === "Enter") submitForm(event);',
  'export const config = { retries: 3, cache: false };',
  'users.filter((user) => user.active).map((user) => user.email);',
  'const isReady = status === "idle" && queue.length > 0;',
  'try { await saveDraft(formData); } catch (error) { notify(error); }',
  'return items.slice(0, limit).sort((a, b) => a.rank - b.rank);',
  'const route = `/users/${user.id}/settings`;',
  'button.addEventListener("click", () => setOpen(true));'
];

const NUMBER_TOKENS = [
  '404',
  '12.8',
  '2026',
  '64%',
  '$19',
  '7/10',
  '3,200',
  '0.95',
  '#42',
  '18:30',
  'v2.1',
  '99+',
  '8-bit',
  '120ms',
  '5-4',
  '1,024',
  '200',
  '302',
  '0.25',
  '75%',
  '$49',
  '2/3',
  '6:45',
  '#108',
  '16px',
  '24/7',
  '1.618',
  '10x',
  '60fps',
  '256mb',
  '9-0'
];

function shuffleList(list, random = Math.random) {
  const nextList = [...list];

  for (let index = nextList.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [nextList[index], nextList[randomIndex]] = [nextList[randomIndex], nextList[index]];
  }

  return nextList;
}

function buildRepeatedShuffledText(textList, wordCount, random = Math.random) {
  const sourceTexts = [...new Set(textList)].filter(Boolean);
  const nextWords = [];

  if (wordCount <= 0 || sourceTexts.length === 0) return '';

  while (nextWords.length < wordCount) {
    const shuffledTexts = shuffleList(sourceTexts, random);

    shuffledTexts.forEach((text) => {
      if (nextWords.length >= wordCount) return;
      nextWords.push(...text.split(/\s+/).filter(Boolean));
    });
  }

  return nextWords.slice(0, wordCount).join(' ');
}

export function normalizeCustomText(customText) {
  return String(customText || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCustomTarget({
  customText = '',
  testType = 'time',
  testValue = 30
} = {}) {
  const normalizedText = normalizeCustomText(customText);

  if (!normalizedText) {
    return buildTrainingTarget({ testType, testValue, trainingMode: 'standard' });
  }

  return normalizedText;
}

export function getTrainingMode(modeId) {
  return (
    TRAINING_MODES.find((mode) => mode.id === modeId) ||
    TRAINING_MODES[0]
  );
}

export function getTrainingModeIds() {
  return TRAINING_MODES.map((mode) => mode.id);
}

export function getTrainingModeLabel(modeId) {
  return getTrainingMode(modeId).shortLabel;
}

export function buildTrainingTarget({
  customText = '',
  random = Math.random,
  testType = 'time',
  testValue = 30,
  trainingMode = 'standard'
} = {}) {
  const wordCount = testType === 'words' ? testValue : 90;

  if (trainingMode === 'custom') {
    return buildCustomTarget({ customText, testType, testValue });
  }

  if (trainingMode === 'weak') {
    return shuffleWords(wordCount, WEAK_WORDS, random);
  }

  if (trainingMode === 'quotes') {
    return buildRepeatedShuffledText(QUOTES, wordCount, random);
  }

  if (trainingMode === 'code') {
    return buildRepeatedShuffledText(CODE_SNIPPETS, wordCount, random);
  }

  if (trainingMode === 'numbers') {
    return shuffleWords(wordCount, NUMBER_TOKENS, random);
  }

  return shuffleWords(wordCount, words, random);
}

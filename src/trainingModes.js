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
  'private'
];

const QUOTES = [
  'Small steps, typed cleanly, become speed later.',
  'Focus is a quiet room you build one word at a time.',
  'Fast hands are useful; calm hands are dangerous.',
  'Practice does not need drama, only a return key.',
  'Accuracy first, velocity follows.'
];

const CODE_SNIPPETS = [
  'const total = items.reduce((sum, item) => sum + item.count, 0);',
  'function formatUser(name) { return name.trim().toLowerCase(); }',
  'if (event.key === "Enter") submitForm(event);',
  'export const config = { retries: 3, cache: false };',
  'users.filter((user) => user.active).map((user) => user.email);'
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
  '1,024'
];

function repeatToWordCount(text, wordCount) {
  const sourceWords = text.split(/\s+/).filter(Boolean);
  const nextWords = [];

  while (nextWords.length < wordCount) {
    nextWords.push(...sourceWords);
  }

  return nextWords.slice(0, wordCount).join(' ');
}

function shuffleList(list, random = Math.random) {
  const nextList = [...list];

  for (let index = nextList.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [nextList[index], nextList[randomIndex]] = [nextList[randomIndex], nextList[index]];
  }

  return nextList;
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
  random = Math.random,
  testType = 'time',
  testValue = 30,
  trainingMode = 'standard'
} = {}) {
  const wordCount = testType === 'words' ? testValue : 90;

  if (trainingMode === 'weak') {
    return shuffleWords(wordCount, WEAK_WORDS, random);
  }

  if (trainingMode === 'quotes') {
    return repeatToWordCount(
      shuffleList(QUOTES, random).join(' '),
      wordCount
    );
  }

  if (trainingMode === 'code') {
    return repeatToWordCount(
      shuffleList(CODE_SNIPPETS, random).join(' '),
      wordCount
    );
  }

  if (trainingMode === 'numbers') {
    return shuffleWords(wordCount, NUMBER_TOKENS, random);
  }

  return shuffleWords(wordCount, words, random);
}

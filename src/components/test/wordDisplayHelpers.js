export function isLastWordFullyCorrect(targetText, typedText) {
  const lastWordStart = targetText.lastIndexOf(' ') + 1;

  return typedText.slice(lastWordStart) === targetText.slice(lastWordStart);
}

export function getUnresolvedSpaceMistakeIndex(targetText, typedText) {
  for (let index = 0; index < typedText.length; index += 1) {
    if (targetText[index] === ' ' && typedText[index] !== ' ') {
      return index;
    }
  }

  return -1;
}

export function getWordStateClassName(
  word,
  typedLength,
  typedText,
  unresolvedSpaceMistakeIndex
) {
  const firstLetterIndex = word.letters[0]?.index ?? word.space?.index ?? 0;
  const lastLetterIndex = word.letters.at(-1)?.index ?? firstLetterIndex;
  const wordEndIndex = word.space?.index ?? lastLetterIndex + 1;
  const hasWrongSpace =
    word.space &&
    typedText[word.space.index] !== undefined &&
    typedText[word.space.index] !== ' ';

  if (
    unresolvedSpaceMistakeIndex !== -1 &&
    firstLetterIndex > unresolvedSpaceMistakeIndex
  ) {
    return 'word word-future';
  }

  if (typedLength < firstLetterIndex) return 'word word-future';
  if (hasWrongSpace) return 'word word-active';
  if (typedLength > wordEndIndex) return 'word word-past';

  return 'word word-active';
}
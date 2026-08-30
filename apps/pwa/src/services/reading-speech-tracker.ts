export type ReadingSpeechMatch = {
  accepted: boolean;
  matchedWordIndexes: number[];
  coverage: number;
  anchorIndex: number;
};

export type ReadingSpeechAlignmentOptions = {
  maxForwardWords?: number;
  minCoverage?: number;
};

export function normalizeReadingWord(value: string): string {
  return value.toLocaleLowerCase('en').replace(/[’]/g, "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function tokenizeReadingSpeech(value: string): string[] {
  return value.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.map(normalizeReadingWord).filter(Boolean) ?? [];
}

export function alignReadingSpeech(referenceWords: readonly string[], transcript: string, anchorIndex: number, options: ReadingSpeechAlignmentOptions = {}): ReadingSpeechMatch {
  const spokenWords = tokenizeReadingSpeech(transcript);
  if (spokenWords.length < 3 || referenceWords.length === 0) return rejected(anchorIndex);
  const normalizedReference = referenceWords.map(normalizeReadingWord);
  const safeAnchor = Math.max(0, Math.min(normalizedReference.length - 1, anchorIndex));
  const searchStart = Math.max(0, safeAnchor - 120);
  // Speech chunks describe only a few nearby seconds. A very large forward
  // window lets common words match a paragraph the reader has not reached yet.
  const forwardWindow = Math.max(options.maxForwardWords ?? 24, spokenWords.length * 3);
  const searchEnd = Math.min(normalizedReference.length, safeAnchor + forwardWindow);
  const searchWords = normalizedReference.slice(searchStart, searchEnd);
  const scores = Array.from({ length: spokenWords.length + 1 }, () => new Uint16Array(searchWords.length + 1));

  for (let spokenIndex = 1; spokenIndex <= spokenWords.length; spokenIndex += 1) {
    for (let referenceIndex = 1; referenceIndex <= searchWords.length; referenceIndex += 1) {
      scores[spokenIndex]![referenceIndex] = spokenWords[spokenIndex - 1] === searchWords[referenceIndex - 1]
        ? (scores[spokenIndex - 1]![referenceIndex - 1] ?? 0) + 1
        : Math.max(scores[spokenIndex - 1]![referenceIndex] ?? 0, scores[spokenIndex]![referenceIndex - 1] ?? 0);
    }
  }

  const matchedWordIndexes: number[] = [];
  let spokenIndex = spokenWords.length;
  let referenceIndex = searchWords.length;
  while (spokenIndex > 0 && referenceIndex > 0) {
    if (spokenWords[spokenIndex - 1] === searchWords[referenceIndex - 1]) {
      matchedWordIndexes.push(searchStart + referenceIndex - 1);
      spokenIndex -= 1;
      referenceIndex -= 1;
    } else if ((scores[spokenIndex - 1]![referenceIndex] ?? 0) >= (scores[spokenIndex]![referenceIndex - 1] ?? 0)) {
      spokenIndex -= 1;
    } else {
      referenceIndex -= 1;
    }
  }
  matchedWordIndexes.reverse();

  const matchedCount = matchedWordIndexes.length;
  const coverage = matchedCount / spokenWords.length;
  const matchSpan = matchedCount > 1 ? matchedWordIndexes[matchedCount - 1]! - matchedWordIndexes[0]! + 1 : Number.POSITIVE_INFINITY;
  const accepted = matchedCount >= 3 && coverage >= (options.minCoverage ?? 0.58) && matchSpan <= spokenWords.length * 2 + 8;
  if (!accepted) return { ...rejected(anchorIndex), coverage };
  return {
    accepted: true,
    matchedWordIndexes,
    coverage,
    anchorIndex: Math.max(safeAnchor, matchedWordIndexes[matchedWordIndexes.length - 1]! + 1),
  };
}

function rejected(anchorIndex: number): ReadingSpeechMatch {
  return { accepted: false, matchedWordIndexes: [], coverage: 0, anchorIndex };
}

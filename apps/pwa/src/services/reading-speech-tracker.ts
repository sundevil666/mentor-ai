export type ReadingSpeechMatch = {
  accepted: boolean;
  matchedWordIndexes: number[];
  coverage: number;
  anchorIndex: number;
};

export type ReadingSpeechAlignmentOptions = {
  maxBackwardWords?: number;
  maxForwardWords?: number;
  minCoverage?: number;
  minMatchedWords?: number;
  minSpokenWords?: number;
};

export function normalizeReadingWord(value: string): string {
  return value.toLocaleLowerCase('en').replace(/[’]/g, "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function tokenizeReadingSpeech(value: string): string[] {
  return value.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.map(normalizeReadingWord).filter(Boolean) ?? [];
}

export function alignReadingSpeech(referenceWords: readonly string[], transcript: string, anchorIndex: number, options: ReadingSpeechAlignmentOptions = {}): ReadingSpeechMatch {
  const spokenWords = tokenizeReadingSpeech(transcript);
  if (spokenWords.length < (options.minSpokenWords ?? 3) || referenceWords.length === 0) return rejected(anchorIndex);
  const safeAnchor = Math.max(0, Math.min(referenceWords.length - 1, anchorIndex));
  const searchStart = Math.max(0, safeAnchor - (options.maxBackwardWords ?? 120));
  // Speech chunks describe only a few nearby seconds. A very large forward
  // window lets common words match a paragraph the reader has not reached yet.
  const forwardWindow = Math.max(options.maxForwardWords ?? 24, spokenWords.length * 3);
  const searchEnd = Math.min(referenceWords.length, safeAnchor + forwardWindow);
  // A personal book can contain tens of thousands of words. Normalizing the
  // entire book for every 1.5-second transcript blocked iPad taps for seconds.
  // Alignment only consumes this bounded nearby window, so normalize only it.
  const searchWords = referenceWords.slice(searchStart, searchEnd).map(normalizeReadingWord);
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
  const ordinarySpan = matchSpan <= spokenWords.length * 2 + 8;
  // Tablet Whisper often recognizes the right phrase while omitting names or
  // merging several words. Keep the ordinary guard for weak matches, but let a
  // longer, high-confidence phrase survive so the nearby-word bound can remove
  // backward/forward outliers before anything is highlighted.
  const highConfidenceTabletSpan = options.minCoverage !== undefined
    && matchedCount >= 6
    && coverage >= 0.65
    && matchSpan <= spokenWords.length * 4 + 12;
  const accepted = matchedCount >= (options.minMatchedWords ?? 3)
    && coverage >= (options.minCoverage ?? 0.58)
    && (ordinarySpan || highConfidenceTabletSpan);
  if (!accepted) return { ...rejected(anchorIndex), coverage };
  return {
    accepted: true,
    matchedWordIndexes,
    coverage,
    anchorIndex: Math.max(safeAnchor, matchedWordIndexes[matchedWordIndexes.length - 1]! + 1),
  };
}

export function recoverReadingSpeechPosition(referenceWords: readonly string[], transcript: string, anchorIndex: number, maxRecoveryWords = 600): ReadingSpeechMatch {
  const probeStep = 16;
  let bestMatch: ReadingSpeechMatch | null = null;
  const recoveryEnd = Math.min(referenceWords.length - 1, anchorIndex + maxRecoveryWords);
  for (let probeAnchor = anchorIndex; probeAnchor <= recoveryEnd; probeAnchor += probeStep) {
    const match = alignReadingSpeech(referenceWords, transcript, probeAnchor, {
      maxBackwardWords: 8,
      maxForwardWords: 48,
      minCoverage: 0.65,
      minMatchedWords: 5,
    });
    if (!match.accepted) continue;
    if (!bestMatch || match.coverage > bestMatch.coverage
      || (match.coverage === bestMatch.coverage && match.matchedWordIndexes.length > bestMatch.matchedWordIndexes.length)) {
      bestMatch = match;
    }
  }
  return bestMatch ?? rejected(anchorIndex);
}

export function boundTabletReadingProgress(matchedWordIndexes: readonly number[], anchorIndex: number, spokenWordCount: number): number[] {
  if (!matchedWordIndexes.length || spokenWordCount <= 0) return [];
  const nearby = matchedWordIndexes.filter((wordIndex) => wordIndex >= Math.max(0, anchorIndex - 8));
  // Never fall back to an old phrase when no nearby match exists. Common words
  // can otherwise move the tablet anchor hundreds of words backwards.
  if (nearby.length < Math.min(3, spokenWordCount)) return [];
  const candidates = nearby;
  const startIndex = candidates[0]!;
  const maximumAdvance = spokenWordCount + Math.max(3, Math.ceil(spokenWordCount * 0.5));
  return candidates.filter((wordIndex) => wordIndex <= startIndex + maximumAdvance);
}

export function confirmTabletReadingWordIndexes(matchedWordIndexes: readonly number[], anchorIndex: number, spokenWordCount: number, minConfirmedWords = 3): number[] {
  const bounded = boundTabletReadingProgress(matchedWordIndexes, anchorIndex, spokenWordCount);
  if (bounded.length < minConfirmedWords) return [];
  const confirmed = new Set(bounded);
  const firstIndex = bounded[0]!;
  // Whisper often loses one or two boundary words between consecutive audio
  // chunks. A nearby match immediately after the old anchor confirms that tiny
  // bridge without crediting an arbitrary unread range.
  if (firstIndex >= anchorIndex && firstIndex - anchorIndex <= 2) {
    for (let wordIndex = anchorIndex; wordIndex < firstIndex; wordIndex += 1) confirmed.add(wordIndex);
  }
  // Recover only tiny holes bracketed by words Whisper matched in this chunk.
  // Larger gaps remain uncredited because the reader may really have skipped.
  for (let index = 1; index < bounded.length; index += 1) {
    const previous = bounded[index - 1]!;
    const current = bounded[index]!;
    if (current - previous > 3) continue;
    for (let wordIndex = previous + 1; wordIndex < current; wordIndex += 1) confirmed.add(wordIndex);
  }
  return [...confirmed].sort((left, right) => left - right);
}

function rejected(anchorIndex: number): ReadingSpeechMatch {
  return { accepted: false, matchedWordIndexes: [], coverage: 0, anchorIndex };
}

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

type ExactReadingRun = {
  referenceStart: number;
  spokenStart: number;
  length: number;
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
  const spokenWords = tokenizeReadingSpeech(transcript);
  const safeAnchor = Math.max(0, Math.min(referenceWords.length - 1, anchorIndex));
  const recoveryEnd = Math.min(referenceWords.length, safeAnchor + maxRecoveryWords + 1);
  const recoveryWords = referenceWords.slice(safeAnchor, recoveryEnd).map(normalizeReadingWord);
  const exactRun = longestExactReadingRun(recoveryWords, spokenWords);
  const exactRunStart = exactRun ? safeAnchor + exactRun.referenceStart : -1;
  const exactRunLength = exactRun?.length ?? 0;
  if (exactRun && exactRunLength >= 4) {
    const estimatedTranscriptStart = Math.max(safeAnchor, exactRunStart - exactRun.spokenStart);
    const aligned = alignReadingSpeech(referenceWords, transcript, estimatedTranscriptStart, {
      maxBackwardWords: 2,
      maxForwardWords: Math.max(64, spokenWords.length * 2),
      minCoverage: 0.42,
      minMatchedWords: 4,
    });
    const alignedIndexes = new Set(aligned.matchedWordIndexes);
    const containsTrustedRun = Array.from({ length: exactRunLength }, (_, index) => exactRunStart + index)
      .every((wordIndex) => alignedIndexes.has(wordIndex));
    if (aligned.accepted && containsTrustedRun) {
      const coherentIndexes = coherentRecoveredIndexes(
        aligned.matchedWordIndexes,
        exactRunStart,
        exactRunLength,
        spokenWords.length,
      );
      return {
        accepted: true,
        matchedWordIndexes: coherentIndexes,
        coverage: coherentIndexes.length / Math.max(1, spokenWords.length),
        anchorIndex: coherentIndexes.at(-1)! + 1,
      };
    }
  }

  // A long exact sequence is reliable even when Sherpa includes noisy words
  // before and after it. Confirm only that sequence; never paint the gap from
  // the stale anchor to the recovered phrase.
  if (exactRunStart >= 0 && exactRunLength >= 4) {
    const matchedWordIndexes = Array.from({ length: exactRunLength }, (_, index) => exactRunStart + index);
    return {
      accepted: true,
      matchedWordIndexes,
      coverage: exactRunLength / Math.max(1, spokenWords.length),
      anchorIndex: exactRunStart + exactRunLength,
    };
  }

  const probeStep = 16;
  let bestMatch: ReadingSpeechMatch | null = null;
  for (let probeAnchor = safeAnchor; probeAnchor < recoveryEnd; probeAnchor += probeStep) {
    const match = alignReadingSpeech(referenceWords, transcript, probeAnchor, {
      maxBackwardWords: 8,
      maxForwardWords: 48,
      // Four accurately recognized consecutive words are enough to relocate
      // a stale page-start anchor without waiting for a rare 5+ word chunk.
      // Requiring 80% coverage still rejects partial common-word fragments.
      minCoverage: 0.8,
      minMatchedWords: 4,
    });
    if (!match.accepted) continue;
    if (!bestMatch || match.coverage > bestMatch.coverage
      || (match.coverage === bestMatch.coverage && match.matchedWordIndexes.length > bestMatch.matchedWordIndexes.length)) {
      bestMatch = match;
    }
  }
  return bestMatch ?? rejected(anchorIndex);
}

function coherentRecoveredIndexes(indexes: readonly number[], trustedStart: number, trustedLength: number, spokenWordCount: number): number[] {
  const trustedEnd = trustedStart + trustedLength - 1;
  const maximumSpan = spokenWordCount + Math.max(8, Math.ceil(spokenWordCount * 0.25));
  const ordered = [...new Set(indexes)].sort((left, right) => left - right);
  let first = ordered.findIndex((wordIndex) => wordIndex === trustedStart);
  let last = ordered.findIndex((wordIndex) => wordIndex === trustedEnd);
  if (first < 0 || last < first) return Array.from({ length: trustedLength }, (_, index) => trustedStart + index);

  while (first > 0) {
    const candidate = ordered[first - 1]!;
    if (ordered[first]! - candidate > 3 || ordered[last]! - candidate + 1 > maximumSpan) break;
    first -= 1;
  }
  while (last + 1 < ordered.length) {
    const candidate = ordered[last + 1]!;
    if (candidate - ordered[last]! > 3 || candidate - ordered[first]! + 1 > maximumSpan) break;
    last += 1;
  }
  return ordered.slice(first, last + 1);
}

function longestExactReadingRun(referenceWords: readonly string[], spokenWords: readonly string[]): ExactReadingRun | null {
  let best: ExactReadingRun | null = null;
  for (let spokenIndex = 0; spokenIndex < spokenWords.length; spokenIndex += 1) {
    for (let referenceIndex = 0; referenceIndex < referenceWords.length; referenceIndex += 1) {
      if (spokenWords[spokenIndex] !== referenceWords[referenceIndex]) continue;
      let runLength = 1;
      while (
        spokenIndex + runLength < spokenWords.length
        && referenceIndex + runLength < referenceWords.length
        && spokenWords[spokenIndex + runLength] === referenceWords[referenceIndex + runLength]
      ) runLength += 1;
      if (!best || runLength > best.length) best = { referenceStart: referenceIndex, spokenStart: spokenIndex, length: runLength };
    }
  }
  return best;
}

export function previewTabletReadingWordIndexes(referenceWords: readonly string[], transcript: string, anchorIndex: number, maxPreviewWords = 120): number[] {
  const strict = matchSequentialReadingSpeech(referenceWords, transcript, anchorIndex);
  if (strict.accepted) return strict.matchedWordIndexes;
  const spokenWords = tokenizeReadingSpeech(transcript);
  const safeAnchor = Math.max(0, Math.min(referenceWords.length - 1, anchorIndex));
  const previewWords = referenceWords.slice(safeAnchor, safeAnchor + maxPreviewWords).map(normalizeReadingWord);
  const exactRun = longestExactReadingRun(previewWords, spokenWords);
  if (!exactRun || exactRun.length < 4) return [];
  return Array.from({ length: exactRun.length }, (_, index) => safeAnchor + exactRun.referenceStart + index);
}

export function matchReadingSpeechAtAnchor(referenceWords: readonly string[], transcript: string, anchorIndex: number): ReadingSpeechMatch {
  const spokenWords = tokenizeReadingSpeech(transcript);
  if (spokenWords.length !== 1 || anchorIndex < 0 || anchorIndex >= referenceWords.length) return rejected(anchorIndex);
  if (normalizeReadingWord(referenceWords[anchorIndex] ?? '') !== spokenWords[0]) return rejected(anchorIndex);
  return {
    accepted: true,
    matchedWordIndexes: [anchorIndex],
    coverage: 1,
    anchorIndex: anchorIndex + 1,
  };
}

export function matchSequentialReadingSpeech(referenceWords: readonly string[], transcript: string, anchorIndex: number): ReadingSpeechMatch {
  const spokenWords = tokenizeReadingSpeech(transcript);
  if (!spokenWords.length || anchorIndex < 0 || anchorIndex >= referenceWords.length) return rejected(anchorIndex);

  const matchedWordIndexes: number[] = [];
  for (let spokenIndex = 0; spokenIndex < spokenWords.length; spokenIndex += 1) {
    const wordIndex = anchorIndex + spokenIndex;
    if (wordIndex >= referenceWords.length) break;
    if (normalizeReadingWord(referenceWords[wordIndex] ?? '') !== spokenWords[spokenIndex]) break;
    matchedWordIndexes.push(wordIndex);
  }

  if (!matchedWordIndexes.length) return rejected(anchorIndex);
  return {
    accepted: true,
    matchedWordIndexes,
    coverage: matchedWordIndexes.length / spokenWords.length,
    anchorIndex: matchedWordIndexes.at(-1)! + 1,
  };
}

export function previewBrowserReadingWordIndexes(referenceWords: readonly string[], transcript: string, anchorIndex: number): number[] {
  return matchSequentialReadingSpeech(referenceWords, transcript, anchorIndex).matchedWordIndexes;
}

export function stableReadingInterimPrefix(previousTranscript: string, currentTranscript: string): string[] {
  const previousWords = tokenizeReadingSpeech(previousTranscript);
  const currentWords = tokenizeReadingSpeech(currentTranscript);
  const stableWords: string[] = [];
  const maximumLength = Math.min(previousWords.length, currentWords.length);
  for (let index = 0; index < maximumLength; index += 1) {
    if (previousWords[index] !== currentWords[index]) break;
    stableWords.push(currentWords[index]!);
  }
  return stableWords;
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

export function activeReadingHighlightIndexes(confirmedWordIndexes: readonly number[], maximumWords = 12): number[] {
  const ordered = [...new Set(confirmedWordIndexes)].sort((left, right) => left - right);
  if (!ordered.length || maximumWords <= 0) return [];
  const active: number[] = [ordered.at(-1)!];
  for (let index = ordered.length - 2; index >= 0 && active.length < maximumWords; index -= 1) {
    const wordIndex = ordered[index]!;
    if (active[0]! - wordIndex > 2) break;
    active.unshift(wordIndex);
  }
  return active;
}

function rejected(anchorIndex: number): ReadingSpeechMatch {
  return { accepted: false, matchedWordIndexes: [], coverage: 0, anchorIndex };
}

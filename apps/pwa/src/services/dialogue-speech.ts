const smallNumberWords = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const tensNumberWords = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
// Speech recognition can write the same spoken word in either spelling.
const spellingVariants: Record<string, string> = {
  analyse: 'analyze',
  cancelled: 'canceled',
  centre: 'center',
  colour: 'color',
  favourite: 'favorite',
  grey: 'gray',
  honour: 'honor',
  neighbour: 'neighbor',
  organise: 'organize',
  realise: 'realize',
  theatre: 'theater',
  travelling: 'traveling',
};

function integerToWords(value: number): string[] {
  if (value < 20) return [smallNumberWords[value]!];
  if (value < 100) {
    const remainder = value % 10;
    return [tensNumberWords[Math.floor(value / 10)]!, ...(remainder ? integerToWords(remainder) : [])];
  }
  if (value < 1_000) {
    const remainder = value % 100;
    return [...integerToWords(Math.floor(value / 100)), 'hundred', ...(remainder ? integerToWords(remainder) : [])];
  }
  if (value < 1_000_000) {
    const remainder = value % 1_000;
    return [...integerToWords(Math.floor(value / 1_000)), 'thousand', ...(remainder ? integerToWords(remainder) : [])];
  }
  return [String(value)];
}

function normalizeWord(word: string): string[] {
  const normalized = word.toLocaleLowerCase('en');
  if (/^\d{1,3}(?:,\d{3})*$/.test(normalized)) {
    return integerToWords(Number(normalized.replaceAll(',', '')));
  }
  return [spellingVariants[normalized] ?? normalized];
}

function words(text: string): string[] {
  const expanded = text.toLocaleLowerCase('en')
    .replace(/\bgonna\b/g, 'going to')
    .replace(/\bwanna\b/g, 'want to')
    .replace(/\b(he|she|it|that|there|who|what|where|when|why|how)'d\b/g, '$1 would')
    .replace(/\b(i|you|we|they)'d\b/g, '$1 would')
    .replace(/\b(he|she|it|that|there|who|what|where|when|why|how)'s\b/g, '$1 is')
    .replace(/\b(i|you|we|they)'re\b/g, '$1 are')
    .replace(/\b(i|you|we|they)'ve\b/g, '$1 have')
    .replace(/\b(i|you|he|she|it|we|they)'ll\b/g, '$1 will')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\b([a-z]+)n't\b/g, '$1 not');
  return (expanded.match(/[a-z]+(?:'[a-z]+)?|\d{1,3}(?:,\d{3})*|\d+/g) ?? [])
    .flatMap(normalizeWord);
}

export interface DialogueExpectedSegment {
  text: string;
  matched: boolean | null;
}

export function resolveDialogueExpectedText(exercise: {
  audioText?: string;
  expectedResponse?: string;
} | null | undefined): string {
  return exercise?.audioText?.trim() || exercise?.expectedResponse?.trim() || '';
}

export function getDialogueExpectedSegments(transcript: string, expected: string): DialogueExpectedSegment[] {
  const expectedMatches = [...expected.matchAll(/[a-z]+(?:'[a-z]+)?|\d{1,3}(?:,\d{3})*|\d+/gi)];
  if (!expectedMatches.length) return expected ? [{ text: expected, matched: null }] : [];

  const target = expectedMatches.flatMap((match) => words(match[0]));
  const heard = words(transcript);
  const matchedTargetIndexes = findOrderedMatches(target, heard);
  const segments: DialogueExpectedSegment[] = [];
  let cursor = 0;

  let targetIndex = 0;
  expectedMatches.forEach((match) => {
    const start = match.index ?? cursor;
    if (start > cursor) segments.push({ text: expected.slice(cursor, start), matched: null });
    const normalized = words(match[0]);
    segments.push({ text: match[0], matched: normalized.every((_, index) => matchedTargetIndexes.has(targetIndex + index)) });
    targetIndex += normalized.length;
    cursor = start + match[0].length;
  });

  if (cursor < expected.length) segments.push({ text: expected.slice(cursor), matched: null });
  return segments;
}

function findOrderedMatches(target: string[], heard: string[]): Set<number> {
  const lengths = Array.from({ length: target.length + 1 }, () => Array<number>(heard.length + 1).fill(0));
  for (let targetIndex = target.length - 1; targetIndex >= 0; targetIndex -= 1) {
    for (let heardIndex = heard.length - 1; heardIndex >= 0; heardIndex -= 1) {
      lengths[targetIndex][heardIndex] = target[targetIndex] === heard[heardIndex]
        ? 1 + (lengths[targetIndex + 1]?.[heardIndex + 1] ?? 0)
        : Math.max(lengths[targetIndex + 1]?.[heardIndex] ?? 0, lengths[targetIndex]?.[heardIndex + 1] ?? 0);
    }
  }

  const matches = new Set<number>();
  let targetIndex = 0;
  let heardIndex = 0;
  while (targetIndex < target.length && heardIndex < heard.length) {
    if (target[targetIndex] === heard[heardIndex]) {
      matches.add(targetIndex);
      targetIndex += 1;
      heardIndex += 1;
    } else if ((lengths[targetIndex + 1]?.[heardIndex] ?? 0) >= (lengths[targetIndex]?.[heardIndex + 1] ?? 0)) {
      targetIndex += 1;
    } else {
      heardIndex += 1;
    }
  }
  return matches;
}

export function dialogueAnswerCoverage(transcript: string, expected: string): number {
  const heard = new Set(words(transcript));
  const target = words(expected);
  if (!target.length) return 0;
  return target.filter((word) => heard.has(word)).length / target.length;
}

export function isConfidentDialogueAnswer(transcript: string, expected: string): boolean {
  const heard = words(transcript);
  const target = words(expected);
  if (!heard.length || !target.length) return false;
  const coverage = dialogueAnswerCoverage(transcript, expected);
  const extraWords = heard.filter((word) => !target.includes(word)).length;
  return coverage >= (target.length <= 12 ? 1 : 0.9) && extraWords <= 1;
}

export function dialoguePreviewStatus(transcript: string, expected: string, isFinal: boolean): 'idle' | 'correct' | 'incorrect' {
  if (!transcript.trim()) return 'idle';
  if (isConfidentDialogueAnswer(transcript, expected)) return 'correct';
  return isFinal ? 'incorrect' : 'idle';
}

export function chooseBestDialogueTranscript(current: string, candidate: string, expected: string): string {
  if (!current.trim()) return candidate.trim();
  const currentScore = dialogueAnswerCoverage(current, expected);
  const candidateScore = dialogueAnswerCoverage(candidate, expected);
  if (candidateScore !== currentScore) return candidateScore > currentScore ? candidate.trim() : current.trim();
  const targetLength = words(expected).length;
  const currentDistance = Math.abs(words(current).length - targetLength);
  const candidateDistance = Math.abs(words(candidate).length - targetLength);
  return candidateDistance < currentDistance ? candidate.trim() : current.trim();
}

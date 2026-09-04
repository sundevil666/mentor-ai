const numberWords: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '13': 'thirteen',
  '14': 'fourteen',
  '15': 'fifteen',
  '16': 'sixteen',
  '17': 'seventeen',
  '18': 'eighteen',
  '19': 'nineteen',
  '20': 'twenty',
};

function normalizeWord(word: string): string {
  const normalized = word.toLocaleLowerCase('en');
  return numberWords[normalized] ?? normalized;
}

function words(text: string): string[] {
  return (text.toLocaleLowerCase('en').match(/[a-z]+(?:'[a-z]+)?|\d+/g) ?? [])
    .map(normalizeWord);
}

export interface DialogueExpectedSegment {
  text: string;
  matched: boolean | null;
}

export function getDialogueExpectedSegments(transcript: string, expected: string): DialogueExpectedSegment[] {
  const expectedMatches = [...expected.matchAll(/[a-z]+(?:'[a-z]+)?|\d+/gi)];
  if (!expectedMatches.length) return expected ? [{ text: expected, matched: null }] : [];

  const target = expectedMatches.map((match) => normalizeWord(match[0]));
  const heard = words(transcript);
  const matchedTargetIndexes = findOrderedMatches(target, heard);
  const segments: DialogueExpectedSegment[] = [];
  let cursor = 0;

  expectedMatches.forEach((match, index) => {
    const start = match.index ?? cursor;
    if (start > cursor) segments.push({ text: expected.slice(cursor, start), matched: null });
    segments.push({ text: match[0], matched: matchedTargetIndexes.has(index) });
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
  return coverage >= 0.9 && extraWords <= 1;
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

function words(text: string): string[] {
  return text.toLocaleLowerCase('en').match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
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

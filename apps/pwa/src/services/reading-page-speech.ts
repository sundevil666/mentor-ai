import { normalizeReadingWord, tokenizeReadingSpeech } from './reading-speech-tracker.js';

export interface ReadingPageWord { index: number; text: string }
export interface ReadingPageSpeechSummary {
  pageIndex: number;
  totalWords: number;
  correctWords: number;
  missedWords: { index: number; word: string }[];
}

/** The index is built once on a page turn, never for each microphone update. */
export class ReadingPageSpeech {
  private readonly positions = new Map<string, number[]>();
  private readonly matched = new Set<number>();
  private wasAttempted = false;
  readonly words: readonly ReadingPageWord[];
  readonly pageIndex: number;

  constructor(pageIndex: number, words: readonly ReadingPageWord[], previouslyMatched: readonly number[] = []) {
    this.pageIndex = pageIndex;
    this.words = words;
    const allowed = new Set(words.map((word) => word.index));
    previouslyMatched.forEach((index) => { if (allowed.has(index)) this.matched.add(index); });
    for (const word of words) {
      const key = normalizeReadingWord(word.text);
      if (!key) continue;
      const occurrences = this.positions.get(key) ?? [];
      occurrences.push(word.index);
      this.positions.set(key, occurrences);
    }
  }

  match(transcript: string): number[] {
    const heard = tokenizeReadingSpeech(transcript);
    if (heard.length) this.wasAttempted = true;
    const matches: number[] = [];
    for (const word of heard) {
      const firstUnused = this.positions.get(word)?.find((index) => !this.matched.has(index));
      if (firstUnused === undefined) continue;
      this.matched.add(firstUnused);
      matches.push(firstUnused);
    }
    return matches;
  }

  preview(transcript: string): number[] {
    const used = new Set(this.matched);
    return tokenizeReadingSpeech(transcript).flatMap((word) => {
      const firstUnused = this.positions.get(word)?.find((index) => !used.has(index));
      if (firstUnused === undefined) return [];
      used.add(firstUnused);
      return [firstUnused];
    });
  }

  get attempted(): boolean { return this.wasAttempted; }
  get matchedIndexes(): number[] { return [...this.matched]; }
  get nextIndex(): number { return this.words.find((word) => !this.matched.has(word.index))?.index ?? (this.words.at(-1)?.index ?? -1) + 1; }
  summary(): ReadingPageSpeechSummary {
    return {
      pageIndex: this.pageIndex,
      totalWords: this.words.length,
      correctWords: this.matched.size,
      missedWords: this.words.filter((word) => !this.matched.has(word.index)).map((word) => ({ index: word.index, word: word.text })),
    };
  }
}

import { normalizeReadingWord, tokenizeReadingSpeech } from './reading-speech-tracker.js';

export interface ReadingPageWord { index: number; text: string }
export interface ReadingPageSpeechSummary {
  pageIndex: number;
  totalWords: number;
  correctWords: number;
  missedWords: { index: number; word: string }[];
}

/** Match a short spoken stream against the current page only. */
export class ReadingPageSpeech {
  private readonly normalized = new Map<number, string>();
  private readonly phraseStarts = new Map<string, number[]>();
  private readonly matched = new Set<number>();
  private wasAttempted = false;
  private cursorIndex: number;
  private pendingWords: string[] = [];
  readonly words: readonly ReadingPageWord[];
  readonly pageIndex: number;

  constructor(pageIndex: number, words: readonly ReadingPageWord[], previouslyMatched: readonly number[] = []) {
    this.pageIndex = pageIndex;
    this.words = words;
    const allowed = new Set(words.map((word) => word.index));
    previouslyMatched.forEach((index) => { if (allowed.has(index)) this.matched.add(index); });
    this.cursorIndex = words.find((word) => !this.matched.has(word.index))?.index ?? (words.at(-1)?.index ?? -1) + 1;
    for (const word of words) this.normalized.set(word.index, normalizeReadingWord(word.text));
    for (const word of words) {
      const phrase = Array.from({ length: 4 }, (_, offset) => this.normalized.get(word.index + offset));
      if (phrase.some((part) => part === undefined)) continue;
      const key = phrase.join('\u0000');
      const starts = this.phraseStarts.get(key) ?? [];
      starts.push(word.index);
      this.phraseStarts.set(key, starts);
    }
  }

  match(transcript: string): number[] {
    const heard = tokenizeReadingSpeech(transcript);
    if (heard.length) this.wasAttempted = true;
    const result = this.consume(heard, this.cursorIndex, this.pendingWords, this.matched);
    this.cursorIndex = result.cursor;
    this.pendingWords = result.pending;
    return result.indexes;
  }

  preview(transcript: string): number[] {
    return this.consume(tokenizeReadingSpeech(transcript), this.cursorIndex, this.pendingWords, new Set(this.matched)).indexes;
  }

  private consume(heard: readonly string[], start: number, previousPending: readonly string[], matched: Set<number>) {
    const indexes: number[] = [];
    let cursor = start;
    let pending = [...previousPending];
    const confirm = (index: number) => {
      if (!matched.has(index)) {
        matched.add(index);
        indexes.push(index);
      }
      cursor = index + 1;
    };
    for (const word of heard) {
      if (this.normalized.get(cursor) === word) {
        confirm(cursor);
        pending = [];
        continue;
      }
      let recovered = false;
      const precedingWord = pending.at(-1);
      if (precedingWord) {
        // A single familiar word ahead is weak evidence. Two consecutive words
        // may confirm a tiny skipped gap, leaving that gap uncredited.
        for (let gap = 1; gap <= 2; gap += 1) {
          const first = cursor + gap;
          if (this.normalized.get(first) !== precedingWord || this.normalized.get(first + 1) !== word) continue;
          confirm(first);
          confirm(first + 1);
          pending = [];
          recovered = true;
          break;
        }
      }
      if (recovered) continue;
      pending.push(word);
      if (pending.length > 4) pending.shift();
      if (pending.length < 4) continue;
      // Relocate only on an unambiguous phrase from the current page. Do not
      // credit any words between the old cursor and the confirmed phrase.
      const candidates = this.phraseStarts.get(pending.join('\u0000')) ?? [];
      const candidate = candidates.findIndex((index) => index >= cursor);
      if (candidate < 0 || candidate + 1 < candidates.length) continue;
      for (let offset = 0; offset < 4; offset += 1) confirm(candidates[candidate]! + offset);
      pending = [];
    }
    return { indexes, cursor, pending };
  }

  get attempted(): boolean { return this.wasAttempted; }
  get matchedIndexes(): number[] { return [...this.matched]; }
  get nextIndex(): number { return this.cursorIndex; }
  moveTo(index: number): void {
    if (this.normalized.has(index)) {
      this.cursorIndex = index;
      this.pendingWords = [];
    }
  }
  summary(): ReadingPageSpeechSummary {
    return {
      pageIndex: this.pageIndex,
      totalWords: this.words.length,
      correctWords: this.matched.size,
      missedWords: this.words.filter((word) => !this.matched.has(word.index)).map((word) => ({ index: word.index, word: word.text })),
    };
  }
}

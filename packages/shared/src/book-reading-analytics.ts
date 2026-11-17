/** Cumulative evidence per device/book. Never sum revisions of the same row. */
export interface BookReadingAnalytics {
  version: 1;
  bookId: string;
  deviceId: string;
  revision: number;
  startedAt: string;
  updatedAt: string;
  readWords: number;
  wordLookups: number;
  passageLookups: number;
  pronunciationRequests: number;
  speechPageWords: number;
  speechMatchedWords: number;
  words: Array<{ text: string; translations: number; pronunciations: number; context?: string }>;
  passages: Array<{ text: string; count: number }>;
  unmatchedSpeechWords: string[];
  examplesTruncated: boolean;
}

export interface BookReadingAnalyticsReceipt {
  bookId: string;
  deviceId: string;
  revision: number;
}

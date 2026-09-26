import type { BookDifficultyAssessment, BookReaderDifficultyRating, PersonalReadingBook } from '@mentor-ai/shared';

export const bookDifficultyReviewIntervalMs = 7 * 24 * 60 * 60 * 1000;

export interface BookReadingReviewEvidence {
  progressRatio: number;
  lastProgressAt?: string;
  rating?: BookReaderDifficultyRating;
  now?: string;
}

export interface FreeBookRecommendation {
  title: string;
  author: string;
  targetDifficulty: number;
  sourceLabel: string;
  url: string;
}

const freeReadingLadder: FreeBookRecommendation[] = [
  { title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', targetDifficulty: 25, sourceLabel: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/11' },
  { title: 'The Wonderful Wizard of Oz', author: 'L. Frank Baum', targetDifficulty: 34, sourceLabel: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/55' },
  { title: 'The Secret Garden', author: 'Frances Hodgson Burnett', targetDifficulty: 43, sourceLabel: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/17396' },
  { title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', targetDifficulty: 52, sourceLabel: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/1661' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', targetDifficulty: 62, sourceLabel: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/1342' },
];

export function isBookDifficultyReviewDue(assessment: BookDifficultyAssessment | undefined, now = new Date()): boolean {
  if (!assessment) return false;
  const dueAt = Date.parse(assessment.nextReviewAt ?? assessment.analyzedAt) + (assessment.nextReviewAt ? 0 : bookDifficultyReviewIntervalMs);
  return Number.isFinite(dueAt) && now.getTime() >= dueAt;
}

export function applyReadingReview(
  assessment: BookDifficultyAssessment,
  evidence: BookReadingReviewEvidence,
): BookDifficultyAssessment {
  const now = evidence.now ?? new Date().toISOString();
  const progressRatio = clamp(evidence.progressRatio, 0, 1);
  const previousRatio = clamp(assessment.lastReviewedProgressRatio ?? 0, 0, 1);
  const progressDelta = Math.max(0, progressRatio - previousRatio);
  const inactiveDays = evidence.lastProgressAt
    ? Math.max(0, (Date.parse(now) - Date.parse(evidence.lastProgressAt)) / 86_400_000)
    : Infinity;
  const stalled = progressRatio > 0 && progressRatio < 0.995 && progressDelta < 0.01 && inactiveDays >= 7;
  const ratingAdjustment: Record<BookReaderDifficultyRating, number> = {
    'very-hard': 24,
    hard: 12,
    comfortable: -5,
    easy: -12,
  };
  const initialScore = assessment.initialScore ?? assessment.score;
  const evidenceScore = Math.round(clamp(
    initialScore + (evidence.rating ? ratingAdjustment[evidence.rating] : 0) + (stalled ? 10 : 0) - (progressDelta >= 0.08 ? 6 : 0),
    0,
    100,
  ));
  const score = evidence.rating === 'very-hard' ? Math.max(80, evidenceScore)
    : evidence.rating === 'hard' ? Math.max(65, evidenceScore)
      : evidence.rating === 'comfortable' ? Math.min(55, evidenceScore)
        : evidence.rating === 'easy' ? Math.min(45, evidenceScore)
          : evidenceScore;
  const recommendation = evidence.rating
    ? (evidence.rating === 'very-hard' || evidence.rating === 'hard' ? 'rewrite' : 'read')
    : score >= 58 ? 'rewrite' : 'read';
  const reasons = assessment.reasons.filter((reason) => !reason.startsWith('Weekly check:'));
  if (evidence.rating) reasons.push(`Weekly check: you rated this book ${evidence.rating.replace('-', ' ')}.`);
  if (stalled) reasons.push('Weekly check: reading progress has stalled for at least seven days.');
  else if (progressDelta >= 0.08) reasons.push(`Weekly check: you advanced ${Math.round(progressDelta * 100)}% since the previous review.`);

  return {
    ...assessment,
    score,
    initialScore,
    recommendation,
    confidence: evidence.rating || progressDelta > 0 ? 'high' : assessment.confidence,
    personalEvidenceCount: assessment.personalEvidenceCount + (evidence.rating ? 1 : 0),
    reasons,
    analyzedAt: now,
    readerRating: evidence.rating ?? assessment.readerRating,
    lastReviewedProgressRatio: progressRatio,
    nextReviewAt: new Date(Date.parse(now) + bookDifficultyReviewIntervalMs).toISOString(),
    readingState: progressRatio <= 0 ? 'not-started' : stalled ? 'stalled' : 'active',
  };
}

export function recommendNextFreeBook(currentDifficulty: number, excludedTitles: readonly string[] = []): FreeBookRecommendation | null {
  const excluded = new Set(excludedTitles.map(normalizeBookTitle));
  const target = clamp(currentDifficulty + 5, 20, 65);
  return [...freeReadingLadder]
    .filter((book) => !excluded.has(normalizeBookTitle(book.title)))
    .sort((left, right) => Math.abs(left.targetDifficulty - target) - Math.abs(right.targetDifficulty - target))[0]
    ?? null;
}

function normalizeBookTitle(title: string) {
  return title
    .toLocaleLowerCase('en')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}

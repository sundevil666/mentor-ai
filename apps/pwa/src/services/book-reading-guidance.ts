import type { BookDifficultyAssessment, BookReaderDifficultyRating, PersonalReadingBook } from '@mentor-ai/shared';
import type { ReaderBookCalibration } from './reader-book-calibration';
import type { PersonalBookAction } from './personal-book-status';

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

export function postponeBookDifficultyReview(
  assessment: BookDifficultyAssessment,
  now = new Date(),
): BookDifficultyAssessment {
  return {
    ...assessment,
    reasons: [...assessment.reasons],
    nextReviewAt: new Date(now.getTime() + bookDifficultyReviewIntervalMs).toISOString(),
  };
}

export function preserveBookLaneOnDifficultyCheck(
  assessment: BookDifficultyAssessment,
  currentAction: PersonalBookAction,
  allowPlacementChange: boolean,
): BookDifficultyAssessment {
  return allowPlacementChange ? assessment : { ...assessment, recommendation: currentAction };
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
  // Text difficulty is an objective analysis result. Reader experience is
  // stored separately and calibrates the personal level, not this score.
  const initialScore = assessment.initialScore ?? assessment.score;
  const recommendation = evidence.rating
    ? (evidence.rating === 'very-hard' ? 'rewrite' : 'read')
    : assessment.recommendation;

  return {
    ...assessment,
    score: initialScore,
    initialScore,
    recommendation,
    reasons: [...assessment.reasons],
    personalEvidenceCount: assessment.personalEvidenceCount + (evidence.rating ? 1 : 0),
    readerRating: evidence.rating ?? assessment.readerRating,
    lastReviewedProgressRatio: progressRatio,
    nextReviewAt: new Date(Date.parse(now) + bookDifficultyReviewIntervalMs).toISOString(),
    readingState: progressRatio <= 0 ? 'not-started' : stalled ? 'stalled' : 'active',
  };
}

export function recommendNextFreeBook(currentDifficulty: number, excludedTitles: readonly string[] = [], growth = 5): FreeBookRecommendation | null {
  const excluded = new Set(excludedTitles.map(normalizeBookTitle));
  const target = clamp(currentDifficulty + growth, 20, 65);
  return [...freeReadingLadder]
    .filter((book) => !excluded.has(normalizeBookTitle(book.title)))
    .sort((left, right) => Math.abs(left.targetDifficulty - target) - Math.abs(right.targetDifficulty - target))[0]
    ?? null;
}

/** Recommendations unlock from actual history, including analytics without a
 * self-rating. Sparse evidence stays near the estimate rather than pushing up.
 */
export function recommendNextBookForReader(
  calibration: ReaderBookCalibration, books: readonly PersonalReadingBook[],
): FreeBookRecommendation | null {
  if (!calibration.evidenceCount) return null;
  const candidate = recommendNextFreeBook(calibration.readerAbility, books.map((book) => book.title), calibration.confidence === 'low' ? 0 : 5);
  return candidate && candidate.targetDifficulty <= calibration.readerAbility + 7 ? candidate : null;
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

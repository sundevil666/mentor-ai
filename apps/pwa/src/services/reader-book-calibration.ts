import type { BookDifficultyAssessment, PersonalReadingBook } from '@mentor-ai/shared';
import type { PersonalBookReadingStatus } from './personal-book-status';

export type BookFitBand = 'easy' | 'good-fit' | 'stretch' | 'too-hard';

export interface ReadingFitEvidence {
  bookId: string;
  title: string;
  kind: 'rating' | 'finished' | 'progress';
  description: string;
  difficulty: number;
}

export interface ReaderBookCalibration {
  readerAbility: number;
  evidenceCount: number;
  confidence: 'low' | 'medium' | 'high';
  evidence: ReadingFitEvidence[];
  excludedBookCount: number;
}

export interface BookFitPrediction {
  calibratedDifficulty: number;
  gap: number;
  band: BookFitBand;
  label: string;
}

/** A heuristic on the book-difficulty scale, not a comprehension or CEFR test.
 * Ratings estimate a level; reading positions only provide weak lower bounds.
 * One book contributes once, and inactivity is never evidence of inability.
 */
export function calibrateReaderFromBooks(
  books: readonly PersonalReadingBook[],
  statuses: Readonly<Record<string, PersonalBookReadingStatus>>,
  wordsReached: Readonly<Record<string, number>> = {},
): ReaderBookCalibration {
  const evidence: ReadingFitEvidence[] = [];
  const ratings: Array<{ ability: number; weight: number }> = [];
  const lowerBounds: Array<{ ability: number; weight: number }> = [];
  const seen = new Set<string>();
  for (const book of books) {
    if (seen.has(book.id)) continue;
    seen.add(book.id);
    const assessment = book.difficultyAssessment;
    if (!assessment) continue;
    const raw = assessment.initialScore ?? assessment.score;
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) continue;
    const quality = assessment.confidence === 'high' ? 1 : assessment.confidence === 'medium' ? 0.75 : 0.5;
    const base = { bookId: book.id, title: book.title, difficulty: raw };
    if (assessment.readerRating) {
      const offset = { 'very-hard': -15, hard: -6, comfortable: 6, easy: 15 }[assessment.readerRating];
      const label = { 'very-hard': 'Unbearable', hard: 'Hard, but manageable', comfortable: 'Comfortable', easy: 'Easy' }[assessment.readerRating];
      ratings.push({ ability: clamp(raw + offset, 10, 90), weight: 2 * quality });
      evidence.push({ ...base, kind: 'rating', description: `Your rating: ${label}` });
      continue;
    }
    // Finishing a difficult book still counts when its automatic recommendation
    // was rewrite. Completion does not establish unaided understanding.
    if (statuses[book.id] === 'finished') {
      lowerBounds.push({ ability: clamp(raw - 6, 10, 90), weight: 0.75 * quality });
      evidence.push({ ...base, kind: 'finished', description: 'Reached the end — understanding not checked' });
      continue;
    }
    const reached = wordsReached[book.id] ?? 0;
    if (Number.isFinite(reached) && book.wordCount > 0 && reached >= 2000 && reached / book.wordCount >= 0.1) {
      lowerBounds.push({ ability: clamp(raw - 12, 10, 90), weight: 0.35 * quality });
      evidence.push({ ...base, kind: 'progress', description: `Reached ${Math.round(clamp(reached / book.wordCount, 0, 1) * 100)}% — understanding not checked` });
    }
  }

  // Keep the provisional starting assumption visible in the UI. Passive
  // progress can raise this estimate but easier books cannot lower it.
  const priorAbility = 45;
  const priorWeight = 3;
  const ratingWeight = ratings.reduce((sum, item) => sum + item.weight, 0);
  const ratingTotal = ratings.reduce((sum, item) => sum + item.ability * item.weight, priorAbility * priorWeight);
  let ability = ratingTotal / (priorWeight + ratingWeight);
  for (const observation of lowerBounds.sort((a, b) => a.ability - b.ability)) {
    if (observation.ability > ability) {
      ability += (observation.ability - ability) * observation.weight / (priorWeight + ratingWeight + observation.weight);
    }
  }
  const ratedBooks = evidence.filter((item) => item.kind === 'rating').length;
  return {
    readerAbility: Math.round(clamp(ability, 10, 90)),
    evidenceCount: evidence.length,
    // Passive positions alone never justify high confidence.
    confidence: ratedBooks >= 5 && ratingWeight >= 7 ? 'high' : ratedBooks >= 2 && ratingWeight >= 2 ? 'medium' : 'low',
    evidence,
    excludedBookCount: seen.size - evidence.length,
  };
}

export function predictBookFit(
  assessment: Pick<BookDifficultyAssessment, 'score' | 'initialScore' | 'readerRating' | 'readingState' | 'recommendation'>,
  calibration: ReaderBookCalibration,
  _status: PersonalBookReadingStatus = 'new',
): BookFitPrediction {
  const raw = assessment.initialScore ?? assessment.score;
  const calibratedDifficulty = Math.round(clamp(raw, 0, 100));
  const gap = calibratedDifficulty - calibration.readerAbility;
  const band: BookFitBand = assessment.readerRating === 'easy' ? 'easy'
    : assessment.readerRating === 'comfortable' ? 'good-fit'
      : assessment.readerRating === 'hard' ? 'stretch'
        : assessment.readerRating === 'very-hard' ? 'too-hard'
          : gap <= -12 ? 'easy'
            : gap <= 7 ? 'good-fit'
              : gap <= 17 ? 'stretch'
                : 'too-hard';
  return { calibratedDifficulty, gap, band, label: fitLabel(band) };
}

export function predictUnseenBookFit(score: number, calibration: ReaderBookCalibration): BookFitPrediction {
  return predictBookFit({ score, recommendation: 'read' }, calibration);
}

function fitLabel(band: BookFitBand) {
  if (band === 'easy') return 'Easy for you';
  if (band === 'good-fit') return 'Good fit';
  if (band === 'stretch') return 'Stretch';
  return 'Too hard now';
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

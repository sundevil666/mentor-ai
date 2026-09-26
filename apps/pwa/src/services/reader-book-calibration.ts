import type { BookDifficultyAssessment, PersonalReadingBook } from '@mentor-ai/shared';
import type { PersonalBookReadingStatus } from './personal-book-status';

export type BookFitBand = 'easy' | 'good-fit' | 'stretch' | 'too-hard';

export interface ReaderBookCalibration {
  readerAbility: number;
  evidenceCount: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface BookFitPrediction {
  calibratedDifficulty: number;
  gap: number;
  band: BookFitBand;
  label: string;
}

export function calibrateReaderFromBooks(
  books: readonly PersonalReadingBook[],
  statuses: Readonly<Record<string, PersonalBookReadingStatus>>,
): ReaderBookCalibration {
  const observations: Array<{ ability: number; weight: number }> = [];
  for (const book of books) {
    const assessment = book.difficultyAssessment;
    if (!assessment) continue;
    const raw = assessment.initialScore ?? assessment.score;
    if (assessment.readerRating) {
      const offset = { 'very-hard': -18, hard: -8, comfortable: 8, easy: 18 }[assessment.readerRating];
      observations.push({ ability: raw + offset, weight: 2 });
    }
    if (assessment.readingState === 'stalled') observations.push({ ability: raw - 14, weight: 1.5 });
    if (statuses[book.id] === 'finished' && assessment.recommendation === 'read') {
      observations.push({ ability: raw + 8, weight: 1 });
    }
  }

  const priorAbility = 45;
  const priorWeight = 3;
  const evidenceWeight = observations.reduce((sum, item) => sum + item.weight, 0);
  const weightedAbility = observations.reduce((sum, item) => sum + item.ability * item.weight, priorAbility * priorWeight);
  const readerAbility = Math.round(clamp(weightedAbility / (priorWeight + evidenceWeight), 10, 90));
  return {
    readerAbility,
    evidenceCount: observations.length,
    confidence: observations.length >= 5 ? 'high' : observations.length >= 2 ? 'medium' : 'low',
  };
}

export function predictBookFit(
  assessment: Pick<BookDifficultyAssessment, 'score' | 'initialScore' | 'readerRating' | 'readingState' | 'recommendation'>,
  calibration: ReaderBookCalibration,
  status: PersonalBookReadingStatus = 'new',
): BookFitPrediction {
  const raw = assessment.initialScore ?? assessment.score;
  const ratingAdjustment = assessment.readerRating
    ? { 'very-hard': 18, hard: 10, comfortable: -5, easy: -12 }[assessment.readerRating]
    : 0;
  const behaviorAdjustment = assessment.readingState === 'stalled' ? 10
    : status === 'finished' && assessment.recommendation === 'read' ? -4
      : 0;
  const calibratedDifficulty = Math.round(clamp(raw + ratingAdjustment + behaviorAdjustment, 0, 100));
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

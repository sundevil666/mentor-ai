import type { BookDifficultyAssessment, BookReadingAnalytics, PersonalReadingBook } from '@mentor-ai/shared';
import type { PersonalBookReadingStatus } from './personal-book-status';

export type BookFitBand = 'easy' | 'good-fit' | 'stretch' | 'too-hard';

export interface ReadingFitEvidence {
  bookId: string;
  title: string;
  kind: 'rating' | 'finished' | 'progress' | 'analytics';
  description: string;
  difficulty: number;
}

export interface ReaderBookCalibration {
  readerAbility: number;
  evidenceCount: number;
  confidence: 'low' | 'medium' | 'high';
  evidence: ReadingFitEvidence[];
  excludedBookCount: number;
  analyticsBookCount: number;
  finishedBookCount: number;
}

export interface BookFitPrediction {
  calibratedDifficulty: number;
  gap: number;
  band: BookFitBand;
  label: string;
}

interface BookHelpSample {
  abilityOffset: number | null;
  coverage: number;
  description: string;
}

/** Rates describe assistance use, not unknown-word percentages. Thresholds are
 * conservative product heuristics on our own difficulty scale, not CEFR norms.
 * Pick the largest tracked device sample; summing devices would duplicate pages.
 */
function bookHelpSample(book: PersonalReadingBook, analytics: readonly BookReadingAnalytics[]): BookHelpSample | null {
  if (!Number.isFinite(book.wordCount) || book.wordCount <= 0) return null;
  const latest = new Map<string, BookReadingAnalytics>();
  for (const item of analytics) {
    if (item.bookId !== book.id || item.version !== 1
      || ![item.readWords, item.wordLookups, item.passageLookups, item.revision].every((count) => Number.isSafeInteger(count) && count >= 0)) continue;
    const previous = latest.get(item.deviceId);
    if (!previous || previous.revision < item.revision) latest.set(item.deviceId, item);
  }
  const sample = [...latest.values()].sort((a, b) => b.readWords - a.readWords
    || b.updatedAt.localeCompare(a.updatedAt) || a.deviceId.localeCompare(b.deviceId))[0];
  if (!sample || sample.readWords <= 0) return null;
  const coverage = Math.min(1, sample.readWords / book.wordCount);
  const minimumWords = Math.min(2000, Math.max(500, book.wordCount * 0.5));
  if (sample.readWords < minimumWords || coverage < 0.1) return null;
  const wordRate = sample.wordLookups / sample.readWords * 1000;
  const passageRate = sample.passageLookups / sample.readWords * 1000;
  const description = `${sample.readWords.toLocaleString('en')} observed words (${Math.round(coverage * 100)}% of book); `
    + `${wordRate.toFixed(1)} word and ${passageRate.toFixed(1)} passage translation requests per 1,000 observed words`;
  // No lookups can mean no need, or missing interaction history. It is never
  // sufficient evidence on its own to raise the reading level.
  const requests = sample.wordLookups + sample.passageLookups;
  const abilityOffset = requests < 3 ? null
    : wordRate >= 30 || passageRate >= 4 ? -12
      : wordRate >= 10 || passageRate >= 1.5 ? -5 : 3;
  return { abilityOffset, coverage, description };
}

/** One observation per book. Ratings dominate; passive progress only supplies
 * weak lower bounds. Inactivity and speech non-matches never lower reading fit.
 */
export function calibrateReaderFromBooks(
  books: readonly PersonalReadingBook[],
  statuses: Readonly<Record<string, PersonalBookReadingStatus>>,
  wordsReached: Readonly<Record<string, number>> = {},
  analytics: readonly BookReadingAnalytics[] = [],
): ReaderBookCalibration {
  const evidence: ReadingFitEvidence[] = [];
  const observations: Array<{ ability: number; weight: number }> = [];
  const lowerBounds: Array<{ ability: number; weight: number }> = [];
  const seen = new Set<string>();
  let ratedBooks = 0;
  let ratingWeight = 0;
  let analyticsBookCount = 0;
  let finishedBookCount = 0;
  let completedAnalyticsBooks = 0;
  for (const book of books) {
    if (seen.has(book.id)) continue;
    seen.add(book.id);
    const assessment = book.difficultyAssessment;
    if (!assessment) continue;
    const raw = assessment.initialScore ?? assessment.score;
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) continue;
    const quality = assessment.confidence === 'high' ? 1 : assessment.confidence === 'medium' ? 0.75 : 0.5;
    const finished = statuses[book.id] === 'finished';
    if (finished) finishedBookCount++;
    const sample = bookHelpSample(book, analytics);
    const usableAnalytics = sample?.abilityOffset !== null && sample?.abilityOffset !== undefined;
    if (usableAnalytics) {
      analyticsBookCount++;
      if (finished && sample.coverage >= 0.5) completedAnalyticsBooks++;
    }
    const details = sample ? `; ${sample.description}${usableAnalytics ? '' : '; too few translation requests to infer ease'}` : '';
    const base = { bookId: book.id, title: book.title, difficulty: raw };
    if (assessment.readerRating) {
      const offset = { 'very-hard': -15, hard: -6, comfortable: 6, easy: 15 }[assessment.readerRating];
      const label = { 'very-hard': 'Unbearable', hard: 'Hard, but manageable', comfortable: 'Comfortable', easy: 'Easy' }[assessment.readerRating];
      const weight = (2 + (finished ? 0.5 : 0)) * quality;
      // The reader's explicit account takes precedence over ambiguous clicks.
      observations.push({ ability: clamp(raw + offset, 10, 90), weight });
      ratedBooks++;
      ratingWeight += weight;
      evidence.push({ ...base, kind: 'rating', description: `Your rating: ${label}${finished ? '; finished' : ''}${details}` });
      continue;
    }
    if (usableAnalytics && sample) {
      const weight = (finished ? 1.5 : 0.75) * quality * (0.5 + 0.5 * sample.coverage);
      observations.push({ ability: clamp(raw + sample.abilityOffset!, 10, 90), weight });
      evidence.push({ ...base, kind: 'analytics', description: `${finished ? 'Finished; ' : ''}${sample.description}; assistance-based estimate` });
      continue;
    }
    // Finishing still counts when the automatic recommendation was rewrite.
    if (finished) {
      lowerBounds.push({ ability: clamp(raw - 6, 10, 90), weight: 0.75 * quality });
      evidence.push({ ...base, kind: 'finished', description: `Reached the end — understanding not checked${details}` });
      continue;
    }
    const reached = wordsReached[book.id] ?? 0;
    if (Number.isFinite(reached) && book.wordCount > 0 && reached >= 2000 && reached / book.wordCount >= 0.1) {
      lowerBounds.push({ ability: clamp(raw - 12, 10, 90), weight: 0.35 * quality });
      evidence.push({ ...base, kind: 'progress', description: `Reached ${Math.round(clamp(reached / book.wordCount, 0, 1) * 100)}% — understanding not checked${details}` });
    }
  }

  const priorAbility = 45;
  const priorWeight = 3;
  const evidenceWeight = observations.reduce((sum, item) => sum + item.weight, 0);
  const weightedTotal = observations.reduce((sum, item) => sum + item.ability * item.weight, priorAbility * priorWeight);
  let ability = weightedTotal / (priorWeight + evidenceWeight);
  for (const observation of lowerBounds.sort((a, b) => a.ability - b.ability)) {
    if (observation.ability > ability) {
      ability += (observation.ability - ability) * observation.weight / (priorWeight + evidenceWeight + observation.weight);
    }
  }
  return {
    readerAbility: Math.round(clamp(ability, 10, 90)),
    evidenceCount: evidence.length,
    // Automated assistance-use evidence alone cannot claim high confidence.
    confidence: ratedBooks >= 5 && ratingWeight >= 7 ? 'high'
      : (ratedBooks >= 2 && ratingWeight >= 2) || completedAnalyticsBooks >= 3 ? 'medium' : 'low',
    evidence,
    excludedBookCount: seen.size - evidence.length,
    analyticsBookCount,
    finishedBookCount,
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

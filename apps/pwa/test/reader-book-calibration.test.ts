import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PersonalReadingBook } from '@mentor-ai/shared';
import { calibrateReaderFromBooks, predictBookFit, predictUnseenBookFit } from '../src/services/reader-book-calibration.js';

function book(id: string, initialScore: number, rating?: 'very-hard' | 'hard' | 'comfortable' | 'easy'): PersonalReadingBook {
  return {
    id, title: id, level: 'unknown', language: 'en', sourceId: id, pageCount: 1, chapterCount: 1, wordCount: 100,
    importedAt: '2026-09-26T00:00:00.000Z', updatedAt: '2026-09-26T00:00:00.000Z', fileName: `${id}.txt`, format: 'txt', rightsConfirmed: true,
    difficultyAssessment: {
      version: 1, recommendation: rating === 'very-hard' ? 'rewrite' : 'read', score: initialScore,
      initialScore, confidence: 'high', sampledWords: 100, personalEvidenceCount: 1, reasons: [], analyzedAt: '2026-09-26T00:00:00.000Z',
      ...(rating ? { readerRating: rating } : {}),
    },
  };
}

describe('reader book calibration', () => {
  it('lowers reader ability but preserves objective book difficulty when an easy-looking book proves unbearable', () => {
    const hardBook = book('underestimated', 30, 'very-hard');
    const calibration = calibrateReaderFromBooks([hardBook], { underestimated: 'started' });
    const prediction = predictBookFit(hardBook.difficultyAssessment!, calibration, 'started');
    assert.ok(calibration.readerAbility < 45);
    assert.equal(prediction.calibratedDifficulty, 30);
    assert.equal(prediction.band, 'too-hard');
  });

  it('raises reader ability but preserves objective book difficulty when a hard-looking book reads easily', () => {
    const easyBook = book('overestimated', 75, 'easy');
    const calibration = calibrateReaderFromBooks([easyBook], { overestimated: 'started' });
    const prediction = predictBookFit(easyBook.difficultyAssessment!, calibration, 'started');
    assert.ok(calibration.readerAbility > 45);
    assert.equal(prediction.calibratedDifficulty, 75);
    assert.equal(prediction.band, 'easy');
  });

  it('uses the recalibrated reader ability to color an unseen book', () => {
    const calibration = calibrateReaderFromBooks([book('strong', 70, 'comfortable')], { strong: 'started' });
    assert.equal(predictUnseenBookFit(72, calibration).band, 'stretch');
    assert.equal(predictUnseenBookFit(45, calibration).band, 'easy');
  });
});


describe('reading history evidence', () => {
  it('does not penalize breaks or count a rating and completion twice', () => {
    const rated = book('rated', 60, 'comfortable');
    rated.difficultyAssessment!.readingState = 'stalled';
    const result = calibrateReaderFromBooks([rated], { rated: 'finished' });
    assert.equal(result.evidenceCount, 1);
    assert.equal(result.evidence[0]!.kind, 'rating');
    delete rated.difficultyAssessment!.readingState;
    assert.equal(calibrateReaderFromBooks([rated], { rated: 'finished' }).readerAbility, result.readerAbility);
  });

  it('uses completed books regardless of their automatic recommendation', () => {
    const finished = book('finished', 80);
    finished.difficultyAssessment!.recommendation = 'rewrite';
    const result = calibrateReaderFromBooks([finished], { finished: 'finished' });
    assert.equal(result.evidenceCount, 1);
    assert.ok(result.readerAbility > 45);
    assert.equal(result.confidence, 'low');
    assert.equal(calibrateReaderFromBooks([book('easy', 20)], { easy: 'finished' }).readerAbility, 45);
  });

  it('uses substantial progress, not opening a book or tiny position changes', () => {
    const reading = { ...book('reading', 80), wordCount: 20000 };
    assert.equal(calibrateReaderFromBooks([reading], { reading: 'started' }, { reading: 1999 }).evidenceCount, 0);
    const result = calibrateReaderFromBooks([reading], { reading: 'started' }, { reading: 3000 });
    assert.equal(result.evidence[0]!.kind, 'progress');
    assert.match(result.evidence[0]!.description, /15%/);
    assert.ok(result.readerAbility > 45);
    assert.equal(result.confidence, 'low');
    assert.equal(calibrateReaderFromBooks([{ ...reading, wordCount: 100000 }], {}, { reading: 3000 }).evidenceCount, 0);
  });

  it('keeps missing or invalid assessments out of the evidence and counts unique books', () => {
    const invalid = book('invalid', NaN);
    const missing = book('missing', 50);
    delete missing.difficultyAssessment;
    const rated = book('rated', 60, 'easy');
    const result = calibrateReaderFromBooks([rated, rated, invalid, missing], {});
    assert.equal(result.evidenceCount, 1);
    assert.equal(result.excludedBookCount, 2);
  });

  it('is independent of library order and cannot gain high confidence from completion alone', () => {
    const books = Array.from({ length: 6 }, (_, i) => book(String(i), 50 + i * 5));
    const statuses = Object.fromEntries(books.map((item) => [item.id, 'finished' as const]));
    const first = calibrateReaderFromBooks(books, statuses);
    assert.equal(first.readerAbility, calibrateReaderFromBooks([...books].reverse(), statuses).readerAbility);
    assert.equal(first.confidence, 'low');
    assert.equal(first.evidenceCount, 6);
  });
});

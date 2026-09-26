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

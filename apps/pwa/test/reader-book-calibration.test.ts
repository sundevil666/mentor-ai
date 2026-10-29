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

function trackedBook(id = 'tracked', score = 60): PersonalReadingBook {
  return { ...book(id, score), wordCount: 20000 };
}
function analytics(bookId = 'tracked', patch: Partial<import('@mentor-ai/shared').BookReadingAnalytics> = {}): import('@mentor-ai/shared').BookReadingAnalytics {
  return {
    version: 1, bookId, deviceId: 'device', revision: 1, startedAt: '2026-10-29T10:00:00.000Z', updatedAt: '2026-10-29T10:10:00.000Z',
    readWords: 10000, wordLookups: 20, passageLookups: 1, pronunciationRequests: 0,
    speechPageWords: 0, speechMatchedWords: 0, words: [], passages: [], unmatchedSpeechWords: [], examplesTruncated: false,
    ...patch,
  };
}

describe('assistance-based reading calibration', () => {
  it('estimates from translation use without a self-rating and preserves text difficulty', () => {
    const reading = trackedBook();
    const light = calibrateReaderFromBooks([reading], { tracked: 'started' }, {}, [analytics()]);
    const heavy = calibrateReaderFromBooks([reading], { tracked: 'started' }, {}, [analytics('tracked', { wordLookups: 600, passageLookups: 80 })]);
    assert.equal(light.analyticsBookCount, 1);
    assert.equal(light.evidenceCount, 1);
    assert.equal(light.evidence[0]!.kind, 'analytics');
    assert.match(light.evidence[0]!.description, /2.0 word and 0.1 passage/);
    assert.ok(light.readerAbility > heavy.readerAbility);
    assert.equal(reading.difficultyAssessment!.score, 60);
    assert.equal(predictBookFit(reading.difficultyAssessment!, light).calibratedDifficulty, 60);
  });

  it('normalizes assistance to observed volume, and accounts for passage translations', () => {
    const reading = trackedBook();
    const half = calibrateReaderFromBooks([reading], {}, {}, [analytics('tracked', { readWords: 5000, wordLookups: 10, passageLookups: 0 })]);
    const full = calibrateReaderFromBooks([reading], {}, {}, [analytics('tracked', { readWords: 10000, wordLookups: 20, passageLookups: 0 })]);
    assert.match(half.evidence[0]!.description, /2.0 word/);
    assert.match(full.evidence[0]!.description, /2.0 word/);
    const passages = calibrateReaderFromBooks([reading], {}, {}, [analytics('tracked', { passageLookups: 60 })]);
    assert.ok(passages.readerAbility < full.readerAbility);
  });

  it('does not infer ease from absent lookups, tiny samples or missing coverage', () => {
    const reading = trackedBook();
    for (const patch of [ { wordLookups: 0, passageLookups: 0 }, { readWords: 100 }, { readWords: 1999 }, { readWords: NaN } ]) {
      const result = calibrateReaderFromBooks([reading], { tracked: 'started' }, {}, [analytics('tracked', patch)]);
      assert.equal(result.analyticsBookCount, 0);
      assert.equal(result.readerAbility, 45);
      assert.equal(result.confidence, 'low');
    }
    const long = { ...reading, wordCount: 200000 };
    assert.equal(calibrateReaderFromBooks([long], {}, {}, [analytics()]).analyticsBookCount, 0);
  });

  it('recalculates after completion, with stronger evidence but only one book observation', () => {
    const reading = trackedBook('tracked', 75);
    const started = calibrateReaderFromBooks([reading], { tracked: 'started' }, {}, [analytics()]);
    const finished = calibrateReaderFromBooks([reading], { tracked: 'finished' }, {}, [analytics()]);
    assert.ok(finished.readerAbility > started.readerAbility);
    assert.equal(finished.evidenceCount, 1);
    assert.equal(finished.finishedBookCount, 1);
    assert.match(finished.evidence[0]!.description, /Finished/);
    assert.deepEqual(calibrateReaderFromBooks([reading], { tracked: 'finished' }, {}, [analytics()]), finished);
  });

  it('does not penalize pronunciation requests or speech non-matches', () => {
    const reading = trackedBook();
    const first = calibrateReaderFromBooks([reading], {}, {}, [analytics()]);
    const speech = calibrateReaderFromBooks([reading], {}, {}, [analytics('tracked', {
      pronunciationRequests: 300, speechPageWords: 10000, speechMatchedWords: 2, unmatchedSpeechWords: ['door'],
    })]);
    assert.equal(speech.readerAbility, first.readerAbility);
  });

  it('keeps explicit feedback dominant and avoids rating/analytics/completion triple-counting', () => {
    const reading = { ...trackedBook(), difficultyAssessment: { ...trackedBook().difficultyAssessment!, readerRating: 'comfortable' as const } };
    const rated = calibrateReaderFromBooks([reading], { tracked: 'finished' }, {}, [analytics()]);
    const heavy = calibrateReaderFromBooks([reading], { tracked: 'finished' }, {}, [analytics('tracked', { wordLookups: 900 })]);
    assert.equal(rated.readerAbility, heavy.readerAbility);
    assert.equal(heavy.evidenceCount, 1);
    assert.equal(heavy.evidence[0]!.kind, 'rating');
  });

  it('selects a device sample and its latest revision instead of adding overlapping observations', () => {
    const reading = trackedBook();
    const largest = analytics();
    const stale = analytics('tracked', { revision: 0, wordLookups: 900 });
    const smallerDevice = analytics('tracked', { deviceId: 'other-device', readWords: 3000, wordLookups: 900 });
    const expected = calibrateReaderFromBooks([reading], {}, {}, [largest]);
    const combined = calibrateReaderFromBooks([reading], {}, {}, [stale, largest, smallerDevice, largest]);
    assert.deepEqual(combined, expected);
    assert.equal(calibrateReaderFromBooks([reading], {}, {}, [analytics('another-book')]).analyticsBookCount, 0);
  });
});

it('updates next-book suggestions from analytics and completed books without requiring a rating', async () => {
  const { recommendNextBookForReader } = await import('../src/services/book-reading-guidance.js');
  const reading = trackedBook('tracked', 90);
  assert.equal(recommendNextBookForReader(calibrateReaderFromBooks([], {}), []), null);
  const started = calibrateReaderFromBooks([reading], { tracked: 'started' }, {}, [analytics('tracked', { readWords: 20000 })]);
  const finished = calibrateReaderFromBooks([reading], { tracked: 'finished' }, {}, [analytics('tracked', { readWords: 20000 })]);
  const first = recommendNextBookForReader(started, [reading]);
  const next = recommendNextBookForReader(finished, [reading]);
  assert.ok(first);
  assert.ok(next);
  assert.notEqual(next.title, first.title);
  assert.ok(next.targetDifficulty <= finished.readerAbility + 7);
  assert.notEqual(recommendNextBookForReader(finished, [reading, { ...reading, title: next.title }])?.title, next.title);
});


it('supports short completed books but keeps automated confidence provisional', () => {
  const short = { ...trackedBook(), wordCount: 1000 };
  assert.equal(calibrateReaderFromBooks([short], { tracked: 'finished' }, {}, [analytics('tracked', { readWords: 499 })]).analyticsBookCount, 0);
  assert.equal(calibrateReaderFromBooks([short], { tracked: 'finished' }, {}, [analytics('tracked', { readWords: 600 })]).analyticsBookCount, 1);
  const books = Array.from({ length: 6 }, (_, index) => trackedBook(String(index)));
  const statuses = Object.fromEntries(books.map((item) => [item.id, 'finished' as const]));
  const result = calibrateReaderFromBooks(books, statuses, {}, books.map((item) => analytics(item.id)));
  assert.equal(result.confidence, 'medium');
  assert.equal(result.analyticsBookCount, 6);
  assert.equal(result.finishedBookCount, 6);
});

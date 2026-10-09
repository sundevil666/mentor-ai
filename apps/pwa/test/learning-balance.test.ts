import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateLearningBalance } from '../src/services/learning-balance.js';

const emptyActivity = { grammarSeconds: 0, listeningSeconds: 0, speakingSeconds: 0, phrasesSeconds: 0, audioSeconds: 0, readingSeconds: 0, vocabularySeconds: 0, totalSeconds: 0, updatedAt: null };

describe('learning balance', () => {
  it('recommends speaking when practice is dominated by audio', () => {
    const balance = calculateLearningBalance({ activity: { ...emptyActivity, audioSeconds: 36_000, totalSeconds: 36_000 } });
    assert.equal(balance.primaryFocus.kind, 'speaking');
    assert.equal(balance.rows.find((row) => row.kind === 'audio')?.status, 'strong');
  });

  it('weights active speaking more strongly than passive audio', () => {
    const balance = calculateLearningBalance({ activity: { ...emptyActivity, speakingSeconds: 3_600, audioSeconds: 3_600, totalSeconds: 7_200 } });
    assert.ok(balance.rows.find((row) => row.kind === 'speaking')!.impactPercent > balance.rows.find((row) => row.kind === 'audio')!.impactPercent);
  });

  it('keeps estimated movies visible without distorting the measured balance', () => {
    const balance = calculateLearningBalance({ activity: emptyActivity, estimatedMovieSeconds: 7_200 });
    assert.equal(balance.rows.find((row) => row.kind === 'movies')?.impactPercent, 0);
    assert.equal(balance.rows.reduce((sum, row) => sum + row.targetPercent, 0), 100);
  });
});

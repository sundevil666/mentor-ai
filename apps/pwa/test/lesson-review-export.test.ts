import assert from 'node:assert/strict';
import { it } from 'node:test';
import { buildLessonReviewExport } from '../src/services/lesson-review-export.js';

it('exports only the current learner evidence and its catalog, excluding authentication stores', () => {
  const review = buildLessonReviewExport('learner', {
    statistics: [{ studentId: 'learner', lessonId: 'sample' }, { studentId: 'other', lessonId: 'other' }],
    'learning-sessions': [{ id: 'saved', lesson: { id: 'sample' }, events: [{ studentId: 'learner' }] },
      { studentId: 'other', events: [{ studentId: 'learner' }] }],
    lessons: [{ id: 'sample' }, { id: 'other' }],
    'auth-sessions': [{ token: 'excluded' }],
  }, 'review-time');
  assert.equal(review.records.statistics.length, 1);
  assert.equal(review.records['learning-sessions'].length, 1);
  assert.deepEqual(review.lessons, [{ id: 'sample' }]);
  assert.equal(JSON.stringify(review).includes('excluded'), false);
  assert.equal(review.source, 'this-device');
});

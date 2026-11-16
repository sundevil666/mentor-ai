import assert from 'node:assert/strict';
import { it } from 'node:test';
import { learningStateRepository } from '../dist/repositories/learning-state.repository.js';
import { learningStateService } from '../dist/services/learning-state.service.js';
it('limits a cloud lesson review to the authenticated owner and requested evidence fields', async () => {
  const original = learningStateRepository.readFields;
  const user = { id: 'review-owner', email: 'review@example.com', displayName: 'Review' };
  learningStateRepository.readFields = async (fields, identity) => {
    assert.strictEqual(identity, user);
    assert.deepEqual(fields, ['exerciseResults', 'acceptedEvents', 'statisticsSnapshots', 'speechResults']);
    const rows = [{ studentId: user.id, id: 'own-result' }, { studentId: 'another-owner', id: 'excluded' }];
    return { exerciseResults: rows, acceptedEvents: rows, statisticsSnapshots: rows, speechResults: rows };
  };
  try {
    const review = await learningStateService.getLessonReview(user);
    for (const key of ['results', 'events', 'statistics', 'speech']) assert.deepEqual(review[key].map(row => row.id), ['own-result']);
    assert.equal(JSON.stringify(review).includes('excluded'), false);
  } finally { learningStateRepository.readFields = original; }
});

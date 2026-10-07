import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { belongsToRequiredLessons, belongsToStartedLessons } from '../src/services/home-lesson-lists.js';

describe('Home lesson lists', () => {
  it('keeps only an explicitly required unfinished lesson in Required', () => {
    assert.equal(belongsToRequiredLessons(true, false), true);
    assert.equal(belongsToRequiredLessons(false, false), false);
    assert.equal(belongsToRequiredLessons(true, true), false);
  });

  it('shows non-required attempts only above zero percent and before completion', () => {
    assert.equal(belongsToStartedLessons(false, 0), false);
    assert.equal(belongsToStartedLessons(false, 1), true);
    assert.equal(belongsToStartedLessons(false, 2), true);
    assert.equal(belongsToStartedLessons(false, 99), true);
    assert.equal(belongsToStartedLessons(false, 100), false);
    assert.equal(belongsToStartedLessons(true, 50), false);
  });
});

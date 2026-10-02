import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { belongsToRequiredLessons, belongsToStartedLessons } from '../src/services/home-lesson-lists.js';

describe('Home lesson lists', () => {
  it('keeps a never-completed assigned lesson only in Required', () => {
    assert.equal(belongsToRequiredLessons(false), true);
    assert.equal(belongsToStartedLessons(false, 50), false);
  });

  it('moves a repeated incomplete attempt only to Started after real progress', () => {
    assert.equal(belongsToRequiredLessons(true), false);
    assert.equal(belongsToStartedLessons(true, 1), false);
    assert.equal(belongsToStartedLessons(true, 2), true);
    assert.equal(belongsToStartedLessons(true, 99), true);
    assert.equal(belongsToStartedLessons(true, 100), false);
  });
});

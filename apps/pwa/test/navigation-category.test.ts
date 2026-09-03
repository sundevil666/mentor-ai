import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveDashboardTrainingCategory } from '../src/services/navigation-category.js';

describe('dashboard navigation category', () => {
  it('uses the active lesson category when a recommended lesson starts from Home', () => {
    assert.equal(resolveDashboardTrainingCategory(undefined, 'listening'), 'listening');
    assert.equal(resolveDashboardTrainingCategory(undefined, 'speaking'), 'speaking');
  });

  it('keeps Home active when there is no categorized lesson or route', () => {
    assert.equal(resolveDashboardTrainingCategory(undefined, 'home'), undefined);
    assert.equal(resolveDashboardTrainingCategory(undefined, undefined), undefined);
  });

  it('uses the active lesson category after starting or resuming it from Home', () => {
    assert.equal(resolveDashboardTrainingCategory('home', 'listening'), 'listening');
    assert.equal(resolveDashboardTrainingCategory('home', 'speaking'), 'speaking');
  });

  it('gives an explicit library route priority over a paused session', () => {
    assert.equal(resolveDashboardTrainingCategory('speaking', 'listening'), 'speaking');
  });
});

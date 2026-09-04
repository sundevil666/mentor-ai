import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  openDashboardHome,
  resolveDashboardTrainingCategory,
  synchronizeDashboardLessonRoute,
} from '../src/services/navigation-category.js';

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

  it('leaves an active lesson before showing Home', async () => {
    const actions: string[] = [];

    await openDashboardHome(true, {
      leaveActiveLesson: async () => { actions.push('leave-lesson'); },
      showHome: async () => { actions.push('show-home'); },
    });

    assert.deepEqual(actions, ['leave-lesson', 'show-home']);
    assert.equal(resolveDashboardTrainingCategory('home', undefined), undefined);
  });

  it('shows Home directly when there is no active lesson', async () => {
    const actions: string[] = [];

    await openDashboardHome(false, {
      leaveActiveLesson: async () => { actions.push('leave-lesson'); },
      showHome: async () => { actions.push('show-home'); },
    });

    assert.deepEqual(actions, ['show-home']);
  });

  it('replaces the Home route with the category of the lesson started there', async () => {
    const replacements: string[] = [];

    const speaking = await synchronizeDashboardLessonRoute('speaking', 'home', async (training) => {
      replacements.push(training);
    });
    const listening = await synchronizeDashboardLessonRoute('listening', 'home', async (training) => {
      replacements.push(training);
    });

    assert.equal(speaking, 'speaking');
    assert.equal(listening, 'listening');
    assert.deepEqual(replacements, ['speaking', 'listening']);
  });

  it('does not replace an already matching lesson category route', async () => {
    let replacements = 0;

    const training = await synchronizeDashboardLessonRoute('speaking', 'speaking', async () => {
      replacements += 1;
    });

    assert.equal(training, 'speaking');
    assert.equal(replacements, 0);
  });
});

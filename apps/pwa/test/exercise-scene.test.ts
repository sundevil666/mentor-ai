import assert from 'node:assert/strict';
import { it } from 'node:test';
import { resolveExerciseScene } from '../src/services/exercise-scene.js';

it('prioritizes the visible action over contextual objects', () => {
  assert.equal(resolveExerciseScene('Девушка побежала к вокзалу за билетом'), 'run');
  assert.equal(resolveExerciseScene('Мастер открыл дверь мастерской'), 'door-open');
  assert.equal(resolveExerciseScene('Велосипед нужно отдать в ремонт'), 'repair');
});
it('does not invent a scene for an unrelated exercise', () => {
  assert.equal(resolveExerciseScene('Выбери подходящее окончание'), null);
});
it('keeps static object contexts distinct from opening and prioritizes repairs', () => {
  assert.equal(resolveExerciseScene('За окном светло'), 'window');
  assert.equal(resolveExerciseScene('Ремонт телефона'), 'repair');
  assert.equal(resolveExerciseScene('The phone is on the table'), 'phone');
});

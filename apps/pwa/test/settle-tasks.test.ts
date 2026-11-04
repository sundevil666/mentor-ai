import assert from 'node:assert/strict';
import { it } from 'node:test';
import { settleTasks } from '../src/services/settle-tasks.js';

it('bounds active tasks, preserves result order and continues after failures', async () => {
  let active = 0;
  let peak = 0;
  const results = await settleTasks(Array.from({ length: 15 }, (_, index) => async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, index % 3));
    active--;
    if (index === 4) throw new Error('offline');
    return index;
  }));
  assert.equal(peak, 3);
  assert.equal(active, 0);
  assert.equal(results.length, 15);
  results.forEach((result, index) => {
    assert.equal(result.status, index === 4 ? 'rejected' : 'fulfilled');
    if (result.status === 'fulfilled') assert.equal(result.value, index);
  });
});

it('isolates synchronous failures and accepts an empty queue', async () => {
  const results = await settleTasks([() => { throw new Error('failed'); }, () => 2], 1);
  assert.equal(results[0]?.status, 'rejected');
  assert.deepEqual(results[1], { status: 'fulfilled', value: 2 });
  assert.deepEqual(await settleTasks([]), []);
  await assert.rejects(settleTasks([], 0), RangeError);
});

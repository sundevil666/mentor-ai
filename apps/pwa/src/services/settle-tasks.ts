// Start only a bounded number of operations at once, while preserving the
// input order and failure isolation of Promise.allSettled.
export async function settleTasks<T>(
  tasks: ReadonlyArray<() => T | PromiseLike<T>>,
  concurrency = 3,
): Promise<PromiseSettledResult<T>[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError('Invalid concurrency');
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]!() };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }));
  return results;
}

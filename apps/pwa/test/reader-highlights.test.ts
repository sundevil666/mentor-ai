import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createReaderHighlighter } from '../src/services/reader-highlights.js';

it('touches only changed highlights in a 100,000-word book', () => {
  const writes: string[] = [];
  const words = new Map(Array.from({ length: 100_000 }, (_, index) => [index, {
    classList: {
      add: (name: string) => { writes.push(`add:${index}:${name}`); },
      remove: (name: string) => { writes.push(`remove:${index}:${name}`); },
    },
  }]));
  const highlights = createReaderHighlighter(words);
  highlights.update('current', [50_000]);
  assert.deepEqual(writes, ['add:50000:current']);
  writes.length = 0;
  highlights.update('current', [50_001]);
  assert.deepEqual(writes, ['remove:50000:current', 'add:50001:current']);
  writes.length = 0;
  highlights.update('current', [50_001]);
  assert.deepEqual(writes, []);
});

it('keeps spoken, selected and current classes independent and clears resets', () => {
  const classes = new Set<string>();
  const highlights = createReaderHighlighter(new Map([[0, {
    classList: { add: (name) => { classes.add(name); }, remove: (name) => { classes.delete(name); } },
  }]]));
  highlights.update('spoken', [0]);
  highlights.update('selected', [0]);
  highlights.update('current', [0]);
  highlights.clear();
  assert.equal(classes.size, 0);
  highlights.update('spoken', [0]);
  highlights.update('selected', [0]);
  highlights.update('current', [0]);
  highlights.update('current', []);
  assert.deepEqual([...classes], ['spoken', 'selected']);
  highlights.update('spoken', []);
  highlights.update('selected', []);
  highlights.update('current', [-1, 999]);
  assert.equal(classes.size, 0);
});

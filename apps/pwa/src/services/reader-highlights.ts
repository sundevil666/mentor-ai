type WordElement = { classList: { add(name: string): void; remove(name: string): void } };

// Index once after mounting a book. Speech updates never query or patch the
// whole DOM: only words entering/leaving each highlight class are touched.
export function createReaderHighlighter(words: ReadonlyMap<number, WordElement>) {
  const previous = new Map<string, Set<number>>();
  return {
    clear() {
      for (const [name, indexes] of previous) {
        for (const index of indexes) words.get(index)?.classList.remove(name);
      }
      previous.clear();
    },
    update(name: string, indexes: Iterable<number>) {
      const next = new Set(indexes);
      const before = previous.get(name) ?? new Set<number>();
      for (const index of before) {
        if (!next.has(index)) words.get(index)?.classList.remove(name);
      }
      for (const index of next) {
        if (!before.has(index)) words.get(index)?.classList.add(name);
      }
      previous.set(name, next);
    },
  };
}

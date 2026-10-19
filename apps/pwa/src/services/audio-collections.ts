type CollectionTrack = {
  id: string;
  title: string;
  collection?: { id: string; title: string; position: number };
};

export function groupAudioCollections<T extends CollectionTrack>(tracks: readonly T[]) {
  const entries: Array<{ id: string; collectionId?: string; title: string; items: T[] }> = [];
  const collections = new Map<string, T[]>();
  for (const track of tracks) {
    const collection = track.collection;
    if (!collection) {
      entries.push({ id: `track:${track.id}`, title: track.title, items: [track] });
      continue;
    }
    let items = collections.get(collection.id);
    if (!items) {
      items = [];
      collections.set(collection.id, items);
      entries.push({ id: `collection:${collection.id}`, collectionId: collection.id, title: collection.title, items });
    }
    items.push(track);
  }
  for (const entry of entries) {
    if (!entry.collectionId) continue;
    entry.items.sort((a, b) => (a.collection?.position ?? 0) - (b.collection?.position ?? 0));
    if (entry.items.length === 1) delete entry.collectionId;
  }
  return entries;
}

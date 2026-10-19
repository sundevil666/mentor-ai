# Audio Catalog Workflow

Read this before adding or editing public audiobook, story, or multipart audio
entries. Related tracks should appear as one recognizable work in the library,
with their listening order preserved.

## Catalog and grouping

- Audio stories and audiobook chapters belong in
  `apps/pwa/src/services/story-library.ts`; podcast programs belong in
  `apps/pwa/src/services/audio-library.ts`.
- For every work with multiple tracks, give each track explicit `collection`
  metadata: the same stable `id`, the same work `title`, and a unique numeric
  `position` starting at 1 in listening order. For example:
  `collection: { id: 'the-30000-bequest', title: 'The $30,000 Bequest', position: 1 }`.
- Group by the work or recording, not by author, narrator, hosting URL, or similar
  titles. Unrelated stories in a source anthology remain separate works.
- Reuse `groupAudioCollections` and `AudioCollection.vue`. Do not render a
  multi-track work as a flat list or introduce a second grouping mechanism.
  The story library already uses these; another catalog renderer must be wired
  to them before adding multipart recordings there.
- Keep standalone tracks as ordinary cards. Collections start collapsed and show
  a distinct header, expansion arrow, track count, and Show/Hide tracks hint.
- Preserve each collection's expanded state on the device across navigation and
  reloads using the existing `mentor-ai:audio-collection-expanded:v1:<id>` key.
  Keep collection IDs stable so saved preferences survive catalog updates.

## Preserve existing behavior

Keep track IDs, media URLs, progress, completion, offline storage, feedback, and
playback independent for each track. Grouping is a library presentation change;
it must not replace or reset track records. Verify source links, duration, file
size, attribution, and chapter order when adding new public recordings.

## Verification

- Add a focused assertion in `apps/pwa/test/audio-collections.test.ts` for each new
  multipart work: one collection, all expected tracks, correct listening order.
- Run the PWA tests and typecheck; build when changing rendering or styles.
- For UI changes, check `/audio/stories` at phone and desktop widths, keyboard
  expansion, open/close persistence after reload, and return from track playback.
- Commit only public catalog metadata and safe instructions. Never commit
  `.ai/private/` content. Personalized English lessons follow the separate
  private lesson workflow referenced in `AGENTS.md`.

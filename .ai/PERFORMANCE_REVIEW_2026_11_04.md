# Performance review: Mac M2 and iPhone 13

## Scope and evidence

Source/build review of the PWA entry, routing, service worker, cached media,
maintenance scheduling, IndexedDB schema, audio storage/playback, reader
pagination, local speech worker and motion preferences. This is not a measured
device benchmark or a complete audit of every backend endpoint. No physical
iPhone 13 or Mac M2 Safari session was profiled in this review.

Optimize browser work and peak memory rather than identifying a particular
chip from a user-agent string. Both requested devices benefit from these
changes; no unsupported hardware acceleration or browser-target upgrade is
required.

## Implemented

1. Lazy route imports for all pages. The persistent layout stays available,
   while page code is evaluated when its route is opened. Reading and audio
   stories share the same imported module. Production service-worker precaching
   continues to include the generated JavaScript chunks for offline navigation.
   Existing router recovery handles missing chunks after updates.
2. Cached media range responses use Blob slicing instead of converting the
   entire recording into an ArrayBuffer and copying the selected range.
   This removes those explicit recording-sized JavaScript heap allocations;
   actual browser memory savings still require device profiling. Added suffix
   range support, safe-integer validation and regression coverage for Safari's
   small initial range requests, open-ended seeks and invalid ranges.
3. Daily maintenance starts at most three top-level tasks simultaneously,
   instead of fifteen. Each task still settles independently and results keep
   their original order for upload-failure checks. Tasks may have their own
   internal requests, so three is not a global HTTP connection limit.
4. Hidden documents do not start new scheduled maintenance or page-speech
   uploads. The existing visibility/online wakeup resumes due maintenance when
   the user returns. In-flight work, native media playback and service-worker
   learning uploads continue as before.

## Production build comparison

Same working tree, including the pre-existing MoviesPage edit, for both builds.
Sizes are the build tool's KB values.

| Output | Before | After |
| --- | ---: | ---: |
| Main index JavaScript | 807.93 KB | 169.99 KB |
| Main index gzip | 260.89 KB | 58.09 KB |
| Total JavaScript | 1486.93 KB | 1507.93 KB |
| JavaScript files | 8 | 41 |

The main file is about 79% smaller (78% gzip). This is not a claim of a 79%
faster launch: initial navigation also loads the layout, shared dependencies
and the selected page. Total code slightly increases from chunk boundaries;
first-install offline precaching still downloads all application chunks.

## Reviewed constraints and follow-up profiling

- Audio already uses stable HTTPS URLs and the service worker rather than
  retaining object URLs for entire recordings. Keep this for iOS suspension.
- Audio and story downloads already stream responses into Cache Storage.
  Do not replace this with full-file ArrayBuffer downloads.
- Speech inference already runs in a worker with a bounded pending queue and
  quantized WASM model. Keep the existing recognition behavior until accuracy,
  latency, warm-model memory and battery are measured on both devices.
  A model replacement or automatic WebGPU switch needs separate validation.
- Reader pagination already batches resizing with requestAnimationFrame and
  invalidates stale pagination work. Long books still create many word nodes;
  profile a large imported book before changing pagination or virtualizing it.
- Motion-reduction handling and offline retention already exist. Avoid broad
  compositor hints or deleting downloaded user content as a performance fix.
- IndexedDB and cached audio remain device-local; build checks cannot prove
  cross-device sync, iOS cache retention or production availability.

## Validation

- `npm test`: all suites passed; PWA 454 tests passed.
- `npm run typecheck`: passed across workspaces.
- `npm run lint`: no errors; existing style warnings remain.
- `npm run build:pwa`: passed, including asset optimization.
- `node scripts/check-deployment-output.mjs`: passed.
- Verified every emitted JavaScript asset is listed in the service worker.

Device acceptance checks still required: cold/warm launch, offline navigation
to every section, seeking downloaded long audio, lock-screen playback,
long-book rotation/font resizing, microphone start/pause/restart, and returning
to the app after iOS suspension. Record Safari timelines and memory before
claiming launch-time, battery or peak-memory improvements.

Reference: https://router.vuejs.org/guide/advanced/lazy-loading

## Reader follow-up: continuous speech highlighting

The original reader built every word's nine dynamic highlight classes inside
StoriesPage's render function. Speech results, lookup state and microphone
meter updates could therefore re-evaluate the full book's word tree.

- Extracted stable book text into ReaderBookText. Its page props change only
  when book content or chapter titles change, so speech/UI state does not
  trigger its render function. Font sizing remains on the outer article.
- An indexed highlighter now applies/removes only changed word classes after
  Vue's update. Spoken, current, expected, selected, bookmark and resume classes
  remain independent. Indexes are rebuilt for new content and released on close.
- Word-element and token-position indexes replace repeated whole-book DOM
  queries and token-array flattening for navigation and sentence lookup.
  Microphone anchoring in paginated mode checks only the current page's words.
- Removed animated brightness, saturation and hue filters from the full reader
  frame. Opacity and transform animations retain the listening feedback.

Verification: a temporary Vue renderer experiment using the actual component
template mounted 20,000 words and performed 100 parent UI updates; the book
render function ran once in total. A permanent 100,000-word highlighter test
checks that moving the current highlight touches only the old and new words.
Reset/overlapping-class coverage is also included. These are algorithm/render
checks, not Safari timing, battery or physical-device benchmarks.

All 456 PWA tests, full repository tests, typecheck, lint (no errors), and the
optimized PWA build passed after the reader changes.

The whole book still has DOM nodes for the existing column pagination,
selection and chapter navigation. This change reduces repeated rendering work;
it does not implement page virtualization or reduce the speech model's inference
cost. Very large books can still consume substantial initial memory. Device
checks for highlighted reading, chapter changes, font resizing, selection and
resuming remain necessary.

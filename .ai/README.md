# Mentor AI Private Workspace

This directory defines the local AI workspace boundary.

Only safe instructions may be committed here. Real learning data must live under:

```text
.ai/private/
```

`.ai/private/` is ignored by Git. Do not commit real lessons, lesson results, Teacher Memory, Teacher Journal, recommendations, progress analytics, voice recordings, generated personal lessons, or any data that can reconstruct the student's learning history.

Production data must be written directly by the backend to private storage such as Postgres through environment-provided credentials. It must not move through Git.

Private authored lessons may be staged locally in `.ai/private/lessons/lesson-library.json`. Run `npm run lessons:queue:status` to inspect unsynchronized changes and `npm run lessons:queue:sync` to make the at-most-daily protected import attempt. The synchronizer fingerprints lesson contents, retains failed work locally, and reports warning and critical backlog ages without committing lesson data.

## Russian-English language contract

Mentor AI is a Russian-English learning application. All learner-facing lesson content, built-in templates, generated exercises, prompts, instructions, hints, explanations, answer choices, and feedback must use only Russian and English. Use Russian for the source phrase and learner guidance, and English for the language being learned and produced.

Never introduce Slovak or any other third language into learner-facing content unless the user explicitly requests that language for a specific task. Do not use the device locale, the user's location, or nearby-language vocabulary as a reason to substitute another language. Before delivering lesson-related changes, search every changed lesson and template for unintended third-language text and verify that translation tasks have the correct Russian source and English answer.

## Spoken exercise contract

- Instructions to speak, say, repeat aloud, or give a full spoken response must use a microphone-based exercise (`repeat-speaking` or `dialogue-translation`), never a typed answer field. Supply a complete `expectedResponse` and matching `audioText` for recognition and model playback.
- Written production must explicitly ask the learner to write. If a task requires both writing and speaking, use separate steps.
- Keep the model answer concealed until the learner requests it; record answer reveals as hints.
- A typed fallback must not count as completion of the spoken step. Explain microphone unavailability and allow retry. Do not claim pronunciation assessment when only recognized words are checked.
- When correcting input behavior in existing lessons, preserve lesson/exercise IDs, completion status, completion history, and saved progress. Do not reset completed lessons or create replacement lesson identities.

## Required privacy verification

Before committing, pushing, or publishing lesson-related changes, run `npm run test:privacy` and inspect the exact files included in the change. Keep private lessons, learning results, profiles, access tokens, database URLs and environment files outside Git. Never print secret values in tool output, reports or commit messages. Retrieve only the credentials needed for the authorized action. Report the scope and result of the check without claiming that a pattern scan proves the absence of every possible secret.

If the cloud database is unavailable, preserve authored lessons in the private synchronization queue and report the actual failure. Do not mark an upload as successful or imply a local queue runs automatically. Retry through `npm run lessons:queue:sync`; preserve all existing lesson identities and completed progress.

## New lessons and the global offline download

Every new or imported lesson must enter the shared available lesson catalog, including lessons stored only in the device IndexedDB while the database is unavailable. The header bulk-download action must discover all unfinished local and remote lessons; no lesson-specific enable flag or per-card download should be needed. After a local import transaction succeeds, emit `mentor-ai:lesson-catalog-changed` so the header and visible library refresh without a page reload.

Reuse `downloadGeneratedLessonOffline` for both bulk and per-card actions. A stored lesson JSON or an offline registry record alone is not a completed download: `isGeneratedLessonAvailableOffline` must confirm the current content version and every required audio cache entry. Register readiness only after all required speech succeeds. Successful downloads must update the header count and every affected card automatically; failed or incomplete audio must stay pending for retry. Preserve existing IDs, completion status and results.

Before delivering lessons, verify: local import with cloud quota failure shows the global button; one click downloads the new lesson batch; every successful card changes to Downloaded; completed/currently cached lessons are excluded; missing audio remains pending. Keep the lesson payload and private tests outside Git, and run the privacy checks.

## Shared lesson presentation and illustrations

All exercises use the shared `ExerciseBrief` presentation rather than per-lesson layouts. On laptops, keep the instruction and situation on the left and the response controls on the right. Reserve space for the fixed bottom navigation; long content must scroll above it. Preserve lesson/exercise IDs, completion history, progress, microphone behavior, and concealed model answers when changing presentation.

Use a clear reading order: lesson name and step, action heading, task, main phrase/situation, brief explanation, optional tip. Make the phrase the strongest text emphasis. Use readable body text, quieter secondary labels, consistent spacing and theme tokens. Keep backgrounds calm; avoid photographic decoration, competing badges, isolated bright picture panels, and redundant labels. Group the compact illustration on the right inside the same situation card as its text, never vertically against the whole instruction column.

Illustrations should be simple consistent line drawings with recognizable people and objects. Reuse generic semantic scenes through `resolveExerciseScene` and `ExerciseSituationScene`; never embed private lesson text, IDs or learning history in public visual mappings. Check the meaning of every exercise, including later steps, rather than applying one picture to a whole lesson. For unrecognized contexts, omit the picture until an appropriate scene exists instead of displaying a misleading one.

Static scenes are the default for requests, conversations, payment, repair arrangements and explanations. Animate only when visible movement teaches the action, such as opening or running. Keep motion subtle, provide a pause control, honor reduced-motion preferences, and ensure the static frame still communicates meaning. Use local vector assets so the scenes work offline without external requests or image-generation calls during lessons.

Before delivery, check the latest lesson batch against the scene resolver privately, inspect representative static and animated steps at laptop and narrow widths, check text/background contrast and menu overlap, and run the privacy checks. Do not publish personal lesson content in fixtures or screenshots intended for public documentation.

Spoken task text must visually separate context/instructions (read), the requested phrase (say in English), and supporting vocabulary/constructions. Reuse `splitExercisePrompt` for existing quoted prompts and explicit `nativePrompt` values. Never derive the visible phrase from `expectedResponse` or audio text; preserve unmatched prompts intact. Keep context quiet, the spoken phrase prominent, and support in a separate compact block.

Author every new spoken task with the same three-part structure. Put the instruction and situation in `prompt`, then a colon and the exact native-language text to produce inside `«…»`; place any required words or constructions after the closing quote. Example shape: `Без английской опоры, о вчера: «…». Используй …`. Prefer an explicit `nativePrompt` when the source format already separates the phrase. The shared UI must label the instruction as what to do, show the quoted/native phrase in a separate larger emphasized card, and keep any language support visually separate. Do not mix the instruction into the phrase that the learner must say.

## Durable lesson catalog and stable release dates

### Always preserve and resume lesson state

Persist the exact current exercise and completed exercise results after every step. Reloading, closing the app, changing categories, returning to the library, installing an update and refreshing lesson content must retain the current position, answers already checked, hints and completion history. Reopening an unfinished lesson must resume its saved session, including offline, rather than create a new session at step one. Resume must not count as another lesson start. Keep the last active unfinished lesson active after reload; retain other unfinished lessons independently.

Content corrections must preserve lesson/exercise IDs, original release dates and saved progress. Verify restoration on a later step after reload and after opening another lesson; test this with synthetic records rather than submitting fabricated learner answers. Completed lessons may be deliberately repeated without deleting earlier completion history.

The IndexedDB `lessons` store is a durable catalog, not a disposable cache. Imported records may be the only device copy: never prune them by age or a maximum lesson count. Removing an offline download may remove media and its readiness record, but must keep the lesson JSON, identity, release date and completion history. Prune statistical evidence independently. Do not restore a shared lesson-count retention limit without a separate, verified recoverable catalog design.

`createdAt` is the original release/library date. Content refresh, database `updated_at`, reimport, restoration and synchronization must not replace it with the current time. Use `updated_at` to discover changed content; group cards by the preserved release date. New batches get their own release date and unique stable IDs; corrections keep the old IDs/date.

Before importing a new batch, keep an immutable private copy under `.ai/private/lessons/archive/`, stage it in the private queue, and inspect the queue's exact pending set. A canonical staging file or a queued upload is not proof that lessons are visible in the application. Verify the target device's dated library after import and after reload, confirm the previous batch and completion counts still exist, and confirm new lessons activate global offline download. Keep the original archive after successful synchronization clears the pending staging file. Never publish lesson payloads through Git.

If server access fails, retain the private archive and queue, distinguish local device availability from cloud availability, and use the existing Settings local import when authorized. Do not claim availability on other devices without verifying a successful server import. Source-chat observations, user-reported completion and measured exercise results must remain distinct; never invent mastery, transcripts or hint counts when detailed results are unavailable.

## Device download lifecycle

Downloads are explicit user actions. Daily maintenance refreshes the available lesson catalog, without downloading audio automatically. The global download action includes missing built-in lessons, all available generated lessons, stories and audio recordings, including completed content. Readiness requires the current content and all audio; a missing file remains eligible for retry.

Remove downloaded media after 30 days without opening or playback, regardless of completion. Check locally at startup and when the app becomes visible, including offline. Catalog reads and readiness checks must not update last-use time. Keep progress and the durable generated lesson catalog: the latter may contain the only copy of an imported lesson. Device cleanup never deletes server content. Removed downloads remain available for explicit download again; do not restore them through daily background downloads. Speech belonging to a registered download is protected from temporary speech-cache limits, and removing one download must preserve speech shared with another.

Built-in lesson plans can share a generated ID. Store their downloaded lesson snapshots with their template-specific offline records, preserving the lesson ID and saved progress, rather than overwriting one another in the generated lesson store.

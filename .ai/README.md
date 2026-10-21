# Mentor AI Private Workspace

This directory defines the local AI workspace boundary.

Only safe instructions may be committed here. Real learning data must live under:

```text
.ai/private/
```

`.ai/private/` is ignored by Git. Do not commit real lessons, lesson results, Teacher Memory, Teacher Journal, recommendations, progress analytics, voice recordings, generated personal lessons, or any data that can reconstruct the student's learning history.

Production data must be written directly by the backend to private storage such as Postgres through environment-provided credentials. It must not move through Git.

Private authored lessons may be staged locally in `.ai/private/lessons/lesson-library.json`. Run `npm run lessons:queue:status` to inspect unsynchronized changes and `npm run lessons:queue:sync` to make the at-most-daily protected import attempt. The synchronizer fingerprints lesson contents, retains failed work locally, and reports warning and critical backlog ages without committing lesson data.

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

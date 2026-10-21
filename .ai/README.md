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

# Mentor AI Private Workspace

This directory defines the local AI workspace boundary.

Only safe instructions may be committed here. Real learning data must live under:

```text
.ai/private/
```

`.ai/private/` is ignored by Git. Do not commit real lessons, lesson results, Teacher Memory, Teacher Journal, recommendations, progress analytics, voice recordings, generated personal lessons, or any data that can reconstruct the student's learning history.

Production data must be written directly by the backend to private storage such as Postgres through environment-provided credentials. It must not move through Git.

Private authored lessons may be staged locally in `.ai/private/lessons/lesson-library.json`. Run `npm run lessons:queue:status` to inspect unsynchronized changes and `npm run lessons:queue:sync` to make the at-most-daily protected import attempt. The synchronizer fingerprints lesson contents, retains failed work locally, and reports warning and critical backlog ages without committing lesson data.

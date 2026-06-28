# Mentor AI

Mentor AI is a personal AI English learning platform built as a production-oriented npm monorepo. The current implementation includes the first offline-first PWA learning loop, a local Student Model, lesson generation/evaluation rules, IndexedDB persistence, synchronization evidence, and an Express API shell for private learning state.

## Architecture

- `apps/pwa` - Quasar 2, Vue 3, TypeScript PWA with Pinia, Vue Router, IndexedDB persistence, Workbox service worker generation, offline lesson playback, local statistics, and sync controls.
- `apps/api` - Node.js, Express, TypeScript REST API for health, demo user data, lessons, statistics, configuration, recommendations, and learning evidence synchronization.
- `packages/shared` - shared TypeScript contracts plus the first lesson-planning, lesson-generation, scoring, recommendation, observation, and Student Model update functions.
- `docs` - architecture and operating notes.
- `.ai/private` - local personal data directory ignored by Git.

## Current PWA Scope

The PWA can run a complete demo learning session without the API:

- creates a short English lesson from the current Student Model;
- plays text-to-speech prompts when audio text is available;
- scores typed or selected answers locally;
- updates the Student Model after a completed lesson;
- stores the active session, lessons, statistics, speech attempts, and sync queue in IndexedDB;
- shows offline/online state, pending evidence, lesson progress, skill scores, latest accuracy, and manual sync/reset controls;
- queues learning evidence while offline and sends it to the API when available.

The implementation is still intentionally small: it uses deterministic demo lesson content and browser speech synthesis, not production AI generation or advanced pronunciation scoring.

## First Statistics Pass

The next useful step is not to test the student. The next useful step is to let the MVP run through real learning sessions and collect enough product evidence to see where the application is still weak.

This pass should be treated as application diagnostics, not as an exam. Wrong answers, slow answers, skipped exercises, repeated audio, abandoned sessions, and manual concept choices are not personal failures. They are signals that the product may need a better prompt, clearer exercise wording, a different difficulty decision, more forgiving input handling, stronger offline recovery, or a calmer learning flow.

The goal is to answer:

- Can the student open the PWA and start without confusion?
- Does the recommended path feel useful enough to press?
- Do Learning, Reading, and Vocabulary Growth feel like different teaching concepts, not just three buttons?
- Does each completed lesson produce local evidence in IndexedDB?
- Does the Student Model change in a believable way after a lesson?
- Does the next recommendation explain the teacher decision calmly?
- Does offline completion preserve progress and sync later?
- Does any visible statistic make the student feel measured instead of guided?

If a session feels uncomfortable, confusing, boring, too hard, too easy, or mechanical, record that as a product issue. The wording should be "the app did not support this moment well", not "the student failed this moment".

### What To Collect First

The first statistics pass should stay small and repeatable. Run several short sessions across the three concepts and collect:

- selected concept: recommended path, Learning, Reading, or Vocabulary Growth;
- whether the lesson was completed, skipped, abandoned, or restarted;
- accuracy and average response time;
- audio replay count;
- speech attempt availability and whether speech was actually detected;
- unknown words from Reading;
- vocabulary recall status from Vocabulary Growth;
- repeated wrong exercise types;
- teacher level decision: increase, decrease, or hold;
- recommendation text shown after completion;
- whether evidence stayed available after refresh, offline mode, and sync.

This is enough to expose the first serious gaps without building a heavy analytics dashboard.

### How To Interpret The First Data

Use the collected evidence to inspect the product, not the person:

- low accuracy may mean the lesson was too hard, the prompt was unclear, or accepted answers were too strict;
- slow responses may mean the task needs an example, not that the student is weak;
- repeated audio replay may mean listening content is useful, audio is unclear, or the sentence is too long;
- skipped speaking may mean the browser has no speech support, the environment is not private, or the prompt feels unsafe;
- repeated manual choice of one concept may mean preference, current need, or avoidance caused by another mode feeling bad;
- abandoned sessions may mean the flow is too long, progress recovery is unclear, or the next action is not obvious;
- a level decrease is only acceptable when the teacher can explain the evidence gently;
- a level increase should require stable success, not one lucky answer.

The first pass should produce a list of product gaps, for example:

- lesson text is confusing;
- input scoring is too strict;
- Reading content does not yet feel like real reading;
- Vocabulary Growth does not yet remember fragile words deeply enough;
- the Student Model changes too aggressively or too slowly;
- the UI exposes too many raw statistics;
- sync status is technically correct but not understandable;
- offline recovery works in storage but does not feel reassuring;
- speech exercises look like pronunciation testing instead of low-pressure practice.

### MVP Transition Criteria

The project is ready to move from demo loop to the next MVP slice when the first statistics pass shows:

- at least one completed lesson in each concept;
- local evidence preserved after refresh;
- one offline completion followed by later synchronization;
- one Student Model update that changes the next recommendation;
- one clear product issue discovered from Learning;
- one clear product issue discovered from Reading;
- one clear product issue discovered from Vocabulary Growth;
- no private learning data committed to Git.

After that, the next implementation work should be chosen from evidence. Do not add broad features because they sound useful. Fix the product moments where the first sessions show friction, missing evidence, weak adaptation, or student-facing pressure.

## Agent Expansion Prompt

Use this section as the product and architecture prompt for any future AI coding agent that scales Mentor AI beyond the current demo loop.

Mentor AI must be expanded into three clear learning concepts:

1. Learning
2. Reading
3. Vocabulary Growth

These concepts are not just navigation tabs. They are teaching modes with different goals, signals, content types, and adaptation rules. The application should understand which concept the student chooses, observe how the student performs inside that concept, and respond by changing the next lesson, the difficulty level, and the learning path.

### Product Direction

The application should feel like one personal English teacher with three focused ways to study.

Learning is the main guided lesson path. It should teach grammar, sentence construction, listening, speaking, recall, and practical usage through adaptive lessons. This mode is responsible for broad skill development and should decide when to review, when to introduce new material, and when to slow down.

Reading is the comprehension path. It should give the student texts that match their level, then observe comprehension, unknown words, reading speed, repeated confusion, and ability to answer questions about meaning. Reading should not be passive. It should become evidence for the Student Model.

Vocabulary Growth is the word expansion path. It should help the student learn, review, recognize, recall, pronounce, and use words in context. It should track fragile words, mastered words, confused words, slow recall, and words that the student can recognize but cannot actively use.

The system must treat the student's chosen concept as a strong signal, but not the only signal. If the student repeatedly chooses Vocabulary Growth, the teacher should understand that vocabulary may be a current need or preference. If the student avoids Reading, the teacher should notice the avoidance and gently adapt. If the student performs well in Learning but struggles in Reading, the system should not assume global progress; it should adjust reading level separately.

### Adaptive System Under The Hood

Under the UI, Mentor AI needs an adaptive teaching system that continuously answers these questions:

- Which concept did the student choose?
- What level is the student currently showing in that concept?
- Was the student's performance stable, fragile, overloaded, or too easy?
- Should the next activity increase difficulty, decrease difficulty, repeat, or change style?
- Which evidence should update the Student Model?
- What should the teacher prepare next?

The system should never raise or lower level randomly. Every change must be based on evidence such as accuracy, response speed, number of hints, repeated mistakes, skipped tasks, reading comprehension, vocabulary recall, pronunciation attempts, confidence signals, completion rate, and recent learning history.

### Retention And Avoidance Analysis

Mentor AI must understand not only what the student does, but also what the student has not done for a long time.

The system should track when each concept, skill, grammar structure, reading level, and vocabulary group was last practiced. If something important has not been practiced recently, the teacher should gently bring it back as a check, review, or short reinforcement activity.

The teacher should recognize that a student may avoid difficult or boring work. Avoidance should be treated as a learning signal, not as a reason to blame the student. If the student repeatedly chooses easier concepts, skips reading, abandons vocabulary review, or avoids speaking/writing tasks, the system should notice the pattern and adapt.

The system should ask internally:

- What has the student not practiced recently?
- Which skill may be getting weaker because too much time passed?
- Which concept is the student avoiding?
- Is the student choosing only easy tasks to avoid effort?
- Should the teacher recommend a short check before moving forward?
- Should the next activity be framed as practice, review, recovery, or confidence rebuilding?

The response should be calm and teacher-like. For example:

- "You have not practiced reading for a while. Let us try a short text and check if this level still feels comfortable."
- "These words were strong before, but they have not appeared recently. Let us quickly reinforce them before adding new ones."
- "Speaking has been skipped a few times, so the next task will be very short and low pressure."

Avoidance analysis should not punish the student. The teacher should use it to reduce friction, choose smaller tasks, rebuild confidence, and protect long-term progress. If the student avoids something because it is too hard, the system should lower difficulty or switch to recovery. If the student avoids something because it is boring but already stable, the system may reduce repetition and move forward.

Retention checks should be lightweight. A check can be one short reading, a few vocabulary recalls, a simple grammar use task, or a short speaking prompt. The goal is to verify whether the skill is still active before deciding whether to increase level, hold level, or review.

### Level Adaptation Rules

Increase level when the student shows stable success:

- answers are mostly correct;
- response speed improves;
- the same skill works across more than one exercise;
- fewer hints are needed;
- the student completes tasks without visible overload;
- recent sessions show consistency, not just one lucky result.

Decrease level when the student shows overload:

- repeated mistakes appear in the same pattern;
- comprehension drops;
- response speed becomes slow even on familiar material;
- the student skips or abandons tasks;
- too many hints are required;
- confidence or completion falls;
- the student returns after a long break and needs recovery.

Hold level when evidence is mixed:

- some answers are correct but slow;
- recognition works but active recall fails;
- reading comprehension is good but vocabulary usage is weak;
- the student succeeds only with hints;
- the current level is possible but not stable yet.

The level system should support independent levels per concept. A student may be A2 in guided Learning, A1 in Reading, and stronger or weaker in specific vocabulary domains. Do not collapse everything into one global number unless the code also preserves concept-specific evidence.

### Concept-Specific Agent Instructions

When building Learning, create a guided lesson engine that can mix explanation, examples, exercises, listening, speaking, typing, correction, and review. The agent should connect every lesson to a reason from the Student Model.

When building Reading, create leveled reading sessions with comprehension questions, unknown-word capture, sentence explanations, optional translation support, and follow-up vocabulary extraction. Reading should feed evidence back into Vocabulary Growth and Learning.

When building Vocabulary Growth, create a word learning loop with spaced review, recognition, active recall, usage in sentences, pronunciation support, and context examples. Vocabulary should not be just a list; every word should have status, history, difficulty, and next-review logic.

### Data To Preserve

Future implementation should extend the Student Model with concept-aware evidence:

- selected concept;
- current concept level;
- activity type;
- target skill;
- target words or grammar structures;
- accuracy;
- response time;
- hint usage;
- skipped or abandoned items;
- repeated mistakes;
- last practiced at;
- days since last practice;
- avoidance pattern;
- retention risk;
- review urgency;
- reading text level;
- reading comprehension score;
- unknown words;
- vocabulary recall status;
- teacher decision;
- reason for level change;
- next recommended concept and activity.

This evidence should be stored locally first and synchronized later, following the existing offline-first privacy model.

### Expected User Experience

The first screen should make the three concepts easy to choose without making the app feel like a course catalog. The student should be able to start quickly:

- continue the teacher-recommended path;
- choose Learning;
- choose Reading;
- choose Vocabulary Growth.

If the student chooses manually, the teacher should respect the choice and adapt inside it. If the teacher recommends a different concept, the recommendation should be calm and specific, for example: "Reading is a little fragile today, so the next session will use a shorter text with familiar vocabulary."

The interface should not expose raw algorithm details. The student should feel guided, not measured.

### Implementation Priority

Build the expansion in this order:

1. Add concept types and concept-specific state to shared contracts.
2. Extend the Student Model with separate concept levels and evidence history.
3. Add lesson planning rules that choose concept, activity type, and level change.
4. Add PWA concept selection and teacher recommendation UI.
5. Add Reading sessions.
6. Add Vocabulary Growth sessions.
7. Connect all concepts to offline evidence storage and API synchronization.
8. Add tests for level increase, level decrease, level hold, concept switching, and offline evidence replay.

Keep the implementation small at first. The first version can use deterministic content, but the architecture must make room for a guarded AI teacher pipeline later.

## Run Frontend

```bash
npm install
npm run dev:pwa
```

The PWA runs with Quasar dev tooling. PWA mode and Workbox service worker generation are configured for production builds.

```bash
npm run build:pwa
```

## Run Backend

```bash
npm install
npm run dev:api
```

The API defaults to `http://localhost:4000` and exposes health, demo user, lesson, and statistics route placeholders.

```bash
npm run build:api
npm run start --workspace @mentor-ai/api
```

## Demo Mode

Set `STORAGE_MODE=demo` or leave the default from `.env.example`. Demo mode uses committed fake fixtures in `apps/api/src/data/demo` so the app can run safely without personal files.

## Personal Mode

Set `STORAGE_MODE=personal`. Real lessons, progress, statistics, AI notes, Teacher Memory, Teacher Journal, and speech recognition results belong under `.ai/private/`.

The `.ai/private/` directory is ignored by Git so personal data stays local. Only `.ai/README.md` is committed to document the privacy boundary. Production data should be written directly by the backend to private database storage through environment-provided credentials such as `DATABASE_URL`; it must not move through Git.

## Production Storage

The current backend/runtime is a Node.js Express API in `apps/api`. For Vercel production, use a private Postgres database such as Neon Postgres, Vercel Postgres, or Supabase Postgres and set `DATABASE_URL` in Vercel environment variables. The starter migration is in `migrations/001_private_learning_state.sql`.

## Remaining Product Work

- replace deterministic demo lesson generation with a guarded AI teacher pipeline;
- add authenticated personal profiles before real multi-user production use;
- persist API state to the configured private database instead of demo files;
- add richer speech recognition/pronunciation feedback behind explicit browser permissions;
- add a reading-library import pipeline that stores books, chapters, pages, reading attempts, pronunciation issues, and follow-up vocabulary practice offline first;
- add end-to-end PWA install/update tests for target devices.

## Reading Library Import Direction

The reading pipeline should be built as provider adapters, not as site-specific logic embedded in the learning engine. A provider adapter may discover metadata, chapter/page counts, and page text, then normalize everything into shared reading contracts before it reaches IndexedDB.

For sites such as Liteka, the adapter must respect copyright, robots rules, rate limits, and user authorization. Mentor AI should only download and store books from public-domain sources, licensed providers, explicit exports, or user-owned materials. Once content is imported, the PWA can read it fully offline, record the student's speech, compare the transcript with the expected page text, extract mispronounced or unknown words, and schedule those words for separate practice and sentence-based review.

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run format
```

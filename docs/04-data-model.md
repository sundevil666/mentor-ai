# Mentor AI Data Model

## Introduction

Mentor AI data exists to represent the student's learning journey.

It should describe what the system knows, what happened during learning, what the AI Teacher inferred, what the student needs next, and which evidence supports those conclusions. It should not begin with storage mechanics, database tables, API payloads, framework state, or implementation convenience.

The purpose of this document is to define the important data objects in Mentor AI before deciding how they will be stored.

The central rule is simple:

**Everything stored should help the AI become a better teacher.**

Data should preserve attention. A real teacher remembers what the student tried, where they hesitated, which mistakes returned, which explanation helped, when confidence improved, and when tiredness changed the meaning of an answer. Mentor AI must preserve the same kind of memory in structured form.

The data model should therefore favor learning meaning over technical shape. A completed exercise is not just an answer. It is evidence. A lesson is not just content. It is an instructional artifact created for a reason. A statistic is not progress by itself. It is a signal that may help the AI Teacher interpret the student's state.

The Student Model remains the center of the system. Other data exists to create, challenge, explain, update, and protect that model.

This document is not a database design. It does not define tables, keys, indexes, JSON schemas, or transport formats. Those decisions must come later and must follow this conceptual model.

## Canonical Ownership And Metadata

This document is the canonical source for domain object metadata. Other documents may describe how a module uses an object, but they should not duplicate ownership, persistence, lifecycle, privacy, or versioning rules.

The metadata format follows [Documentation Style](12-documentation-style.md). When implementation introduces a new important object, add its canonical metadata here before using it in code, prompts, analytics labels, or synchronization contracts.

### Student

| Field | Value |
| --- | --- |
| Type | Persistent object |
| Owner | Student |
| Source of Truth | Student identity and explicit preferences |
| Mutable | Mutable |
| Persistence | Persistent |
| Lifetime | Forever or until the learning relationship is deleted |
| Offline | Supported |
| Synchronization | Required for multi-device continuity |
| Privacy | Personal |
| Git | Prohibited for real student data |
| Versioned | Optional |
| AI Reads | Limited |
| AI Writes | No |
| Dependencies | Learning Preferences |
| Consumers | PWA Client, Backend, Student Model, Synchronization |

### Student Model

| Field | Value |
| --- | --- |
| Type | Persistent object |
| Owner | Student Model |
| Source of Truth | Latest validated Student Model version derived from evidence |
| Mutable | Versioned |
| Persistence | Persistent |
| Lifetime | Forever, with significant changes preserved |
| Offline | Required as a local readable copy |
| Synchronization | Required through controlled model updates |
| Privacy | Sensitive |
| Git | Prohibited for real student data |
| Versioned | Required |
| AI Reads | Yes |
| AI Writes | Proposed only, validated before storage |
| Dependencies | Student, Learning Analytics, Teacher Journal, Teacher Memory |
| Consumers | AI Teacher, Lesson Engine, Learning Analytics, Synchronization, PWA Client |

### Learning Session

| Field | Value |
| --- | --- |
| Type | Persistent object |
| Owner | Learning |
| Source of Truth | Learning Events accepted for the session |
| Mutable | Append-only while active, immutable after completion |
| Persistence | Persistent |
| Lifetime | Forever as learning history |
| Offline | Required |
| Synchronization | Required |
| Privacy | Personal |
| Git | Prohibited for real student data |
| Versioned | Optional |
| AI Reads | Yes |
| AI Writes | No |
| Dependencies | Student, Lesson, Learning Event |
| Consumers | Learning Analytics, AI Teacher, Student Model, Synchronization |

### Lesson Plan

| Field | Value |
| --- | --- |
| Type | Persistent planning object |
| Owner | AI Teacher |
| Source of Truth | AI Teacher teaching decision grounded in Student Model evidence |
| Mutable | Versioned |
| Persistence | Persistent while active, historical after superseded |
| Lifetime | Until completed, superseded, or archived |
| Offline | Supported as downloaded plan context |
| Synchronization | Required when plans change |
| Privacy | Sensitive |
| Git | Prohibited for real student data |
| Versioned | Required |
| AI Reads | Yes |
| AI Writes | Proposed only, validated before storage |
| Dependencies | Student Model, Teacher Journal, Teacher Memory, Learning Goal |
| Consumers | Lesson Engine, Synchronization, PWA Client, Learning Analytics |

### Lesson

| Field | Value |
| --- | --- |
| Type | Persistent object |
| Owner | Learning |
| Source of Truth | Validated Lesson definition |
| Mutable | Versioned until attempted, immutable after use |
| Persistence | Persistent |
| Lifetime | Forever as learning history after use |
| Offline | Required when assigned or downloaded |
| Synchronization | Required for completion and availability state |
| Privacy | Personal unless explicitly demo data |
| Git | Example only |
| Versioned | Required |
| AI Reads | Yes |
| AI Writes | Proposed only through Lesson Engine validation |
| Dependencies | Learning Goal, Lesson Plan, Exercise |
| Consumers | PWA Client, Learning Session, Learning Analytics, AI Teacher |

### Generated Lesson

| Field | Value |
| --- | --- |
| Type | Persistent artifact |
| Owner | Lesson Engine |
| Source of Truth | Validated Generated Lesson linked to teaching intent |
| Mutable | Versioned until attempted, immutable after use |
| Persistence | Persistent |
| Lifetime | Forever as teaching and learning history after use |
| Offline | Required when made available locally |
| Synchronization | Required for availability, completion, and analysis |
| Privacy | Sensitive |
| Git | Prohibited for real student data |
| Versioned | Required |
| AI Reads | Yes |
| AI Writes | Proposed only, validated before storage |
| Dependencies | Student Model, Lesson Plan, Learning Goal, Lesson Template |
| Consumers | PWA Client, Learning Analytics, AI Teacher, Synchronization |

### Exercise Result

| Field | Value |
| --- | --- |
| Type | Persistent evidence object |
| Owner | Learning |
| Source of Truth | Student attempt captured during an Exercise |
| Mutable | Immutable |
| Persistence | Persistent |
| Lifetime | Forever as raw learning evidence |
| Offline | Required |
| Synchronization | Required and idempotent |
| Privacy | Personal |
| Git | Prohibited for real student data |
| Versioned | No |
| AI Reads | Yes |
| AI Writes | No |
| Dependencies | Student, Learning Session, Lesson, Exercise |
| Consumers | Learning Analytics, AI Teacher, Student Model, Synchronization |

### Speech Result

| Field | Value |
| --- | --- |
| Type | Persistent evidence object |
| Owner | Speech Layer |
| Source of Truth | Captured speech interaction and validated speech processing outcome |
| Mutable | Immutable |
| Persistence | Persistent when meaningful, ephemeral for raw buffers |
| Lifetime | According to privacy and retention rules; derived evidence may remain forever |
| Offline | Supported, with local capture required when speech is available |
| Synchronization | Required only when privacy rules allow |
| Privacy | Sensitive |
| Git | Prohibited |
| Versioned | No |
| AI Reads | Limited or only with permission for raw/transcribed speech |
| AI Writes | No |
| Dependencies | Exercise, Learning Session, Speech Availability, Audio Asset |
| Consumers | Learning Analytics, AI Teacher, Student Model, Synchronization |

### Learning Event

| Field | Value |
| --- | --- |
| Type | Event |
| Owner | Learning |
| Source of Truth | Actual student activity captured by the PWA Client |
| Mutable | Append-only |
| Persistence | Persistent until safely processed and compacted without losing meaning |
| Lifetime | Forever when educational meaning is needed, otherwise until summarized |
| Offline | Required |
| Synchronization | Required and idempotent |
| Privacy | Personal |
| Git | Prohibited for real student data |
| Versioned | No |
| AI Reads | Yes after validation |
| AI Writes | No |
| Dependencies | Student, Learning Session, Lesson or Exercise context |
| Consumers | Synchronization, Learning Analytics, Teacher Journal, Student Model |

### Observation

| Field | Value |
| --- | --- |
| Type | Persistent interpreted object |
| Owner | AI Teacher |
| Source of Truth | Evidence-grounded AI Teacher interpretation |
| Mutable | Immutable, superseded by later Observations |
| Persistence | Persistent |
| Lifetime | Forever as teaching history unless privacy deletion applies |
| Offline | Supported as downloaded context or pending local evidence |
| Synchronization | Required when created or superseded |
| Privacy | Sensitive |
| Git | Prohibited for real student data |
| Versioned | No |
| AI Reads | Yes |
| AI Writes | Yes, validated before storage |
| Dependencies | Exercise Result, Speech Result, Statistics Snapshot, Learning Session |
| Consumers | Teacher Journal, Teacher Memory, Student Model, Recommendation |

### Recommendation

| Field | Value |
| --- | --- |
| Type | Persistent teaching guidance |
| Owner | AI Teacher |
| Source of Truth | Active AI Teacher guidance derived from Observations and Student Model |
| Mutable | Versioned or superseded |
| Persistence | Persistent |
| Lifetime | Until completed, expired, or superseded; history retained |
| Offline | Supported |
| Synchronization | Required for active state and outcome |
| Privacy | Personal or sensitive depending on content |
| Git | Prohibited for real student data |
| Versioned | Required for meaningful changes |
| AI Reads | Yes |
| AI Writes | Yes, validated before storage |
| Dependencies | Observation, Student Model, Learning Goal, Teacher Journal |
| Consumers | Lesson Plan, Lesson Engine, PWA Client, Learning Analytics |

### Teacher Journal

| Field | Value |
| --- | --- |
| Type | Persistent narrative teaching record |
| Owner | AI Teacher |
| Source of Truth | Accepted journal entries grounded in Observations and decisions |
| Mutable | Append-only |
| Persistence | Persistent |
| Lifetime | Forever as teaching history unless privacy deletion applies |
| Offline | Supported as summary; full writing may be deferred |
| Synchronization | Required |
| Privacy | Sensitive |
| Git | Prohibited for real student data |
| Versioned | Optional; entries are immutable |
| AI Reads | Yes |
| AI Writes | Yes, validated before storage |
| Dependencies | Educational Insight, Observation, Recommendation, Lesson Plan |
| Consumers | AI Teacher, Teacher Memory, Student Model, Learning Analytics |

### Teacher Memory

| Field | Value |
| --- | --- |
| Type | Persistent long-term teaching knowledge |
| Owner | AI Teacher |
| Source of Truth | Validated long-term memory derived from repeated evidence |
| Mutable | Versioned |
| Persistence | Persistent |
| Lifetime | Until superseded, corrected, forgotten by policy, or deleted by privacy action |
| Offline | Supported as local planning context |
| Synchronization | Required and conflict-aware |
| Privacy | Sensitive |
| Git | Prohibited for real student data |
| Versioned | Required |
| AI Reads | Yes |
| AI Writes | Proposed only, validated before storage |
| Dependencies | Teacher Journal, Observation, Learning Analytics, Student Model |
| Consumers | AI Teacher, Lesson Plan, Lesson Engine, Student Model |

### Statistics Snapshot

| Field | Value |
| --- | --- |
| Type | Derived object |
| Owner | Learning Analytics |
| Source of Truth | Underlying Learning Events, Exercise Results, and Speech Results |
| Mutable | Regenerable |
| Persistence | Derived, sometimes persisted |
| Lifetime | Until superseded, compacted, or retained as a milestone |
| Offline | Supported for local feedback and synchronization |
| Synchronization | Supported when needed for continuity |
| Privacy | Personal |
| Git | Prohibited for real student data |
| Versioned | Optional |
| AI Reads | Yes |
| AI Writes | No |
| Dependencies | Learning Event, Exercise Result, Speech Result |
| Consumers | Learning Analytics, AI Teacher, Observation, Student Model |

### Synchronization State

| Field | Value |
| --- | --- |
| Type | Process state |
| Owner | Synchronization |
| Source of Truth | Local queue plus backend acknowledgements |
| Mutable | Mutable |
| Persistence | Mixed |
| Lifetime | Until all related work is acknowledged and recoverable |
| Offline | Required |
| Synchronization | Self-referential; reconciles local and durable state |
| Privacy | Personal |
| Git | Prohibited for real student data |
| Versioned | Required for protocol changes |
| AI Reads | Limited |
| AI Writes | No |
| Dependencies | Learning Event, Exercise Result, Speech Result, Generated Lesson |
| Consumers | PWA Client, Backend, Learning Analytics, AI Teacher |

## Data Categories

Mentor AI data belongs to three categories:

* Persistent Data
* Derived Data
* Ephemeral Data

These categories describe the meaning and lifetime of data, not where it is stored.

## Persistent Data

Persistent Data is long-term information that should remain available because it helps preserve the student's learning history, current state, or future teaching quality.

Examples include:

* Student
* Student Model
* Learning History
* Learning Sessions
* Lessons
* Generated Lessons
* Exercise Results
* Speech Results
* Observations
* Recommendations
* Preferences
* Learning Goals
* Audio Assets
* Vocabulary Items
* Grammar Topics
* Synchronization History

Persistent Data is the durable memory of Mentor AI. It should be protected, synchronized when appropriate, and treated as educationally meaningful.

Persistent does not mean everything is permanent forever. Some persistent objects may expire, become superseded, or be archived. The important distinction is that persistent objects are part of the student's learning record or teaching context and should not disappear accidentally when a screen closes or the device restarts.

## Derived Data

Derived Data is information calculated from Persistent Data.

Examples include:

* Listening Score
* Grammar Score
* Vocabulary Score
* Speaking Score
* Confidence
* Mastery
* Weakness Ranking
* Learning Trends
* Progress Indicators
* Fatigue Estimate
* Estimated Level
* Recent Accuracy
* Response Speed Trend
* Retention Strength

Derived Data is useful because it gives the AI Teacher a compressed view of learning behavior. It can make planning faster, reveal trends, and support recommendations.

Derived Data must never become the primary source of truth.

A score should be reproducible from the underlying history, observations, and model state that produced it. If a derived value becomes wrong, stale, or inconsistent, the system should be able to rebuild or replace it from persistent evidence.

Derived Data may be stored for performance, offline use, comparison, or explanation, but it should always remain subordinate to the underlying learning history and Student Model.

## Ephemeral Data

Ephemeral Data is temporary runtime information used while the app, lesson, speech layer, or synchronization process is active.

Examples include:

* Speech Recognition Buffer
* Current Playback State
* Synchronization Queue while processing
* Lesson Timer
* Temporary AI Context
* Upload Queue
* Current Exercise Focus
* In-Progress Recording Buffer
* Local Retry State
* Temporary Prompt Assembly Context

Ephemeral Data should not be permanently stored unless it becomes meaningful evidence.

A speech recognition buffer, for example, is not automatically a Speech Result. A playback position is not automatically learning history. A temporary AI prompt is not automatically an Observation. Runtime data becomes persistent only when it helps explain learning, preserve continuity, recover from failure, or improve future teaching decisions.

Ephemeral Data should be small, replaceable, and disposable. The system should assume it can be lost and still preserve the student's real learning history.

## Core Data Objects

## Student

### Purpose

The Student represents the person learning through Mentor AI.

The Student anchors identity, privacy, continuity, preferences, goals, lessons, sessions, and the Student Model. Mentor AI is initially optimized for one student, but the concept must still be explicit because all learning history belongs to a specific person.

### Responsibilities

The Student object identifies whose learning journey is being represented. It connects the human learner to their model, sessions, generated lessons, preferences, goals, and private history.

It should not contain every detail about learning ability. That responsibility belongs to the Student Model.

### Lifecycle

The Student begins when a learner first uses Mentor AI or is created for a learning context.

At first, little may be known. Over time, the Student accumulates history, preferences, goals, generated lessons, and model updates. The Student can remain active indefinitely.

### Relationships

The Student owns or anchors:

* Student Model
* Learning Sessions
* Lessons
* Exercise Results
* Observations
* Recommendations
* Learning Goals
* Preferences
* Audio Assets
* Synchronization State

### Persistent Fields

Persistent Student data may include identity, active learning language, native or support language, account-level preferences, accessibility needs, active status, and links to the current Student Model and learning goals.

### Derived Fields

Derived Student data may include estimated level, activity rhythm, recent progress state, current readiness, and high-level learning phase.

### Possible Future Extensions

Future extensions may include multiple languages, multiple teacher profiles, guardian or coach relationships, migration between devices, and shared learning contexts.

## Student Model

### Purpose

The Student Model is the durable teaching memory of Mentor AI.

It represents what the system currently understands about the student's ability, weaknesses, strengths, confidence, memory, fatigue, preferences, response patterns, and readiness for future learning.

### Responsibilities

The Student Model guides personalization. The AI Teacher reads it before deciding what the student needs next. The Lesson Engine responds to teaching intent shaped by it. Learning Analytics refines it. Synchronization protects it.

The Student Model should summarize current understanding without replacing immutable history. It is the current interpretation, not the full evidence archive.

### Lifecycle

The Student Model starts sparse and uncertain. Every meaningful session can update it.

It should evolve continuously as the system receives new exercise results, speech results, observations, recommendations, and learning trends. Older versions or meaningful changes may be preserved for audit, rollback, comparison, and AI improvement.

### Relationships

The Student Model belongs to a Student and is informed by Learning Sessions, Exercise Results, Speech Results, Observations, Statistics Snapshots, Vocabulary Items, Grammar Topics, Listening Topics, Difficulty Profiles, Fatigue Profiles, and Learning Preferences.

It produces context for Recommendations, Generated Lessons, and Learning Goals.

### Persistent Fields

Persistent Student Model data may include current skill understanding, known weaknesses, reliable strengths, mastery estimates, confidence patterns, fatigue patterns, vocabulary state, grammar state, listening state, speaking state, learning pace, preferred exercise patterns, and instructional constraints.

### Derived Fields

Derived fields may include estimated level, current readiness, weakness ranking, mastery score, confidence score, retention trend, fatigue estimate, learning velocity, and topic priority.

### Possible Future Extensions

Future extensions may include richer memory models, teacher-specific interpretations, multi-language models, pronunciation modeling, conversation ability, emotional readiness, and model version comparison.

## Learning Session

### Purpose

A Learning Session represents a period of active learning by the Student.

It gives context to lessons, exercises, timing, fatigue, interruptions, retries, and completion. The same mistake can mean different things depending on where it occurred in a session.

### Responsibilities

The Learning Session groups learning activity into a meaningful human episode. It helps the AI Teacher understand rhythm, endurance, attention, fatigue, and session-level outcomes.

### Lifecycle

A session begins when the student starts learning and ends when the student finishes, abandons, times out, or the system closes the learning episode.

Completed sessions should be preserved as history.

### Relationships

A Learning Session belongs to a Student. It may contain one or more Lessons, Exercises, Exercise Results, Speech Results, Observations, Statistics Snapshots, and synchronization events.

### Persistent Fields

Persistent fields may include start time, end time, duration, completion state, lessons attempted, offline or online context, interruptions, session intent, and session outcome.

### Derived Fields

Derived fields may include fatigue estimate, engagement trend, session difficulty, average response time, success rate, recovery after mistakes, and learning value.

### Possible Future Extensions

Future extensions may include mood check-ins, energy estimation, environmental context, session type, conversation mode, and teacher notes.

## Learning Event

### Purpose

A Learning Event records the smallest meaningful fact that happened during learning.

It preserves raw evidence before Learning Analytics, the AI Teacher, or the Student Model interprets it.

### Responsibilities

The Learning Event records factual activity such as lesson start, exercise completion, speech detection, audio replay, skipped work, hint use, timing, interruption, local feedback, or synchronization progress.

It must not judge the student or explain the meaning of the event.

### Lifecycle

A Learning Event is created by the PWA Client during learning, especially while offline. It is queued locally, synchronized idempotently, validated by the Backend, and then used by Learning Analytics.

Events should be append-only in spirit. They may later be compacted only when educational meaning is preserved.

### Relationships

A Learning Event belongs to a Student and usually relates to a Learning Session, Lesson, Exercise, Exercise Result, Speech Result, or Synchronization State.

Learning Events produce evidence for Exercise Results, Statistics Snapshots, Observations, Teacher Journal entries, Teacher Memory updates, and Student Model changes.

### Persistent Fields

Persistent fields may include event type, event time, local sequence, source device, related lesson or exercise, captured fact, synchronization identity, and version.

### Derived Fields

Derived fields may include processing status, duplicate status, ordering confidence, educational relevance, and compaction eligibility.

### Possible Future Extensions

Future extensions may include richer device context, privacy-preserving local summaries, event provenance chains, and recovery diagnostics.

## Lesson Plan

### Purpose

A Lesson Plan is the AI Teacher's planned teaching direction before one or more specific lessons are generated.

It connects evidence, Learning Goals, Recommendations, Teacher Journal context, Teacher Memory, and Student Model state into a coherent next teaching move.

### Responsibilities

The Lesson Plan defines what should happen next and why. It may specify review, challenge, recovery, listening focus, speaking practice, grammar stabilization, vocabulary transfer, difficulty direction, expected evidence, and constraints for the Lesson Engine.

The Lesson Plan is not a Lesson. It guides Lesson generation.

### Lifecycle

A Lesson Plan is created or revised when the AI Teacher has enough evidence to choose a teaching direction. It may remain active across one session, shape several Generated Lessons, or be superseded after new evidence arrives.

Plan history should be retained so Mentor AI can evaluate whether teaching direction worked.

### Relationships

A Lesson Plan belongs to a Student and depends on Student Model state, Learning Goals, Recommendations, Observations, Teacher Journal entries, Teacher Memory, and Learning Context.

It is consumed by the Lesson Engine and may produce Generated Lessons.

### Persistent Fields

Persistent fields may include plan purpose, target skills, target topics, strategy, evidence summary, constraints, expected evidence, active state, source model version, and replacement reason.

### Derived Fields

Derived fields may include freshness, confidence, priority, risk of overload, and lesson readiness.

### Possible Future Extensions

Future extensions may include multi-day plans, plan comparison, teacher strategy experiments, and student-visible plan summaries.

## Lesson

### Purpose

A Lesson is a purposeful learning experience prepared for the Student.

It exists because the AI Teacher or lesson plan has a teaching reason.

### Responsibilities

The Lesson organizes exercises, prompts, explanations, audio, and expected outcomes around a teaching purpose. It should create useful learning and useful evidence.

### Lifecycle

A Lesson may be planned, generated, assigned, started, completed, skipped, abandoned, reviewed, or archived.

Once completed, its historical record should not be changed.

### Relationships

A Lesson belongs to a Student and may belong to a Learning Session. It may be based on a Lesson Template and may exist as a Generated Lesson. It contains Exercises and produces Exercise Results, Speech Results, Observations, Statistics Snapshots, and Student Model updates.

### Persistent Fields

Persistent fields may include teaching purpose, target skills, target topics, difficulty intent, exercise sequence, expected evidence, creation context, completion state, and relationship to recommendations or goals.

### Derived Fields

Derived fields may include lesson effectiveness, completion quality, difficulty match, student readiness, and follow-up priority.

### Possible Future Extensions

Future extensions may include multi-day lessons, adaptive branching, conversation lessons, teacher explanations, regenerated variants, and lesson quality scoring.

## Lesson Template

### Purpose

A Lesson Template is a reusable instructional structure.

It defines a teaching pattern without deciding whether the student needs that pattern now.

### Responsibilities

The Lesson Template gives the Lesson Engine reliable forms for practice, review, listening, speaking, grammar correction, vocabulary recall, conversation, shadowing, or diagnosis.

### Lifecycle

Templates may be created, improved, deprecated, or replaced. A template can evolve, but lessons generated from an older version should preserve the historical context of what was used.

### Relationships

A Lesson Template can produce many Generated Lessons. It may target Vocabulary Items, Grammar Topics, Listening Topics, Difficulty Profiles, and Learning Goals.

### Persistent Fields

Persistent fields may include instructional pattern, supported exercise types, intended skill focus, difficulty behavior, required inputs, expected outputs, and template purpose.

### Derived Fields

Derived fields may include effectiveness across uses, suitability for a student state, difficulty stability, and failure rate.

### Possible Future Extensions

Future extensions may include teacher-authored templates, AI-discovered templates, language-specific templates, template versioning, and adaptive template selection.

## Generated Lesson

### Purpose

A Generated Lesson is a Lesson created specifically for the Student from teaching intent and current Student Model context.

It is personal, contextual, and replaceable.

### Responsibilities

The Generated Lesson records what the system chose to teach, why it chose that focus, and what content was created for that purpose.

It allows later comparison between teaching intent and learning outcome.

### Lifecycle

A Generated Lesson is created, made available, possibly used offline, completed or skipped, analyzed, and preserved as learning history.

After completion, it should be immutable except for analysis attached around it.

### Relationships

A Generated Lesson belongs to a Student, is based on Student Model context, may use a Lesson Template, contains Exercises, and is connected to Recommendations, Learning Goals, Observations, and Exercise Results.

### Persistent Fields

Persistent fields may include generation reason, teaching intent, source context, target skills, generated content, exercise sequence, difficulty assumptions, personalization inputs, and creation time.

### Derived Fields

Derived fields may include effectiveness, difficulty fit, completion quality, relevance, and regeneration priority.

### Possible Future Extensions

Future extensions may include reproducibility metadata, alternative variants, prompt lineage, teacher rationale, model comparison, and content safety review.

## Exercise

### Purpose

An Exercise is a single task inside a Lesson.

It asks the Student to do something observable.

### Responsibilities

An Exercise presents a prompt, creates a learning action, and produces evidence through the student's response.

It should have a reason to exist inside the lesson.

### Lifecycle

An Exercise is created as part of a Lesson or Generated Lesson, presented to the student, attempted, completed, skipped, retried, or abandoned.

The Exercise definition should remain stable once the student has attempted it.

### Relationships

An Exercise belongs to a Lesson and may target Vocabulary Items, Grammar Topics, Listening Topics, Difficulty Profiles, or Learning Goals. It produces Exercise Results and may produce Speech Results.

### Persistent Fields

Persistent fields may include prompt, exercise type, expected answer or outcome, target skill, target topic, allowed support, difficulty intent, audio reference, and evaluation criteria.

### Derived Fields

Derived fields may include observed difficulty, discrimination value, error pattern, and usefulness for future lessons.

### Possible Future Extensions

Future extensions may include branching exercises, multi-turn exercises, conversational tasks, pronunciation scoring, and adaptive hints.

## Exercise Result

### Purpose

An Exercise Result records what happened when the Student attempted an Exercise.

It is evidence.

### Responsibilities

The Exercise Result preserves correctness, timing, attempts, hesitation, support used, answer quality, and other outcome signals that help the AI Teacher interpret learning.

### Lifecycle

An Exercise Result is created during or after an exercise attempt. Once recorded, it should be immutable.

Corrections or reinterpretations should be added as new analysis, not by rewriting the original result.

### Relationships

An Exercise Result belongs to a Student, Learning Session, Lesson, and Exercise. It may include or reference Speech Results. It informs Observations, Statistics Snapshots, and Student Model updates.

### Persistent Fields

Persistent fields may include response, correctness, response time, attempt count, hints used, completion state, confidence signal, evaluation notes, and context at the time of attempt.

### Derived Fields

Derived fields may include skill impact, fatigue contribution, difficulty estimate, confidence estimate, mastery impact, and error classification.

### Possible Future Extensions

Future extensions may include self-correction analysis, partial-credit reasoning, teacher feedback, answer confidence, and comparison with similar prior attempts.

## Speech Result

### Purpose

A Speech Result records evidence from spoken interaction.

It helps the system understand speaking ability, listening response, fluency, pronunciation-related behavior, timing, and confidence.

### Responsibilities

The Speech Result preserves meaningful speech outcomes without confusing raw audio processing buffers with durable learning evidence.

### Lifecycle

A Speech Result is created when a speech interaction produces meaningful evidence. It should be immutable after creation.

Raw or temporary audio may be discarded unless preservation is necessary and privacy rules allow it.

### Relationships

A Speech Result belongs to a Student and usually relates to a Learning Session, Lesson, Exercise, Audio Asset, and Voice Profile. It informs Observations, Speaking Score, Confidence, Fatigue Profile, and Student Model updates.

### Persistent Fields

Persistent fields may include detected speech, transcription, response start delay, duration, completeness, recognition confidence, repetition count, interruption, and evaluation notes.

### Derived Fields

Derived fields may include speaking confidence, fluency estimate, pronunciation signal, fatigue signal, and speaking readiness.

### Possible Future Extensions

Future extensions may include pronunciation analysis, accent adaptation, conversation turn quality, speech anxiety indicators, and audio comparison over time.

## Observation

### Purpose

An Observation is interpreted AI knowledge about the Student.

It turns evidence into teaching meaning.

### Responsibilities

An Observation explains what the AI Teacher believes is true or likely true about the student, and which evidence supports that belief.

Observations must be evidence-based.

### Lifecycle

An Observation is created after analysis of session activity, exercise results, speech results, or longer-term trends. It should be preserved as historical teaching memory.

Later observations may confirm, refine, supersede, or contradict earlier observations, but should not erase them.

### Relationships

An Observation belongs to a Student and may reference Learning Sessions, Lessons, Exercise Results, Speech Results, Statistics Snapshots, Vocabulary Items, Grammar Topics, Listening Topics, Fatigue Profiles, and Student Model changes.

Observations inform Recommendations and Student Model updates.

### Persistent Fields

Persistent fields may include observation statement, evidence summary, confidence, affected skill, affected topic, severity, time context, and instructional implication.

### Derived Fields

Derived fields may include current relevance, confirmation strength, priority, trend direction, and recommendation impact.

### Possible Future Extensions

Future extensions may include observation chains, contradiction detection, teacher commentary, model audit trails, and explainable AI reports.

## Recommendation

### Purpose

A Recommendation is teaching guidance produced from the Student Model and Observations.

It describes what the student should practice, review, avoid, repeat, or attempt next.

### Responsibilities

The Recommendation connects evidence to action. It helps the AI Teacher and Lesson Engine choose useful next steps without forcing the student to become a learning strategist.

### Lifecycle

A Recommendation is created from current model understanding, may be active for a limited period, may lead to generated lessons, and may later be completed, ignored, expired, or superseded.

Recommendation history should be preserved so the system can evaluate whether its teaching advice worked.

### Relationships

A Recommendation belongs to a Student. It is based on Observations, Student Model state, Learning Goals, Statistics Snapshots, and possibly prior Recommendations. It may generate Lessons or update Learning Goals.

### Persistent Fields

Persistent fields may include recommendation statement, teaching reason, target skill, urgency, expected benefit, source observations, active state, and outcome.

### Derived Fields

Derived fields may include priority, expected impact, freshness, confidence, and success probability.

### Possible Future Extensions

Future extensions may include competing recommendations, teacher rationale, recommendation experiments, student-visible explanations, and automatic retirement rules.

## Learning Goal

### Purpose

A Learning Goal describes a desired learning outcome.

It gives direction to lessons, recommendations, and model updates.

### Responsibilities

The Learning Goal defines what the system is trying to improve. It may represent a broad long-term ambition or a narrow short-term instructional target.

### Lifecycle

A Learning Goal may be created by the student, inferred by the AI Teacher, refined over time, completed, paused, replaced, or archived.

Goals are mutable while active, but goal history should remain available.

### Relationships

A Learning Goal belongs to a Student and relates to Student Model state, Recommendations, Lessons, Vocabulary Items, Grammar Topics, Listening Topics, Difficulty Profiles, and Statistics Snapshots.

### Persistent Fields

Persistent fields may include goal statement, target skill, desired outcome, priority, time horizon, origin, active state, and completion criteria.

### Derived Fields

Derived fields may include progress estimate, current relevance, expected next step, difficulty match, and completion probability.

### Possible Future Extensions

Future extensions may include goal hierarchies, milestone planning, teacher-created goals, student reflection, and goal conflict detection.

## Statistics Snapshot

### Purpose

A Statistics Snapshot is a point-in-time summary of learning signals.

It helps the system compare current performance with prior behavior.

### Responsibilities

The Statistics Snapshot compresses evidence into useful signals for analysis, trends, and planning. It should never replace the raw history or Student Model.

### Lifecycle

A Statistics Snapshot may be created after exercises, lessons, sessions, daily activity, synchronization, or model analysis.

Snapshots may be retained, regenerated, or compacted depending on their value.

### Relationships

A Statistics Snapshot belongs to a Student and may summarize Learning Sessions, Lessons, Exercise Results, Speech Results, Vocabulary Items, Grammar Topics, Listening Topics, and Student Model state.

### Persistent Fields

Persistent fields may include time period, source evidence, summarized skill area, correctness, timing, completion, repetition, confidence, fatigue, and trend signals.

### Derived Fields

Most fields in a Statistics Snapshot are derived. They may include scores, trends, rankings, estimates, and progress indicators.

### Possible Future Extensions

Future extensions may include model comparison snapshots, lesson effectiveness snapshots, teacher quality metrics, and offline analytics summaries.

## Teacher Journal

### Purpose

The Teacher Journal is the narrative record of what the AI Teacher noticed, why it mattered, and how it influenced teaching.

It preserves the reasoning trail between evidence and future decisions.

### Responsibilities

The Teacher Journal records important Observations, Educational Insights, decisions, changed Recommendations, Lesson Plan changes, and meaningful outcomes.

It should not contain raw event dumps. It should preserve teaching meaning.

### Lifecycle

A Teacher Journal entry is created after meaningful analysis, synchronization, lesson completion, recommendation change, or plan revision.

Entries are append-only. Later entries may confirm, refine, or correct earlier entries, but historical reasoning should remain traceable.

### Relationships

Teacher Journal entries belong to a Student. They are grounded in Learning Events, Exercise Results, Speech Results, Statistics Snapshots, Observations, Recommendations, and Lesson Plans.

Teacher Journal entries inform Teacher Memory and Student Model updates.

### Persistent Fields

Persistent fields may include journal statement, evidence references, decision affected, teaching implication, confidence, time context, authoring workflow, and related model version.

### Derived Fields

Derived fields may include current relevance, memory promotion candidate, contradiction risk, and recommendation impact.

### Possible Future Extensions

Future extensions may include teacher reflection summaries, audit views, memory promotion rules, and student-facing explanations.

## Teacher Memory

### Purpose

Teacher Memory is durable teaching knowledge that remains useful across many sessions.

It prevents the AI Teacher from rediscovering the same facts and helps lessons feel remembered.

### Responsibilities

Teacher Memory preserves long-term patterns, preferences, weaknesses, strengths, effective strategies, recovery needs, difficulty sensitivities, and context-specific teaching knowledge.

It should be slower to change than the Teacher Journal because it represents stable learned understanding.

### Lifecycle

Teacher Memory is created when repeated evidence or high-confidence insight becomes useful beyond a single lesson or week.

It may be confirmed, refined, superseded, corrected, forgotten by policy, or deleted by privacy action. Meaningful changes must be versioned.

### Relationships

Teacher Memory belongs to a Student and is derived from Teacher Journal entries, Observations, Learning Analytics, Student Model changes, Recommendations, and lesson outcomes.

It informs the AI Teacher, Lesson Plans, Generated Lessons, and Student Model interpretation.

### Persistent Fields

Persistent fields may include memory statement, scope, evidence basis, confidence, stability, effective date, related skills or contexts, current status, and replacement history.

### Derived Fields

Derived fields may include relevance, recency, contradiction risk, teaching priority, and confidence decay.

### Possible Future Extensions

Future extensions may include memory review workflows, teacher-specific memory layers, privacy-scoped memory, and self-hosted memory controls.

## Synchronization State

### Purpose

Synchronization State describes what learning data exists locally, what has been safely synchronized, what is pending, and what needs reconciliation.

It protects continuity when learning happens offline.

### Responsibilities

Synchronization State ensures that offline learning becomes part of the durable learning journey without duplication, loss, or confusion.

### Lifecycle

Synchronization State changes frequently while the app is offline, reconnecting, retrying, or processing acknowledgements.

Successful synchronization may create permanent history. Temporary queue details should expire after they are no longer needed.

### Relationships

Synchronization State belongs to a Student, device, or client context. It references Learning Sessions, Lessons, Exercise Results, Speech Results, Statistics Snapshots, Generated Lessons, Audio Assets, and pending uploads.

### Persistent Fields

Persistent fields may include last synchronized point, pending learning events, acknowledged events, failed events, conflict status, device context, and synchronization history.

### Derived Fields

Derived fields may include offline readiness, queue health, retry priority, conflict risk, and synchronization freshness.

### Possible Future Extensions

Future extensions may include multi-device conflict resolution, background sync health, synchronization audit trails, and offline lesson package state.

## Audio Asset

### Purpose

An Audio Asset represents audio used or created during learning.

It may support listening, speaking, pronunciation, shadowing, playback, or speech analysis.

### Responsibilities

The Audio Asset preserves audio content that has teaching value or is required for lesson execution, review, evidence, or offline continuity.

### Lifecycle

An Audio Asset may be generated, downloaded, cached, used in a lesson, linked to a result, synchronized, expired, or deleted according to privacy and storage rules.

### Relationships

An Audio Asset may belong to Lessons, Exercises, Speech Results, Voice Profiles, Generated Lessons, and offline lesson packages.

### Persistent Fields

Persistent fields may include audio purpose, language, voice identity, related prompt, duration, availability, privacy classification, and relationship to lesson content.

### Derived Fields

Derived fields may include playback readiness, quality score, reuse suitability, and synchronization priority.

### Possible Future Extensions

Future extensions may include pronunciation reference audio, student-recorded samples, adaptive playback speed, multiple voices, and audio quality analysis.

## Voice Profile

### Purpose

A Voice Profile describes voice-related preferences or characteristics used for speech synthesis, speech recognition, or speaking analysis.

### Responsibilities

The Voice Profile helps Mentor AI provide consistent, usable, and personalized spoken interaction.

It should not store unnecessary biometric detail.

### Lifecycle

A Voice Profile may begin with default settings and evolve through student preference, accessibility needs, speech recognition performance, or teacher choices.

### Relationships

A Voice Profile belongs to a Student or teacher context. It relates to Audio Assets, Speech Results, Learning Preferences, Lessons, and Speech Layer behavior.

### Persistent Fields

Persistent fields may include preferred voice type, speech speed, target accent, recognition language, playback preferences, and accessibility constraints.

### Derived Fields

Derived fields may include recognition reliability, preferred playback speed, speaking comfort estimate, and voice suitability.

### Possible Future Extensions

Future extensions may include multiple teacher voices, accent-specific practice, pronunciation baselines, and student voice calibration.

## Vocabulary Item

### Purpose

A Vocabulary Item represents a word, phrase, expression, or lexical unit that matters to the student's learning.

### Responsibilities

The Vocabulary Item tracks how the student recognizes, recalls, understands, and uses vocabulary across contexts.

### Lifecycle

A Vocabulary Item may be introduced, practiced, strengthened, forgotten, revived, mastered, or retired from active review.

Its learning history should be preserved.

### Relationships

A Vocabulary Item belongs to the Student Model and may appear in Lessons, Exercises, Exercise Results, Speech Results, Observations, Recommendations, Learning Goals, and Generated Lessons.

### Persistent Fields

Persistent fields may include term, meaning, target language, support language, example contexts, introduction source, practice history, known confusion, and current learning state.

### Derived Fields

Derived fields may include recognition strength, recall strength, listening strength, speaking availability, retention estimate, and review priority.

### Possible Future Extensions

Future extensions may include phrase families, collocations, personal example sentences, register, topic grouping, and spaced repetition behavior.

## Grammar Topic

### Purpose

A Grammar Topic represents a grammatical structure, pattern, rule, or usage area relevant to the student's learning.

### Responsibilities

The Grammar Topic tracks understanding, production, transfer, stability, and recurring errors around grammar.

### Lifecycle

A Grammar Topic may be introduced, explained, practiced, misunderstood, stabilized, mastered, forgotten, or revisited.

### Relationships

A Grammar Topic belongs to the Student Model and relates to Lessons, Exercises, Exercise Results, Observations, Recommendations, Learning Goals, Generated Lessons, and Difficulty Profiles.

### Persistent Fields

Persistent fields may include topic name, examples, known error patterns, related topics, practice history, explanation history, and current learning state.

### Derived Fields

Derived fields may include grammar score, mastery estimate, production reliability, transfer strength, error frequency, and review urgency.

### Possible Future Extensions

Future extensions may include dependency mapping, misconception tracking, grammar explanation variants, and context-specific mastery.

## Listening Topic

### Purpose

A Listening Topic represents an area of listening comprehension that can be practiced, measured, or improved.

It may describe content, speed, accent, sound pattern, sentence type, or comprehension behavior.

### Responsibilities

The Listening Topic helps the AI Teacher understand what kind of spoken language the student can process reliably.

### Lifecycle

A Listening Topic may be introduced through audio exercises, practiced at different speeds, linked to comprehension results, strengthened, or revisited after regression.

### Relationships

A Listening Topic belongs to the Student Model and relates to Audio Assets, Lessons, Exercises, Speech Results, Exercise Results, Observations, Recommendations, Learning Goals, and Voice Profiles.

### Persistent Fields

Persistent fields may include topic description, listening context, speed range, accent or voice context, related vocabulary, related grammar, practice history, and known breakdown patterns.

### Derived Fields

Derived fields may include listening score, comprehension reliability, speed tolerance, repetition need, and fatigue sensitivity.

### Possible Future Extensions

Future extensions may include accent-specific comprehension, noisy-audio tolerance, dictation-like tasks, and natural conversation listening.

## Difficulty Profile

### Purpose

A Difficulty Profile represents what makes learning easy, hard, stable, or overwhelming for the Student.

Difficulty is personal and context-dependent.

### Responsibilities

The Difficulty Profile helps the AI Teacher and Lesson Engine choose appropriate challenge, pacing, support, and exercise complexity.

### Lifecycle

The Difficulty Profile changes as the student improves, tires, gains confidence, or encounters new types of tasks.

### Relationships

A Difficulty Profile belongs to the Student Model and relates to Lessons, Exercises, Exercise Results, Speech Results, Learning Goals, Fatigue Profiles, and Learning Preferences.

### Persistent Fields

Persistent fields may include current challenge tolerance, preferred pacing, known overload patterns, task difficulty sensitivities, support needs, and successful challenge ranges.

### Derived Fields

Derived fields may include optimal difficulty estimate, overload risk, challenge readiness, and difficulty mismatch indicators.

### Possible Future Extensions

Future extensions may include adaptive lesson branching, stress-aware difficulty, task-specific challenge curves, and teacher style adjustment.

## Fatigue Profile

### Purpose

A Fatigue Profile represents patterns in how the Student's performance changes with time, effort, task type, and cognitive load.

### Responsibilities

The Fatigue Profile helps the AI Teacher distinguish lack of understanding from tiredness, overload, or reduced attention.

### Lifecycle

The Fatigue Profile evolves from session history, response timing, error patterns, speech behavior, skipped work, and recovery signals.

It should be updated cautiously because fatigue is inferred, not directly known.

### Relationships

A Fatigue Profile belongs to the Student Model and relates to Learning Sessions, Exercise Results, Speech Results, Statistics Snapshots, Difficulty Profiles, Recommendations, and Learning Preferences.

### Persistent Fields

Persistent fields may include session-length tolerance, fatigue indicators, recovery patterns, task types that increase fatigue, time-of-day patterns, and confidence under fatigue.

### Derived Fields

Derived fields may include current fatigue estimate, fatigue trend, lesson length recommendation, rest recommendation, and performance adjustment.

### Possible Future Extensions

Future extensions may include optional self-report, time-of-day planning, adaptive session length, and fatigue-aware lesson generation.

## Learning Preference

### Purpose

A Learning Preference represents known student preferences, constraints, accessibility needs, or effective teaching patterns.

Preferences should help the AI Teacher teach better without making the student manage the system.

### Responsibilities

Learning Preferences guide presentation, pacing, modality, support language, audio behavior, explanation style, and acceptable lesson formats.

### Lifecycle

Learning Preferences may be declared by the student, inferred from behavior, suggested by the AI Teacher, changed over time, or overridden for specific learning goals.

### Relationships

Learning Preferences belong to a Student and inform the Student Model, Lesson Engine, Voice Profile, Difficulty Profile, Generated Lessons, and Recommendations.

### Persistent Fields

Persistent fields may include preferred language support, audio settings, exercise preferences, accessibility needs, explanation style, session length preference, and practice modality.

### Derived Fields

Derived fields may include effective preference confidence, inferred preference strength, and mismatch warnings.

### Possible Future Extensions

Future extensions may include teacher personality preference, preferred correction style, notification preference, modality scheduling, and temporary learning modes.

## Historical Data

Some objects should preserve history indefinitely because they are evidence of the student's journey and of the AI Teacher's decisions.

Objects that should preserve history forever include:

* Lessons
* Generated Lessons
* Exercise Results
* Speech Results
* Observations
* Recommendations
* Learning Sessions
* Learning Goals
* Statistics Snapshots where they represent meaningful milestones
* Synchronization History
* Significant Student Model changes

History is valuable because future AI improvements may need evidence that the current system did not yet know how to use.

A result that seems minor today may later reveal a pattern. A recommendation that failed may teach the AI which strategy does not work. A repeated hesitation may show fragile mastery. An offline synchronization conflict may explain a missing or duplicated learning event.

Historical data also protects trust. Mentor AI should be able to explain why the Student Model changed, why a lesson was generated, why a recommendation appeared, and how the teacher's understanding evolved.

History should be compacted only when the educational meaning is preserved.

## Mutable vs Immutable Data

Mentor AI needs both mutable current state and immutable evidence.

Mutable objects represent current understanding, preferences, or active plans. They may change because the student changes.

Mutable objects include:

* Student Model
* Learning Goals while active
* Learning Preferences
* Difficulty Profile
* Fatigue Profile
* Voice Profile
* Synchronization State
* Active Recommendations
* Current offline availability

Immutable objects represent what happened, what was generated, what was observed, or what was decided at a point in time.

Immutable objects include:

* Completed Lesson
* Generated Lesson after use
* Exercise Result
* Speech Result
* Observation
* Completed Learning Session
* Statistics Snapshot for a completed period
* Synchronization History event

Immutable history matters because the AI Teacher must learn from evidence, not from rewritten memory.

If a result was evaluated incorrectly, the original result should remain and a correction or reinterpretation should be added. If an observation becomes outdated, a newer observation should supersede it. If a recommendation turns out to be poor, the system should preserve that failure so future recommendations improve.

The Student Model can change. The evidence that caused the change should remain.

## Relationships

Mentor AI relationships are conceptual. They describe teaching meaning, not storage structure.

The central relationship chain is:

```text
Student
  ↓
Learning Sessions
  ↓
Lessons
  ↓
Exercises
  ↓
Exercise Results
  ↓
Observations
  ↓
Student Model
  ↓
Recommendations
```

The Student is the owner of the learning journey.

Learning Sessions provide context for learning activity.

Lessons organize purposeful learning.

Exercises create observable tasks.

Exercise Results preserve evidence.

Speech Results enrich evidence for spoken interaction.

Observations interpret evidence.

The Student Model holds current understanding.

Recommendations turn understanding into future teaching direction.

Generated Lessons turn recommendations and goals into concrete practice.

Statistics Snapshots help compare change over time.

Synchronization State protects the journey when work happens offline.

No object should exist in isolation. Every object should either belong to the Student, explain the Student Model, produce evidence, preserve history, or help the AI Teacher decide what comes next.

## Data Ownership

Every object needs a clear owner. Ownership means responsibility for creating, changing, interpreting, or preserving the object. It does not necessarily mean exclusive storage ownership.

| Object | Primary Owner | Modification Authority |
| --- | --- | --- |
| Student | Student / Backend | Backend may update identity and account context; Student may change permitted personal settings |
| Student Model | AI Teacher | AI Teacher updates through evidence; Learning Analytics may contribute signals |
| Learning Session | Lesson Engine / PWA | Lesson Engine and PWA create session activity; Backend finalizes durable state |
| Lesson | Lesson Engine | Lesson Engine creates; Backend preserves; completed lessons are not changed |
| Lesson Template | Lesson Engine | Lesson Engine maintainers or AI-assisted authoring may update templates |
| Generated Lesson | Lesson Engine / AI Teacher | Created from AI Teacher intent; immutable after student use |
| Exercise | Lesson Engine | Created as lesson content; immutable after attempt |
| Exercise Result | Lesson Engine / PWA | Created from student interaction; immutable after recording |
| Speech Result | Speech Layer | Speech Layer creates; AI Teacher may interpret but not rewrite |
| Observation | AI Teacher | AI Teacher creates from evidence; later observations may supersede |
| Recommendation | AI Teacher | AI Teacher creates, retires, supersedes, or marks outcome |
| Learning Goal | Student / AI Teacher | Student may set explicit goals; AI Teacher may infer or refine learning goals |
| Statistics Snapshot | Learning Analytics | Learning Analytics creates and recalculates from evidence |
| Synchronization State | Synchronization Engine | Synchronization Engine updates queue, acknowledgement, conflict, and history state |
| Audio Asset | Speech Layer / Lesson Engine | Speech Layer and Lesson Engine create or manage educational audio |
| Voice Profile | Student / Speech Layer | Student preferences and Speech Layer performance may update it |
| Vocabulary Item | AI Teacher / Student Model | AI Teacher and Learning Analytics update learning state from evidence |
| Grammar Topic | AI Teacher / Student Model | AI Teacher and Learning Analytics update learning state from evidence |
| Listening Topic | AI Teacher / Student Model | AI Teacher, Speech Layer, and Learning Analytics update learning state from evidence |
| Difficulty Profile | AI Teacher | AI Teacher updates from performance, fatigue, and outcomes |
| Fatigue Profile | AI Teacher / Learning Analytics | Learning Analytics detects signals; AI Teacher interprets them |
| Learning Preference | Student / AI Teacher | Student may declare preferences; AI Teacher may infer effective preferences |

Ownership must remain explicit. UI state should not silently become teaching memory. Statistics should not silently overwrite the Student Model. Speech recognition should not directly decide learning goals. Synchronization should preserve evidence, not reinterpret it.

## Data Lifetime

Different data objects have different expected lifetimes.

### Minutes

Minute-level data is runtime support.

Examples include:

* Speech Recognition Buffer
* Current Playback State
* Lesson Timer
* Temporary AI Context
* Current Exercise Focus

These objects exist only to complete the current interaction. They should disappear unless they become evidence.

### Hours

Hour-level data supports active sessions, retries, uploads, and short-term offline continuity.

Examples include:

* Upload Queue
* Temporary Synchronization Queue
* In-progress Learning Session
* Pending audio processing state
* Temporary lesson execution state

These objects may survive app restarts or connection loss, but they are not long-term learning memory by themselves.

### Days

Day-level data supports near-term continuity and offline readiness.

Examples include:

* Current lessons
* Recent recommendations
* Cached audio
* Recent statistics queue
* Active synchronization state
* Short-term fatigue estimate

This data helps the student continue learning smoothly across normal usage patterns.

### Months

Month-level data supports medium-term learning strategy.

Examples include:

* Active Learning Goals
* Learning Preferences
* Difficulty Profile
* Fatigue Profile
* Vocabulary state
* Grammar state
* Listening state
* Recent Statistics Snapshots

This data reveals patterns and supports adaptive teaching over time.

### Forever

Forever data is durable learning history or current teaching memory.

Examples include:

* Student
* Student Model
* Completed Learning Sessions
* Completed Lessons
* Generated Lessons used by the student
* Exercise Results
* Speech Results
* Observations
* Recommendations and their outcomes
* Synchronization History
* Significant Student Model changes

This data protects the continuity and explainability of the student's learning journey.

## Offline Storage Strategy

Offline storage exists because learning should continue without a constant internet connection.

The following data should always be available offline when practical:

* Current lessons
* Exercises for current lessons
* Required audio
* Student Model summary
* Recent recommendations
* Active learning goals
* Learning preferences
* Voice profile settings needed for playback or recognition
* Recent statistics needed for lesson continuity
* Pending exercise results
* Pending speech results
* Statistics queue
* Synchronization state

Offline data should prioritize continuity over completeness. The device does not need the entire historical archive to teach one current lesson, but it does need enough context to avoid feeling forgetful.

The following can usually wait for synchronization:

* Long-term historical archives
* Older completed lessons
* Older audio assets
* Deep analytics snapshots
* AI reanalysis of long-term trends
* Recommendation effectiveness analysis
* Full Student Model audit history
* Non-current generated lesson variants

Offline work must still become part of the same learning journey. When the device reconnects, completed sessions, results, speech evidence, statistics, and synchronization history should be reconciled into durable state.

The offline strategy should never create a second, separate student history.

## Privacy Classification

Mentor AI data is personal by default.

Privacy classification helps decide what can be stored, synchronized, cached, logged, shared, committed, or displayed.

## Public

Public data is safe to include in source control, documentation, examples, or public demos.

Examples include:

* Generic lesson templates
* Generic grammar topic names
* Generic vocabulary examples
* Non-personal demo content
* Product documentation

Public data must not contain real student history, private generated lessons, speech content, or personal observations.

## Example / Demo

Example or demo data is artificial data created to demonstrate the product.

Examples include:

* Artificial Student records
* Synthetic exercise results
* Demo lessons
* Sample recommendations
* Mock statistics

Demo data must be clearly artificial. It should not be copied from a real student's history and should not accidentally train the system on false personal evidence unless explicitly isolated.

## Personal

Personal data belongs to the Student's learning journey.

Examples include:

* Student identity
* Preferences
* Learning goals
* Completed lessons
* Exercise results
* Observations
* Recommendations
* Student Model
* Vocabulary and grammar state
* Synchronization history

Personal data may be synchronized only through trusted product paths and should be protected from accidental logging, exposure, or source control.

## Sensitive

Sensitive data is personal data that could reveal private behavior, voice, ability, mistakes, or emotional state.

Examples include:

* Speech recordings
* Speech transcripts
* Voice profile details
* Fatigue patterns
* Confidence signals
* AI observations about weaknesses
* Generated lessons based on private mistakes
* Detailed learning history

Sensitive data requires stronger protection, shorter retention when possible, and careful synchronization rules.

## Never Synchronized

Some data should remain local unless there is a clear educational need and the student has accepted the privacy tradeoff.

Examples may include:

* Raw speech recognition buffers
* Temporary audio processing data
* Temporary AI prompt assembly context
* Debug-only runtime state
* Local playback state

If this data becomes meaningful evidence, store the minimum useful result rather than the raw temporary material.

## Never Committed To Git

The following must never be committed to Git:

* Real student learning history
* Real Student Models
* Real generated lessons for a student
* Real exercise results
* Real speech results
* Real audio recordings
* Real voice profile data
* Real observations or recommendations
* Synchronization queues containing real activity
* Secrets, tokens, credentials, or private AI context

Git may contain public templates, artificial fixtures, and documentation. It must not contain the student's private learning journey.

## Design Rules

1. Student Model is the source of truth for current personalization.
2. Raw history is the source of truth for what actually happened.
3. Derived data must always be reproducible from persistent evidence.
4. History is immutable after creation.
5. Observations must be evidence-based.
6. Recommendations must come from Observations, Student Model state, or explicit Learning Goals.
7. Statistics never replace history.
8. Generated Lessons are artifacts, not the source of truth.
9. Generated Lessons should preserve enough context to understand why they were created.
10. Persistent data should remain minimal but meaningful.
11. Every stored object must have a learning purpose.
12. Do not duplicate information unless there is a clear reason such as offline continuity, performance, or auditability.
13. Duplicated derived data must be marked as derived and rebuildable.
14. Keep data ownership explicit.
15. UI state must not silently become durable learning memory.
16. Speech buffers must not become permanent data unless they create meaningful evidence.
17. Exercise Results and Speech Results must not be rewritten after creation.
18. Corrections should be added as new interpretation, not by erasing prior evidence.
19. Learning Goals may change, but goal history should remain understandable.
20. Preferences should guide teaching without forcing the student to configure the system.
21. Fatigue estimates must be treated as uncertain signals, not facts.
22. Mastery must be proven across time, context, and pressure.
23. Weaknesses should be treated as teachable information, not failure labels.
24. Protect personal learning history by default.
25. Offline data must reconcile into the same learning journey.
26. Synchronization should preserve evidence before analysis.
27. AI prompts must follow the data model and should not invent hidden sources of truth.
28. Future database schemas must serve the domain model, not redefine it.

## Final Summary

This data model defines what Mentor AI knows about the student, what evidence it preserves, what the AI Teacher may infer, and how future learning decisions should be grounded.

Every future database schema, API contract, frontend state model, synchronization flow, statistics process, and AI prompt must follow this model.

The goal is to make implementation replaceable while keeping the domain model stable.

Mentor AI can change storage systems, frameworks, interfaces, AI providers, and lesson generation strategies. It must not lose the core idea: data exists to represent the student's learning journey and help the AI become a better teacher.

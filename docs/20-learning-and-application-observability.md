# Learning and Application Observability

## Purpose

Mentor AI must improve from evidence, not intuition. The analysis system observes two separate areas:

1. teaching quality: whether activities are understandable, appropriately difficult, useful, and completed;
2. application quality: whether the interface, storage, synchronization, network, media, and device capabilities worked reliably.

A technical failure must never lower a learner's skill score. A microphone failure, missing audio file, interrupted network request, stale cache, or synchronization conflict makes the affected learning evidence uncertain. It is an application signal first.

## Analyze Before Optimizing

Every optimization follows this loop:

1. collect append-only evidence;
2. validate identity, shape, time, and duplicate IDs;
3. separate reliable evidence from technically affected sessions;
4. wait for a minimum useful sample or a repeated critical signal;
5. produce findings with evidence count and confidence;
6. let the user accept, postpone, or reject a proposed change;
7. compare the same metrics before and after the change.

The application must not silently rewrite teaching rules from one session or one error. A monthly report is a review point, not permission for automatic product changes.

## Evidence Streams

### Learning evidence

Existing `LearningEvent`, `ExerciseResult`, `SpeechResult`, `StatisticsSnapshot`, `ContentProgress`, and `ContentEngagementEvent` records describe learning behavior. Useful signals include starts, finishes, full plays, retries, response time, accuracy, audio replay, pronunciation availability, feedback, content progress, and recommendation context.

Interpretation must stay cautious:

- low accuracy can mean difficulty, ambiguous wording, or strict answer matching;
- slow response can mean the activity needs an example;
- repeated playback can mean useful repetition or unclear audio;
- abandonment can mean excessive length, broken recovery, technical failure, or poor fit;
- missing speech evidence cannot be treated as weak pronunciation.

### Application evidence

`ApplicationTelemetryEvent` is deliberately separate. The first implementation records:

- application open;
- route view by stable route name;
- online/offline transitions;
- runtime errors;
- unhandled promise rejections;
- app version, anonymous device ID, session ID, severity, and timestamp.

Do not store typed answers, spoken transcripts, authentication tokens, email addresses, URLs containing user text, stack traces, or raw exception messages in telemetry. Stable error classes and controlled codes are sufficient for grouping.

## Storage and Synchronization

The PWA writes operational evidence to the `application-telemetry` IndexedDB store. It works offline, uses stable event IDs, keeps the latest 2,000 local records, and attempts synchronization when online. The API validates identity and allowed fields, deduplicates IDs, stores at most the latest 10,000 operational records per private learning state, and never merges these events into skill scoring.

The current API repository uses private per-user learning-state files. This is the persistence adapter for the first implementation, not the final production database. A production migration should move append-only learning and application events to indexed database tables without changing their shared contracts or IDs.

Suggested production tables:

- `learning_events`;
- `exercise_results`;
- `content_engagement_events`;
- `content_progress_snapshots`;
- `application_telemetry_events`;
- `analysis_reports`;
- `optimization_experiments`.

Indexes should cover `(student_id, occurred_at)`, `(type, occurred_at)`, `(session_id)`, and unique event ID. Retention and deletion must be explicit and independently configurable for learning and operational data.

## Readiness Rules

The header Analysis Center becomes ready when any rule is satisfied:

- at least 20 learning engagement events cover at least 7 days;
- at least one month has passed and learning evidence exists;
- the same controlled technical error occurs at least 3 times.

Before readiness, the center shows collection progress and can still expose critical repeated failures. Thresholds are initial product defaults and must be revised only after observing real data.

## Report Contract

Every monthly report must contain:

1. confirmed learning improvements;
2. probable teaching weaknesses;
3. application problems that may have distorted learning evidence;
4. data-quality limitations;
5. proposed changes, expected effect, confidence, and verification metric.

Each finding includes its time window, number of supporting sessions/events, affected mode or surface, technical contamination status, and confidence. Wording must describe product behavior rather than blame the learner.

## Optimization Safety

- Never optimize from a single session unless it reveals a critical data-loss or security problem.
- Never count retries or offline synchronization duplicates as separate evidence.
- Prefer monotonic progress such as `furthestPosition` when devices disagree.
- Exclude technically affected measurements from adaptive level changes.
- Preserve raw append-only evidence; derived summaries can be rebuilt.
- Record the app version and optimization version so before/after comparison is possible.
- Require an explicit user action before applying a functional recommendation.

## Delivery Stages

### Stage 1: implemented foundation

- separate privacy-safe operational event contract;
- offline IndexedDB storage and server synchronization;
- server validation, identity enforcement, deduplication, and retention limits;
- deterministic readiness calculation;
- header indicator and initial evidence-based findings;
- tests for minimum evidence, monthly/volume readiness, repeated errors, and completion warnings.

### Stage 2: database and session reliability

- production event tables and migrations;
- controlled API/media/cache/sync error codes;
- session health record linking technical failures to affected learning evidence;
- server-clock receipt time and clock-skew detection;
- delivery acknowledgements so local synchronized events can be compacted safely.

### Stage 3: monthly reports

- persisted report snapshots;
- scheduled monthly analysis plus early critical reports;
- confidence calculation and before/after comparison;
- accepted, postponed, rejected, and completed recommendation states.

### Stage 4: evidence-led optimization

- propose targeted teaching or product changes;
- require approval;
- deploy one measurable change at a time;
- evaluate it against the previous period and roll it back if the expected improvement is absent.

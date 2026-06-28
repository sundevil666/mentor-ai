# Mentor AI Backend

## Introduction

The Mentor AI backend is the platform layer that keeps the learning system coherent, durable, secure, and available across devices.

It is not responsible for teaching.

Teaching belongs to the AI Teacher. The backend is responsible for making sure the AI Teacher has the right memory, evidence, context, workflows, and storage boundaries to teach well.

The backend coordinates modules. It stores knowledge. It runs AI workflows. It synchronizes devices. It protects private learning data. It exposes APIs to client surfaces. It turns learning activity into durable platform state.

The backend should never become the product's teaching mind. It should not decide lessons by hard-coded curriculum paths, hide teaching logic inside request handlers, or make the student experience depend on a specific runtime. Its job is orchestration: receive events, validate them, preserve them, route them, enrich them, ask the right intelligent components for help, and return useful product state.

The backend must remain replaceable without changing the product architecture. A future implementation may use different services, storage engines, AI providers, deployment models, or runtimes. The conceptual responsibilities should remain stable.

Backend module boundaries must follow [Conceptual Contracts](14-contracts.md). Canonical object ownership and metadata live in [Data Model](04-data-model.md).

## Backend Philosophy

The backend is designed around a thin API and a rich domain.

The API should expose product capabilities clearly without becoming the place where product meaning lives. Request and response contracts should be simple, predictable, and stable. The deeper rules belong to the domain: lessons have teaching purposes, exercise results are evidence, synchronization protects memory, and the Student Model remains the source of truth for personalization.

The backend should be organized as independent modules with clear ownership. Authentication should not understand lesson generation. Synchronization should not own AI reasoning. Media management should not update mastery directly. Each module should do one kind of work and communicate through explicit contracts.

The backend should favor asynchronous processing. Learning should not pause because a model update, speech analysis, lesson generation, recommendation refresh, or cleanup task takes time. The student should be able to finish a session and trust that the platform will reconcile, analyze, and prepare future learning when processing completes.

The backend must be offline-friendly. Offline activity is not second-class activity. A completed lesson on an unreliable connection still contains real learning evidence. The backend should accept delayed events, process idempotent synchronization, detect conflicts, merge safely, and preserve continuity.

The backend is AI-first. It should treat AI workflows as primary platform behavior, not optional integrations. AI analysis, observation generation, recommendation delivery, and lesson generation are core parts of the system. At the same time, the AI provider must remain replaceable. The product depends on the AI Teacher role, not on one vendor or one model.

The backend exists to protect the long-term teaching loop:

```text
Learning activity
  ↓
Evidence
  ↓
Student Model
  ↓
AI interpretation
  ↓
Teaching intent
  ↓
Generated lesson
  ↓
New learning activity
```

## Responsibilities

The backend is responsible for the durable platform responsibilities of Mentor AI.

It authenticates the student, identifies the active learning context, and ensures that private learning history belongs only to the correct person.

It stores Student data, Student Model state, learning sessions, lessons, generated lessons, exercise results, speech results, observations, recommendations, statistics snapshots, preferences, configuration, and synchronization history.

It receives learning events from client surfaces. These events may arrive immediately or after offline use. The backend validates them, deduplicates them, orders them when possible, detects conflicts, and turns them into durable learning history.

It persists the Student Model and coordinates updates to it. The backend does not invent teaching interpretation by itself, but it ensures that observations, statistics, session results, and AI analysis can safely improve the model.

It stores lesson definitions and generated lesson artifacts. Generated lessons should be linked to their teaching intent, source Student Model version, validation status, and later outcomes.

It coordinates speech processing requests. Speech may require recognition, timing analysis, confidence estimation, pronunciation-related signals, or later AI interpretation. The backend manages the workflow and stores the resulting evidence.

It synchronizes devices. It accepts offline queues, validates uploaded activity, merges learning state, returns updated lessons and recommendations, and helps clients recover from partial or repeated synchronization attempts.

It delivers recommendations. Recommendations are generated from observations and Student Model state, then made available to the client in a form that supports simple learning decisions without overwhelming the student.

It executes AI workflows. These workflows may include lesson planning, observation generation, model analysis, recommendation creation, content generation, speech interpretation, and validation of generated material.

It collects statistics that help the AI Teacher understand learning. Statistics are not created for vanity dashboards. They exist because they compress evidence into signals that can improve teaching.

It manages versioning. Student Model versions, generated lesson versions, API versions, synchronization protocol versions, lesson schema versions, and AI workflow versions should be tracked so the platform can evolve without losing meaning.

It provides configuration. Feature availability, supported languages, lesson generation settings, AI provider routing, synchronization limits, media policies, and deployment-specific behavior should be configured without changing product concepts.

It manages media. Audio assets, generated speech, uploaded recordings, temporary processing files, and reusable listening material require clear ownership, lifecycle rules, and privacy controls.

## High-Level Backend Modules

## API Layer

The API Layer is the stable boundary between client surfaces and backend capabilities.

It exposes operations for authentication, student state, lessons, learning sessions, exercise results, speech events, synchronization, recommendations, configuration, and media access. It should hide internal service structure and present contracts in product language.

The API Layer should validate shape, identity, version, and basic request integrity. It should not contain deep domain decisions or AI reasoning.

## Application Layer

The Application Layer coordinates product workflows.

It handles use cases such as starting a session, completing a lesson, synchronizing offline events, requesting the next lesson, generating recommendations, storing speech results, and refreshing the Student Model.

The Application Layer knows which modules must collaborate. It does not own the domain meaning of the data it moves.

## Domain Layer

The Domain Layer contains the core product concepts and rules.

It defines Students, Student Models, Lessons, Generated Lessons, Exercises, Exercise Results, Learning Sessions, Observations, Recommendations, Learning Goals, Statistics Snapshots, Speech Results, and Synchronization Events.

Business rules belong here. A lesson must have a teaching purpose. Exercise results are evidence. A Student Model update must be traceable to learning evidence or AI interpretation. Generated content must not become the source of truth.

## Infrastructure Layer

The Infrastructure Layer connects the backend to external systems.

It may provide persistence, queues, object storage, AI provider clients, speech services, notification services, monitoring, logging, and deployment-specific integrations.

Infrastructure should be replaceable. The domain should not depend on infrastructure details.

## AI Layer

The AI Layer coordinates communication with the AI Teacher and other intelligent workflows.

It prepares context, requests analysis, receives structured outputs, validates results, records observations, routes lesson generation requests, and protects the platform from provider-specific assumptions.

The AI Layer should treat AI as a separate intelligent component with explicit inputs and outputs.

## Synchronization Layer

The Synchronization Layer preserves continuity between local client state and durable backend state.

It accepts offline queues, validates events, detects duplicates, applies merge rules, records synchronization status, returns updated state, and supports recovery after partial failure.

Synchronization is not only transport. In Mentor AI, synchronization protects memory.

## Storage Layer

The Storage Layer provides durable access to persistent data.

It stores private learning records, Student Model versions, generated content, statistics, recommendations, media metadata, configuration, synchronization state, and audit-relevant history.

Storage mechanics are implementation details. The conceptual ownership of data belongs to the domain.

## Media Layer

The Media Layer manages audio and other binary learning assets.

It handles uploaded recordings, generated audio, lesson audio, temporary processing artifacts, cached media, public demo media, and private student-specific media. It enforces lifecycle, privacy, and access rules.

## Configuration Layer

The Configuration Layer controls platform behavior that may change by environment, version, language, or deployment.

It may define supported languages, AI routing, lesson generation limits, synchronization limits, media retention, feature availability, and model version compatibility.

Configuration should not hide product logic. It should tune platform behavior without becoming an undocumented rule system.

## Background Workers

Background Workers run work that should not block the learning surface.

They process lesson generation, speech analysis, recommendation updates, model refreshes, statistics aggregation, audio preparation, cleanup, migrations, retries, and long-running synchronization tasks.

Workers should be observable, retryable, and safe to run more than once when appropriate.

## API Philosophy

The backend API should be REST-first.

REST is appropriate because the platform has clear resources: students, sessions, lessons, results, recommendations, media, synchronization batches, and configuration. A resource-oriented API helps keep contracts understandable and avoids exposing internal orchestration.

The API should be stateless. Each request should carry enough identity, version, and intent for the backend to process it without relying on hidden server session state. This supports scaling, retries, offline synchronization, and future clients.

The API should be predictable. Similar resources should behave similarly. Error responses should be structured. State transitions should be explicit. Clients should not need to guess whether a request created, updated, queued, or ignored something.

The API should be versioned. Mentor AI will evolve: lesson formats, synchronization protocols, Student Model structure, AI workflow outputs, and media policies will change. Versioning lets the platform improve without breaking older clients abruptly.

The API should use simple contracts. Client surfaces should not need to understand internal modules, provider-specific AI outputs, or storage structure. Contracts should describe product meaning: completed exercise, generated lesson, recommendation, synchronization result, active Student Model version.

The API should be offline-friendly. Clients must be able to submit delayed events, retry failed uploads, ask what changed since a known point, and receive enough state to continue learning locally.

Synchronization operations should be idempotent. A client may send the same event more than once after network loss. Repeated uploads should not duplicate learning history, double-count statistics, or corrupt the Student Model.

These principles matter because the API is the platform's most durable boundary. A good API lets clients change, backend implementations change, and AI providers change without breaking the product architecture.

## AI Integration

The backend communicates with the AI Teacher as a separate intelligent component.

The AI Teacher is not a helper function hidden inside the backend. It is the role responsible for interpreting the Student Model and deciding what the student needs next. The backend prepares the conditions for good teaching, but the AI Teacher performs the teaching interpretation.

Inputs to the AI Teacher may include:

* Student Model state
* recent learning sessions
* exercise results
* speech results
* statistics snapshots
* prior observations
* prior recommendations
* learning goals
* lesson outcomes
* preferences and constraints
* relevant generated lesson history

Outputs from the AI Teacher may include:

* observations
* updated interpretation of weaknesses and strengths
* recommendation candidates
* learning goals
* lesson requests
* teaching intent
* difficulty guidance
* repetition guidance
* validation feedback for generated content

Memory belongs to the platform, not to an AI provider. The Student Model, observations, learning history, and generated lesson outcomes must be stored in backend-controlled domain state. AI workflows may use this memory, but they should not be the only place where memory exists.

Context should be assembled deliberately. The backend should provide enough information for useful teaching decisions without dumping the entire history into every AI request. Context should be selected according to the workflow: lesson generation needs different context than speech interpretation or recommendation refresh.

Prompt generation is an internal AI workflow concern, not a product architecture dependency. The backend should produce structured teaching context and receive structured teaching output. Prompt wording may change without changing the domain.

Recommendations should come from AI interpretation of evidence, not from superficial metrics alone. A low score may suggest a problem, but the AI Teacher should decide what the problem means.

Lesson requests should describe teaching intent before content. The platform should know why a lesson is being generated: review, diagnosis, confidence building, recall speed, listening pressure, grammar stabilization, speaking practice, or vocabulary transfer.

Observation generation turns raw activity into teaching knowledge. Observations should be traceable to evidence and useful for future decisions.

The AI Teacher must remain replaceable. Mentor AI depends on the role, contracts, and memory model, not on one AI provider. Replacing the provider should require adapter and workflow changes, not a redesign of lessons, synchronization, data ownership, or client behavior.

## Lesson Generation Flow

Lesson generation begins with the Student Model.

The backend gathers the relevant current state: what the system understands about the student, what happened recently, which weaknesses are active, which strengths are reliable, what goals are pending, and which generated lessons have already been used.

The AI Teacher analyzes this context and identifies what matters now. The result is not immediately a lesson. It is an interpretation of need.

From that analysis, the system defines a Learning Goal. The goal gives purpose to the next learning experience.

The Learning Goal becomes a Lesson Request. The request describes teaching intent, constraints, difficulty, exercise needs, language requirements, media requirements, and any relevant context from the Student Model.

The Lesson Engine generates the lesson from the request. It creates lesson structure, exercises, examples, listening tasks, speaking tasks, review patterns, or other learning content appropriate to the goal.

The generated lesson is validated. Validation checks whether the lesson is coherent, appropriate for the student, aligned with the teaching intent, safe to present, and structurally usable by the client.

After validation, the lesson is stored. Storage preserves the generated artifact, its teaching purpose, the Student Model version that informed it, and the workflow that produced it.

Finally, the lesson becomes available through synchronization or direct API retrieval.

```text
Student Model
  ↓
AI Analysis
  ↓
Learning Goal
  ↓
Lesson Request
  ↓
Lesson Generation
  ↓
Validation
  ↓
Storage
  ↓
Synchronization
```

This flow keeps teaching interpretation separate from content generation and keeps generated content subordinate to the Student Model.

## Synchronization Flow

Synchronization starts on the client with an offline queue.

The queue contains learning activity captured locally: session events, exercise results, speech events, completion signals, timing, local statistics, and other evidence that must become part of durable history.

The client uploads the queue to the backend when connectivity is available. Uploads may be partial, repeated, delayed, or out of order.

The backend validates the uploaded events. It checks identity, structure, version compatibility, event ownership, duplicate identifiers, ordering hints, and whether the events are allowed in the current student context.

The backend merges valid events into durable learning history. It deduplicates repeated events, preserves evidence, records synchronization state, and detects conflicts.

Conflicts should be handled conceptually according to ownership and meaning. Some events can be combined. Some can be ordered by event time. Some require latest accepted state. Some require preserving both versions for review. The system should prefer preserving evidence over silently discarding learning activity.

Merged activity updates the Student Model directly or through background analysis. The update may be immediate for simple facts and asynchronous for deeper interpretation.

The AI Teacher analyzes meaningful new evidence. It may create observations, adjust recommendations, request new lessons, or mark existing recommendations as stale.

New recommendations and lessons become available to the student.

The client downloads updated state: accepted event acknowledgements, conflict results, Student Model summary, available lessons, recommendations, configuration changes, and media references.

```text
Offline queue
  ↓
Upload
  ↓
Validation
  ↓
Merge
  ↓
Student Model Update
  ↓
AI Analysis
  ↓
Recommendations
  ↓
New Lessons
  ↓
Download
```

Synchronization should be eventual. The student should not need to understand which analysis happened immediately and which analysis finished later. The platform should converge toward a coherent learning history.

## Background Processing

Background processing exists because the student experience should remain responsive while the platform performs deeper work.

Lesson generation may require AI analysis, content creation, validation, media preparation, and storage. This should not block unrelated learning actions.

Speech analysis may involve audio upload, recognition, timing interpretation, confidence scoring, pronunciation-related signals, and later AI observation. Some parts may finish quickly. Others may complete later.

Recommendation generation may depend on newly synchronized results, updated statistics, observations, and Student Model changes. Recommendations should be refreshed when the learning state meaningfully changes.

Audio preparation may create generated speech, normalize uploaded recordings, prepare listening assets, or cache reusable media.

Synchronization may require delayed merge processing, conflict resolution, retry handling, or downstream model updates.

Cleanup removes expired temporary files, obsolete generated artifacts, abandoned processing records, stale caches, and data no longer needed under retention rules.

Version migration updates older Student Model structures, lesson formats, synchronization records, or generated content metadata so the platform can evolve safely.

Background jobs should be retryable, observable, and tied to durable workflow state. A crash should not erase the meaning of the work. Re-running a job should not corrupt learning history.

## Storage Strategy

Storage is a platform responsibility, but storage technology is an implementation detail.

Persistent storage holds durable learning memory. It includes Student records, Student Models, learning sessions, lessons, generated lessons, exercise results, speech results, observations, recommendations, statistics snapshots, preferences, synchronization state, configuration, and media metadata.

Temporary storage holds data needed during processing. It may include upload fragments, speech processing files, AI workflow context, transient validation results, pending media transformations, or retry state. Temporary data should have clear expiration rules.

Generated content storage holds personal lesson artifacts. Generated lessons are student-specific and should be stored with teaching intent, generation context, validation status, version, and outcome links. They are artifacts, not the source of truth.

Cached content storage improves performance and offline readiness. Cached lessons, audio, configuration, summaries, or computed statistics may be stored because they are useful to retrieve quickly. Cached content should be rebuildable from authoritative state.

Private data storage contains personal learning history, Student Model state, speech results, recordings, generated lessons, and observations. It must be isolated by student and protected by access controls.

Public demo data is separate from private learning data. Demo lessons, fixtures, sample media, or public examples must not be mixed with a real student's history.

Ownership matters more than location. The Student owns private learning history. The domain owns the meaning of the data. Infrastructure owns storage mechanics. AI workflows may read and write through contracts, but they do not own memory.

## Security

Security protects trust, privacy, and teaching quality.

Authentication confirms who is using the platform. The backend must know which student context a request belongs to before returning private state or accepting learning events.

Authorization controls what the authenticated actor may access or change. A student should not be able to read another student's history, modify another Student Model, access another person's recordings, or request private generated lessons outside their context.

Personal data isolation is fundamental. Learning history is intimate: mistakes, confidence, speech, fatigue, weaknesses, goals, and private progress. The backend should treat this data as sensitive by default.

Private learning history should remain private. Generated lessons may contain personal weaknesses or examples based on prior mistakes. Observations may contain inferred ability or confidence. Speech recordings may reveal identity. All require careful access control and retention rules.

API validation protects the domain. The backend should reject malformed, inconsistent, unauthorized, unsupported, or dangerous input before it becomes learning history.

Rate limiting protects the platform from abuse, accidental loops, excessive AI workflow execution, media upload spikes, and synchronization storms.

Secret management protects API keys, AI provider credentials, storage credentials, signing keys, and deployment-specific sensitive values. Secrets should not live in client code, generated lessons, logs, or configuration visible to the student.

Security exists so the student can trust the teacher. A system that mishandles private learning history cannot be a good learning companion.

## Error Recovery

The backend should assume failure will happen.

Network loss should not erase learning activity. Clients may continue offline, queue events locally, and upload them later.

Offline mode should be a normal path, not an exception. Lessons, responses, speech events, and statistics captured offline should still become part of the Student Model when synchronized.

Partial synchronization should be recoverable. If only some events are accepted, the client should know which events succeeded, which failed, and which should be retried.

Retries should be safe. Repeated requests should not duplicate sessions, double-count answers, regenerate unnecessary lessons, or apply the same Student Model update multiple times.

Conflict detection should preserve meaning. When two devices produce overlapping activity, the backend should detect the conflict, keep evidence, apply clear merge rules, and avoid silent data loss.

Graceful degradation should keep the student moving when possible. If recommendation generation is delayed, the client may continue with an already available lesson. If speech analysis is delayed, the session can complete and the analysis can arrive later. If AI generation fails, the backend can return existing valid content or mark the workflow for retry.

Recovery after crashes should rely on durable workflow state. The backend should know which jobs were pending, which events were accepted, which lesson generation requests were completed, and which outputs still need validation.

Error recovery is part of product quality. A teacher that forgets because the network failed is not trustworthy.

## Extensibility

The backend should support future additions without changing the core product architecture.

Multiple AI providers should be possible. The AI Teacher role should be expressed through provider-independent contracts so the platform can route, compare, replace, or combine providers.

Multiple students should be possible even though Mentor AI begins personal-first. Student ownership, isolation, and identity should be explicit from the beginning.

Multiple languages should be possible. The backend should not assume one learning language, one support language, or one lesson format forever.

New lesson engines should be possible. The platform may later add conversation engines, pronunciation engines, listening engines, grammar engines, writing engines, or assessment engines.

New exercise types should be possible. Exercise results should be flexible enough to represent different evidence without forcing every exercise into the same metrics.

Cloud deployments should be possible. The backend should support managed infrastructure, scalable workers, durable queues, external storage, and provider-managed AI services.

Self-hosted deployments should be possible. The conceptual platform should not require one proprietary deployment model. Privacy-sensitive users may need local or controlled hosting.

Extensibility depends on boundaries. The more clearly the backend separates domain, AI contracts, synchronization, storage ownership, and client APIs, the easier future change becomes.

## Design Principles

1. Backend coordinates, AI teaches.
2. The Student Model is the durable center of personalization.
3. Keep the domain independent from frameworks, runtimes, databases, and providers.
4. API contracts should describe product capabilities, not internal service structure.
5. Modules communicate through explicit contracts.
6. Business rules belong to the domain.
7. Never duplicate domain logic across API handlers, workers, clients, or AI adapters.
8. Synchronization is eventual and must preserve learning evidence.
9. Offline Students are first-class citizens.
10. Every accepted learning event should be traceable to a student, session, source, and version.
11. Generated lessons are artifacts, not the source of truth.
12. Storage is an implementation detail; data ownership is a domain concern.
13. AI integration should remain provider-independent.
14. Memory belongs to the platform, not to an AI vendor.
15. Background work must be retryable and observable.
16. Repeated synchronization requests must be safe.
17. Private learning history is sensitive by default.
18. Derived statistics must remain subordinate to underlying evidence.
19. Configuration may tune behavior but should not hide core product logic.
20. Version everything that may evolve: APIs, lessons, models, synchronization, and AI workflows.
21. Prefer preserving evidence over silently discarding uncertain data.
22. Validation should happen before data becomes durable learning history.
23. The backend should degrade gracefully when AI or network services are delayed.
24. Everything should be replaceable behind stable contracts.

## Backend Summary

The Mentor AI backend is the orchestration platform for an AI-first learning system.

It does not teach the student. It protects the conditions that make teaching possible: durable memory, clean workflows, secure data, reliable synchronization, provider-independent AI integration, stored lessons, and stable APIs.

The backend should remain independent from any specific framework, runtime, database, AI provider, or deployment model. Its architecture is defined by responsibility, ownership, and contracts.

If designed correctly, the backend can be replaced without changing the product's core shape: the student learns, evidence updates the Student Model, the AI Teacher interprets that model, and the platform delivers the next useful learning experience.

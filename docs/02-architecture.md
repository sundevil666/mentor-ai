# Mentor AI Architecture

## Introduction

Mentor AI is designed as a teaching system first and an application second.

The architecture exists to protect the most important product responsibility: the AI teacher must understand the student and decide what the student needs next. Every technical boundary should make that responsibility easier to preserve, test, evolve, and improve.

Canonical domain object metadata is defined in [Data Model](04-data-model.md). Conceptual module contracts are defined in [Conceptual Contracts](14-contracts.md). The first production slice is defined in [First Implementation](15-first-implementation.md).

The platform is built around several long-term requirements:

* AI-first development, where teaching decisions are made by an adaptive teacher rather than hard-coded lesson paths.
* Offline-first learning, so progress continues even when connectivity is unreliable.
* Personalization, where every session changes what the system knows about the student.
* Maintainability, so the system can evolve without turning teaching logic into UI logic.
* Scalability, so the platform can later support more students, teachers, devices, and languages.
* Modularity, so each part of the system has a clear reason to exist.
* Future evolution, so early decisions do not trap the product inside its first interface.

The AI teacher should never depend on UI decisions. The PWA is a learning surface. It should make the teacher reachable and usable, but it should not define the teacher's memory, reasoning, lesson planning, or personalization model.

Architecture serves the AI teacher. The interface serves the student. The rest of the system exists to keep those two responsibilities connected without mixing them together.

## High Level Architecture

The complete system is organized as a sequence of clear responsibilities:

```text
Student
  ↓
PWA Client
  ↓
REST API
  ↓
Application Services
  ↓
AI Teacher
  ↓
Lesson Engine
  ↓
Student Model
  ↓
Storage
  ↓
Synchronization
```

The student learns, responds, hesitates, speaks, makes mistakes, improves, forgets, and returns. The system should observe these events without asking the student to manage the learning strategy.

The PWA Client provides the learning surface. It starts lessons, presents exercises, captures responses, supports speech interactions, stores offline activity, and keeps the student moving with minimal friction.

The REST API is the stable boundary between client surfaces and backend behavior. It exposes product capabilities without exposing internal service structure. Future clients should be able to use the same conceptual backend without inheriting PWA-specific assumptions.

Application Services coordinate product workflows. They enforce business rules, orchestrate persistence, call the AI Teacher, request lesson generation, receive synchronized events, and convert raw activity into durable learning state.

The AI Teacher makes teaching decisions. It interprets the Student Model, analyzes recent performance, decides what should happen next, and explains instructional intent to the Lesson Engine.

The Lesson Engine turns teaching intent into lesson content. It produces exercises, prompts, explanations, review sequences, listening tasks, speaking tasks, and repetition plans that serve a specific learning purpose.

The Student Model is the durable representation of what the system currently understands about the student. It is the source of truth for personalization.

Storage preserves generated lessons, learning history, statistics, student progress, AI observations, synchronization state, and private personal data.

Synchronization reconciles offline activity with durable backend state. It allows learning to continue locally and become part of the main learning history later.

## Why This Architecture

### Why PWA

Mentor AI starts as a PWA because learning should be immediately reachable across devices without requiring a native installation path. A PWA can support fast iteration, offline capabilities, local storage, installability, and a familiar web deployment model.

This choice fits the first version because the core risk is not native platform integration. The core risk is whether the AI teacher can produce better lessons over time. A PWA gives the project enough device reach and offline behavior while keeping development focused on the teacher, model, and learning loop.

The PWA is not treated as the permanent center of the architecture. It is one client surface. Future mobile or desktop applications should be able to reuse the same backend concepts and teaching system.

### Why Node Backend

A Node backend keeps the platform close to the web client ecosystem and supports rapid development of API, synchronization, orchestration, and AI integration workflows. It is a pragmatic default for an AI-first web product where much of the system is I/O-heavy: API requests, storage operations, model calls, synchronization processing, and background jobs.

The backend exists as a separate layer because durable teaching behavior should not live inside the client. The client can operate offline, but the authoritative interpretation of learning history, model evolution, and long-term personalization belongs behind stable service boundaries.

### Why Offline-First

Offline-first is a learning requirement, not only a technical feature.

The student should be able to learn whenever they have time and attention. Connectivity should not decide whether practice can happen. A system that loses learning events during disconnection cannot build reliable memory. A teacher that ignores offline sessions becomes less trustworthy over time.

Offline-first architecture ensures that lessons, responses, statistics, speech events, and completion records can be captured locally and synchronized later. This protects continuity, which is essential for personalization.

### Why The AI Teacher Is Independent

The AI Teacher must be independent because teaching decisions should not be coupled to screen structure, navigation, button placement, or client state. If UI decisions shape teaching decisions, the product becomes an application with AI features rather than an AI teacher with application surfaces.

Independence also makes the teacher portable. A future mobile app, desktop app, conversation mode, or speech-first interface should be able to ask the same teacher what the student needs next.

This separation also improves maintainability. Engineers can change the interface without rewriting teaching logic, and they can improve teaching logic without redesigning the interface.

### Why Student Model Is A Separate Concept

The Student Model is separate because personalization needs a stable conceptual home.

Raw answers are not enough. Statistics are not enough. Completed lessons are not enough. The system needs an evolving interpretation of the student: strengths, weak points, fragile skills, recurring errors, vocabulary retention, grammar reliability, listening comprehension, speaking confidence, response speed, fatigue signals, and learning momentum.

Keeping this model separate prevents the system from scattering student understanding across lesson records, UI state, analytics tables, prompts, and generated content. It gives the AI Teacher one primary source of truth.

### Why Lesson Engine Is Isolated

The Lesson Engine is isolated because deciding what to teach and producing the lesson are different responsibilities.

The AI Teacher decides the purpose: review a fragile structure, test listening under pressure, rebuild confidence, increase recall speed, or repeat a recurring mistake in a new context.

The Lesson Engine converts that purpose into teachable material. It can change templates, exercise formats, repetition strategies, and difficulty progression without changing the teacher's reasoning model.

This boundary keeps generated lessons replaceable. The platform can later improve generation quality, add lesson types, support new languages, or introduce different content strategies without rewriting the Student Model or synchronization system.

### Why Synchronization Is Asynchronous

Synchronization is asynchronous because learning should not block on network availability or backend processing. The student should be able to complete a session, close the app, and trust that the system will reconcile activity when possible.

Asynchronous synchronization also allows analysis and model updates to happen after the learning moment. Some updates may be immediate. Others may require background processing, AI analysis, conflict resolution, or aggregation across multiple events.

This design favors resilience. The system can recover from connection loss, partial uploads, repeated events, and delayed processing without interrupting the student's session.

### Why Generated Lessons Are Stored Separately

Generated lessons are stored separately because they are personal, contextual artifacts. They may contain student-specific weaknesses, AI observations, private examples, speech prompts, or references to learning history.

They should not be confused with public demo lessons, source-controlled fixtures, or static curriculum material. Separating generated lessons protects privacy, enables regeneration, supports auditing of teaching decisions, and allows the system to compare what was planned with what happened during execution.

Generated content is not the source of truth. The Student Model is. Lessons are artifacts created from the model and used to improve the model.

## System Modules

## PWA

The PWA is the student's primary learning surface.

Its responsibilities are:

* Present the current lesson clearly.
* Let the student start and finish sessions with minimal friction.
* Capture answers, timing, speech events, completion state, and local statistics.
* Continue learning when offline.
* Store pending activity locally until synchronization succeeds.
* Play audio and coordinate speech interactions through the Speech Layer.
* Show only the product controls the student genuinely needs.
* Avoid exposing internal teacher reasoning as interface complexity.

The PWA should not own long-term teaching strategy. It should ask the system what lesson is available, execute that lesson faithfully, collect evidence, and preserve continuity.

## Backend

The backend coordinates durable product behavior.

Its responsibilities are:

* Expose REST API capabilities to current and future clients.
* Authenticate and identify the active student context.
* Validate client-submitted learning activity.
* Enforce business rules around lessons, sessions, synchronization, and progress.
* Persist private learning data.
* Coordinate Application Services.
* Call the AI Teacher when teaching decisions or analysis are needed.
* Store generated lessons and link them to their teaching intent.
* Receive offline events and reconcile them into durable history.

The backend is not merely a data proxy. It is the boundary where product workflows become reliable, repeatable, and independent of any single client.

## AI Teacher

The AI Teacher is responsible for instructional decision making.

Its responsibilities are:

* Interpret the Student Model.
* Analyze recent lessons, mistakes, response patterns, and statistics.
* Decide the goal of the next lesson.
* Recommend difficulty, pacing, repetition, and exercise type.
* Identify skills that are strong, weak, improving, forgotten, or fragile.
* Maintain teaching memory through structured observations.
* Explain teaching intent to the Lesson Engine.
* Use outcomes from completed lessons to improve future decisions.

The AI Teacher should behave like a teacher, not a content selector. Its central question is always: what does this student need now?

## Lesson Engine

The Lesson Engine produces lessons from teaching intent.

Its responsibilities are:

* Generate lesson structures that match the teacher's goal.
* Produce prompts, exercises, explanations, listening tasks, and speaking tasks.
* Apply lesson templates where structure improves reliability.
* Manage difficulty progression inside a lesson.
* Support repetition without making practice feel static.
* Create review material from prior mistakes and fragile skills.
* Preserve enough metadata for later analysis of lesson effectiveness.

The Lesson Engine does not decide the student's long-term path. It transforms instructional intent into concrete learning work.

## Student Model

The Student Model is the heart of Mentor AI.

It represents the system's current understanding of the student. It is not a profile page, a scoreboard, or a raw event log. It is the evolving teaching memory that makes personalization possible.

Every lesson should update the Student Model directly or indirectly. Answers reveal correctness. Timing reveals fluency. Repetition reveals retention. Speech events reveal confidence and production ability. Mistakes reveal unstable knowledge. Completed sessions reveal endurance and learning rhythm. Skipped or failed work may reveal difficulty, fatigue, or mismatch.

Every future decision depends on this model. The AI Teacher reads it before planning. The Lesson Engine receives intent shaped by it. Learning Analytics refines it. Synchronization protects it. Storage preserves its history. Future clients must treat it as the primary source of truth for personalization.

If the Student Model is inaccurate, the teacher becomes inaccurate. If the Student Model improves, the entire product improves.

## Learning Analytics

Learning Analytics converts learning activity into teaching signals.

Its responsibilities are:

* Track correctness, response time, repetition, completion, hesitation, recall, and error patterns.
* Detect improvement, regression, forgetting, automaticity, and unstable knowledge.
* Produce signals that the AI Teacher can use for planning and analysis.
* Preserve enough historical context to compare current performance with prior behavior.
* Support quality evaluation of generated lessons.

Statistics are collected to improve teaching quality. They are not primarily collected to generate dashboards.

The student should not need to interpret charts to know what to study. The AI Teacher should use statistics privately and turn them into better lesson decisions.

## Synchronization Engine

The Synchronization Engine preserves learning continuity across offline and online states.

Its responsibilities are:

* Maintain an offline queue of learning events.
* Persist local session activity until it is safely acknowledged.
* Retry synchronization after connection loss.
* Resolve conflicts between local activity and backend state.
* Prevent duplicate processing of repeated events.
* Support background synchronization when the client is available.
* Recover gracefully from partial failure.

Synchronization should feel invisible to the student. Offline work should become part of the same learning history as online work.

## Speech Layer

The Speech Layer isolates spoken interaction from lesson generation.

Its responsibilities are:

* Speech recognition.
* Speech synthesis.
* Timing measurement.
* Speaking detection.
* Audio playback.
* Capturing speech-related session events.
* Reporting speech outcomes to the learning flow.

Speech is isolated because audio interaction is a delivery and capture mechanism, not the source of teaching strategy. The Lesson Engine may create a speaking exercise, but speech recognition, playback, latency, interruptions, and audio state should not leak into lesson generation.

This boundary allows Mentor AI to improve speech technology over time without changing the core teacher. It also allows future interfaces to support text-first, speech-first, or mixed interaction while preserving the same instructional model.

## Data Flow

A complete learning cycle follows this flow:

```text
Lesson request
  ↓
Lesson generation
  ↓
Lesson execution
  ↓
Offline statistics
  ↓
Synchronization
  ↓
AI analysis
  ↓
Student model update
  ↓
Next lesson generation
```

The lesson request begins when the student starts or resumes learning. The client asks for the next appropriate lesson or uses an already available local lesson when offline.

Lesson generation begins with teaching intent. The AI Teacher reads the Student Model, considers recent evidence, decides the lesson purpose, and asks the Lesson Engine to produce suitable content.

Lesson execution happens in the PWA. The student reads, listens, speaks, answers, hesitates, repeats, or finishes. The client records meaningful events without forcing the student to manage the process.

Offline statistics are collected locally during the session. Correctness, timing, attempts, speech events, and completion state are preserved even when the network is unavailable.

Synchronization sends local activity to the backend when possible. The system retries safely, avoids duplicate processing, and reconciles activity into durable history.

AI analysis interprets the completed work. The AI Teacher evaluates what the lesson revealed, whether the intended teaching goal worked, and what changed about the student's needs.

The Student Model update turns session evidence into durable personalization. It adjusts the system's understanding of skills, weaknesses, retention, confidence, response speed, and future priorities.

Next lesson generation uses the updated model. The next lesson should be more appropriate because the system knows more than it did before.

## Offline Strategy

Offline support is a first-class architectural requirement because Mentor AI depends on continuity. A student may learn during travel, unstable connectivity, short breaks, or moments when the network is unavailable. Those sessions must still matter.

The offline strategy includes local lessons. The client should have enough lesson material available for the student to continue without waiting on the backend.

It includes local statistics. Learning events must be captured at the moment they occur because timing, attempts, and speech behavior lose value if reconstructed later.

It includes a local speech queue. Speech-related events, audio playback state, recognition outcomes, and speaking timing may need to be stored until the system can synchronize them reliably.

It includes synchronization later. Offline activity should enter the same durable learning history as online activity, then influence AI analysis, Student Model updates, and future lessons.

Offline-first does not mean the entire AI system must run locally in the first version. It means the learning session should remain useful and the evidence from that session should be preserved.

## Personal vs Public Data

Mentor AI separates public project data from private student data.

The public repository contains:

* Source code.
* Documentation.
* Demo lessons.
* Artificial Student records.
* Example statistics.

Private storage contains:

* Generated lessons.
* Student progress.
* AI observations.
* Speech history.
* Learning history.

This separation exists for privacy, maintainability, and trust.

The project can be open source without exposing the student's learning history. Engineers can develop against demo data without touching private records. Generated lessons can include personal weaknesses, examples, observations, or history without becoming part of the repository.

Public data helps the platform be understandable and testable. Private data protects the student and preserves the integrity of the real learning relationship.

## Scalability

The architecture supports future growth without making the first version unnecessarily complicated.

Multiple students can be supported by treating the Student Model, generated lessons, statistics, and synchronization state as student-scoped data. The first version can optimize for one student while preserving boundaries that do not assume only one student forever.

Multiple AI teachers can be supported because the AI Teacher is a separate decision-making module. Future teachers may have different styles, specialties, languages, or intervention strategies while sharing the same Student Model concepts.

Cloud synchronization can grow from the same offline queue and reconciliation model. The system can later support multiple devices, background jobs, remote storage, and conflict policies without changing the basic learning flow.

Mobile apps and desktop apps can be added because the REST API and backend services are not tied to PWA navigation. New clients should execute lessons and capture events, not recreate teaching logic.

Additional languages can be supported because the Lesson Engine and AI Teacher are separated from the interface. Language-specific lesson generation, speech behavior, templates, and progression rules can evolve behind stable contracts.

The architecture aims for scalable boundaries, not premature infrastructure. The first version should remain simple, but the conceptual seams should be strong enough to survive real growth.

## Design Principles

* Keep AI independent from UI.
* Treat the Student Model as the source of truth.
* Make offline learning the default expectation.
* Treat synchronization as eventual.
* Let modules communicate through clear contracts.
* Keep generated content replaceable.
* Give every component one primary responsibility.
* Prefer simplicity over cleverness.
* Favor composition over coupling.
* Let personalization drive architecture.
* Store private learning data outside the public repository.
* Preserve learning events before analyzing them.
* Separate teaching intent from lesson production.
* Separate speech mechanics from instructional reasoning.
* Design every surface as a client of the teacher, not as the teacher itself.
* Optimize visible UI for learning, not configuration.
* Use statistics to improve teaching quality, not to create product noise.
* Make future clients possible without rebuilding the core teacher.

## Architecture Summary

Mentor AI is an offline-first, AI-first learning platform organized around an independent AI Teacher and a durable Student Model.

The PWA gives the student a simple learning surface. The REST API and backend services provide stable product boundaries. The AI Teacher decides what the student needs. The Lesson Engine turns that decision into learning material. The Student Model preserves the evolving understanding that makes personalization possible. Learning Analytics improves teaching quality. The Synchronization Engine protects continuity when learning happens offline. The Speech Layer enables spoken interaction without coupling audio mechanics to lesson strategy.

The architecture is intentionally modular because the product must evolve. Interfaces may change. Lesson formats may improve. Speech technology may advance. Storage may move. More students, teachers, devices, and languages may appear.

The central rule should remain stable: the application is only the interface. The AI teacher is the product. The architecture exists to help that teacher remember, adapt, and teach better over time.

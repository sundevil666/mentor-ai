# Mentor AI Implementation Plan

## Purpose

This document is the engineering roadmap for building Mentor AI into the first production-ready teaching loop.

The roadmap follows the approved documentation. It treats the Student Model as the durable center, the AI Teacher as the teaching decision maker, the Lesson Engine as the producer of purposeful lessons, and synchronization as protection for learning continuity.

Implementation must stay incremental. Every milestone should leave the project buildable, tested, and closer to the Version 1 completion criteria in [First Implementation](15-first-implementation.md).

## Milestone 1 - Domain Foundation

### Goal

Create the shared domain contracts and pure learning logic that all applications use.

### Scope

- Shared TypeScript objects for Student, Student Model, Learning Event, Exercise Result, Speech Result, Statistics Snapshot, Observation, Recommendation, Lesson Plan, Generated Lesson, Teacher Journal, Teacher Memory, and Synchronization State.
- Narrow Version 1 enums for exercise types, learning modes, event types, skill areas, and sync status.
- Pure validation and helper functions for lesson purpose, evidence identity, model versioning, and local scoring.
- Unit tests for the shared domain package.

### Risks

- Over-modeling the future instead of the first vertical slice.
- Mixing storage or API concerns into domain objects.

### Completion Criteria

- Shared package compiles.
- Shared tests pass.
- Domain names match the glossary and contracts.
- No private student data is introduced.

## Milestone 2 - Local Teaching Loop

### Goal

Build a deterministic local loop that can generate and complete one purposeful lesson without external AI.

### Scope

- Seed a safe demo Student Model.
- Produce a simple Lesson Plan from the model and recent evidence.
- Generate a short English lesson with vocabulary recall, word order, listening comprehension, simple repeat, and review exercises.
- Capture Learning Events and Exercise Results locally.
- Update local Statistics Snapshots and Student Model version from completed evidence.

### Risks

- Making the fallback teacher feel like a fixed course.
- Hiding teaching decisions inside UI code.

### Completion Criteria

- A lesson can be generated from Student Model context.
- Completion evidence changes the next Lesson Plan.
- The logic is framework-independent and test-covered.

## Milestone 3 - PWA Learning Surface

### Goal

Make the PWA a calm one-action learning surface.

### Scope

- Replace dashboard placeholders with Start or Continue flow.
- Present one generated lesson at a time.
- Execute exercises and capture timing, attempts, hints, audio replay, and completion.
- Store local progress and pending synchronization queue in IndexedDB.
- Recover in-progress lesson state after refresh.
- Show only necessary offline or sync status.

### Risks

- Exposing analytics or planning complexity to the Student.
- Making the interface feel like a feature menu.

### Completion Criteria

- Student can open the PWA, start learning, complete a lesson, and return later.
- Learning continues from local state when offline.
- The PWA does not own long-term teaching strategy.

## Milestone 4 - Backend Persistence And API

### Goal

Create the durable single-student backend boundary.

### Scope

- Resource-oriented REST endpoints for current Student state, lessons, sessions, synchronization, recommendations, and configuration.
- File-backed local personal storage under `.ai/private/` for private development use, or private production database storage through environment-provided credentials.
- Demo storage with artificial data only.
- Validation before accepting synchronized evidence.
- Versioned persistence for Student Model and Generated Lessons.

### Risks

- Treating the backend as a data proxy instead of a workflow coordinator.
- Accidentally committing generated personal data.

### Completion Criteria

- API compiles and validates incoming evidence.
- Personal storage remains outside Git.
- PWA can retrieve and submit the first teaching loop through the API.

## Milestone 5 - Synchronization

### Goal

Make offline evidence durable, idempotent, and acknowledged.

### Scope

- Durable local synchronization queue.
- Stable event identifiers and idempotency keys.
- Backend acknowledgement and duplicate detection.
- Incremental download of updated lessons, recommendations, Student Model summary, and configuration.
- Recovery for partial upload failure.

### Risks

- Losing learning evidence during conflict handling.
- Double-counting repeated uploads.

### Completion Criteria

- Repeated uploads are harmless.
- Unacknowledged events survive restart.
- Outdated completed lessons still count as evidence.

## Milestone 6 - Learning Analytics

### Goal

Convert completed learning evidence into conservative teaching signals.

### Scope

- Statistics Snapshots for correctness, response time, attempts, completion, audio replay, speech detection, and fatigue signals.
- Pattern detection across recent sessions.
- Educational Insights grounded in repeated evidence.
- Traceable inputs for Observations and Student Model updates.

### Risks

- Treating one event as a reliable pattern.
- Turning analytics into student-facing dashboards.

### Completion Criteria

- Analytics produces useful signals without inventing conclusions.
- Pending or failed analysis preserves raw evidence.
- Student sees the result only through better lessons and brief guidance.

## Milestone 7 - AI Teacher Workflow

### Goal

Introduce the AI Teacher as a replaceable structured workflow.

### Scope

- Provider-independent AI Teacher interface.
- Deterministic local teacher for development and offline fallback.
- Optional provider adapter gated by environment configuration.
- Structured Observations, Recommendations, Lesson Plans, Teacher Journal entries, Teacher Memory candidates, and proposed Student Model updates.
- Validation before AI output becomes durable state.

### Risks

- Coupling product memory to a provider.
- Allowing AI output to rewrite evidence.

### Completion Criteria

- The system works without provider credentials.
- Provider-backed output is validated and evidence-grounded.
- Missing credentials produce a clear action request, not broken learning.

## Milestone 8 - Teacher Journal And Teacher Memory

### Goal

Preserve teaching reasoning and stable long-term knowledge.

### Scope

- Append-only Teacher Journal entries tied to evidence and decisions.
- Teacher Memory promotion rules based on repeated or high-confidence evidence.
- Versioned Teacher Memory changes.
- Lesson planning context that uses memory without overloading every request.

### Risks

- Turning the journal into a technical log.
- Promoting weak signals into long-term memory too early.

### Completion Criteria

- Lesson Plan changes have private journal reasoning.
- At least one stable recurring pattern can become Teacher Memory.
- Prior memory versions remain traceable.

## Milestone 9 - Speech Layer Version 1

### Goal

Support basic listening and speaking evidence without advanced pronunciation scoring.

### Scope

- Audio playback for listening and repeat exercises.
- Speech availability detection.
- Basic speech attempt capture.
- Response start delay and completion timing where available.
- Graceful fallback to non-speech interaction.

### Risks

- Treating speech failure as student failure.
- Adding external speech dependencies before the loop needs them.

### Completion Criteria

- Speech Result records distinguish availability, attempt, timing, and uncertainty.
- Lessons continue when speech is unavailable.
- Advanced pronunciation analysis remains postponed.

## Milestone 10 - Production Readiness

### Goal

Prepare the Version 1 loop for reliable personal use.

### Scope

- End-to-end tests for offline completion, synchronization, analytics, model update, and next lesson generation.
- Build, lint, and typecheck in CI-ready scripts.
- Error handling and privacy review.
- PWA installability and service worker verification.
- Operational documentation for required environment variables and local storage.

### Risks

- Shipping a demo flow that cannot preserve real learning continuity.
- Leaving generated or personal data inside source control.

### Completion Criteria

- Version 1 completion criteria from [First Implementation](15-first-implementation.md) are satisfied.
- Build and tests pass from a clean checkout.
- Known limitations are documented without temporary code.

## Ongoing Milestone Workflow

For every milestone:

1. Read the relevant approved documentation.
2. Plan the smallest complete implementation.
3. Identify risks.
4. Implement.
5. Test.
6. Self-review for simplicity, documentation alignment, abstraction, justified code, and maintainability.
7. Refactor before commit if needed.
8. Commit one logical change.
9. Update [Implementation Log](implementation-log.md).
10. Continue to the next milestone unless blocked by a true external dependency or an ADR is required.

## Summary

The implementation path begins with shared domain truth, then builds the complete local teaching loop, then connects PWA, backend, synchronization, analytics, AI Teacher workflows, journal, memory, speech, and production readiness.

The roadmap does not optimize for feature count. It optimizes for a working teacher that remembers, adapts, and prepares a better next lesson from real learning evidence.

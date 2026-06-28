# Mentor AI Conceptual Contracts

## Purpose

This document defines communication contracts between the major Mentor AI modules.

It is not an API specification. It does not define HTTP, JSON, endpoints, tables, queues, or provider payloads. It defines what each module may know, produce, depend on, validate, and own.

The goal is clear implementation boundaries before production code begins.

Canonical object definitions and metadata live in [Data Model](04-data-model.md). Official terminology lives in [Glossary](13-glossary.md).

## Information Flow

Mentor AI moves from student activity to better teaching:

```text
PWA Client
  ↓
Learning Event
  ↓
Synchronization
  ↓
Backend
  ↓
Learning Analytics
  ↓
Teacher Journal
  ↓
Teacher Memory
  ↓
Student Model
  ↓
AI Teacher
  ↓
Lesson Plan
  ↓
Lesson Engine
  ↓
Generated Lesson
  ↓
PWA Client
```

Each module should receive only the knowledge it needs. No module should bypass ownership because it is technically convenient.

## AI Teacher

### Purpose

The AI Teacher interprets the Student Model and decides what the Student needs next.

### Inputs

Student Model, Teacher Journal, Teacher Memory, Observations, Recommendations, Learning Goals, Learning Analytics signals, recent Learning Sessions, Exercise Results, Speech Results, and Learning Context.

### Outputs

Observations, Recommendations, Lesson Plans, teaching intent, difficulty guidance, review priorities, Teacher Journal entries, proposed Teacher Memory updates, and proposed Student Model changes.

### Required Knowledge

The AI Teacher must know the current Student Model, recent evidence, active goals, relevant Teacher Memory, and current Learning Context.

### Produced Knowledge

Teaching interpretation, next-step guidance, durable Observations, narrative reasoning, and proposed long-term memory.

### Dependencies

Student Model, Learning Analytics, Teacher Journal, Teacher Memory, Lesson Engine, Backend.

### Failure Behaviour

If the AI Teacher cannot complete analysis, the system should preserve evidence, keep existing valid Recommendations, continue with known lessons or recovery material, and mark deeper analysis as pending.

### Validation Rules

AI Teacher outputs must be evidence-grounded, tied to official concepts, privacy-safe, and validated before becoming durable state. It must not invent Learning Events or rewrite evidence.

### Ownership

Owns teaching interpretation, Observations, Recommendations, Lesson Plans, Teacher Journal authorship, and proposed Teacher Memory changes.

## Lesson Engine

### Purpose

The Lesson Engine turns teaching intent into coherent Lessons and Generated Lessons.

### Inputs

Lesson Plan, Learning Goal, teaching intent, Student Model context, Learning Context, Lesson Templates, available Exercise types, Speech Availability, offline constraints, and validation rules.

### Outputs

Generated Lessons, Exercise sequences, expected evidence, local evaluation rules, required Audio Assets, recovery paths, and lesson metadata.

### Required Knowledge

The Lesson Engine must know why the lesson exists, what evidence it should create, which constraints apply, and what the PWA Client can deliver offline.

### Produced Knowledge

Lesson structure, practice design, difficulty assumptions, expected outcomes, and validation status.

### Dependencies

AI Teacher, Student Model, Speech Layer, Backend, PWA Client.

### Failure Behaviour

If generation fails, keep the current Lesson Plan active, return an existing valid lesson when possible, or request a recovery lesson. Invalid generated content must not reach the Student.

### Validation Rules

Every lesson must have a purpose, target evidence, appropriate difficulty, deliverable structure, privacy-safe content, and a recovery path.

### Ownership

Owns lesson assembly, Generated Lesson validation, exercise sequencing, and lesson metadata.

## Learning Analytics

### Purpose

Learning Analytics converts learning evidence into patterns, Educational Insights, Statistics Snapshots, and Student Model signals.

### Inputs

Learning Events, Exercise Results, Speech Results, Learning Sessions, completed Lessons, synchronization outcomes, Student feedback, and historical Statistics Snapshots.

### Outputs

Statistics Snapshots, Patterns, Educational Insights, Observation candidates, Teacher Journal inputs, Teacher Memory candidates, and proposed Student Model updates.

### Required Knowledge

Learning Analytics must know what happened, where evidence came from, which lesson context produced it, and how reliable the signal is.

### Produced Knowledge

Measured signals, trend summaries, confidence estimates, and conservative teaching insights.

### Dependencies

Learning, Speech Layer, Synchronization, Student Model, AI Teacher.

### Failure Behaviour

If analytics cannot process evidence, raw evidence remains durable and analysis is retried. Teaching should continue from the best available model without pretending pending evidence was interpreted.

### Validation Rules

Analytics must distinguish facts from interpretation, preserve uncertainty, avoid single-event overreaction, and keep derived values subordinate to raw evidence and the Student Model.

### Ownership

Owns Statistics Snapshots, Pattern detection, Educational Insights, and analytics-derived model signals.

## Synchronization

### Purpose

Synchronization preserves learning continuity across offline activity, local state, backend state, and future teaching.

### Inputs

Local Learning Events, Exercise Results, Speech Results, Generated Lesson completion, Preferences, Synchronization State, backend acknowledgements, and downloadable updates.

### Outputs

Accepted evidence, acknowledgements, conflict results, updated local state, downloaded Lessons, Recommendations, Student Model summaries, Teacher Memory summaries, configuration, and pending work status.

### Required Knowledge

Synchronization must know object ownership, local sequence, idempotency identity, version compatibility, privacy constraints, and whether evidence has been acknowledged.

### Produced Knowledge

Synchronization State, conflict outcomes, accepted event status, and continuity guarantees.

### Dependencies

PWA Client, Backend, Learning Analytics, Student Model, Teacher Memory.

### Failure Behaviour

Failed uploads remain queued. Partial uploads are recoverable. Duplicate uploads are harmless. Outdated lessons still count as evidence. The Student should not become the synchronization operator.

### Validation Rules

Synchronization must validate identity, ownership, version, duplicate status, ordering hints, privacy permissions, and required dependencies before accepting state.

### Ownership

Owns Synchronization State, offline queue behaviour, acknowledgement semantics, conflict handling, and recovery flow.

## Speech Layer

### Purpose

The Speech Layer handles spoken interaction as learning evidence without owning teaching strategy.

### Inputs

Speaking Exercises, listening prompts, Audio Assets, microphone availability, Student speech, playback state, permissions, and Learning Context.

### Outputs

Speech Results, playback events, speech detection signals, transcription when allowed, timing evidence, recognition confidence, and speech availability status.

### Required Knowledge

The Speech Layer must know the current Exercise, expected speech behaviour, privacy rules, device capability, and whether local or remote processing is permitted.

### Produced Knowledge

Speech evidence and audio delivery state.

### Dependencies

PWA Client, Lesson Engine, Backend, Synchronization, Learning Analytics.

### Failure Behaviour

Speech failure should produce recoverable evidence, not student blame. The lesson may retry, switch input mode, continue with text, or defer analysis.

### Validation Rules

Speech Results must distinguish raw audio, transcription, confidence, timing, and interpretation. Sensitive speech data must obey privacy and retention rules.

### Ownership

Owns speech capture, playback, speech-related runtime state, and Speech Result production.

## Backend

### Purpose

The Backend coordinates durable product behaviour and protects private learning state.

### Inputs

Client requests, synchronized evidence, AI Teacher outputs, Lesson Engine outputs, Speech Layer outputs, Learning Analytics outputs, configuration, and storage state.

### Outputs

Durable state changes, accepted evidence, available lessons, recommendations, synchronization results, workflow status, configuration, and validated AI or lesson artifacts.

### Required Knowledge

The Backend must know identity, ownership, authorization, object versions, validation rules, workflow state, and storage boundaries.

### Produced Knowledge

Durable product state, workflow coordination, audit-relevant history, and validated module outputs.

### Dependencies

PWA Client, AI Teacher, Lesson Engine, Learning Analytics, Synchronization, Speech Layer, Student Model.

### Failure Behaviour

The Backend should preserve accepted evidence, retry background work safely, avoid duplicate processing, degrade gracefully, and never lose private learning history because a workflow failed.

### Validation Rules

The Backend validates identity, ownership, shape, version, privacy, dependencies, state transitions, idempotency, and generated artifact safety.

### Ownership

Owns orchestration, persistence boundaries, validation before durable storage, privacy enforcement, and background workflow reliability.

## PWA Client

### Purpose

The PWA Client is the Student's learning surface.

### Inputs

Available Lessons, Generated Lessons, Recommendations, Student Model summaries, configuration, Audio Assets, local Preferences, offline state, and Student activity.

### Outputs

Learning Events, Exercise Results, Speech Results, local Statistics Snapshots, local Synchronization State, Preferences, and completion evidence.

### Required Knowledge

The PWA Client must know what lesson to present, how to capture evidence, what can be done offline, which assets are available, and how to preserve progress.

### Produced Knowledge

Local learning evidence, local progress, offline queue state, and immediate feedback when possible.

### Dependencies

Backend, Synchronization, Speech Layer, Lesson Engine outputs.

### Failure Behaviour

The PWA Client should keep learning available from local state, preserve progress across crashes, avoid duplicate attempts, and communicate only necessary limitations to the Student.

### Validation Rules

The PWA Client validates local lesson structure, required assets, exercise completion, offline queue durability, and privacy-sensitive capture permissions.

### Ownership

Owns learning presentation, local capture, offline persistence, local recovery, and Student-facing flow.

## Student Model

### Purpose

The Student Model is the current durable teaching interpretation of the Student.

### Inputs

Learning Analytics signals, Observations, Teacher Journal entries, Teacher Memory, Exercise Results, Speech Results, Recommendations, Learning Goals, Preferences, and explicit Student feedback.

### Outputs

Current learning state, skill understanding, readiness, weaknesses, strengths, confidence patterns, fatigue patterns, review priorities, and context for Lesson Plans.

### Required Knowledge

The Student Model must know the latest validated interpretation and the evidence behind meaningful changes.

### Produced Knowledge

Personalization context used by the AI Teacher, Lesson Engine, Learning Analytics, Synchronization, and PWA Client.

### Dependencies

Student, AI Teacher, Learning Analytics, Teacher Journal, Teacher Memory.

### Failure Behaviour

If a model update fails, retain the previous valid model, preserve pending evidence, and retry or reprocess from traceable inputs.

### Validation Rules

Student Model updates must be evidence-based, versioned, explainable, privacy-safe, and gradual for important assumptions.

### Ownership

Owns current teaching interpretation and model version history.

## Teacher Journal

### Purpose

The Teacher Journal records teaching observations, insights, and decision reasoning over time.

### Inputs

Observations, Educational Insights, Recommendations, Lesson Plan changes, Learning Analytics signals, lesson outcomes, and AI Teacher reflections.

### Outputs

Journal entries, reasoning history, memory promotion candidates, and explanations for future teaching decisions.

### Required Knowledge

The Teacher Journal must know which evidence and decision each entry explains.

### Produced Knowledge

Narrative teaching history and traceable decision context.

### Dependencies

AI Teacher, Learning Analytics, Observation, Recommendation, Student Model.

### Failure Behaviour

If journal writing fails, preserve source evidence and mark reflection as pending. Do not block learning.

### Validation Rules

Entries must be evidence-grounded, privacy-safe, nonjudgmental, and useful for future teaching.

### Ownership

Owned by the AI Teacher as part of the learning relationship.

## Teacher Memory

### Purpose

Teacher Memory stores durable teaching knowledge that remains useful beyond a single session or week.

### Inputs

Repeated Teacher Journal entries, confirmed Observations, Learning Analytics trends, Student Model changes, successful strategies, failed strategies, and long-term patterns.

### Outputs

Durable teaching knowledge, stable preferences, known weak or strong patterns, recovery strategies, and long-term context for Lesson Plans.

### Required Knowledge

Teacher Memory must know evidence strength, scope, confidence, relevance, and whether a memory has become outdated.

### Produced Knowledge

Long-term personalization context.

### Dependencies

Teacher Journal, AI Teacher, Learning Analytics, Student Model, Synchronization.

### Failure Behaviour

If memory update fails or conflicts, keep existing memory, preserve candidate evidence, and require validation before replacing durable knowledge.

### Validation Rules

Teacher Memory should change slowly, be correctable, preserve prior versions, and never store unsupported claims.

### Ownership

Owned by the AI Teacher, persisted by the Backend, and protected as sensitive Student data.

## Summary

These contracts protect Mentor AI from becoming a tangle of UI logic, AI prompts, storage mechanics, and analytics shortcuts.

Learning produces evidence. Synchronization preserves it. Learning Analytics interprets measured patterns. The AI Teacher turns evidence into teaching direction. The Lesson Engine creates learning work. The Student Model, Teacher Journal, and Teacher Memory preserve what the system understands. The PWA Client lets the Student learn without managing the machinery.

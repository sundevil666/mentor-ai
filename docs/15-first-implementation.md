# Mentor AI First Implementation

## Purpose

This document defines the smallest complete Mentor AI version that should be built first.

Version 1 must be a complete vertical slice, not a collection of unfinished surfaces. It should prove the central loop:

```text
Student learns
  ↓
Evidence is captured offline
  ↓
Synchronization preserves it
  ↓
Learning Analytics interprets it
  ↓
AI Teacher updates understanding
  ↓
Lesson Engine creates the next useful lesson
  ↓
Student returns to something better
```

The first implementation must preserve the project philosophy: one student, one teacher, generated lessons, offline-first continuity, invisible intelligence, and simple learning.

## Version 1 Scope

Version 1 is intentionally narrow:

- One Student.
- English only.
- One AI Teacher.
- One Lesson Engine.
- Offline-first PWA Client.
- Backend orchestration.
- Basic Learning Analytics.
- Basic Teacher Journal.
- Basic Teacher Memory.
- Basic Student Model.
- Basic Synchronization.
- Basic Speech Layer.

Narrow does not mean shallow. Version 1 should be complete enough that every completed lesson can influence the next lesson.

## Student Experience

The Student should be able to:

- Open the PWA.
- Start the current lesson with one primary action.
- Complete a short English lesson.
- Answer simple Exercises.
- Listen to available audio.
- Speak when the lesson asks for a simple spoken response and the device allows it.
- Continue when offline if a lesson is already available.
- Finish the session without managing analytics, synchronization, or planning.
- Return later to a lesson shaped by prior evidence.

The interface should not expose dashboards, course catalogs, teacher configuration, or manual lesson planning.

## PWA Client

Version 1 PWA must include:

- Start or continue flow.
- Lesson presentation.
- Exercise execution.
- Local Learning Event capture.
- Local Exercise Result capture.
- Basic Speech Result capture when speech is available.
- Durable offline queue.
- Local lesson availability.
- Local progress recovery after refresh or restart.
- Simple offline and synchronization status only when needed.

The PWA should not own teaching strategy, long-term analytics, or Student Model authority.

## Backend

Version 1 Backend must include:

- Single-student identity boundary.
- Durable storage for canonical objects defined in [Data Model](04-data-model.md).
- Validation before accepting synchronized evidence.
- Workflow orchestration for lesson generation, analytics, AI Teacher reflection, and Student Model updates.
- Privacy boundaries that prevent real student data from entering Git.
- Basic background processing or retryable workflow state for delayed AI and analytics work.

The Backend should coordinate, not teach.

## AI Teacher

Version 1 AI Teacher must:

- Read the current Student Model.
- Read recent Learning Sessions, Exercise Results, Speech Results, Teacher Journal, and Teacher Memory.
- Produce evidence-grounded Observations.
- Produce basic Recommendations.
- Create a simple Lesson Plan.
- Propose cautious Student Model updates.
- Write Teacher Journal entries for important teaching decisions.
- Promote only stable repeated patterns into Teacher Memory.

The AI Teacher should not invent history, compare students, or choose random variety.

## Lesson Engine

Version 1 Lesson Engine must:

- Generate short purposeful English lessons from a Lesson Plan.
- Support a small set of Exercise types: vocabulary recall, word order, listening comprehension, simple speaking or repeat, and review.
- Include lesson purpose, target skills, expected evidence, difficulty intent, local evaluation rules, and recovery behaviour.
- Validate every Generated Lesson before delivery.
- Store Generated Lessons with source Student Model version and teaching intent.

The Lesson Engine should build complete lessons, not isolated prompts.

## Learning Analytics

Version 1 Learning Analytics must:

- Convert Learning Events into Exercise Results and Statistics Snapshots where appropriate.
- Track correctness, response time, attempts, completion, audio replay, speech detection, and basic fatigue indicators.
- Detect simple patterns across recent sessions.
- Produce Educational Insights conservatively.
- Feed Observations, Teacher Journal, Teacher Memory candidates, and Student Model updates.

Analytics should remain invisible to the Student except through better lessons and brief Recommendations.

## Teacher Journal

Version 1 Teacher Journal must:

- Record meaningful Observations and decisions.
- Explain why a Lesson Plan changed.
- Preserve links to supporting evidence.
- Stay append-only.
- Remain private.

The journal should not be a raw technical log.

## Teacher Memory

Version 1 Teacher Memory must:

- Store a small number of stable teaching facts.
- Require repeated or high-confidence evidence before update.
- Preserve prior versions of meaningful changes.
- Inform Lesson Plans and Generated Lessons.

Examples include a recurring word-order weakness, a known listening difficulty, or a reliable recovery strategy.

## Student Model

Version 1 Student Model must include:

- Current English learning state.
- Basic vocabulary state.
- Basic grammar state.
- Basic listening state.
- Basic speaking confidence state.
- Known weaknesses.
- Known strengths.
- Confidence and fatigue signals.
- Review priorities.
- Active Learning Goals.
- Version history for meaningful changes.

The Student Model should be useful, not exhaustive.

## Synchronization

Version 1 Synchronization must:

- Queue Learning Events offline.
- Survive app restart.
- Upload events idempotently.
- Acknowledge accepted events.
- Avoid duplicate processing.
- Preserve evidence when interpretation is delayed.
- Download updated lessons, Recommendations, configuration, and Student Model summary.
- Treat outdated completed lessons as valid evidence.

Synchronization should feel like continuity, not maintenance.

## Speech Layer

Version 1 Speech Layer must:

- Support playback for listening and repeat exercises.
- Detect whether speech input is available.
- Capture basic speech attempt status.
- Record response start delay and completion when possible.
- Produce Speech Results without requiring advanced pronunciation scoring.
- Fall back gracefully to non-speech interaction.

Advanced pronunciation analysis is postponed.

## Data And Privacy

Version 1 must use the metadata in [Data Model](04-data-model.md) as implementation guidance.

Real student data, generated personal lessons, Teacher Journal entries, Teacher Memory, speech evidence, and Student Model state must not be committed to Git.

Demo data may exist only when artificial, clearly marked, and safe.

## What Is Intentionally Postponed

Version 1 should not include:

- Multiple students.
- Multiple languages.
- Multiple AI Teachers.
- Course marketplace.
- Social features.
- Leaderboards, streak pressure, badges, or gamification loops.
- Advanced dashboards.
- Native mobile applications.
- Desktop applications.
- Advanced pronunciation scoring.
- Open-ended conversation mode.
- Long-form writing feedback.
- Imported movies, podcasts, books, or work documents.
- Plugin architecture.
- Community lesson packs.
- Teacher personality selection.
- Complex multi-device conflict UI.
- Public sharing of learning history.

These are not rejected forever. They are postponed so the first version proves the teacher loop.

## Completion Criteria

Version 1 is complete when:

- A Student can complete a lesson offline.
- The lesson produces durable Learning Events and Exercise Results.
- Synchronization accepts the evidence without duplication.
- Learning Analytics produces basic signals.
- The AI Teacher creates at least one Observation and Recommendation from the result.
- The Teacher Journal records why the next step changed.
- Teacher Memory can preserve one stable long-term pattern.
- The Student Model updates with a versioned change.
- The Lesson Engine generates a next lesson from the updated context.
- The PWA presents that next lesson without requiring the Student to choose a topic.

The test is not feature count.

The test is whether Mentor AI remembers, adapts, and teaches better after one real learning loop.

## Summary

The first implementation should be small, complete, and faithful.

One student. English only. Offline-first. One AI Teacher. One Lesson Engine. Basic analytics, journal, memory, model, synchronization, speech, and generated lessons.

Build the vertical teaching loop first. Everything else can wait until the teacher can reliably observe, remember, adapt, and prepare the next useful lesson.

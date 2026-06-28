# Mentor AI Glossary

## Introduction

This glossary defines the official language of Mentor AI.

Every important project term should have exactly one definition. Future documents, architecture decisions, code names, prompts, analytics labels, and product descriptions should use these terms consistently.

If two terms are similar, the difference is explained in the Notes field.

## Adaptive Lesson

**Definition:** A lesson whose structure, difficulty, modality, or pacing changes according to the Student Model, Learning Context, and teaching purpose.

**Purpose:** To make the lesson fit the student instead of forcing the student through fixed content.

**Related Terms:** Generated Lesson, Lesson Engine, Personalization, Learning Context

**Appears In Documents:** [Learning Experience](06-learning-experience.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Adaptive Lesson describes the behavior of a lesson. Generated Lesson describes how a lesson was produced.

## Adaptive Timing

**Definition:** The practice of changing review timing, lesson length, response pressure, or repetition intervals based on learning evidence.

**Purpose:** To present practice when it is most useful for retention, confidence, and readiness.

**Related Terms:** Retention, Readiness, Response Time, Learning Rhythm

**Appears In Documents:** [Lesson Engine](08-lesson-engine.md), [Learning Analytics](09-learning-analytics.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Adaptive Timing is not a simple reminder schedule. It is teaching timing shaped by evidence.

## AI Observation

**Definition:** An observation created or interpreted by the AI Teacher about the student's learning state, behavior, progress, or need.

**Purpose:** To turn learning evidence into teaching understanding.

**Related Terms:** Observation, Educational Insight, Teacher Journal, Teacher Memory

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** AI Observation is a type of Observation. It should be grounded in evidence and should not invent learning history.

## AI Teacher

**Definition:** The teaching intelligence of Mentor AI that observes the student, interprets evidence, remembers learning history, and decides what the student needs next.

**Purpose:** To make Mentor AI behave like a personal teacher instead of a fixed course.

**Related Terms:** Student Model, Teacher Memory, Teacher Journal, Lesson Engine, Recommendation

**Appears In Documents:** [Manifesto](00-manifesto.md), [Project](01-project.md), [Architecture](02-architecture.md), [AI Teacher](07-ai-teacher.md)

**Notes:** The AI Teacher decides what should be taught. The Lesson Engine decides how that teaching decision becomes a lesson.

## Automatic Response

**Definition:** A student response that is accurate, fast, and available with little conscious effort.

**Purpose:** To show that knowledge is becoming usable in real communication.

**Related Terms:** Automaticity, Response Time, Speaking Fluency, Retention

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** A correct but slow answer is not yet an Automatic Response.

## Automaticity

**Definition:** The degree to which the student can understand or produce English without heavy conscious effort.

**Purpose:** To measure whether learning is becoming available, not merely correct during isolated practice.

**Related Terms:** Automatic Response, Response Time, Speaking Fluency, Grammar Stability

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Automaticity is broader than speed. It includes ease, stability, and reduced mental load.

## Building Block

**Definition:** A reusable learning unit that the Lesson Engine can combine into a lesson.

**Purpose:** To allow lessons to adapt without inventing every activity from nothing.

**Related Terms:** Exercise, Review Block, Warm-up, Lesson Engine

**Appears In Documents:** [Lesson Engine](08-lesson-engine.md)

**Notes:** A Building Block may be a single Exercise or a larger group of related activities.

## Backend

**Definition:** The platform layer that coordinates durable product behaviour, validation, persistence, synchronization, AI workflows, and privacy boundaries.

**Purpose:** To keep Mentor AI reliable without becoming the teaching mind.

**Related Terms:** PWA Client, AI Teacher, Synchronization, Student Model

**Appears In Documents:** [Architecture](02-architecture.md), [Backend](05-backend.md), [Conceptual Contracts](14-contracts.md)

**Notes:** The Backend coordinates. The AI Teacher teaches.

## Bus Mode

**Definition:** A learning mode for short, interrupted, one-handed learning in imperfect conditions.

**Purpose:** To let the student make useful progress while commuting, waiting, or dealing with divided attention.

**Related Terms:** Walking Mode, Home Practice, Learning Context, Speech Availability

**Appears In Documents:** [Learning Experience](06-learning-experience.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Bus Mode should favor listening, recognition, quick responses, light review, and interruption-tolerant tasks.

## Challenge Lesson

**Definition:** A lesson designed to increase complexity intentionally when the student is ready.

**Purpose:** To help the student grow beyond stable material without creating overload.

**Related Terms:** Adaptive Lesson, Readiness, Difficulty Profile, Recovery Lesson

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** A Challenge Lesson should still protect the student from unnecessary failure.

## Confidence

**Definition:** The student's trust in their ability to understand, answer, speak, or continue learning.

**Purpose:** To help the AI Teacher distinguish knowledge problems from hesitation, fear, fatigue, or low readiness.

**Related Terms:** Speaking Confidence, Readiness, Fatigue Profile, Recommendation

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Confidence is not the same as correctness. A student may answer correctly but still lack confidence.

## Consistency

**Definition:** The stability of learning behavior or skill performance across time, contexts, and ordinary difficulty.

**Purpose:** To show whether progress survives beyond a single successful lesson.

**Related Terms:** Grammar Stability, Retention, Learning Rhythm, Student Model

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Consistency can describe both practice rhythm and skill reliability. The context should make the meaning clear.

## Difficulty Profile

**Definition:** A representation of how difficult different skills, topics, modalities, and exercise types are for the student.

**Purpose:** To help the AI Teacher and Lesson Engine choose appropriate challenge and support.

**Related Terms:** Fatigue Profile, Readiness, Challenge Lesson, Recovery Lesson

**Appears In Documents:** [Data Model](04-data-model.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Difficulty Profile describes the student's relationship to difficulty, not a universal content level.

## Educational Insight

**Definition:** An interpreted learning conclusion that explains what a pattern may mean for teaching.

**Purpose:** To turn analytics into a useful teaching decision.

**Related Terms:** Insight, Pattern, Teacher Journal, Learning Analytics

**Appears In Documents:** [Learning Analytics](09-learning-analytics.md)

**Notes:** Educational Insight is more specific than Insight. It must have teaching relevance.

## Exercise

**Definition:** A single learning task completed by the student.

**Purpose:** To create focused practice and produce evidence about learning.

**Related Terms:** Exercise Result, Building Block, Lesson, Learning Event

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** An Exercise is the task. An Exercise Result is what happened when the student attempted it.

## Exercise Result

**Definition:** A structured record of what happened during a student's attempt at an Exercise.

**Purpose:** To preserve correctness, timing, attempts, hints, speech behavior, completion state, and context as learning evidence.

**Related Terms:** Exercise, Learning Event, Speech Result, Learning Analytics

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Exercise Result is not only an answer record. It captures evidence around the attempt.

## Fatigue Profile

**Definition:** A representation of how tiredness, attention loss, or effort changes the student's learning behavior.

**Purpose:** To help Mentor AI adjust pacing, difficulty, modality, and recovery.

**Related Terms:** Confidence, Readiness, Recovery Lesson, Learning Rhythm

**Appears In Documents:** [Data Model](04-data-model.md), [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Fatigue Profile should be interpreted carefully. Slower answers may indicate fatigue, difficulty, distraction, or uncertainty.

## Generated Lesson

**Definition:** A lesson created from teaching intent, Student Model evidence, learning goals, and current context.

**Purpose:** To provide a personalized session that exists for a specific reason.

**Related Terms:** Lesson, Lesson Engine, Lesson Plan, Adaptive Lesson

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [Lesson Engine](08-lesson-engine.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** A Generated Lesson is a kind of Lesson. Not every Lesson must be generated.

## Grammar Stability

**Definition:** The degree to which the student can apply a grammar pattern correctly across exercises, time, and contexts.

**Purpose:** To distinguish temporary correctness from reliable grammar ability.

**Related Terms:** Automaticity, Consistency, Difficulty Profile, Student Model

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Grammar Stability should include use under pressure, not only recognition in simple exercises.

## Home Practice

**Definition:** A learning mode for deeper, more focused work in a stable environment.

**Purpose:** To support longer explanations, speaking practice, writing, grammar stabilization, review, and more complex lessons.

**Related Terms:** Bus Mode, Walking Mode, Learning Context, Speaking Ability

**Appears In Documents:** [Learning Experience](06-learning-experience.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Home Practice is a context, not a location guarantee. It means the student can likely give more attention.

## Insight

**Definition:** An interpreted conclusion produced from patterns, observations, or analytics.

**Purpose:** To help the AI Teacher understand what learning evidence means.

**Related Terms:** Educational Insight, Pattern, Observation, Teacher Journal

**Appears In Documents:** [Learning Analytics](09-learning-analytics.md)

**Notes:** Use Educational Insight when the conclusion directly affects teaching.

## Learning Analytics

**Definition:** The system that converts learning activity into patterns, insights, Teacher Journal entries, Teacher Memory, and Student Model updates.

**Purpose:** To help the AI Teacher make better decisions from evidence.

**Related Terms:** Learning Event, Pattern, Educational Insight, Student Model

**Appears In Documents:** [Project](01-project.md), [Learning Analytics](09-learning-analytics.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Learning Analytics is not a reporting dashboard. It is educational intelligence.

## Learning Context

**Definition:** The student's current learning situation, including time, attention, device state, speech availability, offline state, energy, and mode.

**Purpose:** To adapt lessons to real conditions without losing the teaching goal.

**Related Terms:** Bus Mode, Walking Mode, Home Practice, Speech Availability

**Appears In Documents:** [Learning Experience](06-learning-experience.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Learning Context explains why the same goal may require different lesson shapes.

## Learning Event

**Definition:** The smallest meaningful factual record of something that happened during learning.

**Purpose:** To preserve raw evidence before interpretation.

**Related Terms:** Exercise Result, Learning Analytics, Synchronization, Observation

**Appears In Documents:** [Learning Analytics](09-learning-analytics.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** A Learning Event is a fact. It should not claim what the event means.

## Learning Goal

**Definition:** A specific educational objective that guides lesson planning and teaching decisions.

**Purpose:** To connect student evidence with purposeful learning activity.

**Related Terms:** Lesson Purpose, Lesson Plan, AI Teacher, Lesson Engine

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** A Learning Goal should be more specific than a broad topic.

## Learning Rhythm

**Definition:** The student's pattern of returning, practicing, resting, reviewing, and progressing over time.

**Purpose:** To help Mentor AI adapt timing, difficulty, recovery, and expectations.

**Related Terms:** Consistency, Adaptive Timing, Fatigue Profile, Retention

**Appears In Documents:** [Learning Experience](06-learning-experience.md), [Learning Analytics](09-learning-analytics.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Learning Rhythm is not the same as a streak. It includes interruptions, recovery, and sustainable continuation.

## Learning Session

**Definition:** A period of active learning by the Student.

**Purpose:** To group lessons, exercises, timing, fatigue, interruptions, and outcomes into a meaningful learning episode.

**Related Terms:** Lesson, Exercise Result, Learning Event, Student

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md)

**Notes:** A Learning Session may contain one or more lessons or lesson fragments.

## Learning Strategy

**Definition:** A teaching approach chosen to help the student progress, such as review, challenge, recovery, listening focus, speaking confidence, or grammar stabilization.

**Purpose:** To guide lesson planning beyond isolated exercises.

**Related Terms:** AI Teacher, Lesson Plan, Recommendation, Adaptive Lesson

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Learning Strategy is broader than a Learning Goal. A strategy may shape many goals over time.

## Lesson

**Definition:** A purposeful learning experience prepared for the Student.

**Purpose:** To turn teaching intent into a session the student can complete.

**Related Terms:** Generated Lesson, Lesson Plan, Exercise, Lesson Engine

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** A Lesson should exist because there is a teaching reason.

## Lesson Engine

**Definition:** The system that turns AI Teacher decisions into coherent lessons.

**Purpose:** To select building blocks, adjust difficulty, assemble lesson structure, validate the result, and prepare delivery.

**Related Terms:** AI Teacher, Generated Lesson, Building Block, Lesson Validation

**Appears In Documents:** [Project](01-project.md), [Architecture](02-architecture.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Lesson Engine is preferred over Lesson Generator because it owns more than generation.

## Lesson Plan

**Definition:** A planned teaching direction that connects learning evidence, goals, lesson purpose, and future activity.

**Purpose:** To make lessons part of a continuous teaching process.

**Related Terms:** Learning Goal, Lesson Purpose, AI Teacher, Generated Lesson

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** A Lesson Plan may exist before any specific lesson is generated.

## Lesson Purpose

**Definition:** The specific reason a lesson exists now.

**Purpose:** To keep every lesson focused on a teaching need.

**Related Terms:** Learning Goal, Lesson Plan, Generated Lesson, Lesson Validation

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Lesson Purpose should guide every block inside a lesson.

## Lesson Validation

**Definition:** The process of checking whether an assembled lesson is coherent, useful, deliverable, and appropriate for the Student.

**Purpose:** To prevent random, overloaded, unsafe, or purposeless lessons from reaching the student.

**Related Terms:** Lesson Engine, Generated Lesson, Lesson Purpose, Learning Context

**Appears In Documents:** [Lesson Engine](08-lesson-engine.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Validation should check educational coherence, not only technical correctness.

## Listening Ability

**Definition:** The student's ability to understand spoken English.

**Purpose:** To guide listening practice, audio difficulty, repetition, speed, and comprehension checks.

**Related Terms:** Listening Stability, Speech Result, Shadowing, Student Model

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Experience](06-learning-experience.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Listening Ability is broader than recognizing words. It includes meaning, rhythm, speed, and context.

## Listening Stability

**Definition:** The reliability of the student's listening comprehension across speed, repetition, accents, contexts, and time.

**Purpose:** To distinguish temporary listening success from durable comprehension.

**Related Terms:** Listening Ability, Consistency, Retention, Difficulty Profile

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Listening Stability matters because a student may understand slow repeated audio but struggle with natural speech.

## Long-term Memory

**Definition:** Durable teaching knowledge preserved across many lessons, sessions, and weeks.

**Purpose:** To keep Mentor AI from treating every lesson as a fresh start.

**Related Terms:** Teacher Memory, Retention, Student Model, Learning Synchronization

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Long-term Memory is the general idea. Teacher Memory is the official project object that stores durable teaching knowledge.

## Observation

**Definition:** A meaningful statement about student behavior, learning evidence, or teaching context.

**Purpose:** To preserve what the system noticed so it can influence future teaching.

**Related Terms:** AI Observation, Educational Insight, Teacher Journal, Learning Event

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** A Learning Event records what happened. An Observation states what was noticed about it.

## Pattern

**Definition:** A repeated signal across enough learning evidence to matter educationally.

**Purpose:** To help Mentor AI distinguish noise from meaningful learning behavior.

**Related Terms:** Learning Analytics, Educational Insight, Weakness, Consistency

**Appears In Documents:** [Learning Analytics](09-learning-analytics.md)

**Notes:** One mistake is not a Pattern. Patterns require repeated or contextual evidence.

## Personalization

**Definition:** The adaptation of teaching decisions, lessons, timing, difficulty, and recommendations to the Student.

**Purpose:** To make Mentor AI begin with the learner instead of a fixed course.

**Related Terms:** AI Teacher, Student Model, Adaptive Lesson, Recommendation

**Appears In Documents:** [Manifesto](00-manifesto.md), [Project](01-project.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Personalization is not cosmetic preference. It is teaching adaptation.

## PWA Client

**Definition:** The offline-first learning surface where the Student starts lessons, completes Exercises, hears audio, speaks, and produces local learning evidence.

**Purpose:** To make the AI Teacher reachable through a simple, recoverable learning experience.

**Related Terms:** Backend, Synchronization, Speech Layer, Learning Event

**Appears In Documents:** [Architecture](02-architecture.md), [Learning Experience](06-learning-experience.md), [Conceptual Contracts](14-contracts.md)

**Notes:** The PWA Client executes lessons and captures evidence. It does not own teaching strategy.

## Readiness

**Definition:** The student's current ability to benefit from a teaching step without overload.

**Purpose:** To decide when to introduce challenge, review, recovery, new material, or harder production.

**Related Terms:** Confidence, Fatigue Profile, Difficulty Profile, Challenge Lesson

**Appears In Documents:** [Data Model](04-data-model.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Readiness includes skill, confidence, fatigue, context, and recent performance.

## Recommendation

**Definition:** Guidance from the AI Teacher that explains or suggests a useful next step for the student.

**Purpose:** To make teaching direction understandable without forcing the student to manage the curriculum.

**Related Terms:** AI Teacher, Learning Strategy, Student Model, Teacher Journal

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [AI Teacher](07-ai-teacher.md)

**Notes:** A Recommendation is teacher guidance. It should not feel like a product notification.

## Recovery Lesson

**Definition:** A lesson designed to reduce pressure and rebuild momentum after fatigue, interruption, low confidence, missed days, or repeated difficulty.

**Purpose:** To keep learning emotionally safe and continuous.

**Related Terms:** Challenge Lesson, Fatigue Profile, Confidence, Recovery Mode

**Appears In Documents:** [Learning Experience](06-learning-experience.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Recovery Lesson is not punishment or regression. It is teaching care.

## Recovery Mode

**Definition:** A learning mode that lowers pressure and restores momentum after difficulty or interruption.

**Purpose:** To protect continuity and confidence.

**Related Terms:** Recovery Lesson, Fatigue Profile, Confidence, Learning Context

**Appears In Documents:** [Learning Experience](06-learning-experience.md)

**Notes:** Recovery Mode describes the experience posture. Recovery Lesson is a lesson created within or for that posture.

## Reflection

**Definition:** A moment where the student or system notices what happened during learning.

**Purpose:** To capture confidence, perceived difficulty, usefulness, or teaching evidence that may not appear in correctness alone.

**Related Terms:** Observation, Teacher Journal, Confidence, Lesson

**Appears In Documents:** [Lesson Engine](08-lesson-engine.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Reflection should be short and purposeful. It should not burden the student with analysis.

## Response Time

**Definition:** The time a student takes to answer, speak, choose, or complete a learning task.

**Purpose:** To help determine automaticity, hesitation, difficulty, fatigue, or readiness.

**Related Terms:** Automaticity, Automatic Response, Exercise Result, Fatigue Profile

**Appears In Documents:** [System Design](03-system-design.md), [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Response Time describes speed. It does not explain the reason for speed by itself.

## Retention

**Definition:** The student's ability to preserve and retrieve learned material over time.

**Purpose:** To guide review timing, repetition, and long-term learning protection.

**Related Terms:** Review Lesson, Review Block, Adaptive Timing, Long-term Memory

**Appears In Documents:** [Data Model](04-data-model.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Retention is different from immediate correctness. A student may succeed today and forget next week.

## Review Block

**Definition:** A lesson block that returns to material needing reinforcement.

**Purpose:** To protect memory, speed, confidence, and stability.

**Related Terms:** Review Lesson, Retention, Building Block, Lesson Engine

**Appears In Documents:** [Lesson Engine](08-lesson-engine.md)

**Notes:** Review Block is part of a lesson. Review Lesson is a lesson whose primary purpose is review.

## Review Lesson

**Definition:** A lesson designed primarily to reinforce previously learned material.

**Purpose:** To convert temporary success into durable skill.

**Related Terms:** Review Block, Retention, Adaptive Timing, Learning Strategy

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Review should be purposeful, not repetition for its own sake.

## Shadowing

**Definition:** A speaking practice where the student listens to English and repeats it closely.

**Purpose:** To improve rhythm, pronunciation, connected speech, listening, and speaking confidence.

**Related Terms:** Speaking Ability, Listening Ability, Speech Result, Walking Mode

**Appears In Documents:** [Lesson Engine](08-lesson-engine.md), [Learning Experience](06-learning-experience.md)

**Notes:** Shadowing is both listening and speaking practice.

## Speaking Ability

**Definition:** The student's ability to produce spoken English meaningfully.

**Purpose:** To guide speaking tasks, pronunciation work, fluency practice, and confidence-building.

**Related Terms:** Speaking Confidence, Speaking Fluency, Speech Result, Shadowing

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Experience](06-learning-experience.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Speaking Ability includes recall, pronunciation, fluency, sentence construction, and willingness to speak.

## Speaking Confidence

**Definition:** The student's trust in their ability to speak English aloud.

**Purpose:** To help the AI Teacher decide when to support, repeat, challenge, or reduce pressure in speaking tasks.

**Related Terms:** Confidence, Speaking Ability, Speaking Fluency, Recovery Lesson

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Speaking Confidence can be low even when grammar or vocabulary knowledge is strong.

## Speaking Fluency

**Definition:** The student's ability to produce spoken English with less hesitation, more stability, and smoother retrieval.

**Purpose:** To measure whether speaking is becoming available in real time.

**Related Terms:** Speaking Ability, Automaticity, Response Time, Speech Result

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Fluency does not require perfection. It describes usable flow and recovery.

## Speech Availability

**Definition:** Whether the current device, environment, permissions, and student situation allow spoken interaction.

**Purpose:** To help the AI Teacher and Lesson Engine choose appropriate lesson modes and fallbacks.

**Related Terms:** Speech Result, Speaking Ability, Learning Context, Walking Mode

**Appears In Documents:** [Learning Experience](06-learning-experience.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** If speech is unavailable, learning should continue through other modes.

## Speech Layer

**Definition:** The module that handles speech recognition, speech synthesis, audio playback, speech capture, timing, and speech-related learning evidence.

**Purpose:** To support spoken learning without coupling audio mechanics to teaching strategy.

**Related Terms:** Speech Result, Speech Availability, Speaking Ability, PWA Client

**Appears In Documents:** [Architecture](02-architecture.md), [Conceptual Contracts](14-contracts.md), [First Implementation](15-first-implementation.md)

**Notes:** The Speech Layer produces Speech Results. It does not decide the Student's learning path.

## Speech Result

**Definition:** A structured record of a spoken response or speech-related attempt.

**Purpose:** To preserve pronunciation signals, transcription, confidence, fluency, timing, and speech availability as learning evidence.

**Related Terms:** Speaking Ability, Speaking Fluency, Speech Availability, Exercise Result

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Speech Result is sensitive and requires strong privacy boundaries.

## Student

**Definition:** The person learning through Mentor AI.

**Purpose:** To anchor identity, learning history, preferences, goals, sessions, privacy, and the Student Model.

**Related Terms:** Student Model, Learning Session, AI Teacher, Personalization

**Appears In Documents:** [Manifesto](00-manifesto.md), [Project](01-project.md), [System Design](03-system-design.md), [Data Model](04-data-model.md)

**Notes:** Use Student instead of User. Student preserves the educational relationship.

## Student Model

**Definition:** The durable teaching interpretation of the student's ability, weaknesses, strengths, confidence, memory, fatigue, preferences, and readiness.

**Purpose:** To guide personalization and future teaching decisions.

**Related Terms:** Student, AI Teacher, Teacher Memory, Learning Analytics

**Appears In Documents:** [Project](01-project.md), [Architecture](02-architecture.md), [System Design](03-system-design.md), [Data Model](04-data-model.md)

**Notes:** Student Model is not the full history. It is the current interpretation built from evidence.

## Synchronization

**Definition:** The process that keeps learning knowledge aligned across offline activity, devices, backend storage, analytics, AI Teacher, and future lessons.

**Purpose:** To preserve continuity when learning happens across interruptions, weak networks, and multiple system states.

**Related Terms:** Learning Event, Student Model, Teacher Memory, Generated Lesson

**Appears In Documents:** [Project](01-project.md), [Architecture](02-architecture.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Synchronization is not only network transfer. It is synchronization of learning knowledge.

## Synchronization State

**Definition:** The local and durable state that records what learning evidence is pending, accepted, acknowledged, failed, or needs reconciliation.

**Purpose:** To let offline learning become durable history without duplication, loss, or confusion.

**Related Terms:** Synchronization, Learning Event, Exercise Result, Generated Lesson

**Appears In Documents:** [Data Model](04-data-model.md), [Learning Synchronization](10-learning-synchronization.md), [Conceptual Contracts](14-contracts.md)

**Notes:** Synchronization State is process state. It is not the learning evidence itself.

## Teacher Journal

**Definition:** The narrative record of teaching observations, insights, and decisions.

**Purpose:** To explain what the AI Teacher noticed, why it mattered, and how it affected teaching.

**Related Terms:** Teacher Memory, Observation, Educational Insight, Recommendation

**Appears In Documents:** [Learning Analytics](09-learning-analytics.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Teacher Journal is more narrative and time-based than Teacher Memory. It should not be called a log.

## Teacher Memory

**Definition:** Durable teaching knowledge that remains useful across many lessons and sessions.

**Purpose:** To help the AI Teacher remember patterns, preferences, weaknesses, strengths, recovery strategies, and long-term learning meaning.

**Related Terms:** Teacher Journal, Student Model, Long-term Memory, AI Teacher

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md), [Learning Synchronization](10-learning-synchronization.md)

**Notes:** Teacher Memory is not a cache. It is learned teaching understanding.

## Vocabulary Growth

**Definition:** The development of the student's ability to recognize, recall, retain, and use words or phrases.

**Purpose:** To guide vocabulary review, introduction, usage practice, and retention work.

**Related Terms:** Retention, Student Model, Exercise Result, Learning Analytics

**Appears In Documents:** [AI Teacher](07-ai-teacher.md), [Learning Analytics](09-learning-analytics.md)

**Notes:** Vocabulary Growth includes use in context, not only word count.

## Walking Mode

**Definition:** A learning mode for motion, divided attention, and audio-first interaction.

**Purpose:** To support listening, shadowing, simple spoken responses, and minimal screen attention.

**Related Terms:** Bus Mode, Home Practice, Speech Availability, Shadowing

**Appears In Documents:** [Learning Experience](06-learning-experience.md), [AI Teacher](07-ai-teacher.md), [Lesson Engine](08-lesson-engine.md)

**Notes:** Walking Mode should not require sustained visual focus.

## Warm-up

**Definition:** A short, familiar lesson block that prepares the student for learning.

**Purpose:** To create momentum and reduce friction at the beginning of a lesson.

**Related Terms:** Building Block, Lesson, Review Block, Recovery Lesson

**Appears In Documents:** [Lesson Engine](08-lesson-engine.md)

**Notes:** Warm-up should usually be easy enough to help the student begin.

## Weakness

**Definition:** A skill, topic, pattern, or behavior that repeatedly shows fragility, difficulty, slow retrieval, low confidence, or poor retention.

**Purpose:** To guide review, support, practice, and teaching decisions.

**Related Terms:** Pattern, Difficulty Profile, Student Model, Recovery Lesson

**Appears In Documents:** [System Design](03-system-design.md), [Data Model](04-data-model.md), [AI Teacher](07-ai-teacher.md)

**Notes:** A Weakness is not a judgment of the student. It is a teaching signal.

## Glossary Maintenance Rules

Every new project concept must first be added to this glossary before it appears in architecture, documentation, prompts, analytics labels, or code.

Each concept must have exactly one official name.

Each official name must have exactly one definition.

Do not introduce synonyms for variety.

Do not rename concepts in code because a technical synonym feels more familiar.

If a new term overlaps with an existing term, update the existing definition or explain the difference before using both.

If a term becomes obsolete, mark it as deprecated in this glossary before removing it from documents or code.

If a document needs a concept that is not in the glossary, update the glossary first.

If code needs a domain name that is not in the glossary, update the glossary first.

If an AI prompt needs a project concept, use the glossary term exactly.

The glossary is the source of truth for Mentor AI language.

## Summary

Mentor AI depends on consistent language because its architecture is conceptual before it is technical.

The same words should mean the same things everywhere. This glossary protects the teacher, the student, the learning model, and the future of the project from accidental ambiguity.

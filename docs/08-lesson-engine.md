# Mentor AI Lesson Engine

## Introduction

Lessons in Mentor AI are not static documents.

They are not pages selected from a fixed course. They are not prewritten units delivered in order. They are not collections of exercises that happen to share a topic.

Lessons are generated dynamically.

The Lesson Engine is responsible for transforming teaching decisions into learning sessions. It receives direction from the AI Teacher, reads the current Student Model, understands the learning context, selects appropriate building blocks, adjusts difficulty, assembles the session, validates the result, and prepares it for delivery.

The AI Teacher decides what should be taught.

The Lesson Engine decides how that teaching decision becomes an actual lesson.

This distinction matters. The teacher may decide that the student needs to stabilize past-tense question forms, rebuild confidence after a difficult speaking session, increase listening speed, or review fragile travel vocabulary. The Lesson Engine turns that decision into a balanced sequence of activities the student can actually complete today.

Every lesson should have a purpose.

A lesson should exist because the system has evidence that this session is useful now. It may protect memory, strengthen recall, introduce a small challenge, recover confidence, test retention, improve listening, practice speaking, or connect several skills together.

No lesson should exist merely because content is available.

## Philosophy

The Lesson Engine should behave like a curriculum designer working in real time.

It should not randomly assemble activities. It should not treat variety as a substitute for teaching. It should not assume that completing more exercises is always better. It should build lessons that reflect the student's current state, the teacher's decision, the learning mode, and the desired outcome.

Lessons should be adaptive.

An adaptive lesson changes according to the student. It may become shorter, slower, more oral, more visual, more repetitive, more challenging, or more supportive depending on what the Student Model shows.

Lessons should be modular.

The engine should build sessions from reusable parts. Modularity allows the system to combine known teaching patterns in new ways without inventing every lesson from nothing.

Lessons should be reusable.

A good exercise, explanation, listening pattern, review block, or speaking prompt should be usable in many contexts. Reuse allows the system to preserve quality while still adapting the lesson around the student.

Lessons should be evidence-based.

The engine should select material because there is a teaching reason: a weak skill, a recent success, a fragile memory, a planned progression, a confidence signal, or a context constraint.

Lessons should be balanced.

A lesson should manage effort. It may include recognition, recall, listening, speaking, review, challenge, and reflection in proportions that fit the student's current need. Balance does not mean every lesson contains everything. It means the lesson has enough variation and pacing to support learning.

Lessons should be purpose-driven.

The purpose of the lesson should guide every block inside it. A lesson about listening speed should not drift into unrelated grammar drills. A recovery lesson should not accidentally become a difficult test. A challenge lesson should still protect the student from overload.

No lesson exists by accident.

## Building Blocks

The Lesson Engine builds lessons from reusable blocks.

A block is a meaningful learning unit. It may be small, such as one exercise, or larger, such as a group of related exercises. A block should have a clear role in the session.

Common block types include:

- Exercise
- Exercise Group
- Grammar Topic
- Vocabulary Topic
- Listening Segment
- Speaking Segment
- Review Block
- Challenge Block
- Warm-up
- Cooldown
- Reflection

An exercise is a single task the student completes.

An exercise group is a set of related tasks that practice the same skill, pattern, vocabulary set, or teaching goal.

A grammar topic represents a grammatical structure, rule, contrast, or usage pattern that may be introduced, reviewed, or practiced.

A vocabulary topic represents a semantic group, practical situation, word family, collocation set, or personalized vocabulary need.

A listening segment exposes the student to spoken English and checks comprehension, sound recognition, rhythm, speed, or meaning.

A speaking segment asks the student to produce English aloud through repetition, sentence building, answers, roleplay, or guided conversation.

A review block returns to material that needs protection. It should be selected because memory, speed, accuracy, or confidence requires reinforcement.

A challenge block increases complexity intentionally. It may combine skills, reduce support, introduce more natural language, or ask the student to produce longer answers.

A warm-up prepares the student for learning. It should be short, familiar, and easy enough to create momentum.

A cooldown helps the lesson finish cleanly. It may reduce difficulty, return to successful material, or stabilize the final emotional tone of the session.

A reflection block helps the system and student notice what happened. It may ask for confidence, perceived difficulty, or a short self-assessment.

Modularity is important because adaptation requires recombination.

The same grammar topic may appear in a short bus lesson, a home practice session, a speaking challenge, or a review day. The same vocabulary set may be practiced through recognition, translation, listening, conversation, or recall. The same weakness may need different lesson shapes depending on energy, time, device state, and confidence.

Without modularity, every lesson becomes a fixed artifact.

With modularity, the Lesson Engine can preserve teaching intent while changing the session around the student.

## Lesson Structure

A conceptual lesson may look like this:

```text
Warm-up
  ↓
Review
  ↓
Core Practice
  ↓
Listening
  ↓
Speaking
  ↓
Challenge
  ↓
Reflection
```

This is not a required template.

It is one possible teaching shape.

The Lesson Engine should choose structure according to context. A student on a bus may receive warm-up, listening review, quick recognition, and a short reflection. A student at home may receive deeper grammar practice, longer speaking, and a challenge block. A tired student may receive review, guided practice, and cooldown without new material. A confident student may receive a shorter warm-up and a harder production task.

Structure should serve the lesson purpose.

If the purpose is recovery, the structure should lower pressure and restore momentum.

If the purpose is retention, the structure should prioritize retrieval, spaced review, and targeted repetition.

If the purpose is speaking confidence, the structure should build from safe repetition toward controlled production.

If the purpose is listening speed, the structure should expose the student to audio at the right speed, check understanding, repeat strategically, and adjust support.

The engine should not force all lessons into the same order.

A lesson is a designed learning arc, not a checklist.

## Exercise Types

Exercise types are families of student activity.

They describe how the student practices, not only what topic is being practiced. The same grammar structure can appear in translation, word order, conversation, listening, or speaking exercises. The same vocabulary set can be recognized, recalled, heard, spoken, or used in context.

Core exercise families include:

- Translation
- Listening
- Speaking
- Shadowing
- Conversation
- Grammar
- Word Order
- Vocabulary
- Review
- Mixed Practice

Translation exercises ask the student to move meaning between languages. They are useful for recall, sentence construction, grammar application, and checking whether the student can produce meaning without seeing the English answer first.

Listening exercises ask the student to understand spoken English. They may involve selecting meaning, repeating audio, answering comprehension questions, identifying words, or comparing similar sounds.

Speaking exercises ask the student to produce spoken English. They may focus on pronunciation, fluency, recall, sentence building, or confidence.

Shadowing exercises ask the student to listen and repeat closely. They support rhythm, pronunciation, connected speech, and confidence with spoken patterns.

Conversation exercises simulate communicative use. They may involve roleplay, short answers, follow-up questions, repair after mistakes, or guided dialogue.

Grammar exercises strengthen structure. They may teach, test, contrast, or stabilize forms, but grammar should remain connected to meaning and usage.

Word order exercises train sentence structure. They are useful when the student knows the words but cannot reliably arrange them into natural English.

Vocabulary exercises strengthen recognition, recall, meaning, collocation, and usage.

Review exercises return to known material at the right time. Their purpose is retention, stability, speed, and confidence.

Mixed practice combines skills. It helps determine whether knowledge transfers across contexts instead of working only in isolated drills.

New exercise types should be added as new interaction patterns, not as one-off content hacks.

Each new type should define:

- What skill it practices
- What student response it expects
- What evidence it produces
- How difficulty can change
- Which lesson contexts it supports
- How success or struggle should update the Student Model

An exercise type is useful only if it teaches something and tells the system something.

## Lesson Generation

Lesson generation is the process of converting evidence and teaching intent into a deliverable session.

Conceptually, the flow is:

```text
Student Model
  ↓
Teacher Decision
  ↓
Learning Goal
  ↓
Exercise Selection
  ↓
Difficulty Adjustment
  ↓
Lesson Assembly
  ↓
Validation
  ↓
Delivery
```

The Student Model describes the current learner. It includes knowledge, weaknesses, strengths, memory stability, recent mistakes, response speed, confidence, preferred modes, available capabilities, and session context.

The Teacher Decision defines what the AI Teacher believes should happen next. It may choose review, challenge, recovery, new material, listening practice, speaking practice, grammar stabilization, vocabulary reinforcement, or a combination of goals.

The Learning Goal translates the teacher decision into a concrete session purpose. A goal should be specific enough to guide selection. For example, "review weak vocabulary" is less useful than "strengthen recall of restaurant phrases that are recognized in reading but slow in speaking."

Exercise Selection chooses blocks that support the goal. Selection should consider topic, skill, modality, estimated duration, evidence value, prior exposure, and suitability for the current context.

Difficulty Adjustment tunes the selected material. The engine may change sentence length, vocabulary familiarity, listening speed, accent, time pressure, response format, support level, production complexity, or number of repetitions.

Lesson Assembly orders the selected blocks into a learning arc. The engine should consider warm-up, pacing, progression, transitions, fatigue, balance, and the emotional ending of the lesson.

Validation checks whether the assembled lesson is coherent, useful, and deliverable. It confirms that the lesson has a purpose, fits the context, has suitable duration, and does not overload the student.

Delivery prepares the lesson for the learning experience. The student should not see the complexity behind the lesson. They should simply enter a session that feels ready, personal, and purposeful.

The generation process should be repeatable, inspectable, and improvable.

The system should be able to explain why a lesson was generated, which evidence influenced it, and what outcome it expected.

## Adaptation

The Lesson Engine adapts lessons to the student's situation.

Adaptation means changing the shape of the lesson without losing the teaching purpose.

Bus Mode should produce short, interruption-tolerant lessons. It should favor listening, recognition, quick responses, light review, and tasks that can be paused or resumed easily.

Walking should produce audio-first lessons. It should favor listening, shadowing, simple spoken responses, and minimal visual attention.

Home should allow deeper practice. It can include longer explanations, writing, speaking, grammar work, review chains, and more complex feedback.

Low Energy should reduce pressure. It may shorten the session, reduce production demands, increase familiarity, add more support, or shift from challenge to recovery.

High Confidence should support growth. It may introduce harder contexts, longer responses, faster listening, reduced hints, or mixed practice.

Review Day should protect memory. It should prioritize spaced retrieval, weak items, slow responses, recurring mistakes, and skills that are at risk of fading.

Recovery Day should restore momentum. It should avoid punishment for absence or struggle, return to known material, and end with success.

Challenge Day should stretch the student. It should increase complexity intentionally while preserving enough support to keep effort productive.

Speech Available should enable speaking, shadowing, pronunciation checks, oral recall, and conversation practice.

Speech Unavailable should shift gracefully. The lesson may use listening, reading, typing, recognition, translation, or silent review without treating the session as broken.

Adaptation should feel natural to the student.

The lesson should change because the teacher is paying attention, not because the product is unstable.

## Repetition

Repetition is not filler.

Repetition is one of the main ways learning becomes durable.

The Lesson Engine should plan repetition intentionally. It should return to material because the student needs memory protection, faster recall, better accuracy, stronger listening recognition, more confident speaking, or transfer into new contexts.

Spaced repetition returns to material after time has passed. The timing should reflect memory stability, prior performance, and the risk of forgetting.

Adaptive repetition changes based on evidence. A word that was answered quickly and confidently may need less repetition. A structure that was correct in grammar drills but failed during speaking may need more varied repetition.

Targeted repetition focuses on the exact source of weakness. The engine should not repeat an entire topic when the problem is a specific contrast, phrase, word order pattern, sound, or response condition.

Confidence-based repetition recognizes that knowledge and confidence are not the same. A student may answer correctly but hesitate, avoid speaking, or feel uncertain. Repetition can make the skill feel safer and more available.

Automatic review protects learning without requiring the student to manage it. The student should not need to remember what to review. The system should notice and return to what matters.

Repetition should be varied enough to teach transfer.

The engine may repeat the same target through translation, listening, word order, speaking, and conversation. The goal is not to make the student memorize one exercise. The goal is to make the skill available across real use.

Repetition is intentional because forgetting is predictable.

The Lesson Engine should treat memory as something to design for, not something to hope for.

## Difficulty

Difficulty is multidimensional.

It is not only grammar level.

A sentence can be grammatically simple but difficult because it is long, fast, unfamiliar, emotionally uncomfortable, or requires speaking under time pressure. A grammar point can be advanced but manageable if the vocabulary is known and the response format is supported.

The Lesson Engine should consider difficulty across many dimensions:

- Sentence length
- Vocabulary familiarity
- Listening speed
- Accent
- Response time
- Context complexity
- Speaking complexity
- Grammar complexity
- Amount of support
- Number of steps
- Similarity to prior examples
- Required memory load
- Error recovery demand
- Emotional pressure

Sentence length affects working memory and production effort.

Vocabulary affects comprehension, recall, confidence, and speed.

Listening speed affects sound processing and comprehension stability.

Accent affects recognition and transfer to real-world listening.

Response time affects automaticity and pressure.

Context complexity affects whether the student understands the situation, not only the words.

Speaking complexity affects fluency, pronunciation, sentence planning, and confidence.

Adaptive difficulty means changing these dimensions based on evidence.

If the student is accurate but slow, the engine may keep content similar while reducing response time or increasing retrieval frequency.

If the student understands written sentences but struggles with audio, the engine may keep vocabulary stable while adjusting listening speed and repetition.

If the student loses confidence during speaking, the engine may reduce sentence length, add scaffolding, or begin with shadowing before asking for independent production.

Difficulty should rise when the student shows readiness.

Difficulty should fall when overload prevents useful learning.

The goal is not to make lessons easy.

The goal is to make effort productive.

## Lesson Validation

Before delivery, every lesson should pass quality checks.

Validation protects the student from incoherent, accidental, unbalanced, or context-inappropriate sessions.

Every lesson should have a purpose.

The engine should know why the lesson exists and which learning need it serves.

Every lesson should have balance.

Balance means the session contains an appropriate mix of activity, challenge, support, repetition, and pacing for the current goal. A review lesson may be mostly retrieval. A speaking lesson may be mostly production. Balance is measured against purpose, not a universal formula.

Every lesson should have an estimated duration.

The lesson should fit the available time and mode. A bus session should not behave like a home lesson. A short session should not attempt an entire topic arc.

Every lesson should have expected difficulty.

The engine should estimate whether the lesson is easy, moderate, difficult, recovery-oriented, or challenge-oriented for this student now.

Every lesson should have a recovery strategy.

If the student struggles, the lesson should know how to respond. It may reduce difficulty, add hints, repeat audio, switch exercise type, return to known material, shorten the lesson, or end with a confidence-restoring cooldown.

Validation exists because generated lessons can fail in subtle ways.

A lesson may have good exercises but poor order. It may have useful review but too much repetition. It may have a strong challenge but no recovery. It may match the topic but not the student's energy. It may be correct in content but wrong for the moment.

The Lesson Engine should catch these problems before the student feels them.

## Future Lesson Types

The Lesson Engine should be extensible.

Future lesson types should be added by expanding blocks, exercise families, generation rules, and validation checks rather than creating disconnected product modes.

Conversation lessons may focus on sustained dialogue, turn-taking, repair, follow-up questions, and confidence under natural pressure.

Story lessons may teach through narrative continuity, recurring vocabulary, prediction, comprehension, and retelling.

Movie lessons may use scenes, dialogue, listening comprehension, expressions, emotion, culture, and shadowing.

Podcast lessons may train longer listening, summarization, note-taking, topic vocabulary, and real-speed comprehension.

Real-world situations may prepare the student for restaurants, travel, doctors, school, work, phone calls, appointments, and everyday interactions.

Travel mode may prioritize survival phrases, listening in noisy contexts, quick responses, pronunciation clarity, and offline availability.

Work mode may prioritize meetings, email language, presentations, negotiation, small talk, and professional vocabulary.

Interview mode may prioritize self-introduction, experience summaries, follow-up answers, confidence, and precise speaking.

Extensibility should preserve the core teaching model.

New lesson types should still be adaptive, modular, evidence-based, balanced, and purpose-driven. They should still update the Student Model. They should still respect context, difficulty, repetition, and validation.

The engine should grow by becoming a better curriculum system, not by accumulating isolated lesson templates.

## Lesson Engine Principles

1. Lessons are generated, not stored as fixed paths.
2. Every lesson has a purpose.
3. Every exercise has a reason to appear.
4. No random exercises should reach the student.
5. The Student Model shapes every lesson.
6. The AI Teacher defines the teaching intent.
7. The Lesson Engine turns intent into session design.
8. Reuse should come before duplication.
9. Modularity makes adaptation possible.
10. Repetition is planned, not accidental.
11. Review protects memory before failure becomes visible.
12. Difficulty is adaptive and multidimensional.
13. Correctness is not the only signal.
14. Response speed changes lesson decisions.
15. Confidence changes lesson decisions.
16. Student context matters.
17. Available time matters.
18. Device and speech availability matter.
19. Balance challenge and confidence.
20. Recovery is a legitimate teaching goal.
21. A short lesson can still be a complete lesson.
22. New material should arrive when the student is ready.
23. Familiar material should return when stability is fragile.
24. Listening, speaking, grammar, vocabulary, and review should support one another.
25. Lessons should evolve continuously.
26. Lesson structure should serve purpose, not habit.
27. Validation should happen before delivery.
28. Generated lessons should be explainable.
29. Every lesson should teach something.
30. The engine should become more precise as evidence grows.

## Final Summary

The Lesson Engine is the system that turns teaching decisions into lived learning sessions.

It does not merely generate content. It assembles purposeful, adaptive, modular lessons from reusable blocks, guided by the Student Model and directed by the AI Teacher.

Its work is to make each session feel prepared, relevant, balanced, and useful.

The Lesson Engine should feel less like a content generator and more like a curriculum designer working together with the AI Teacher.

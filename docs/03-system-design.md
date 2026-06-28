# Mentor AI System Design

## Introduction

Mentor AI is built around one central idea:

**The Student Model.**

Everything else in the system exists to improve it.

Every lesson gives the system more evidence. Every exercise reveals something about the student's knowledge, confidence, speed, memory, listening, grammar, speaking, vocabulary, fatigue, or motivation. Every recommendation exists because the Student Model now understands something more precisely than it did before. Every statistic matters only when it helps the AI Teacher interpret the student. Every observation matters because it turns raw learning behavior into teaching knowledge.

The Student Model is not a profile, score, report, or database record. It is the living understanding of one student's learning state. It is the memory that lets Mentor AI behave like a teacher instead of a course.

Lessons are temporary.

Exercises are temporary.

Statistics are snapshots.

Generated content is replaceable.

The Student Model is the durable center of the system.

This document defines the domain model of Mentor AI. It describes the language, concepts, relationships, and rules that every future backend service, client surface, AI workflow, storage model, and user interface must respect.

Canonical object metadata lives in [Data Model](04-data-model.md). This document explains domain meaning and relationships; it should not duplicate ownership tables.

## Ubiquitous Language

### Student

The Student is the person learning through Mentor AI.

The Student learns, answers, listens, speaks, hesitates, improves, forgets, struggles, returns, and changes over time. The Student is not expected to design their own curriculum, interpret complex analytics, choose the next grammar topic, or manage difficulty. Their responsibility is to participate honestly in learning.

The system exists to understand the Student more deeply after every meaningful interaction.

### Lesson

A Lesson is a purposeful learning experience prepared for the Student.

A Lesson is not a unit in a fixed course. It exists because the AI Teacher believes the Student needs something specific now: review, practice, confidence, recall, listening pressure, grammar stabilization, vocabulary reinforcement, speaking fluency, or diagnosis.

Every Lesson must have a teaching purpose.

### Exercise

An Exercise is a single learning task inside a Lesson.

It asks the Student to do something observable: translate, listen, repeat, shadow, choose, correct, order words, answer in conversation, recall vocabulary, or produce speech. Exercises create evidence. That evidence later helps update the Student Model.

An Exercise is valuable only when it reveals or improves something relevant to the Student.

### Exercise Result

An Exercise Result is the outcome of one Exercise attempt.

It may describe correctness, response time, attempts, speech detection, confidence, difficulty, timing, manual feedback, hesitation, partial success, or completion. Not every Exercise produces every metric. A listening task may reveal different evidence than a grammar correction task. A speaking task may reveal confidence and timing even when correctness is hard to judge.

Exercise Results are evidence, not teaching wisdom by themselves.

### AI Teacher

The AI Teacher is the domain role responsible for interpreting the Student Model and deciding what the Student needs next.

The AI Teacher observes, remembers, recommends, adjusts difficulty, chooses learning goals, identifies weaknesses, recognizes strengths, and explains teaching intent. It does not merely select content. It makes instructional decisions from evidence.

The AI Teacher is the product's teaching mind.

### Student Model

The Student Model is the evolving representation of what Mentor AI currently understands about the Student.

It includes knowledge, confidence, weaknesses, strengths, mastered skills, forgotten skills, learning history, preferences, fatigue indicators, response speed, listening ability, grammar ability, speaking ability, vocabulary, motivation, and memory.

The Student Model is the heart of the system and the source of truth for personalization.

### Recommendation

A Recommendation is teaching guidance produced for the Student.

It may suggest what to practice, what to repeat, when to rest, which skill needs attention, or why a future Lesson focuses on a specific area. Recommendations are generated from AI Observations, not directly from raw statistics.

A Recommendation should be understandable to the Student, but it should not force the Student to become their own analyst.

### Observation

An Observation is interpreted AI knowledge about the Student.

Examples include:

* The Student hesitates before Present Perfect.
* Listening comprehension improved at slow speed.
* Question word order is still unstable.
* The Student becomes tired after twenty minutes.
* Vocabulary recall is strong in isolation but weak in conversation.
* Speaking confidence drops when the Student must respond quickly.

Observations are not raw statistics. They are conclusions drawn from evidence.

### Weakness

A Weakness is a skill, pattern, concept, behavior, or condition that limits the Student's progress.

A Weakness may be obvious, such as repeated grammar errors. It may also be subtle, such as slow recall, fragile confidence, poor transfer from recognition to production, or fatigue after a certain lesson length.

A Weakness should be treated as teachable information, not as failure.

### Strength

A Strength is an area where the Student shows reliable ability.

Strengths may include stable grammar, fast vocabulary recall, strong listening at a given speed, accurate pronunciation, good memory for repeated phrases, or resilience after mistakes. Strengths help the AI Teacher decide what to skip, what to use as support, and when the Student can handle more difficulty.

### Learning Session

A Learning Session is a period of active learning by the Student.

It may contain one or more Lessons, Exercises, responses, pauses, retries, speech events, and completion signals. A Learning Session has a rhythm: the Student begins, works, reacts, tires, succeeds, struggles, and stops.

The Learning Session is important because learning behavior has context. A mistake after two minutes may mean something different than the same mistake after twenty minutes.

### Synchronization

Synchronization is the act of preserving learning continuity across local and durable system state.

It ensures that offline activity, completed Exercises, timing, speech results, statistics, and session evidence become part of the same learning history. Synchronization is not merely data transfer. In the domain, it protects memory.

Offline learning must still matter.

### Statistics Snapshot

A Statistics Snapshot is a point-in-time representation of learning activity or progress.

It may summarize response time, correctness, completion, repetitions, listening score, speaking activity, vocabulary recall, or grammar reliability. Snapshots are useful for trend analysis and for helping the AI Teacher interpret change.

A Statistics Snapshot is not the source of truth. The Student Model is.

### Speech Result

A Speech Result is evidence produced by a spoken interaction.

It may include whether speech was detected, how long the Student took to begin, whether the response was complete, confidence in recognition, pronunciation-related signals, timing, repetition, or manual correction. A Speech Result may be incomplete or uncertain.

Speech Results help the system understand speaking ability, confidence, fluency, and fatigue.

### Lesson Template

A Lesson Template is a reusable learning structure.

It describes a pattern for teaching, such as review, listening practice, translation drills, conversation, grammar correction, or shadowing. A Lesson Template does not decide what the Student needs. It gives the Lesson Engine a reliable form for expressing teaching intent.

Templates are tools, not curriculum.

### Generated Lesson

A Generated Lesson is a Lesson created for the Student from teaching intent.

It is personal, contextual, and temporary. It may reflect current weaknesses, remembered mistakes, preferred pacing, fatigue, vocabulary needs, or confidence. A Generated Lesson exists to create new evidence and improvement.

Generated Lessons are based on the Student Model and should eventually improve it.

### Learning Goal

A Learning Goal is a desired learning outcome.

It may be short-term, such as practicing question word order today. It may be long-term, such as becoming comfortable in spoken conversation. Learning Goals can change automatically as the Student Model evolves.

A Learning Goal gives purpose to Lessons and Exercises.

### Mastery

Mastery is reliable ability under appropriate conditions.

A mastered skill is not merely answered correctly once. It is stable across time, contexts, formats, and reasonable pressure. Mastery may weaken if unused, so the system may later treat a mastered skill as fragile or forgotten.

Mastery is never assumed to be permanent without evidence.

### Confidence

Confidence is the Student's apparent readiness to use knowledge without excessive hesitation, avoidance, or breakdown.

Confidence may be inferred from response speed, speech behavior, repeated success, self-correction, and willingness to attempt difficult work. Confidence is different from correctness. A Student can be correct but uncertain, or incorrect but increasingly willing to try.

### Response Time

Response Time is the time between a prompt and the Student's meaningful response.

It helps distinguish knowledge from automaticity. A correct but very slow answer may reveal fragile recall. A fast answer may indicate fluency, guessing, or familiarity depending on context.

Response Time must be interpreted, not worshipped.

### Listening Score

Listening Score is a signal about how well the Student understands spoken language.

It may be based on comprehension tasks, repeated listening, transcription-like behavior, response accuracy after audio prompts, or difficulty at different speeds. It should be understood as one signal among many.

### Grammar Skill

Grammar Skill is the Student's ability to understand and produce grammatical structures.

It includes correctness, stability, transfer to new contexts, speed, and resilience under pressure. A Grammar Skill may be strong in written tasks but weak in speech.

### Vocabulary Skill

Vocabulary Skill is the Student's ability to recognize, recall, and use words or phrases.

Vocabulary strength varies by context. A word may be recognized when reading, understood while listening, recalled in isolation, but unavailable during conversation. The Student Model should preserve these differences.

### Speaking Skill

Speaking Skill is the Student's ability to produce spoken language.

It includes readiness, response speed, completeness, pronunciation-related signals, fluency, confidence, and recovery after mistakes. Speaking Skill depends on grammar, vocabulary, listening, memory, and emotional pressure.

### Memory

Memory is the Student's ability to retain and retrieve learned material over time.

Memory can strengthen through repetition and weaken through disuse. The system should notice forgetting, fragile recall, and skills that require review before they collapse.

### Fatigue

Fatigue is a condition where the Student's performance or attention appears to decline during learning.

Fatigue may be visible through slower responses, more mistakes, shorter speech, repeated retries, skipped work, or reduced confidence. Fatigue is not the same as lack of ability. The AI Teacher must distinguish tiredness from misunderstanding when possible.

### Difficulty

Difficulty describes how demanding a Lesson or Exercise is for the Student.

Difficulty is personal. The same Exercise may be easy for one Student state and difficult for another. Difficulty depends on content, skill, speed, context, fatigue, confidence, and format.

## Core Domain

The core business domain of Mentor AI is not lesson delivery.

The core domain is continuously improving the Student Model so the AI Teacher can make better teaching decisions over time.

Lessons are tools. Exercises are tools. Statistics are tools. Speech analysis is a tool. Synchronization is a tool. Generated content is a tool.

The real product is the adaptive teaching loop:

```text
Understand the Student
  ↓
Choose a useful learning goal
  ↓
Create a purposeful lesson
  ↓
Observe the Student's work
  ↓
Interpret the evidence
  ↓
Improve the Student Model
  ↓
Teach better next time
```

If a feature does not help the system understand the Student, teach the Student, preserve learning memory, or improve future decisions, it does not belong in the core domain.

## Main Domain Objects

## Student

### Responsibilities

The Student participates in learning.

The Student starts sessions, completes Exercises, listens, speaks, reads, answers, repeats, struggles, and returns later. The Student supplies the human effort that makes the Student Model meaningful.

The Student is not responsible for choosing the next Lesson, designing a plan, interpreting statistics, or tuning the system. Mentor AI should reduce decision burden so the Student can focus on learning.

### Lifecycle

The Student begins with little or no known learning history. At first, the system may know only broad preferences, target language, starting ability, or initial goals.

Over time, the Student becomes better understood. Their learning history grows. Strengths become visible. Weaknesses repeat or resolve. Fatigue patterns appear. Confidence changes. The AI Teacher becomes more precise because the Student Model becomes richer.

The Student lifecycle is open-ended. There is no final state where the system stops learning about the Student.

### State

The Student's domain state includes identity, active learning context, preferences, goals, current progress, and relationship to the Student Model.

The most important Student state is not demographic. It is educational: what the Student can do, what they cannot yet do, what they can do only slowly, what they can do only with support, and what they are ready to learn next.

### Identity

The Student has identity because learning history must belong to someone specific.

Mentor AI is initially personal-first. The Student's identity anchors privacy, continuity, history, generated lessons, observations, and model evolution.

## Student Model

The Student Model is the heart of the system.

It is the durable teaching memory that represents what Mentor AI currently understands about the Student. It is not a transcript of everything the Student has done. It is an interpreted model of what all that activity means.

The Student Model contains:

* knowledge
* confidence
* weaknesses
* strengths
* mastered skills
* forgotten skills
* learning history
* preferences
* fatigue indicators
* response speed
* listening ability
* grammar ability
* speaking ability
* vocabulary
* motivation
* memory

The Student Model evolves through evidence and interpretation.

An Exercise Result may show that the Student answered correctly. A Statistics Snapshot may show that response time improved. A Speech Result may show hesitation before speaking. An Observation may conclude that the Student knows the grammar rule but cannot produce it quickly in speech. The Student Model then changes to reflect that more useful truth.

The Student Model should preserve nuance. It should avoid reducing the Student to a single level, score, streak, or progress percentage. Language ability is uneven. The Student may be strong in reading, fragile in listening, accurate in grammar, slow in speaking, confident with familiar vocabulary, and tired after long sessions.

The Student Model changes continuously, but not carelessly. Updates must come from evidence, interpretation, or explicit Student preference. It should remember long-term patterns while still adapting to recent change.

When the Student Model improves, the entire product improves.

## AI Teacher

The AI Teacher is responsible for teaching decisions.

### Responsibilities

The AI Teacher reads the Student Model, considers recent evidence, identifies what matters, chooses Learning Goals, produces Observations, generates Recommendations, and guides the creation of Lessons.

Its central question is always:

**What does this Student need now?**

### Inputs

The AI Teacher may use:

* the current Student Model
* recent Learning Sessions
* Lesson purposes and outcomes
* Exercise Results
* Speech Results
* Statistics Snapshots
* prior Observations
* prior Recommendations
* Student preferences
* fatigue indicators
* long-term Learning Goals

These inputs are evidence. The AI Teacher's role is to interpret them.

### Outputs

The AI Teacher may produce:

* Observations
* Recommendations
* Learning Goals
* teaching intent for the next Lesson
* difficulty guidance
* review priorities
* warnings about fatigue or overload
* updates to the Student Model

The most important output is not content. It is better understanding.

### Decisions

The AI Teacher decides whether to review, advance, repeat, simplify, increase pressure, reduce pressure, change format, focus on confidence, test retention, or diagnose uncertainty.

It should recognize that the same result can have different meanings. A wrong answer may reveal ignorance, fatigue, distraction, speech recognition failure, unclear instructions, or a skill that is understood but not automatic.

### Memory

The AI Teacher's memory lives through the Student Model and Observations.

Memory is what lets the system avoid behaving like every session is the first session. The AI Teacher should remember what worked, what failed, what the Student avoids, which mistakes repeat, which explanations helped, and which skills appear stable.

### Observations

Observations are the AI Teacher's interpreted knowledge.

They are more valuable than raw statistics because they explain what the statistics may mean. The system should protect Observations as first-class domain knowledge.

### Recommendations

Recommendations are teaching guidance derived from Observations.

They should be useful, specific, and oriented toward learning action. A Recommendation should help the Student or the system decide what should happen next.

## Lesson

A Lesson is a purposeful learning experience.

### Purpose

A Lesson exists to serve a Learning Goal and improve the Student Model. It may teach, test, reinforce, diagnose, build confidence, improve speed, strengthen memory, or expose a weakness.

A Lesson without purpose is noise.

### Lifecycle

A Lesson begins with teaching intent. The AI Teacher decides what the Student needs. The Lesson Engine turns that intent into a concrete Lesson. The Student completes the Lesson through Exercises. The system collects Exercise Results, Speech Results, and timing. The AI Teacher interprets the outcome. The Student Model changes. The next Lesson is shaped by the updated model.

### Relationship To Student Model

A Lesson is generated from the Student Model and should eventually update the Student Model.

This relationship is circular and intentional. The model produces the Lesson. The Lesson produces evidence. The evidence improves the model.

## Exercise

An Exercise is a focused learning action within a Lesson.

Exercise types may include:

* translation
* listening
* repeat
* shadowing
* conversation
* multiple choice
* word order
* grammar correction
* speaking

Different Exercise types reveal different kinds of evidence. Translation may reveal production ability. Listening may reveal comprehension. Repeat and shadowing may reveal speech readiness and timing. Conversation may reveal fluency, confidence, and recall under pressure. Multiple choice may reveal recognition. Word order may reveal sentence structure. Grammar correction may reveal rule awareness.

New Exercise types should be easy to add because the domain does not depend on a fixed list of activities. The stable concept is not the specific format. The stable concept is that an Exercise creates useful learning evidence inside a purposeful Lesson.

## Exercise Result

An Exercise Result describes what happened when the Student attempted an Exercise.

It may include:

* correctness
* response time
* speech detected
* attempts
* confidence
* difficulty
* manual feedback
* timing

Not every Exercise produces every metric. Some results are precise. Some are uncertain. Some require AI interpretation. Some are useful only when compared with prior behavior.

Exercise Results should be treated as evidence. They do not directly decide the next Lesson. They inform Statistics, Observations, and Student Model updates.

## Observation

An Observation is one of the most important concepts in Mentor AI.

An Observation is AI knowledge derived from evidence. It is what the AI Teacher believes may be true about the Student after interpreting learning behavior.

Examples:

* The Student hesitates before Present Perfect.
* Listening improved after repeated slow audio.
* Question word order is still unstable.
* The Student becomes tired after twenty minutes.
* The Student recognizes vocabulary but cannot recall it quickly while speaking.
* The Student performs better when grammar is practiced through conversation rather than isolated drills.

Observations are not raw statistics. They are not dashboards. They are not guesses without evidence.

An Observation should be grounded in learning activity, useful for teaching, and capable of influencing the Student Model or a future Recommendation.

Observations are where Mentor AI becomes more like a teacher. A statistic can say that response time increased. An Observation can say that the Student likely knows the structure but loses confidence when asked to speak quickly.

## Recommendation

A Recommendation is teaching guidance generated from Observations.

Recommendations are written for the Student or for the teaching flow. They may suggest practice, repetition, rest, review, confidence-building, or a change in difficulty.

Recommendations should not be generic encouragement. They should be connected to what the AI Teacher has observed.

Examples:

* Practice short spoken answers using the same grammar pattern before attempting full conversation.
* Review the last vocabulary set tomorrow because recall was accurate but slow.
* Use listening at a slower speed before returning to natural speed.
* End today's session earlier if response time continues to increase.

Recommendations are not the same as Lessons. A Recommendation explains what should be done. A Lesson turns that guidance into learning activity.

## Learning Goal

A Learning Goal describes what the system wants the Student to improve.

Learning Goals may be short-term or long-term.

A short-term goal may focus on one session: stabilize question word order, improve recall of travel vocabulary, or reduce hesitation in basic past-tense answers.

A long-term goal may describe broader progress: become comfortable in everyday conversation, understand natural speech, improve grammar reliability, or speak with less hesitation.

Learning Goals may change automatically. If a weakness becomes stable, the goal may move forward. If a mastered skill becomes forgotten, the goal may return to review. If fatigue appears, the goal may shift from pressure to confidence.

Learning Goals give Lessons their reason to exist.

## Statistics Snapshot

A Statistics Snapshot is a point-in-time view of learning behavior.

It may summarize accuracy, speed, attempts, completion, listening performance, speaking activity, vocabulary recall, grammar stability, or fatigue indicators.

Statistics Snapshots are useful for trend analysis. They help the AI Teacher compare current behavior with previous behavior. They can reveal improvement, regression, forgetting, automaticity, or instability.

Statistics Snapshots are not the source of truth. They describe behavior. They do not interpret it fully.

The Student Model remains the source of truth because it contains interpreted understanding.

## Relationships

The central domain relationship is the learning loop:

```text
Student
  ↓
Learning Session
  ↓
Lesson
  ↓
Exercises
  ↓
Exercise Results
  ↓
Statistics
  ↓
AI Observations
  ↓
Student Model Update
  ↓
Recommendations
  ↓
Next Lesson
```

The Student participates in a Learning Session.

The Learning Session contains a purposeful Lesson.

The Lesson contains Exercises.

Exercises produce Exercise Results.

Exercise Results contribute to Statistics Snapshots.

Statistics help the AI Teacher create Observations.

Observations update the Student Model.

The updated Student Model produces better Recommendations.

Recommendations shape the Next Lesson.

The loop repeats for as long as the Student learns.

## Domain Rules

Lessons never exist without purpose.

Exercises always belong to a Lesson.

Every Lesson must relate to a Learning Goal.

Generated Lessons must be based on the Student Model, recent Observations, or explicit teaching intent.

Exercise Results are evidence, not final interpretation.

Not every Exercise Result contains every metric.

Speech Results may be uncertain and must be interpreted with care.

Statistics describe learning behavior.

Statistics never directly change Lessons.

The AI Teacher interprets Statistics.

Observations come from evidence.

Recommendations come from Observations.

Recommendations should be useful for teaching, not decorative.

The Student Model changes continuously.

The Student Model must be updated before the next generated Lesson is treated as personalized.

Mastery requires reliability over time and context.

Forgotten skills remain part of the Student Model.

Weaknesses should guide teaching without defining the Student negatively.

Strengths should influence what the system skips, accelerates, or uses as support.

Fatigue must not be confused automatically with lack of knowledge.

Difficulty is personal and contextual.

Offline learning must become part of the same learning history.

Synchronization protects teaching memory.

The Student should not be required to interpret raw statistics to know what to study next.

The AI Teacher owns teaching interpretation.

The domain language must stay independent of database tables, API endpoints, UI screens, or framework concepts.

## Extensibility

The domain model supports future growth because its core concepts are stable.

New Exercise types can be added as new ways to create learning evidence.

New AI Teachers can be added as different teaching personalities or strategies that still read and improve the Student Model.

New statistics can be added as additional signals that help interpretation.

New skills can be added as specific abilities inside the Student Model.

New languages can be added because the model describes learning, not only English content.

New speech engines can be added because Speech Results are domain evidence, while speech technology is a replaceable source of that evidence.

New learning strategies can be added because Learning Goals, Lessons, Exercises, Observations, and Recommendations are independent concepts.

The core model should not change just because the system adds a new client, storage mechanism, AI provider, lesson format, speech service, or analytics method.

Extensibility must protect the central idea: everything serves the Student Model.

## Bounded Contexts

### Learning

The Learning context owns Learning Sessions, Lessons, Exercises, Exercise Results, Learning Goals, and the flow of active practice.

It is responsible for making learning happen in a purposeful sequence. It should not own long-term interpretation of the Student. It creates evidence.

### AI

The AI context owns the AI Teacher role, Observations, Recommendations, teaching intent, and interpretation of evidence.

It is responsible for turning learning behavior into teaching knowledge. It should not be treated as a content generator only. Its central responsibility is instructional judgment.

### Speech

The Speech context owns spoken interaction as evidence.

It is responsible for speech recognition, speech synthesis, speaking detection, timing, confidence signals, and Speech Results. It should not decide the Student's learning path. It reports speech-related evidence to the learning and AI contexts.

### Synchronization

The Synchronization context owns continuity between offline and online learning.

It is responsible for preserving local activity, reconciling learning events, avoiding duplicate interpretation, and ensuring that offline work becomes part of the Student's durable history.

Synchronization is separate because learning memory must survive unreliable connectivity.

### Storage

The Storage context owns preservation of private learning data.

It keeps Student history, generated Lessons, Exercise Results, Observations, Recommendations, Statistics Snapshots, and Student Model state durable. It should not define the domain language. Storage serves the model; it does not replace it.

### Identity

The Identity context owns access, preferences, privacy boundaries, and the relationship between a person and their learning history.

It exists so personal learning data belongs to the right Student and remains private.

### Learning Analytics

The Learning Analytics context owns measurement and aggregation of learning behavior.

It produces Statistics Snapshots and signals that help the AI Teacher interpret progress. It describes what happened, but it does not decide what should happen next.

These contexts are separated to protect meaning. Learning produces evidence. Statistics Snapshots describe evidence. AI interprets evidence. The Student Model preserves understanding. Synchronization protects continuity. Storage preserves memory. Identity boundaries protect privacy.

## Design Principles

1. Everything serves the Student Model.
2. The Student Model is the source of truth for personalization.
3. Lessons are temporary.
4. Knowledge is permanent only while evidence supports it.
5. Generated content is a tool, not the product.
6. The real product is adaptive teaching.
7. Every Lesson must have a teaching purpose.
8. Every Exercise must create useful learning evidence.
9. Observations are more valuable than raw statistics.
10. Statistics describe.
11. AI interprets.
12. Recommendations teach.
13. The Student Model evolves forever.
14. Mastery requires stability over time and context.
15. Weaknesses are teaching opportunities, not labels.
16. Strengths should reduce unnecessary repetition.
17. Fatigue is a learning signal.
18. Difficulty is personal.
19. Offline learning must still count.
20. Synchronization protects memory.
21. Keep concepts independent.
22. Protect the domain language.
23. Avoid leaking implementation into the domain.
24. Do not make the Student manage the teaching strategy.
25. Prefer invisible intelligence over visible complexity.
26. A future feature belongs only if it improves learning, memory, interpretation, privacy, or continuity.

## Final Summary

Mentor AI is a teaching system built around an evolving Student Model. The AI Teacher reads that model, creates purposeful learning, observes the Student's work, interprets evidence, updates understanding, and recommends what should happen next.

Every future backend service, API endpoint, database table, AI workflow, synchronization process, and UI component should exist only if it supports this domain model.

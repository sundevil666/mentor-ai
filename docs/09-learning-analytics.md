# Mentor AI Learning Analytics

## Introduction

Data alone does not improve learning.

A completed exercise does not teach by itself. A response time does not explain itself. A mistake does not automatically reveal its cause. A streak does not prove growth. A score does not understand the student.

Interpretation improves learning.

Learning Analytics in Mentor AI exists to convert raw learning activity into educational understanding. It observes what happened, connects events over time, detects meaningful patterns, produces teaching insights, and helps the AI Teacher make better decisions.

This is not a reporting system.

This is not a statistics module.

This is an educational intelligence system.

Its purpose is to help the teacher understand the student more deeply: what is becoming stable, what remains fragile, what needs repetition, what can be challenged, what should be slowed down, and what should be remembered for the future.

Analytics should never replace teaching judgment.

Analytics should support teaching judgment with evidence.

Canonical metadata for Learning Events, Exercise Results, Speech Results, Statistics Snapshots, Teacher Journal, Teacher Memory, and Student Model lives in [Data Model](04-data-model.md). This document explains how evidence becomes teaching knowledge.

## Learning Data Pipeline

Learning data becomes teaching knowledge through a pipeline.

```text
Learning Events
  ↓
Exercise Results
  ↓
Statistics
  ↓
Patterns
  ↓
Insights
  ↓
Teacher Journal
  ↓
Teacher Memory
  ↓
Student Model
  ↓
Lesson Planning
```

Each stage adds meaning.

Learning events are raw facts. They record what happened in the learning environment.

Exercise results organize those facts around a student task. They describe whether an exercise was completed, skipped, repeated, answered correctly, answered slowly, spoken aloud, or supported by hints.

Statistics summarize results. They measure accuracy, timing, attempts, duration, listening success, speaking behavior, consistency, and other observable signals.

Patterns connect statistics over time. They detect repeated hesitation, recurring mistakes, improving speed, fatigue at predictable moments, or better listening after repeated exposure.

Insights interpret patterns educationally. They explain what the pattern may mean for teaching: a skill is stabilizing, a memory is fragile, confidence is dropping, or listening has stopped improving.

The Teacher Journal records important insights as teaching observations. It explains why the teacher made or changed a decision.

Teacher Memory preserves long-term knowledge that remains useful across many lessons. It turns repeated observations into durable understanding of the student.

The Student Model is updated gradually from reliable evidence. It represents the current educational state of the student.

Lesson Planning uses the updated Student Model to decide what should happen next.

The pipeline matters because raw data should not directly control teaching.

Events must be interpreted before they become decisions.

## Learning Events

Learning events are facts.

They describe something that happened without claiming what it means.

Common learning events include:

- Lesson Started
- Lesson Finished
- Exercise Started
- Exercise Finished
- Speech Detected
- Speech Missing
- Repeated Exercise
- Skipped Exercise
- Manual Feedback
- Timing Change
- Synchronization

A Lesson Started event means the student began a session.

A Lesson Finished event means the student reached the end or completed the intended session flow.

An Exercise Started event means the student opened or began a task.

An Exercise Finished event means the student submitted, completed, abandoned, or otherwise ended that task.

A Speech Detected event means the system received spoken input.

A Speech Missing event means the system expected speech but did not receive usable audio.

A Repeated Exercise event means the student returned to the same or similar task.

A Skipped Exercise event means the student bypassed a task.

Manual Feedback records explicit input from the student or teacher, such as too hard, too easy, confusing, useful, boring, tired, or confident.

A Timing Change records meaningful shifts in response duration, lesson pacing, pause length, or completion speed.

Synchronization records when local learning data was safely aligned across devices or storage layers.

Events should be reliable, simple, and factual.

An event should not say the student was lazy.

An event should not say the student failed.

An event should not say the student is weak.

An event should only say what happened.

## Exercise Results

Exercise results are structured interpretations of events around a learning task.

They combine the relevant facts from an exercise into a usable record.

An exercise result may include:

- Exercise type
- Target skill
- Topic
- Expected response
- Actual response
- Correctness
- Number of attempts
- Hints used
- Audio repeated
- Speech detected
- Response time
- Completion state
- Student feedback
- Context of the lesson

Exercise results are still close to the original activity.

They do not yet explain long-term learning. They simply organize what happened during one task so later stages can analyze it.

This distinction is important.

A single wrong answer may be a typing issue, a misunderstanding, fatigue, an unfamiliar word, a grammar gap, or a moment of distraction.

The result records the answer.

Analytics must wait for evidence before deciding what the answer means.

## Statistics

Statistics describe.

They do not explain.

Statistics make learning activity easier to observe by summarizing repeated results into measurable signals.

Common statistics include:

- Response Time
- Accuracy
- Listening Success
- Speaking Attempts
- Vocabulary Growth
- Grammar Stability
- Lesson Duration
- Consistency
- Fatigue Indicators

Response time measures how quickly the student answers or completes a task.

Accuracy measures how often the student produces correct or acceptable responses.

Listening success measures whether the student understands spoken input, with or without repetition.

Speaking attempts measure how often the student tries to speak, how often speech is detected, and whether repeated attempts are needed.

Vocabulary growth measures recognition, recall, reuse, and retention of words or phrases.

Grammar stability measures whether a structure remains correct across different exercises, days, and contexts.

Lesson duration measures how long the student studies and whether that time changes meaningfully.

Consistency measures return frequency, completion rhythm, review behavior, and continuity across days or weeks.

Fatigue indicators may include slower responses, more skips, more missed speech, reduced accuracy, shorter answers, or explicit feedback.

Statistics are useful because they compress many events into a readable signal.

But a statistic is not a teaching conclusion.

Low accuracy does not automatically mean the student does not understand.

Long response time does not automatically mean the task is too hard.

Short lessons do not automatically mean low motivation.

Statistics describe what can be measured.

The teacher still needs interpretation.

## Pattern Detection

Patterns require multiple observations.

One event is not a pattern.

One wrong answer is not a weakness.

One slow response is not fatigue.

One skipped exercise is not avoidance.

Pattern detection asks whether a signal repeats often enough, across enough contexts, to matter educationally.

Examples of meaningful patterns include:

- Repeated hesitation before speaking
- Repeated grammar mistakes in the same structure
- Long response times on word order tasks
- Listening improvements after replay
- Confidence growth during familiar speaking tasks
- Regular fatigue near the end of long lessons

Repeated hesitation may show that the student knows the answer but does not yet trust spoken production.

Repeated grammar mistakes may show that a rule is understood in isolation but not stable during sentence construction.

Long response times may show that knowledge is available but not automatic.

Listening improvements after replay may show that the student benefits from repeated exposure rather than easier content.

Confidence growth may show that a skill is ready for careful challenge.

Regular fatigue may show that lesson duration, difficulty, or timing should change.

Pattern detection should compare signals across time, exercise types, topics, contexts, and lesson conditions.

It should distinguish between temporary noise and educational evidence.

It should remain conservative.

The system should prefer saying not enough evidence yet over inventing a conclusion.

## Educational Insights

Insights are educational conclusions.

They are not raw facts.

They are not simple measurements.

They are interpreted teaching knowledge created from patterns.

Examples of insights include:

- Sentence order is improving.
- Listening has plateaued.
- Vocabulary is expanding.
- Confidence decreased this week.
- Speaking is becoming automatic.

Sentence order is improving may come from faster word order tasks, fewer rearrangement errors, and better sentence production in mixed practice.

Listening has plateaued may come from stable but non-improving comprehension despite repeated exposure and appropriate review.

Vocabulary is expanding may come from increased recall, successful reuse, and fewer recognition errors over time.

Confidence decreased this week may come from fewer speaking attempts, more skipped production tasks, explicit feedback, and slower response after mistakes.

Speaking is becoming automatic may come from shorter response times, fewer attempts, less hesitation, and successful production without prompts.

Insights should be written in educational language.

They should explain what matters for teaching.

They should be specific enough to guide action.

They should include confidence, scope, and evidence where possible.

An insight should help answer:

- What changed?
- Where did it change?
- How reliable is the evidence?
- What should the teacher do next?

## Teacher Journal

Insights become journal entries.

The Teacher Journal is the narrative record of teaching decisions. It explains what the AI Teacher noticed, why it mattered, and how it affected the next lesson.

A journal entry may record that the student struggled with past-tense questions for the third time this week.

A journal entry may record that listening comprehension improved after slower audio was removed.

A journal entry may record that the student answered accurately but hesitated before speaking.

A journal entry may record that shorter bus lessons are preserving consistency better than longer evening lessons.

Journal entries are important because teaching is continuous.

They prevent the system from treating each lesson as isolated. They allow the AI Teacher to remember why a decision was made, not only what decision was made.

Over months, the Teacher Journal becomes a history of learning.

It shows recovery, repetition, breakthroughs, fatigue, confidence, fragile skills, stable skills, and changing needs.

The journal should not be a dump of analytics.

It should contain meaningful teaching observations.

## Teacher Memory

Teacher Memory stores long-term observations that remain useful beyond a single week or lesson.

Journal entries are episodic.

Teacher Memory is durable.

When the same insight appears repeatedly and remains useful, it can become permanent teaching knowledge.

Examples include:

- The student learns best through repetition.
- Morning lessons are more effective.
- British accents remain difficult.
- Bus sessions are usually listening-only.

The student learns best through repetition is not a single observation. It is long-term knowledge formed after seeing repeated success with review, replay, shadowing, and repeated sentence patterns.

Morning lessons are more effective may come from stronger accuracy, faster responses, longer completion, and better speaking confidence during morning sessions.

British accents remain difficult may come from repeated listening errors across many British audio examples, even when vocabulary and grammar are familiar.

Bus sessions are usually listening-only may come from device context, speech missing events, short session duration, and repeated preference behavior.

Permanent knowledge matters because it protects personalization.

It allows the AI Teacher to plan with the Student as a real person, not as a fresh anonymous learner every day.

It prevents repeated rediscovery of the same facts.

It helps the system choose better defaults.

It makes lessons feel remembered.

Teacher Memory should be slow to change.

It should require evidence.

It should be revisable when long-term evidence changes.

## Student Model Updates

Learning Analytics modifies the Student Model gradually.

The Student Model should evolve like a teacher's understanding of a student: carefully, patiently, and with respect for uncertainty.

Analytics may update the Student Model when evidence shows that a skill has improved, weakened, stabilized, become automatic, become fragile, or changed in relation to context.

Possible updates include:

- Increasing confidence in a grammar skill
- Marking vocabulary as stable
- Marking listening comprehension as fragile for a specific accent
- Lowering speaking confidence after repeated avoidance
- Raising difficulty readiness after consistent success
- Increasing review priority for a recurring weakness
- Adjusting preferred lesson duration
- Adjusting best learning mode by context

Updates should be gradual.

The system should avoid sudden changes from a single lesson.

A strong performance today may be real progress, but it may also be familiarity, luck, low difficulty, or high energy.

A weak performance today may be a real problem, but it may also be fatigue, distraction, audio failure, or an unusually difficult exercise.

The Student Model should require evidence before changing important assumptions.

Small signals may create temporary notes.

Repeated signals may create insights.

Reliable insights may update the model.

Long-term insights may enter Teacher Memory.

This protects the student from unstable teaching.

## Analytics Principles

Learning Analytics in Mentor AI should be evidence-based.

Teaching decisions should come from observed learning behavior, not random variation or content availability.

Analytics should be long-term.

Learning is slow, uneven, and cumulative. The system should care about direction over time more than isolated performance.

Analytics should be explainable.

The AI Teacher should be able to say why it thinks a student needs review, challenge, recovery, or repetition.

Analytics should be transparent.

The system should not hide important assumptions. When appropriate, it should make teaching reasoning visible in simple language.

Analytics should be adaptive.

It should help lessons respond to the student, their context, their progress, and their current capacity.

Analytics should be conservative.

The system should avoid overreacting to individual lessons. It should treat single events as evidence, not verdicts.

Educational analytics should respect uncertainty.

The most honest conclusion is sometimes not enough evidence.

## What Analytics Should Never Do

Learning Analytics should never judge the student.

It should never punish the student.

It should never compare students against each other.

It should never optimize engagement as if attention were the same as learning.

It should never reward screen time for its own sake.

It should never generate random conclusions to appear intelligent.

It should never assume without evidence.

It should never label the student as lazy, weak, bad, slow, or incapable.

It should never treat mistakes as moral failures.

It should never chase metrics at the expense of teaching.

It should never turn learning into surveillance.

It should never make the student feel measured instead of taught.

## Future Analytics

Future Learning Analytics should deepen educational understanding without changing the purpose of the system.

Possible future capabilities include:

- Burnout detection
- Optimal lesson duration
- Learning rhythm
- Memory retention prediction
- Accent adaptation
- Conversation readiness
- Interview readiness
- Learning style evolution

Burnout detection may identify sustained fatigue, avoidance, frustration, reduced lesson completion, and lower confidence.

Optimal lesson duration may estimate how long the student can learn effectively before performance declines.

Learning rhythm may identify the days, times, contexts, and lesson shapes that produce the best learning.

Memory retention prediction may estimate when specific vocabulary, grammar, or listening patterns need review.

Accent adaptation may track which accents, speeds, and speech patterns need targeted exposure.

Conversation readiness may estimate whether the student can move from controlled practice into more open dialogue.

Interview readiness may track fluency, topic vocabulary, confidence, listening under pressure, and answer structure.

Learning style evolution may observe how the student's effective learning modes change over months.

Future analytics should remain educational.

They should help the AI Teacher teach better.

They should not turn Mentor AI into a dashboard of scores.

## Learning Analytics Principles

1. Events record.
2. Exercise results organize.
3. Statistics measure.
4. Patterns emerge.
5. Insights explain.
6. Teachers decide.
7. Memory persists.
8. Evidence accumulates.
9. Learning is nonlinear.
10. Single lessons rarely matter.
11. Consistency matters.
12. Context matters.
13. Confidence matters.
14. Fatigue matters.
15. Speed is not mastery.
16. Accuracy is not understanding.
17. Completion is not learning.
18. Mistakes are evidence.
19. Hesitation is information.
20. Repetition protects memory.
21. Review prevents forgetting.
22. Difficulty should move slowly.
23. Conclusions require evidence.
24. Uncertainty should be preserved.
25. Trust evidence.
26. Teach patiently.
27. Adapt carefully.
28. Explain decisions.
29. Protect the student.
30. Measure only to teach better.

## Final Summary

Learning Analytics exists to help the AI Teacher understand the student better.

It does not exist to measure the student for its own sake.

It transforms learning events into teaching knowledge so Mentor AI can plan better lessons, remember what matters, and teach more effectively.

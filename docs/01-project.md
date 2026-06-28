# Mentor AI

Mentor AI is an AI-first personal learning platform. It is designed to help one student improve continuously by giving them a teacher that remembers, adapts, and produces the next useful lesson based on the student's actual learning history.

The application itself is not the product. The AI teacher is the product. The application exists to make the teacher reachable, usable, and reliable during real learning sessions.

In practical terms, Mentor AI is the interface between a student and an adaptive teacher. The interface should stay simple. The teacher should carry the complexity: choosing what comes next, generating lessons, interpreting progress, and updating the student's learning path over time.

## Product Goals

Mentor AI exists to improve one student with increasing precision over time.

The primary goals are:

* Continuously improve the student's language ability.
* Automatically adapt lessons to the student's current needs.
* Remember the student's history, mistakes, strengths, weaknesses, and progress.
* Generate personalized lessons instead of relying on a fixed course.
* Support learning without a constant internet connection.
* Minimize manual configuration and decision-making for the student.
* Use every completed session to make future sessions better.

The project intentionally optimizes for learning quality instead of feature quantity. A small number of deeply adaptive features is more valuable than a large set of generic screens, modes, and options.

The central product question is not "what can the app do?" It is "what does the student need next, and how confidently can the AI teacher decide that?"

## What Mentor AI Is

Mentor AI is a set of cooperating product responsibilities:

```text
Student
  ↓
PWA
  ↓
Backend
  ↓
AI Teacher
  ↓
Lesson Engine
  ↓
Student Model
  ↓
Synchronization
```

Each part has a distinct role.

The student learns, responds, listens, speaks, makes mistakes, and improves. The student should not need to manage the learning system.

The PWA provides the learning surface. It gives the student a simple way to start lessons, complete exercises, continue offline, and return later without friction.

The backend coordinates durable product behavior. It connects local learning activity, AI decisions, lesson generation, student memory, and synchronization.

The AI Teacher decides what the student should do next. It interprets the student's history and turns that understanding into teaching decisions.

The Lesson Engine produces lessons from teaching intent. It converts a purpose into concrete learning activities.

The Student Model represents the current understanding of the student. It changes after every meaningful interaction and guides the rest of the system.

Synchronization preserves continuity across offline and online use. It ensures that progress, recommendations, generated lessons, and model updates remain consistent after disconnected sessions.

## Product Principles

* AI decides what comes next.
* Lessons are generated, not selected from a static catalog.
* Every lesson has a measurable purpose.
* The student should spend time learning instead of configuring.
* Learning should continue without internet access.
* Every interaction should improve future lessons.
* The interface should expose only the choices the student genuinely needs.
* Product intelligence should appear through better teaching, not busier screens.
* Progress should be inferred from learning behavior, not declared manually by the student.

## Core Components

### Student

The student is the person learning through Mentor AI. The product is initially optimized for one student, with deep personalization treated as more important than broad audience support.

The student's responsibility is to show up, start a session, pay attention, respond naturally, and complete the work honestly. The student should not be expected to choose lesson topics, tune difficulty, manage review schedules, or interpret complex analytics.

The expected workflow is simple:

1. Open the application.
2. Start the current lesson.
3. Listen, read, speak, or respond as requested.
4. Finish the session.
5. Return later to a lesson that reflects what happened before.

### AI Teacher

The AI Teacher is the central product experience. It decides what the student should learn, review, repeat, skip, or practice next.

Its responsibilities include:

* Interpreting the current Student Model.
* Understanding recent performance.
* Identifying weak, fragile, or improving skills.
* Choosing the purpose of the next lesson.
* Recommending lesson types and difficulty.
* Remembering prior mistakes and successful interventions.
* Adjusting future teaching based on observed outcomes.

The AI Teacher should not behave like a content browser or static tutor. It should behave like a teacher making decisions from memory, evidence, and instructional intent.

### Lesson Engine

The Lesson Engine turns teaching decisions into lessons.

Its purpose is to produce exercises, prompts, listening tasks, speaking tasks, review material, and explanations that serve a specific learning goal. A lesson begins with a reason: improve response speed, reinforce a grammar structure, test comprehension, reduce a repeated mistake, build confidence, or strengthen recall.

Lessons evolve over time because the Student Model evolves. The same topic may be taught differently depending on fatigue, confidence, mistake history, response time, vocabulary strength, or prior lesson results.

The Lesson Engine is not a course selector. It is a lesson producer.

### Student Model

The Student Model is the most important object in the system.

It represents what Mentor AI currently understands about the student. This includes ability, weaknesses, recurring errors, response patterns, confidence signals, listening comprehension, speaking readiness, vocabulary retention, grammar reliability, and learning momentum.

The Student Model continuously changes. Every lesson, answer, hesitation, correction, offline session, and synchronization event can update it.

Everything else depends on it. The AI Teacher reads it. The Lesson Engine responds to it. Synchronization preserves it. Statistics refine it. Product quality is largely determined by how accurately and usefully this model changes over time.

### Learning Analytics

Learning Analytics exists for the AI, not for dashboards.

Its role is to convert learning activity into useful teaching signals. These signals help the AI Teacher understand what is improving, what is unstable, what is forgotten, what is becoming automatic, and what still needs practice.

Statistics are not primarily a gamification layer. They are not collected to create charts for the student or to make the product feel busy. They exist so the AI can become a better teacher.

Good statistics should improve lesson decisions, recommendation quality, timing, difficulty, repetition, and long-term personalization.

### Synchronization

Synchronization exists because learning should continue even when the internet does not.

The student should be able to complete lessons offline, generate local progress, and continue using available learning material. When connectivity returns, the system should reconcile offline activity with the backend so the AI Teacher can analyze the latest progress.

Synchronization must preserve continuity. Lessons, recommendations, progress, and Student Model updates should remain coherent after offline sessions. The student should not feel that offline learning was separate from the main learning path.

## Typical Learning Flow

A typical Mentor AI session looks like this:

```text
Open application
  ↓
Press Start
  ↓
Lesson begins
  ↓
Student listens
  ↓
Student speaks or responds
  ↓
Offline statistics are collected
  ↓
Session ends
  ↓
Synchronization happens later if needed
  ↓
AI analyzes progress
  ↓
Student Model changes
  ↓
New personalized lesson is generated
```

The flow should remain implementation independent. The important product behavior is that the student begins quickly, learning activity is captured, the AI interprets the result, and the next lesson becomes more appropriate than the previous one.

The student should experience this as continuity, not machinery.

## Out of Scope

Mentor AI intentionally does not try to solve every education or language-learning problem.

The following are out of scope:

* Social features.
* Leaderboards.
* Competitions.
* Streak addiction.
* Badge collection.
* Public profiles.
* Maximizing screen time.
* Generic course marketplaces.
* Manual lesson planning tools for students.
* Dashboards that require the student to become their own analyst.

These features are excluded because they can shift attention away from learning quality. Mentor AI should not compete for attention as a habit product. It should teach effectively, remember accurately, and help the student improve.

The project may eventually support richer surfaces and more modes, but only when they strengthen the teacher-student relationship rather than distract from it.

## Success Criteria

Mentor AI should not measure success primarily by downloads, active users, lesson count, time spent, or the number of visible features.

Those metrics may describe usage, but they do not prove learning.

Success should be measured by student improvement, including:

* Reduced response time.
* Increased listening comprehension.
* More automatic sentence production.
* Fewer repeated mistakes.
* Better vocabulary retention.
* Higher confidence while speaking.
* More stable grammar under pressure.
* Faster recovery after errors.
* Better lesson-to-lesson adaptation.
* Clearer evidence that recommendations are working.

The strongest success signal is that the AI Teacher becomes more effective because it knows the student better.

## Future Evolution

Possible future directions include:

* Additional languages.
* Pronunciation analysis.
* Conversation mode.
* Multiple AI teachers.
* Native mobile applications.
* Desktop applications.
* Richer long-term memory.
* More advanced offline lesson generation.

These are possible extensions, not current priorities. They should be considered only when the core teacher, Student Model, lesson generation loop, and synchronization model are strong enough to support them.

Future expansion should preserve the central product idea: the AI teacher is the product, and every surface exists to help that teacher improve the student.

## Product Summary

Mentor AI is an AI-first personal learning platform built around an adaptive teacher, not a fixed course. The application is the interface. The AI Teacher decides what comes next. The Lesson Engine produces purposeful lessons. The Student Model holds the evolving understanding that makes personalization possible. Statistics and synchronization exist to improve teaching continuity.

The project is successful when the student gets better, not when the application gets larger. Mentor AI should ignore features that create distraction, competition, or artificial engagement unless they directly improve learning quality.

Engineers joining the project should understand Mentor AI as a teaching system first and an application second.

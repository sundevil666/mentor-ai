# Mentor AI Three-Part Learning Screen

## Purpose

Mentor AI should move toward one simple learning screen divided into three logical parts:

1. Listening
2. Lessons
3. New Words

These parts are not separate products and not a course catalog. They are three visible surfaces of one personal English teacher.

The student should open the application and immediately understand what can be practiced today:

- listen and recognize English;
- continue structured lessons;
- discover, review, and learn new words.

The screen should feel practical, calm, and direct. It should not ask the student to manage a complex learning system. Each part should answer a simple question:

- What should I listen to?
- What lesson should I continue?
- Which words do I need to learn now?

The AI Teacher remains responsible for choosing useful content, adapting difficulty, remembering mistakes, and connecting all three parts into one learning path.

## Screen Structure

The main screen should be organized around three primary sections.

```text
Mentor AI

Listening
  Practice hearing and understanding English

Lessons
  Continue the guided learning path

New Words
  Learn words discovered from lessons and listening
```

The sections may be displayed as columns, panels, tabs, or stacked blocks depending on device size. The conceptual structure should stay the same on desktop and mobile.

On desktop, the three areas can appear side by side if space allows.

On mobile, the three areas can become vertically stacked sections or a segmented view. The student should still feel that the learning system has three clear parts, not a hidden menu.

The first screen should not become a dashboard full of statistics. It should be a learning launch surface.

## Part 1 - Listening

Listening is the place for audio-first practice.

Its goal is to help the student hear English more confidently, recognize words in context, understand sentences, and become less dependent on written text.

Listening should include:

- short audio prompts;
- repeatable sentences;
- comprehension checks;
- slow and natural-speed variants;
- pronunciation exposure;
- listening mistakes recorded as learning evidence;
- words discovered from misunderstood audio.

Listening should not feel like a passive media player. It should feel like guided listening with a teacher nearby.

The AI Teacher should decide when to make audio easier, when to repeat a sentence, when to introduce natural speed, and when a listening problem is actually a vocabulary or grammar problem.

### Listening Signals

The application should observe:

- how often audio is replayed;
- whether the student answers correctly after listening;
- which words cause confusion;
- whether mistakes happen more at natural speed;
- whether the student needs text support;
- whether listening improves after repetition.

These signals should influence Lessons and New Words.

If the student repeatedly fails to understand a word in audio, that word should be added to New Words or reviewed there.

If the student understands individual words but misses the sentence meaning, Lessons may need to reinforce grammar or sentence patterns.

## Part 2 - Lessons

Lessons are the main structured learning path.

Their goal is to teach English through guided progression: grammar, sentence building, speaking readiness, recall, reading support, listening support, and practical usage.

Lessons should include:

- adaptive exercises;
- short explanations when needed;
- sentence construction;
- grammar in context;
- translation or meaning checks where useful;
- review of fragile knowledge;
- small new challenges;
- evidence that updates the Student Model.

Lessons should connect the whole product together. They should use evidence from Listening and New Words, and they should create new evidence for both.

For example:

- if Listening shows weak recognition of past-tense phrases, Lessons can add a short past-tense practice block;
- if New Words shows fragile recall of travel words, Lessons can use those words in sentences;
- if Lessons introduce new vocabulary, New Words should remember it for later review.

Lessons should not become a long menu of topics. The AI Teacher should recommend the next useful lesson and explain the reason only when explanation helps trust.

### Lesson Signals

The application should observe:

- accuracy;
- response time;
- skipped exercises;
- repeated mistakes;
- grammar patterns that fail;
- words that are recognized but not produced;
- whether the lesson was completed, abandoned, or restarted;
- whether the next recommendation changed after completion.

These signals should affect the whole screen.

## Part 3 - New Words

New Words is the place where vocabulary becomes visible and learnable.

Its goal is not to show a large word list. Its goal is to help the student learn the words that matter now.

New Words should include:

- words discovered from lessons;
- words discovered from listening;
- words the student marked as unknown;
- words the AI Teacher believes are fragile;
- simple meaning checks;
- recall practice;
- example sentences;
- pronunciation or audio exposure;
- mastery state.

New Words should answer:

- Which words are new?
- Which words are still weak?
- Which words are ready to move into active use?

The list should stay focused. A small useful set is better than a large vocabulary warehouse.

### Word Signals

The application should observe:

- whether the student recognizes the word;
- whether the student can recall the meaning;
- whether the student can use the word in a sentence;
- whether the word is understood in audio;
- whether the word is repeatedly confused with another word;
- how recently the word appeared;
- whether review strengthened or weakened recall.

These signals should influence Listening and Lessons.

If a word is weak, Listening can include it in audio exposure and Lessons can use it inside grammar practice.

If a word becomes stable, the teacher can use it naturally in future lessons instead of treating it as new.

## Shared Teaching Loop

The three parts should work as one system.

```text
Listening finds weak hearing
  -> New Words stores unknown vocabulary
  -> Lessons explain and practice patterns
  -> Listening checks recognition again
  -> New Words reviews fragile words later
```

The student sees three clear areas.

The AI Teacher sees one continuous learning model.

This distinction matters. The interface should be simple for the student, while the teaching intelligence connects evidence in the background.

## First Implementation Direction

The first implementation should stay small.

The goal is not to build every advanced behavior immediately. The goal is to make the main screen clearly express the new concept and begin collecting evidence from the three areas.

### MVP Scope

The first slice should include:

- a main screen with three clear learning sections: Listening, Lessons, and New Words;
- one start or continue action in each section;
- a simple recommended next action from the AI Teacher;
- local evidence for completed activity in each section;
- vocabulary created from lesson or listening activity;
- a shared Student Model update after completion;
- offline persistence through IndexedDB;
- synchronization of learning evidence when the API is available.

### Out Of Scope For The First Slice

The first slice does not need:

- a large word dictionary;
- complex spaced repetition algorithms;
- production speech recognition;
- full AI-generated audio conversations;
- detailed dashboards;
- manual course selection;
- social features;
- gamification.

Those features may become useful later, but only after the basic three-part teaching loop works.

## Product Rules

Every change related to this concept should follow these rules:

- the first screen must make Listening, Lessons, and New Words obvious;
- each section must start learning quickly;
- statistics should support teaching, not pressure the student;
- new words must come from real learning evidence when possible;
- listening mistakes should be usable by lessons and vocabulary review;
- lessons should reuse weak words and weak listening patterns;
- the AI Teacher should connect all three parts into one path;
- the student should not need to manually organize their own learning system.

## Success Criteria

This concept is working when:

- the student understands the three learning areas without explanation;
- each area can produce a completed learning activity;
- evidence from one area changes behavior in another area;
- new words appear because the student actually encountered them;
- the next lesson feels connected to recent listening and vocabulary;
- offline activity is preserved;
- the interface feels like one teacher, not three disconnected tools.

The screen may be visually simple at first.

The important thing is that the product logic becomes clear:

Listening helps the student hear English.

Lessons help the student understand and use English.

New Words help the student remember and activate vocabulary.

Together, they form the daily learning loop.

# Mentor AI Documentation Style

## Documentation Philosophy

Documentation exists to preserve understanding.

Mentor AI is not only a software project. It is a teaching system built around memory, adaptation, privacy, and long-term learning. Its documentation must therefore explain the ideas that make the system meaningful before it explains the mechanisms that make the system run.

Documentation should describe the educational concept before the implementation. A future reader should understand why the AI Teacher exists before reading how an API calls it. They should understand why the Student Model matters before reading how it is stored. They should understand why synchronization protects learning before reading how records move across devices.

Documentation should remain understandable years later.

Technologies, frameworks, providers, and storage choices may change. The teaching purpose should remain clear. A good document should still be useful after the original implementation has been replaced, because it explains responsibilities, relationships, constraints, and intent.

Documentation is part of the product.

It shapes how future decisions are made. It protects the language of the project. It prevents accidental complexity. It helps humans and AI systems reason about Mentor AI without turning every decision into rediscovery.

The central rule is simple:

**Documentation should help Mentor AI remain a coherent teacher.**

## Writing Style

Mentor AI documentation should use simple English.

Simple does not mean shallow. It means the writing should be clear enough that a future engineer, designer, teacher, or AI assistant can understand the idea without decoding unnecessary language.

Use direct sentences.

Explain one idea at a time.

Prefer educational meaning over technical display.

Avoid marketing language. Do not describe a feature as powerful, revolutionary, next-generation, seamless, magical, or delightful unless the word explains a real product requirement. Mentor AI should sound careful, not promotional.

Avoid implementation details unless they are required to understand the concept. A document about Teacher Memory should not begin with a database table. A document about Bus Mode should not begin with screen layout. A document about Learning Analytics should not begin with chart libraries.

Explain concepts before architecture.

Explain architecture before implementation.

Explain implementation before operational details.

Prefer responsibilities over technical details. A reader should first learn what an object is responsible for, what it must never do, and how it relates to other concepts. Implementation choices can come later.

Keep terminology consistent. Use the same term for the same concept everywhere. Do not use several names because they sound more natural in different sentences.

Use Student, not User, when referring to the learner.

Use AI Teacher when referring to the teaching intelligence.

Use Lesson Engine when referring to the system that turns teaching intent into lessons.

Use Student Model when referring to the durable teaching interpretation of the student.

Use Teacher Memory and Teacher Journal with care. They are related, but they are not the same concept.

Keep the language timeless. Avoid phrases tied to a temporary implementation phase, current framework, or short-term workaround unless the document is explicitly about that temporary state.

## Document Structure

Every major document should use a predictable structure.

The exact headings may change when the subject requires it, but the order of thinking should stay consistent:

```text
Title
  ↓
Purpose
  ↓
Responsibilities
  ↓
Relationships
  ↓
Examples
  ↓
Future Extensions
  ↓
Summary
```

### Purpose

Purpose explains why the document or object exists.

It should answer one question:

**What understanding does this document preserve?**

Purpose should be conceptual. It should not begin with implementation details, library names, database shapes, or UI mechanics.

### Responsibilities

Responsibilities explain what the concept owns, protects, decides, produces, or prevents.

Responsibilities should be written as stable obligations. For example, the AI Teacher is responsible for deciding what the student needs next. That remains true even if the model provider, prompt structure, or backend service changes.

### Relationships

Relationships explain how the concept connects to other Mentor AI concepts.

This section should name related objects directly and use the official glossary terms. It should explain direction and meaning, not only dependencies.

### Examples

Examples make abstract concepts concrete.

Use examples when a concept could be misunderstood, confused with a similar term, or interpreted too technically. Examples should clarify the idea without becoming the main definition.

### Future Extensions

Future Extensions explain how the concept may grow without changing its core meaning.

This section should protect the current design from overfitting to the first implementation. It should also prevent future additions from violating the original purpose.

### Summary

Every major document should end with a short summary.

The summary should restate the durable idea, not repeat every detail.

## Object Documentation Template

Every important object should be documented with the same conceptual template.

This template applies to domain objects, learning objects, teaching objects, synchronization units, analytics concepts, and major product modes.

```markdown
## Object Name

### Purpose

What the object means and why it exists.

### Responsibilities

What the object owns, protects, records, decides, or enables.

### Inputs

What information can influence the object.

### Outputs

What the object can produce, expose, update, or trigger.

### Relationships

Which official Mentor AI concepts the object depends on, informs, contains, or is contained by.

### Lifecycle

When the object is created, changed, archived, expired, replaced, or deleted.

### Owner

Which part of Mentor AI is responsible for creating, maintaining, or interpreting it.

### Future Evolution

How the object may grow without changing its core meaning.

### Examples

Concrete examples that clarify correct usage.

### Business Rules

Rules that must remain true regardless of implementation.
```

### Template Rules

Purpose must come before fields.

Responsibilities must come before persistence.

Relationships must use glossary terms.

Lifecycle must explain meaning over time.

Owner must name a conceptual owner, such as AI Teacher, Lesson Engine, Learning Analytics, Synchronization, Student, or Backend.

Business Rules must describe durable behavior, not temporary implementation shortcuts.

## Metadata Block

Every important object document must include a metadata block.

The metadata block gives future readers and AI assistants a fast way to understand ownership, privacy, persistence, and system behavior.

Use this format:

```markdown
### Metadata

| Field | Value |
| --- | --- |
| Type | Conceptual object, persistent object, derived object, event, mode, process, or policy |
| Owner | The concept or system responsible for the object |
| Persistence | Persistent, derived, ephemeral, or mixed |
| Lifetime | Minutes, hours, days, months, forever, or until superseded |
| Offline | Required, supported, optional, or not applicable |
| Synchronization | Required, supported, optional, prohibited, or not applicable |
| Privacy | Public, example/demo, personal, sensitive, never synchronized, or never committed to Git |
| Git | Allowed, example only, prohibited, or documentation only |
| Mutable | Immutable, append-only, mutable, or versioned |
| Versioned | Yes, no, optional, or required for meaningful changes |
| Source of Truth | The authoritative evidence or system for this object |
| AI Reads | Yes, no, limited, or only with permission |
| AI Writes | Yes, no, proposed only, or validated before storage |
| Dependencies | Official concepts this object requires |
| Consumers | Official concepts that read, interpret, or display this object |
```

### Type

Type describes the kind of thing being documented.

Examples include conceptual object, persistent object, derived object, learning event, teaching process, product mode, privacy policy, or synchronization unit.

### Owner

Owner identifies who is responsible for the object.

Ownership is conceptual. The owner may be the AI Teacher, Lesson Engine, Learning Analytics, Synchronization, Student Model, Backend, PWA Client, Speech Layer, or Student.

### Persistence

Persistence describes whether the object is stored, calculated, temporary, or mixed.

Use Persistent for durable learning history or teaching memory. Use Derived for values calculated from evidence. Use Ephemeral for temporary runtime state. Use Mixed when an object has both durable and temporary parts.

### Lifetime

Lifetime describes how long the object should remain meaningful.

Use human-readable durations. The goal is to explain whether the object supports a moment, a session, a learning week, a long-term memory, or the entire student history.

### Offline

Offline describes whether the object must work without a network.

Required means offline support is essential. Supported means offline behavior is useful but not always complete. Optional means offline use is allowed but not central. Not applicable means the object does not participate in offline learning.

### Synchronization

Synchronization describes whether the object moves between local and durable system state.

Required means the object must be reconciled for continuity. Supported means synchronization is useful but conditional. Optional means synchronization may happen when helpful. Prohibited means the object must remain local or unsynchronized. Not applicable means the object does not participate in synchronization.

### Privacy

Privacy describes the sensitivity of the object.

Use the privacy categories defined in the data model: Public, Example / Demo, Personal, Sensitive, Never Synchronized, and Never Committed To Git.

### Git

Git describes whether the object may appear in the repository.

Real student data should not be committed. Example data may be committed only when clearly artificial and safe. Documentation-only concepts may appear freely.

### Mutable

Mutable describes whether the object can change.

Immutable objects should not change after creation. Append-only objects receive new records without rewriting history. Mutable objects may change directly. Versioned objects may change while preserving meaningful history.

### Versioned

Versioned describes whether meaningful changes must preserve prior state.

Use Required when changing the object can alter teaching interpretation, synchronization, privacy, or future lessons. Use Optional when versioning is useful for audit or debugging but not essential. Use No when the object is already immutable or purely ephemeral.

### Source of Truth

Source of Truth identifies the authoritative place where the object is known.

For example, Learning Events may be the source of truth for what happened. The Student Model may be the source of truth for the current teaching interpretation. Teacher Memory may be the source of truth for durable teaching knowledge.

### AI Reads

AI Reads explains whether the AI Teacher or another AI process may read the object.

Use limited or only with permission for sensitive speech, private observations, or data that requires strict boundaries.

### AI Writes

AI Writes explains whether AI may create or update the object.

Some AI outputs should be proposed only until validated. Teacher Journal entries may be AI-written. Learning Events should come from actual activity, not AI invention.

### Dependencies

Dependencies list the official concepts required for the object to make sense.

Use glossary terms only.

### Consumers

Consumers list the official concepts that use the object.

This helps future readers understand impact when the object changes.

## Naming Rules

Names carry architecture.

A casual synonym can create a second concept by accident. Mentor AI should avoid this. Every important concept should have one official name, one definition, and one place in the glossary.

### Required Names

Use Student instead of User.

User is generic software language. Student preserves the educational relationship.

Use AI Teacher instead of Assistant, Tutor Bot, Coach, or AI Agent.

AI Teacher preserves the central product promise: Mentor AI teaches through attention, memory, and adaptation.

Use Lesson Engine instead of Lesson Generator.

Generator describes production. Engine describes responsibility: transforming teaching intent into a coherent learning experience.

Use Student Model instead of Profile.

Profile sounds like account information. Student Model means the current educational interpretation of ability, memory, weakness, confidence, readiness, and learning state.

Use Teacher Memory instead of Cache.

Cache is a technical storage optimization. Teacher Memory is durable teaching knowledge.

Use Teacher Journal instead of Log.

Log suggests raw technical records. Teacher Journal is a narrative record of teaching observations and decisions.

Use Learning Event instead of Tracking Event when the event describes student activity.

Tracking centers analytics machinery. Learning Event centers educational evidence.

Use Exercise Result instead of Answer Record when the result describes a completed task.

The result includes timing, attempts, hints, context, speech availability, and meaning beyond the answer.

Use Generated Lesson only for lessons created from teaching intent.

Do not call every lesson generated if it is static, imported, or manually authored.

### Naming Principles

Use singular names for concepts.

Use plural names only for collections.

Do not rename a concept for stylistic variety.

Do not use technical names when a project concept already exists.

Do not introduce a new term until it is added to the glossary.

Prefer names that describe educational meaning.

Avoid names that describe temporary implementation.

## Diagrams

Diagrams should clarify relationships, sequence, and responsibility.

They should not decorate the document.

Use ASCII diagrams for stable conceptual flows. ASCII diagrams are easy to read in terminals, diffs, plain text, and AI context.

Use arrows from cause to effect, from input to output, or from earlier step to later step.

Preferred flow direction is top to bottom:

```text
Learning Events
  ↓
Exercise Results
  ↓
Learning Analytics
  ↓
Teacher Journal
  ↓
Teacher Memory
  ↓
Student Model
  ↓
Lesson Planning
```

Use left to right only for compact relationships:

```text
Student -> Learning Session -> Lesson -> Exercise Result
```

Indent child concepts beneath parent concepts:

```text
Lesson
  Warm-up
  Review Block
  Core Practice
  Reflection
```

Do not mix direction styles in the same diagram unless the meaning requires it.

Every diagram should be introduced by a sentence explaining what it shows.

Every diagram should be followed by a short explanation when the meaning is not obvious.

## Cross References

Cross references should connect documents without duplicating explanations.

When a concept is already defined elsewhere, link to the defining document instead of redefining it at length.

Use relative Markdown links.

Examples:

- [Mentor AI Data Model](04-data-model.md)
- [Mentor AI Teacher](07-ai-teacher.md)
- [Mentor AI Lesson Engine](08-lesson-engine.md)
- [Mentor AI Learning Analytics](09-learning-analytics.md)
- [Mentor AI Glossary](13-glossary.md)

Cross references should be meaningful. Do not add links to every mention of a term. Link when the reader may need the canonical explanation.

If two documents discuss the same concept from different angles, name the angle clearly.

For example, the data model may define Student Model as an object, while the AI Teacher document explains how the teacher uses it.

## Documentation Rules

1. Explain why before how.
2. Explain the concept before the architecture.
3. Explain the architecture before the implementation.
4. One concept should have one official definition.
5. Every official concept must appear in the glossary.
6. Use Student instead of User.
7. Use project terminology exactly as defined.
8. Avoid synonyms for important concepts.
9. Prefer responsibilities over fields.
10. Prefer educational meaning over technical mechanism.
11. Keep implementation replaceable.
12. Do not begin conceptual documents with database design.
13. Do not let framework names define product concepts.
14. Use examples when a concept may be confused with another concept.
15. Avoid duplicated explanations across documents.
16. Link to the canonical document instead of rewriting it.
17. Every document should answer one primary question.
18. Every section should support the document's purpose.
19. Remove sections that only repeat the title in longer words.
20. Keep language timeless.
21. Write for future maintainers, not only current builders.
22. Write for AI readers as well as human readers.
23. Make ownership explicit.
24. Make privacy explicit.
25. Make persistence explicit.
26. Make lifecycle explicit.
27. Make source of truth explicit.
28. Distinguish facts from interpretations.
29. Distinguish events from results.
30. Distinguish Teacher Journal from Teacher Memory.
31. Distinguish Student from Student Model.
32. Distinguish Lesson from Generated Lesson.
33. Distinguish recommendations from notifications.
34. Prefer simple lists over dense paragraphs when naming responsibilities.
35. Prefer short paragraphs for conceptual explanation.
36. Use ASCII diagrams for durable flows.
37. Do not create diagrams that require color to understand.
38. Do not use marketing language to describe product behavior.
39. Do not describe a weakness as a student failure.
40. Do not expose private learning data in examples.
41. Example data must be clearly artificial.
42. Documentation should evolve before code when a new concept is introduced.
43. Code should follow documented concepts, not invent parallel language.
44. New documents should follow the common structure unless there is a clear reason not to.
45. New objects should use the object documentation template.
46. Metadata blocks are mandatory for important objects.
47. Cross references should clarify, not clutter.
48. Consistency beats creativity.
49. Clear definitions beat clever phrasing.
50. A future reader should be able to recover the intent without asking the original author.

## Summary

Mentor AI documentation exists to preserve the meaning of the product.

It should explain teaching intent before software machinery, use one official language, define responsibilities clearly, protect privacy, and make future decisions easier. Documentation is not an accessory to Mentor AI. It is one of the ways the system remembers what it is trying to become.

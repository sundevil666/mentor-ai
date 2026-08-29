# Personal Book Reading Mentor

## Purpose

Personal Book Reading turns a student-owned English book into a long-term learning relationship with the AI Teacher.

The Student should be able to import a lawful copy of a book once, continue reading it on every signed-in device, read it aloud, and receive teaching based on the part that has actually been read. Mentor AI should understand reading progress, difficult words, comprehension, fluency, and pronunciation without publishing the book or exposing it to other students.

This document is the product and engineering contract for the feature. Future implementation should preserve these requirements unless this document is deliberately revised.

## Current Implementation

The first local reading slice is available inside **Stories & Books**. The existing Stories navigation destination contains persistent **Audio** and **Books** tabs so the main application menu does not grow.

The current Books tab supports private DRM-free EPUB and UTF-8 TXT import, lawful-copy confirmation, local IndexedDB storage, a list of imported books, chapter or part navigation, local deletion, offline reading, and device-local reading progress. It enforces compressed and extracted file size limits and does not upload imported text.

Private cross-device book files, synchronized reading progress, reading-aloud capture, AI Teacher analysis, and generated exercises remain later delivery phases. The interface must describe these boundaries accurately until each phase is implemented and verified.

## Product Promise

The complete learning loop is:

```text
Import a student-owned book
  ↓
Prepare it for private offline reading
  ↓
Synchronize the book to the Student's devices
  ↓
Read silently or aloud
  ↓
Capture progress, words, questions, and speech evidence
  ↓
AI Teacher analyzes only permitted and already-read material
  ↓
Receive feedback, exercises, vocabulary review, and recommendations
  ↓
Continue from the same position on any device
```

The feature is not only an ebook reader. Reading must produce useful evidence for the Student Model and lead to clear teaching actions.

## Core Principles

### The Student owns the imported copy

An imported book is private Student Content. It is not added to the public Mentor AI catalog and is never shared with another account.

The Student must confirm that they have the right to use the imported file. Mentor AI must not remove DRM, bypass access controls, scrape a complete copyrighted book from a third-party website, or make an imported book publicly discoverable.

Public catalog books require separately verified redistribution rights for every deployment jurisdiction. Technical access to text is not proof of permission.

### Reading works offline

After a book is available on a device, opening it, navigating, bookmarking, highlighting, selecting words, and recording progress must work without a network.

Speech capture should continue when technically possible. Feedback that requires a remote speech or AI service may remain pending until the network returns.

### Synchronization protects progress

Importing on one signed-in device should make the private book available on the Student's other signed-in devices. Book download may be automatic for small books and explicit for large books.

Progress must not move backwards. For the same book and edition, the default continuation position is the greatest confirmed reading position. Bookmarks, highlights, vocabulary, notes, speech attempts, and exercise results are append-only or independently mergeable and must not be discarded by a later timestamp from a less advanced device.

### The AI Teacher respects reading boundaries

The AI Teacher may use only the information permitted by the Student. It should create exercises from material already read and avoid revealing future events.

The whole book should not be sent to an AI model when a chapter, page, paragraph, or derived statistic is sufficient.

### Feedback supports the Student

Speech and comprehension feedback should be specific and calm. It should identify useful practice, not assign a harsh global score or treat uncertain speech recognition as a definite Student mistake.

## Student Experience

### Books section

The main application navigation contains a **Books** destination. The first screen contains:

- **Continue reading**, showing the most recent book and synchronized position;
- **My Books**, containing private imported books;
- **Free Library**, containing only books with verified reuse rights;
- an **Import book** action;
- download and synchronization state for every book;
- a clear separation between private books and the shared free catalog.

The book detail screen contains title, author, cover, language, source, import status, download state, reading progress, recent activity, and privacy controls. It also contains **Read**, **Read aloud**, **Practice**, and **Remove** actions.

### Reader

The reader must support:

- chapter navigation and a table of contents;
- readable typography, themes, font sizing, line spacing, and margins;
- a stable location independent of screen size;
- bookmarks and highlights;
- word and sentence selection;
- translation and a short contextual explanation;
- adding words to Vocabulary Growth;
- asking the AI Teacher about a selected passage;
- silent reading and reading-aloud modes;
- visible offline, download, recording, analysis, and synchronization states;
- resuming from the same logical position on different screen sizes.

Page numbers from the source file may be displayed when reliable, but synchronization must use a stable content location such as an EPUB CFI or normalized chapter/block/character location. A visual page number changes with font size and is not a safe progress key.

### Reading aloud

Before reading aloud, the Student presses a visible microphone action. Recording must never begin automatically.

The application shows the active passage and clear recording state. It captures a speech attempt, produces an interim transcript when available, and aligns recognized words with the expected text.

The result may identify:

- words read correctly with sufficient confidence;
- likely substitutions, omissions, and additions;
- repeated attempts and self-corrections;
- long pauses and reading pace;
- phrases that may need pronunciation practice;
- recognition uncertainty that must not be presented as a confirmed error.

Text matching and acoustic pronunciation assessment are different capabilities. Text matching can compare a transcript with the passage. Reliable phoneme, stress, and pronunciation feedback requires an acoustic assessment provider or a validated local model. The product must not claim detailed pronunciation accuracy when it has only browser transcription.

After analysis, the Student can replay their recording when it was saved, repeat one sentence, read the passage again, or continue.

### Exercises from completed reading

The AI Teacher may generate:

- comprehension questions;
- a spoken or typed retelling;
- vocabulary-in-context practice;
- gap-fill activities;
- sentence reconstruction;
- grammar observations grounded in the passage;
- pronunciation repetition for difficult phrases;
- a short conversation about the chapter;
- spaced review of words collected from earlier reading.

Every generated task records the exact completed reading range that supports it. Tasks must not depend on unread chapters. A task should explain why it was chosen when the reason is useful to the Student.

## Import Contract

### Supported import levels

Import support should grow in explicit levels rather than claiming that every file can be interpreted equally well.

#### Level 1: first release

- EPUB 2 and EPUB 3 without DRM;
- UTF-8 plain text (`.txt`).

EPUB is the primary format because it normally preserves chapters, metadata, navigation, and reflowable text. Plain text requires encoding detection, paragraph cleanup, and optional manual metadata.

#### Level 2: structured documents

- HTML;
- Markdown;
- FB2;
- DOCX containing readable text.

These formats are normalized into the same internal Book Content model. Unsupported embedded media, macros, scripts, and external resources are removed.

#### Level 3: PDF and scanned material

- text-based PDF;
- scanned PDF or images through optional OCR.

PDF is a secondary reading format. Reflow, chapter discovery, paragraph order, headers, footers, columns, and page references may be unreliable. The Student must preview and confirm extracted text before mentor analysis. OCR uncertainty must be preserved so recognition errors are not attributed to the Student.

#### Optional personal input

- paste text supplied by the Student;
- import from the device share sheet when the platform supports it;
- import from a connected private storage provider after explicit authorization.

A web URL may be saved as a source link or used to import content only when the Student has permission and the source explicitly allows extraction. URL import must not become a general copyrighted-book scraper.

### Explicitly unsupported input

- DRM-protected Kindle, Apple Books, Kobo, or other locked files;
- executable files or documents with active content;
- archives containing unknown nested content;
- third-party credentials, cookies, or access-control bypasses;
- automatic copying of complete copyrighted works from reading websites.

### Import pipeline

```text
Select file
  ↓
Validate type, size, and safety
  ↓
Calculate content hash
  ↓
Extract metadata and cover
  ↓
Normalize chapters and text blocks
  ↓
Show preview and rights confirmation
  ↓
Save local private copy
  ↓
Queue encrypted cloud upload when enabled
  ↓
Index only the text needed for local reading and teaching
```

Duplicate detection uses a content hash plus normalized book metadata. Different editions remain distinct because their text locations may not align.

## Privacy and Permissions

The Student chooses a per-book AI access level:

1. **Private reading only** — no book text is sent for AI analysis.
2. **Progress and statistics** — the AI Teacher sees progress, timing, word counts, and learning events but not passages.
3. **Selected passages** — the AI Teacher may analyze text explicitly selected or read aloud by the Student.
4. **Completed reading** — the AI Teacher may use already-read ranges to prepare teaching, within configured size and retention limits.

The default should be **Selected passages** during an explicit teaching action. The application must show which level is active and allow it to be changed or revoked.

Microphone permission is requested only after the Student starts reading aloud. The interface must distinguish:

- microphone enabled;
- currently recording;
- processing locally;
- uploading for analysis;
- analysis complete;
- recording or analysis failed.

Voice retention is a separate choice:

- do not save audio after analysis;
- keep audio on this device only;
- synchronize private audio across devices.

Deleting a book must offer two clear scopes: remove the offline copy from this device, or delete the private cloud book and its downloadable copies from the account. Learning evidence, vocabulary, and Teacher Memory derived from the book require a separate, understandable deletion policy.

Private book files, extracted text, voice recordings, and Student data are prohibited in Git, diagnostics, analytics payloads, and application logs.

## Conceptual Data Model

### Personal Book

#### Metadata

| Field | Value |
| --- | --- |
| Type | Persistent object |
| Owner | Student |
| Persistence | Persistent |
| Lifetime | Until deleted by the Student |
| Offline | Required |
| Synchronization | Optional for anonymous use, required for cross-device use |
| Privacy | Personal and sensitive |
| Git | Prohibited |
| Mutable | Versioned metadata; immutable imported source revision |
| Versioned | Yes |
| Source of Truth | Student's private book record and source revision |
| AI Reads | Limited by per-book permission |
| AI Writes | No |
| Dependencies | Identity, Local Storage, Synchronization |
| Consumers | Reader, AI Teacher, Learning Analytics, Vocabulary Growth |

A Personal Book identifies the work, edition, private owner, source revision, normalized structure, rights confirmation, AI permission, and device availability.

### Reading Progress

Reading Progress records the furthest confirmed stable location, current location, completed ranges, reading time, and last activity. Furthest progress and current position are separate: revisiting an earlier chapter must not reduce completion.

### Reading Event

Reading Events are append-only evidence such as opening a book, completing a range, selecting a word, translating a passage, adding a bookmark, highlighting text, or requesting help. Passive open time must not automatically count as active reading time.

### Speech Attempt

A Speech Attempt connects one recording session to an exact book revision and passage range. It may contain expected text references, transcript, alignment, timing, recognition confidence, acoustic feedback, processing provider/version, Student corrections, and audio retention state.

### Book Exercise

A Book Exercise is generated from one or more completed reading ranges. It records its learning purpose, source locations, target skills, difficulty, spoiler boundary, generation version, responses, and outcomes.

## Synchronization Rules

### Identity

Anonymous Students can import and read locally. Cross-device book synchronization requires a validated signed-in identity. A raw client-provided Student ID must never authorize private book access.

### Private content transport

Book files and retained recordings use private object storage with authenticated, short-lived access. Metadata, progress, evidence, and references use the private application API. Provider URLs and permanent public asset URLs must not expose private books.

Encryption in transit is required. Encryption at rest is required. Application-level per-Student encryption should be evaluated before synchronizing complete copyrighted books or voice recordings.

### Offline queue

Every device writes local progress and learning evidence first. Uploads are idempotent and safe to retry. Stable event IDs prevent duplicates.

### Merge behavior

- furthest reading position keeps the greatest compatible position;
- current position uses the most recently intentional reading session, without lowering furthest progress;
- completed ranges are unioned;
- bookmarks, highlights, notes, words, speech attempts, and exercises merge by stable ID;
- deletions use tombstones so an offline device does not restore removed data;
- different book revisions never merge text locations without a verified mapping;
- conflicts preserve evidence and surface a recovery choice instead of silently deleting it.

## AI Teacher Responsibilities

The AI Teacher should understand:

- what the Student is reading and why they chose it;
- how far the Student has progressed;
- active reading time and sustainable reading habits;
- apparent text difficulty;
- translation and lookup frequency;
- fragile and newly learned vocabulary;
- comprehension across completed ranges;
- reading-aloud fluency and recurring likely pronunciation needs;
- whether the current book supports motivation or causes repeated overload.

The AI Teacher may recommend a daily reading range, a short recovery task, a vocabulary review, another read-aloud attempt, or the next book. Recommendations should combine stated interests with observed difficulty and progress. Popularity alone is not a teaching reason.

The AI Teacher must not:

- reveal events beyond the Student's completed range;
- infer comprehension from page advancement alone;
- treat speech-recognition uncertainty as a definite pronunciation error;
- penalize the Student for choosing silent reading or disabling microphone access;
- upload or analyze more text or audio than the active permission allows;
- recommend pirated copies or unsupported DRM removal.

## Delivery Plan

### Phase 0: specification and threat model

- approve this product contract;
- define file limits, storage budget, deletion behavior, and supported jurisdictions;
- select private object storage and speech assessment strategy;
- model copyright, privacy, account takeover, malicious document, and data-loss risks.

### Phase 1: private offline reader

- add Books navigation and My Books;
- import DRM-free EPUB and TXT;
- normalize and store books locally;
- implement reader, chapters, stable locations, progress, bookmarks, highlights, and vocabulary selection;
- add clear private-content and rights confirmation;
- test refresh, offline restart, large chapters, malformed files, and mobile layout.

### Phase 2: cross-device books

- add authenticated private book upload and download;
- synchronize metadata, book revisions, progress, completed ranges, bookmarks, highlights, and words;
- implement idempotency, tombstones, quota handling, and recovery;
- verify that one import appears and resumes correctly on a second device.

### Phase 3: reading aloud

- add explicit microphone start and stop;
- connect attempts to exact passage ranges;
- implement transcript aggregation and text alignment;
- separate transcript differences from acoustic pronunciation results;
- queue remote analysis while offline;
- add audio retention controls and deletion.

### Phase 4: AI Teacher mentoring

- generate spoiler-safe exercises from completed ranges;
- update Student Model reading and vocabulary signals;
- provide post-reading feedback and daily recommendations;
- recommend books from verified sources using interests and observed level;
- explain the evidence behind important difficulty changes.

### Phase 5: broader formats

- add HTML, Markdown, FB2, and DOCX normalization;
- add text-based PDF with extraction preview;
- evaluate opt-in OCR for scanned documents;
- add authorized private-storage imports where useful.

## Acceptance Criteria

The first complete release is accepted only when all of the following are demonstrated:

- a Student imports a DRM-free EPUB or TXT file on one device;
- the book remains readable after refresh and without a network;
- a signed-in second device receives the private book through authenticated synchronization;
- both devices resume at the correct logical location despite different screen sizes;
- offline progress from both devices merges without moving furthest progress backwards;
- bookmarks, highlights, and vocabulary survive synchronization;
- microphone capture begins only after an explicit Student action;
- a multi-sentence speech attempt is not truncated to only the final recognition fragment;
- the result distinguishes likely text differences from uncertain recognition;
- generated exercises use only completed reading ranges and do not contain spoilers;
- AI access and audio retention permissions are visible, enforced, and revocable;
- removing a device copy does not accidentally delete the cloud book;
- deleting the cloud book prevents an offline device from restoring it;
- private files, extracted text, speech, and Student identifiers do not appear in logs or Git;
- unsupported DRM and unsafe documents fail with clear, non-destructive guidance;
- the complete import, offline, sync, microphone, lock/unlock, and resume flow is checked on a physical iPhone, not inferred from automated tests or a successful build.

## Test Strategy

Automated tests should cover parsers, normalization, stable locations, progress merging, duplicate imports, sync retries, tombstones, permissions, passage boundaries, transcript aggregation, text alignment, spoiler boundaries, and deletion behavior.

Integration tests should use only synthetic, public-domain, or explicitly licensed fixtures. Copyrighted Student Content and real recordings must never become repository fixtures.

Browser tests should cover the principal mobile flows and permission states. Physical-device tests remain required for microphone behavior, installed-PWA storage, offline recovery, memory pressure, background interruption, and iPhone lock/unlock behavior.

A passing unit test, browser transcription, `play()` promise, build, or deployment does not prove real-device speech quality, audible output, durable storage, or cross-device privacy.

## Operational Requirements

The product needs observable but privacy-safe health signals:

- import success and failure by format and parser version;
- encrypted upload/download completion and retry state;
- quota and storage failures;
- synchronization lag and conflicts;
- speech processing availability, duration, and failure category;
- exercise generation success and spoiler-boundary validation;
- deletion completion across metadata and private objects.

Diagnostics must use opaque identifiers and categories. They must not include titles when unnecessary, book text, selected passages, transcript text, recordings, email addresses, access tokens, or signed object URLs.

## Future Extensions

Future versions may add parallel text, dictionaries, sentence audio, teacher-guided reading plans, family-safe content controls, accessibility features, exportable personal notes, and opt-in local AI analysis.

These extensions must preserve private ownership, explicit permissions, offline continuity, stable synchronization, evidence-based mentoring, and spoiler safety.

## Summary

Personal Book Reading gives the Student one private library across their devices and lets the AI Teacher mentor real reading over time.

The feature succeeds when the Student can import a lawful book, read anywhere, speak when they choose, preserve every meaningful learning action, and receive specific teaching from material they have already completed. It fails if it becomes a public book-copying service, loses offline progress, overstates speech accuracy, exposes private content, or generates generic exercises disconnected from the Student's reading.

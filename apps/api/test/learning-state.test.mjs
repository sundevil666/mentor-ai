import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { learningStateService } from '../dist/services/learning-state.service.js';

describe('learning state service', () => {
  it('deduplicates device activity and returns combined account totals', async () => {
    const stamp = Date.now();
    const listening = {
      id: `activity-listening-${stamp}`, studentId: 'demo-student', kind: 'listening', contentId: 'audio-1',
      activeSeconds: 60, sourceDeviceId: 'phone', startedAt: '2026-09-04T08:00:00.000Z', endedAt: '2026-09-04T08:01:00.000Z',
    };
    const reading = {
      id: `activity-reading-${stamp}`, studentId: 'demo-student', kind: 'reading', contentId: 'book-1',
      activeSeconds: 45, sourceDeviceId: 'tablet', startedAt: '2026-09-04T08:02:00.000Z', endedAt: '2026-09-04T08:02:45.000Z',
    };
    const first = await learningStateService.mergeLearningActivityEvents([listening, reading]);
    const retry = await learningStateService.mergeLearningActivityEvents([listening]);
    assert.deepEqual(first.acknowledgedIds, [listening.id, reading.id]);
    assert.equal(retry.totals.listeningSeconds >= 60, true);
    assert.equal(retry.totals.readingSeconds >= 45, true);
    assert.equal(retry.totals.totalSeconds, retry.totals.listeningSeconds + retry.totals.readingSeconds + retry.totals.speakingSeconds);
  });

  it('deduplicates valid application telemetry and rejects another student data', async () => {
    const stamp = Date.now();
    const valid = {
      id: `telemetry-valid-${stamp}`,
      studentId: 'demo-student',
      sessionId: `session-${stamp}`,
      sourceDeviceId: 'device-test',
      type: 'runtime-error',
      severity: 'error',
      errorCode: 'MediaError',
      appVersion: 'test',
      occurredAt: new Date(stamp).toISOString(),
    };
    const invalid = { ...valid, id: `telemetry-invalid-${stamp}`, studentId: 'another-student' };

    const first = await learningStateService.mergeApplicationTelemetryEvents([valid, invalid]);
    const second = await learningStateService.mergeApplicationTelemetryEvents([valid]);

    assert.equal(first.some((event) => event.id === valid.id), true);
    assert.equal(first.some((event) => event.id === invalid.id), false);
    assert.equal(second.filter((event) => event.id === valid.id).length, 1);
    assert.equal(second.find((event) => event.id === valid.id)?.errorCode, 'MediaError');
  });

  it('returns student state and generates a current lesson', async () => {
    const studentState = await learningStateService.getStudentState();
    const lesson = await learningStateService.getCurrentLesson();

    assert.equal(studentState.student.id, 'demo-student');
    assert.equal(studentState.studentModel.version >= 1, true);
    assert.equal(lesson.exercises.length > 0, true);
    assert.equal(lesson.studentModelVersion, studentState.studentModel.version);
  });

  it('does not reuse an unsuitable current lesson for listening mode', async () => {
    const lesson = await learningStateService.getCurrentLesson({
      mode: 'listening',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });

    assert.equal(lesson.targetSkills.includes('listening'), true);
    assert.equal(
      lesson.exercises.some(
        (exercise) =>
          exercise.type === 'listening-text' ||
          (exercise.targetSkill === 'listening' && typeof exercise.audioText === 'string' && exercise.audioText.length > 0),
      ),
      true,
    );
    assert.equal(lesson.exercises[0].type, 'listening-text');
    assert.equal(lesson.exercises[0].audioText.split(/\s+/).length >= 1100, true);
  });

  it('does not reuse the cached listening lesson for speaking mode', async () => {
    const listeningLesson = await learningStateService.getCurrentLesson({
      mode: 'listening',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });
    const speakingLesson = await learningStateService.getCurrentLesson({
      mode: 'speaking',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });

    assert.equal(listeningLesson.exercises[0].type, 'listening-text');
    assert.notEqual(speakingLesson.id, listeningLesson.id);
    assert.equal(speakingLesson.exercises.some((exercise) => exercise.targetSkill === 'speaking'), true);
  });

  it('keeps the selected listening lesson content distinct', async () => {
    const commuteLesson = await learningStateService.getCurrentLesson({
      mode: 'listening',
      selectedConcept: 'learning',
      manualConceptChoice: true,
      lessonTemplateKey: 'commute-listening',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 10,
    });
    const shopLesson = await learningStateService.getCurrentLesson({
      mode: 'listening',
      selectedConcept: 'learning',
      manualConceptChoice: true,
      lessonTemplateKey: 'shop-listening',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 7,
    });

    assert.equal(commuteLesson.lessonTemplateKey, 'commute-listening');
    assert.equal(commuteLesson.exercises[0].audioText.includes('going to work'), true);
    assert.equal(shopLesson.lessonTemplateKey, 'shop-listening');
    assert.equal(shopLesson.title, 'Listening: at a small shop');
    assert.equal(shopLesson.exercises[0].audioText.includes('bottle of water and two apples'), true);
    assert.notEqual(shopLesson.exercises[0].audioText, commuteLesson.exercises[0].audioText);
  });

  it('does not reuse the cached current lesson when a lesson card requests a specific template', async () => {
    const readingLesson = await learningStateService.getCurrentLesson({
      mode: 'home',
      selectedConcept: 'reading',
      manualConceptChoice: true,
      lessonTemplateKey: 'message-reading',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });
    const vocabularyLesson = await learningStateService.getCurrentLesson({
      mode: 'home',
      selectedConcept: 'vocabulary',
      manualConceptChoice: true,
      lessonTemplateKey: 'travel-vocabulary',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });

    assert.equal(readingLesson.title, 'Reading: short work message');
    assert.equal(vocabularyLesson.title, 'Vocabulary Growth: travel words');
    assert.notEqual(readingLesson.exercises[0].prompt, vocabularyLesson.exercises[0].prompt);
    assert.equal(vocabularyLesson.exercises[0].prompt, 'Choose the meaning of "arrive".');
  });

  it('regenerates a selected lesson when the client explicitly checks for an update', async () => {
    const context = {
      mode: 'listening',
      selectedConcept: 'learning',
      manualConceptChoice: true,
      lessonTemplateKey: 'shop-listening',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 7,
    };
    const cached = await learningStateService.getCurrentLesson(context);
    const refreshed = await learningStateService.getCurrentLesson(context, undefined, true);

    assert.equal(refreshed.lessonTemplateKey, context.lessonTemplateKey);
    assert.notStrictEqual(refreshed, cached);
  });

  it('accepts new synchronized evidence and marks repeats as duplicates', async () => {
    const event = {
      id: `event-service-check-${Date.now()}`,
      studentId: 'demo-student',
      sessionId: 'session-service-check',
      lessonId: 'lesson-service-check',
      exerciseId: 'exercise-service-check',
      type: 'exercise-finished',
      occurredAt: '2026-06-28T10:30:00.000Z',
    };
    const result = {
      id: `result-service-check-${Date.now()}`,
      studentId: 'demo-student',
      sessionId: 'session-service-check',
      lessonId: 'lesson-service-check',
      exerciseId: 'exercise-service-check',
      exerciseType: 'word-order',
      targetSkill: 'grammar',
      response: 'where are you',
      correct: true,
      attempts: 1,
      responseTimeMs: 2400,
      completionState: 'completed',
      evidenceEventIds: [event.id],
      completedAt: '2026-06-28T10:30:01.000Z',
    };

    const firstSync = await learningStateService.synchronize([event], [result]);
    const duplicateSync = await learningStateService.synchronize([event], [result]);

    assert.equal(firstSync.acknowledgements[0]?.status, 'accepted');
    assert.equal(firstSync.statisticsSnapshots.length, 1);
    assert.equal(firstSync.student.id, 'demo-student');
    assert.equal(firstSync.studentModel.studentId, 'demo-student');
    assert.equal(firstSync.studentModelVersion >= 2, true);
    assert.equal(firstSync.recommendation.studentId, 'demo-student');
    assert.equal(duplicateSync.acknowledgements[0]?.status, 'duplicate');
  });

  it('analyzes delayed offline lessons as separate session snapshots', async () => {
    const createdAt = Date.now();
    const firstEvent = {
      id: `event-offline-batch-a-${createdAt}`,
      studentId: 'demo-student',
      sessionId: `session-offline-batch-a-${createdAt}`,
      lessonId: `lesson-offline-batch-a-${createdAt}`,
      exerciseId: 'exercise-offline-batch-a',
      type: 'exercise-finished',
      occurredAt: '2026-06-28T11:00:00.000Z',
    };
    const secondEvent = {
      id: `event-offline-batch-b-${createdAt}`,
      studentId: 'demo-student',
      sessionId: `session-offline-batch-b-${createdAt}`,
      lessonId: `lesson-offline-batch-b-${createdAt}`,
      exerciseId: 'exercise-offline-batch-b',
      type: 'exercise-finished',
      occurredAt: '2026-06-28T12:00:00.000Z',
    };
    const firstResult = {
      id: `result-offline-batch-a-${createdAt}`,
      studentId: 'demo-student',
      sessionId: firstEvent.sessionId,
      lessonId: firstEvent.lessonId,
      exerciseId: firstEvent.exerciseId,
      exerciseType: 'vocabulary-recall',
      targetSkill: 'vocabulary',
      correct: true,
      attempts: 1,
      responseTimeMs: 1800,
      completionState: 'completed',
      evidenceEventIds: [firstEvent.id],
      completedAt: '2026-06-28T11:00:02.000Z',
    };
    const secondResult = {
      id: `result-offline-batch-b-${createdAt}`,
      studentId: 'demo-student',
      sessionId: secondEvent.sessionId,
      lessonId: secondEvent.lessonId,
      exerciseId: secondEvent.exerciseId,
      exerciseType: 'repeat-speaking',
      targetSkill: 'speaking',
      correct: false,
      attempts: 1,
      responseTimeMs: 4200,
      completionState: 'completed',
      evidenceEventIds: [secondEvent.id],
      completedAt: '2026-06-28T12:00:04.000Z',
    };

    const sync = await learningStateService.synchronize([firstEvent, secondEvent], [firstResult, secondResult]);

    assert.equal(sync.acknowledgements.every((acknowledgement) => acknowledgement.status === 'accepted'), true);
    assert.equal(sync.statisticsSnapshots.length, 2);
    assert.deepEqual(
      sync.statisticsSnapshots.map((snapshot) => snapshot.sessionId),
      [firstEvent.sessionId, secondEvent.sessionId],
    );
    assert.deepEqual(
      sync.statisticsSnapshots.map((snapshot) => snapshot.lessonId),
      [firstEvent.lessonId, secondEvent.lessonId],
    );
    assert.equal(sync.statisticsSnapshots[0]?.speechAttempts, 0);
    assert.equal(sync.statisticsSnapshots[1]?.speechAttempts, 1);
  });

  it('stores in-progress session handoffs for continuing on another device', async () => {
    const createdAt = new Date().toISOString();
    const lesson = await learningStateService.getCurrentLesson();
    const handoff = {
      id: `handoff-demo-student-mobile-${Date.now()}`,
      studentId: 'demo-student',
      sourceDevice: 'mobile',
      lesson,
      context: {
        mode: 'listening',
        isOffline: false,
        speechAvailable: true,
        availableMinutes: 8,
      },
      currentExerciseIndex: 0,
      startedAt: createdAt,
      exerciseStartedAt: createdAt,
      events: [],
      results: [],
      speechResults: [],
      updatedAt: createdAt,
    };

    const saved = await learningStateService.upsertSessionHandoff(handoff);
    const handoffs = await learningStateService.listSessionHandoffs();

    assert.equal(saved.studentId, 'demo-student');
    assert.equal(handoffs.some((item) => item.id === handoff.id && item.sourceDevice === 'mobile'), true);
  });

  it('stores only a bounded normalized reading transcript chunk', async () => {
    const saved = await learningStateService.saveReadingTranscriptChunk({
      id: `reading-transcript-${Date.now()}`,
      studentId: 'demo-student',
      bookId: 'book-1',
      pageIndex: 3,
      text: '  I   am reading aloud.  ',
      capturedAt: '2026-08-29T12:00:00.000Z',
      recognitionEngine: 'device-whisper',
    });

    assert.equal(saved.text, 'I am reading aloud.');
    assert.equal(saved.recognitionEngine, 'device-whisper');
    await assert.rejects(() => learningStateService.saveReadingTranscriptChunk({
      ...saved,
      id: `${saved.id}-wrong-user`,
      studentId: 'another-student',
    }), /Invalid reading transcript/);
  });

  it('keeps the furthest processed progress when a newer device reports less', async () => {
    const base = {
      id: 'video:conflict-test', studentId: 'demo-student', category: 'video', contentId: 'conflict-test',
      duration: 600, completed: false,
    };
    await learningStateService.mergeContentProgress([{
      ...base, position: 420, furthestPosition: 420, sourceDeviceId: 'phone', updatedAt: '2026-01-01T10:00:00.000Z',
    }]);
    const merged = await learningStateService.mergeContentProgress([{
      ...base, position: 30, furthestPosition: 30, sourceDeviceId: 'laptop', updatedAt: '2026-01-01T11:00:00.000Z',
    }]);
    const progress = merged.find((item) => item.id === base.id);
    assert.equal(progress.position, 420);
    assert.equal(progress.furthestPosition, 420);
  });

  it('merges engagement evidence once and rejects another student data', async () => {
    const timestamp = Date.now();
    const valid = {
      id: `engagement-${timestamp}`,
      studentId: 'demo-student',
      category: 'video',
      contentId: 'video-feedback-test',
      type: 'feedback-selected',
      feedback: 'mostly-clear',
      sourceDeviceId: 'phone',
      createdAt: '2026-08-25T10:00:00.000Z',
    };
    const invalid = { ...valid, id: `other-${timestamp}`, studentId: 'another-student' };

    await learningStateService.mergeContentEngagementEvents([valid, invalid]);
    const merged = await learningStateService.mergeContentEngagementEvents([valid]);

    assert.equal(merged.filter((event) => event.id === valid.id).length, 1);
    assert.equal(merged.some((event) => event.id === invalid.id), false);
    assert.equal(merged.find((event) => event.id === valid.id)?.feedback, 'mostly-clear');
  });

  it('turns repeated reader lookups into vocabulary review evidence', async () => {
    const item = {
      id: `reader-vocabulary:demo-student:gripping-${Date.now()}`,
      studentId: 'demo-student',
      bookId: 'book-1',
      chapterId: 'chapter-1',
      text: 'gripping',
      normalizedText: 'gripping',
      kind: 'word',
      translation: 'захватывающий',
      phonetic: '/ˈɡrɪpɪŋ/',
      lookupCount: 3,
      firstLookedUpAt: '2026-08-29T10:00:00.000Z',
      lastLookedUpAt: '2026-08-29T11:00:00.000Z',
    };

    const merged = await learningStateService.mergeReaderVocabularyItems([item]);
    const state = await learningStateService.getStudentState();

    assert.equal(merged.find((candidate) => candidate.id === item.id)?.lookupCount, 3);
    assert.equal(state.studentModel.knownWeaknesses.some((signal) => signal.evidenceIds.includes(item.id)), true);
    assert.equal(state.studentModel.reviewPriorities.some((priority) => priority.target === 'gripping'), true);
  });

  it('keeps an imported book available for another device on the same account', async () => {
    const id = `cloud-book-${Date.now()}`;
    const timestamp = '2026-08-29T12:00:00.000Z';
    const archive = {
      source: { id: `${id}:source`, type: 'manual', provider: 'student-device', importedAt: timestamp },
      book: {
        id,
        title: 'Cloud book',
        level: 'unknown',
        language: 'en',
        sourceId: `${id}:source`,
        pageCount: 1,
        chapterCount: 1,
        wordCount: 4,
        importedAt: timestamp,
        updatedAt: timestamp,
        fileName: 'cloud-book.txt',
        format: 'txt',
        rightsConfirmed: true,
      },
      chapters: [{ id: `${id}:chapter:1`, bookId: id, title: 'Part 1', order: 0, pageIds: [`${id}:page:1`] }],
      pages: [{ id: `${id}:page:1`, bookId: id, chapterId: `${id}:chapter:1`, pageNumber: 1, text: 'Read on another device.', wordCount: 4 }],
    };

    await learningStateService.mergePersonalReadingBooks([archive]);
    const downloaded = await learningStateService.mergePersonalReadingBooks([]);

    assert.equal(downloaded.find((candidate) => candidate.book.id === id)?.pages[0]?.text, 'Read on another device.');
  });
});

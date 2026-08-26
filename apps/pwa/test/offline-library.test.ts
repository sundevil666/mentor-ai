import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLessonPlan, generateLessonFromPlan, initialStudentModel, type GeneratedLesson, type LearningContext } from '@mentor-ai/shared';
import { selectExpiredOfflineLessons, selectOfflineLesson, selectOfflineLessonsOverLimit, selectStaleOfflineStories, type OfflineLesson } from '../src/services/offline-library.js';

describe('offline lesson retention', () => {
  it('selects the exact speaking lesson requested by its library card', () => {
    const lessons = [
      createSpeakingLesson('weekly-weak-spots-dialogue', '2026-08-23T12:00:00.000Z'),
      createSpeakingLesson('polite-speaking', '2026-08-24T12:00:00.000Z'),
    ];
    const context: LearningContext = {
      mode: 'speaking',
      selectedConcept: 'learning',
      manualConceptChoice: true,
      lessonTemplateKey: 'weekly-weak-spots-dialogue',
      isOffline: true,
      speechAvailable: true,
      availableMinutes: 9,
    };

    assert.equal(selectOfflineLesson(lessons, context)?.lessonTemplateKey, 'weekly-weak-spots-dialogue');
    assert.equal(selectOfflineLesson(lessons, { ...context, lessonTemplateKey: 'polite-speaking' })?.lessonTemplateKey, 'polite-speaking');
  });

  it('selects lessons that were not opened within their category period', () => {
    const now = Date.parse('2026-08-23T12:00:00.000Z');
    const lessons: OfflineLesson[] = [
      { id: 'old', category: 'listening', title: 'Old', downloadedAt: '2026-08-01T12:00:00.000Z', lastOpenedAt: '2026-08-01T12:00:00.000Z', estimatedBytes: 10 },
      { id: 'recent', category: 'speaking', title: 'Recent', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
    ];
    assert.deepEqual(selectExpiredOfflineLessons(lessons, { lessons: 30, listening: 14, speaking: 7, audio: 30, stories: 30, videos: 30 }, now).map((lesson) => lesson.id), ['old']);
  });

  it('keeps lessons added in the last seven days even when the size limit is exceeded', () => {
    const now = Date.parse('2026-08-23T12:00:00.000Z');
    const lessons: OfflineLesson[] = [
      { id: 'oldest', category: 'lessons', title: 'Oldest', sourceCreatedAt: '2026-07-10T12:00:00.000Z', downloadedAt: '2026-08-01T12:00:00.000Z', lastOpenedAt: '2026-08-01T12:00:00.000Z', estimatedBytes: 60 },
      { id: 'older', category: 'lessons', title: 'Older', sourceCreatedAt: '2026-07-20T12:00:00.000Z', downloadedAt: '2026-08-02T12:00:00.000Z', lastOpenedAt: '2026-08-02T12:00:00.000Z', estimatedBytes: 60 },
      { id: 'mandatory', category: 'lessons', title: 'Mandatory', sourceCreatedAt: '2026-08-20T12:00:00.000Z', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 80 },
    ];
    assert.deepEqual(selectOfflineLessonsOverLimit(lessons, 100, now).map((lesson) => lesson.id), ['oldest', 'older']);
  });

  it('removes stories that no longer belong to the current catalog', () => {
    const lessons: OfflineLesson[] = [
      { id: 'current', category: 'stories', title: 'Current', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
      { id: 'legacy', category: 'stories', title: 'Legacy', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
      { id: 'audio', category: 'listening', title: 'Audio', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
    ];
    assert.deepEqual(selectStaleOfflineStories(lessons, new Set(['current'])).map((item) => item.id), ['legacy']);
  });
});

function createSpeakingLesson(lessonTemplateKey: string, createdAt: string): GeneratedLesson {
  const plan = createLessonPlan(initialStudentModel, {
    mode: 'speaking',
    selectedConcept: 'learning',
    manualConceptChoice: true,
    lessonTemplateKey,
    isOffline: true,
    speechAvailable: true,
    availableMinutes: 9,
  }, createdAt);
  return generateLessonFromPlan(plan, createdAt);
}

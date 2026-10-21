import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLessonPlan, generateLessonFromPlan, initialStudentModel, type GeneratedLesson, type LearningContext } from '@mentor-ai/shared';
import { getOfflineLessonContentVersion, isGeneratedLessonAvailableOffline, registerOfflineSpeechLesson, forgetOfflineLesson, markOfflineLessonOpened, getSpeechTextsContentVersion, isOfflineSpeechLessonUpdateAvailable, selectExpiredOfflineLessons, selectOfflineLesson, selectOfflineLessonsOverLimit, selectStaleOfflineStories, type OfflineLesson } from '../src/services/offline-library.js';
import { audioLibrary, getAudioContentVersion } from '../src/services/audio-library.js';
import { getStoryContentVersion, storyLibrary } from '../src/services/story-library.js';

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

  it('opens a grammar lesson by ID from its category while offline', () => {
    const grammar = {
      id: 'grammar-correction', concept: 'learning', lessonTemplateKey: undefined,
      createdAt: '2026-09-21T10:00:00.000Z',
      exercises: [{ id: 'fix', type: 'word-order', targetSkill: 'grammar' }],
    } as GeneratedLesson;
    const context: LearningContext = {
      mode: 'home', selectedConcept: 'learning', lessonTemplateKey: 'grammar-correction',
      isOffline: true, speechAvailable: false, availableMinutes: 8,
    };
    assert.equal(selectOfflineLesson([grammar], context)?.id, 'grammar-correction');
  });

  it('selects lessons that were not opened within their category period', () => {
    const now = Date.parse('2026-08-23T12:00:00.000Z');
    const lessons: OfflineLesson[] = [
      { id: 'old', category: 'listening', title: 'Old', downloadedAt: '2026-08-01T12:00:00.000Z', lastOpenedAt: '2026-08-01T12:00:00.000Z', estimatedBytes: 10 },
      { id: 'recent', category: 'speaking', title: 'Recent', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
    ];
    assert.deepEqual(selectExpiredOfflineLessons(lessons, { lessons: 30, listening: 14, speaking: 7, audio: 30, stories: 30, videos: 30 }, now, new Set(['old', 'recent'])).map((lesson) => lesson.id), []);
    assert.deepEqual(selectExpiredOfflineLessons(lessons, { lessons: 30, listening: 14, speaking: 7, audio: 30, stories: 30, videos: 30 }, Date.parse('2026-09-02T12:00:00.000Z'), new Set(['old'])).map((lesson) => lesson.id), ['old']);
  });

  it('never expires unfinished offline content even after 30 days', () => {
    const lesson: OfflineLesson = { id: 'unfinished', category: 'audio', title: 'Unfinished', downloadedAt: '2026-07-01T12:00:00.000Z', lastOpenedAt: '2026-07-01T12:00:00.000Z', estimatedBytes: 10 };
    assert.deepEqual(selectExpiredOfflineLessons([lesson], { lessons: 30, listening: 30, speaking: 30, audio: 30, stories: 30, videos: 30 }, Date.parse('2026-10-09T12:00:00.000Z'), new Set()), []);
  });

  it('keeps lessons added in the last seven days even when the size limit is exceeded', () => {
    const now = Date.parse('2026-08-23T12:00:00.000Z');
    const lessons: OfflineLesson[] = [
      { id: 'oldest', category: 'lessons', title: 'Oldest', sourceCreatedAt: '2026-07-10T12:00:00.000Z', downloadedAt: '2026-08-01T12:00:00.000Z', lastOpenedAt: '2026-08-01T12:00:00.000Z', estimatedBytes: 60 },
      { id: 'older', category: 'lessons', title: 'Older', sourceCreatedAt: '2026-07-20T12:00:00.000Z', downloadedAt: '2026-08-02T12:00:00.000Z', lastOpenedAt: '2026-08-02T12:00:00.000Z', estimatedBytes: 60 },
      { id: 'mandatory', category: 'lessons', title: 'Mandatory', sourceCreatedAt: '2026-08-20T12:00:00.000Z', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 80 },
    ];
    assert.deepEqual(selectOfflineLessonsOverLimit(lessons, 100, now, new Set()).map((lesson) => lesson.id), []);
  });

  it('removes stories that no longer belong to the current catalog', () => {
    const lessons: OfflineLesson[] = [
      { id: 'current', category: 'stories', title: 'Current', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
      { id: 'legacy', category: 'stories', title: 'Legacy', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
      { id: 'audio', category: 'listening', title: 'Audio', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
    ];
    assert.deepEqual(selectStaleOfflineStories(lessons, new Set(['current'])).map((item) => item.id), ['legacy']);
  });

  it('detects changed lesson audio while ignoring harmless surrounding whitespace', () => {
    const savedVersion = getSpeechTextsContentVersion(['Mia: The old track.']);

    assert.equal(getSpeechTextsContentVersion([' Mia: The old track. ']), savedVersion);
    assert.notEqual(getSpeechTextsContentVersion(['Mia: The updated track.']), savedVersion);
  });

  it('offers an explicit update when a downloaded lesson has newer audio', () => {
    const saved: OfflineLesson = {
      id: 'could-you',
      category: 'listening',
      title: 'A Could You',
      downloadedAt: '2026-08-28T10:00:00.000Z',
      lastOpenedAt: '2026-08-28T10:00:00.000Z',
      estimatedBytes: 10,
      speechTexts: ['Mia: Old 36 second lesson.'],
    };

    assert.equal(isOfflineSpeechLessonUpdateAvailable(saved, ['Mia: New two minute lesson.']), true);
    assert.equal(isOfflineSpeechLessonUpdateAvailable(saved, saved.speechTexts ?? []), false);
  });

  it('versions long-form audio and stories from playback-critical metadata', () => {
    const audio = audioLibrary[0]!;
    const story = storyLibrary[0]!;

    assert.notEqual(getAudioContentVersion({ ...audio, durationSeconds: audio.durationSeconds + 1 }), getAudioContentVersion(audio));
    assert.notEqual(getStoryContentVersion({ ...story, sourceUrl: `${story.sourceUrl}?revised=1` }), getStoryContentVersion(story));
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


describe('offline card availability', () => {
  it('recognizes bulk downloads by lesson ID and rejects changed or incomplete audio', async () => {
    const originalStorage = globalThis.localStorage;
    const originalWindow = globalThis.window;
    const originalCaches = globalThis.caches;
    let saved: OfflineLesson[] = [];
    let audioPresent = false;
    const cacheStorage = { open: async () => ({ match: async () => audioPresent ? new Response('audio') : undefined }) };
    Object.assign(globalThis, {
      localStorage: { getItem: () => JSON.stringify(saved) },
      window: { caches: cacheStorage, crypto: globalThis.crypto, location: { origin: 'https://mentor.test' } },
      caches: cacheStorage,
    });
    try {
      const lesson = createSpeakingLesson('personal-speaking', '2026-10-19T10:00:00.000Z');
      lesson.exercises[0]!.audioText = 'A complete phrase.';
      assert.equal(await isGeneratedLessonAvailableOffline(lesson), false);
      saved = [{ id: lesson.id, category: 'lessons', title: lesson.title,
        downloadedAt: lesson.createdAt, lastOpenedAt: lesson.createdAt, estimatedBytes: 1,
        contentVersion: getOfflineLessonContentVersion(lesson), speechTexts: [],
      }];
      assert.equal(await isGeneratedLessonAvailableOffline(lesson), false);
      assert.equal(await isGeneratedLessonAvailableOffline({ ...lesson, title: 'Updated' }), false);
      saved[0]!.speechTexts = ['A complete phrase.'];
      assert.equal(await isGeneratedLessonAvailableOffline(lesson), false);
      audioPresent = true;
      assert.equal(await isGeneratedLessonAvailableOffline(lesson), true);
    } finally {
      Object.assign(globalThis, { localStorage: originalStorage, window: originalWindow, caches: originalCaches });
    }
  });

  it('notifies open cards after saving and removing a download, without notifying on opening', () => {
    const originalStorage = globalThis.localStorage;
    const originalWindow = globalThis.window;
    let value = '[]';
    const events: string[] = [];
    Object.assign(globalThis, {
      localStorage: { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } },
      window: { dispatchEvent: (event: Event) => { events.push(event.type); } },
    });
    try {
      registerOfflineSpeechLesson({ id: 'commute', category: 'listening', title: 'Commute', speechTexts: ['Hello.'] });
      markOfflineLessonOpened('commute', 'listening');
      forgetOfflineLesson('commute', 'listening');
      assert.deepEqual(events, ['mentor-ai:offline-library-changed', 'mentor-ai:offline-library-changed']);
    } finally {
      Object.assign(globalThis, { localStorage: originalStorage, window: originalWindow });
    }
  });
});

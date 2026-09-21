import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GeneratedLesson } from '@mentor-ai/shared';
import {
  buildGeneratedLessonLinks,
  buildLessonCategoryProgress,
  generatedLessonCategory,
  generatedLessonMode,
  mergeAvailableLessonCatalog,
  sortGeneratedLessonsNewestFirst,
  type LessonProgressState,
} from '../src/services/lesson-category-progress.js';

const lessons = [
  { id: 'grammar-1', targetSkills: ['grammar', 'review'] },
  { id: 'grammar-2', targetSkills: ['grammar'] },
  { id: 'listening-1', targetSkills: ['listening'] },
] as GeneratedLesson[];

describe('lesson category progress', () => {
  it('shows the freshest generated lessons first in category lists', () => {
    const catalog = [
      { id: 'older', createdAt: '2026-09-10T08:00:00.000Z' },
      { id: 'newest', createdAt: '2026-09-14T08:00:00.000Z' },
      { id: 'middle', createdAt: '2026-09-12T08:00:00.000Z' },
    ] as GeneratedLesson[];

    assert.deepEqual(
      sortGeneratedLessonsNewestFirst(catalog).map((lesson) => lesson.id),
      ['newest', 'middle', 'older'],
    );
  });

  it('keeps an active or downloaded older lesson visible when the server catalog is unavailable', () => {
    const cached = { id: 'older-grammar', createdAt: '2026-07-01T10:00:00.000Z' } as GeneratedLesson;
    const active = { id: 'active-grammar', createdAt: '2026-09-21T10:00:00.000Z' } as GeneratedLesson;
    assert.deepEqual(mergeAvailableLessonCatalog([], [cached], active, []).map((lesson) => lesson.id), [
      'older-grammar', 'active-grammar',
    ]);
  });

  it('puts generated lessons into the category represented by their exercises', () => {
    const speakingLesson = {
      targetSkills: ['grammar', 'review'],
      exercises: [{ type: 'dialogue-translation', targetSkill: 'grammar' }],
    } as GeneratedLesson;
    const listeningLesson = {
      targetSkills: ['grammar', 'listening'],
      exercises: [
        { type: 'dialogue-translation', targetSkill: 'grammar' },
        { type: 'listening-comprehension', targetSkill: 'listening' },
      ],
    } as GeneratedLesson;

    assert.equal(generatedLessonMode(speakingLesson), 'speaking');
    assert.equal(generatedLessonMode(listeningLesson), 'listening');
    assert.equal(generatedLessonCategory({ targetSkills: ['grammar'], exercises: [] } as unknown as GeneratedLesson), 'grammar');
    assert.equal(generatedLessonCategory({
      targetSkills: ['grammar', 'review'],
      exercises: [
        { type: 'word-order', targetSkill: 'grammar' },
        { type: 'dialogue-translation', targetSkill: 'speaking' },
      ],
    } as GeneratedLesson), 'grammar');
  });

  it('gives every generated lesson a Home link to its actual Grammar, Listen, or Speak category', () => {
    const catalog = [
      {
        id: 'spoken-conditional', lessonTemplateKey: 'conditional-lesson', title: 'Conditional practice',
        purpose: 'Say a conditional sentence', estimatedMinutes: 8, createdAt: '2026-09-21T10:00:00.000Z',
        targetSkills: ['grammar'], exercises: [{ type: 'dialogue-translation', targetSkill: 'grammar' }],
      },
      {
        id: 'listening-lesson', title: 'Hear the conversation', purpose: 'Understand a conversation',
        estimatedMinutes: 6, createdAt: '2026-09-20T10:00:00.000Z',
        targetSkills: ['listening'], exercises: [{ type: 'listening-comprehension', targetSkill: 'listening' }],
      },
      {
        id: 'grammar-lesson', title: 'Grammar practice', purpose: 'Practice a sentence',
        estimatedMinutes: 5, createdAt: '2026-09-19T10:00:00.000Z',
        targetSkills: ['grammar'], exercises: [],
      },
    ] as GeneratedLesson[];

    const homeLinks = buildGeneratedLessonLinks(catalog);
    const categoryLinks = {
      grammar: homeLinks.filter((lesson) => lesson.category === 'grammar'),
      listening: homeLinks.filter((lesson) => lesson.category === 'listening'),
      speaking: homeLinks.filter((lesson) => lesson.category === 'speaking'),
    };

    assert.deepEqual(homeLinks.map(({ templateKey, category }) => [templateKey, category]), [
      ['conditional-lesson', 'speaking'],
      ['listening-lesson', 'listening'],
      ['grammar-lesson', 'grammar'],
    ]);
    assert.equal(homeLinks.find((lesson) => lesson.templateKey === 'grammar-lesson')?.mode, 'home');
    assert.deepEqual(
      homeLinks.map((lesson) => lesson.templateKey).sort(),
      [...categoryLinks.grammar, ...categoryLinks.listening, ...categoryLinks.speaking].map((lesson) => lesson.templateKey).sort(),
    );
    assert.equal(homeLinks.some((lesson) => (lesson.category as string) === 'home'), false);
  });

  it('distinguishes started, partially completed, and fully completed categories', () => {
    const progress = new Map<string, LessonProgressState>([
      ['grammar-1', 'completed'],
      ['grammar-2', 'started'],
      ['listening-1', 'completed'],
    ]);
    const categories = buildLessonCategoryProgress(lessons, (lesson) => progress.get(lesson.id) ?? 'new');

    assert.deepEqual(
      categories.map(({ key, total, started, completed, state }) => ({ key, total, started, completed, state })),
      [
        { key: 'grammar', total: 2, started: 1, completed: 1, state: 'progress' },
        { key: 'listening', total: 1, started: 0, completed: 1, state: 'complete' },
        { key: 'review', total: 1, started: 0, completed: 1, state: 'complete' },
      ],
    );
  });

  it('marks untouched and only-started categories separately', () => {
    const states = new Map<string, LessonProgressState>([['grammar-1', 'started']]);
    const categories = buildLessonCategoryProgress(lessons, (lesson) => states.get(lesson.id) ?? 'new');
    assert.equal(categories.find(({ key }) => key === 'grammar')?.state, 'started');
    assert.equal(categories.find(({ key }) => key === 'listening')?.state, 'new');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GeneratedLesson } from '@mentor-ai/shared';
import {
  buildLessonCategoryProgress,
  generatedLessonMode,
  type LessonProgressState,
} from '../src/services/lesson-category-progress.js';

const lessons = [
  { id: 'grammar-1', targetSkills: ['grammar', 'review'] },
  { id: 'grammar-2', targetSkills: ['grammar'] },
  { id: 'listening-1', targetSkills: ['listening'] },
] as GeneratedLesson[];

describe('lesson category progress', () => {
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

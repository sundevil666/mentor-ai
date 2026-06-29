import { lessonRepository } from '../repositories/lesson.repository.js';
import { privateLessonRepository } from '../repositories/private-lesson.repository.js';
import type { GeneratedLesson } from '@mentor-ai/shared';

export const lessonService = {
  async listLessons() {
    const privateLessons = await privateLessonRepository.listSummaries();
    return privateLessons.length > 0 ? privateLessons : lessonRepository.findAll();
  },

  async importPrivateLessons(lessons: GeneratedLesson[]) {
    const validLessons = lessons.filter((lesson) => lesson?.id && Array.isArray(lesson.exercises));
    return privateLessonRepository.upsertMany(validLessons);
  },
};

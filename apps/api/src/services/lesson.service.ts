import { lessonRepository } from '../repositories/lesson.repository.js';
import { privateLessonRepository } from '../repositories/private-lesson.repository.js';

export const lessonService = {
  async listLessons() {
    const privateLessons = await privateLessonRepository.listSummaries();
    return privateLessons.length > 0 ? privateLessons : lessonRepository.findAll();
  },
};

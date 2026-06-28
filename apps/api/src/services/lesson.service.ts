import { lessonRepository } from '../repositories/lesson.repository.js';

export const lessonService = {
  listLessons: () => lessonRepository.findAll(),
};

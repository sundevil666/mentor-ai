import { mkdir, readFile } from 'node:fs/promises';
import type { GeneratedLesson, LearningConcept, LessonSummary, StudentModel } from '@mentor-ai/shared';
import { resolvePersonalStoragePath } from '../utils/storage-path.js';

const lessonDirectory = resolvePersonalStoragePath('lessons');

export const privateLessonRepository = {
  async findAll(): Promise<GeneratedLesson[]> {
    await mkdir(lessonDirectory, { recursive: true });

    try {
      const file = await readFile(resolvePersonalStoragePath('lessons', 'lessons.json'), 'utf8');
      const parsed = JSON.parse(file) as unknown;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isGeneratedLesson).sort((left, right) => left.id.localeCompare(right.id));
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  },

  async findNextForStudent(model: StudentModel, completedLessonIds: Set<string>): Promise<GeneratedLesson | null> {
    const lessons = await this.findAll();
    const preferredConcept = model.teacherDecision.nextRecommendedConcept;
    const eligibleLessons = lessons.filter((lesson) => !completedLessonIds.has(lesson.id));

    return (
      findLessonByConcept(eligibleLessons, preferredConcept) ??
      eligibleLessons[0] ??
      findLessonByConcept(lessons, preferredConcept) ??
      lessons[0] ??
      null
    );
  },

  async listSummaries(): Promise<LessonSummary[]> {
    return (await this.findAll()).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      level: lesson.conceptLevel === 'foundation' ? 'beginner' : 'intermediate',
      estimatedMinutes: lesson.estimatedMinutes,
    }));
  },
};

function findLessonByConcept(lessons: GeneratedLesson[], concept: LearningConcept): GeneratedLesson | undefined {
  return lessons.find((lesson) => lesson.concept === concept);
}

function isGeneratedLesson(value: unknown): value is GeneratedLesson {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const lesson = value as GeneratedLesson;

  return (
    typeof lesson.id === 'string' &&
    typeof lesson.title === 'string' &&
    Array.isArray(lesson.exercises) &&
    Array.isArray(lesson.localEvaluation) &&
    typeof lesson.concept === 'string'
  );
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

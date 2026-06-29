import { mkdir, readFile } from 'node:fs/promises';
import type { GeneratedLesson, LearningConcept, LessonSummary, StudentModel } from '@mentor-ai/shared';
import { resolvePersonalStoragePath } from '../utils/storage-path.js';
import { getPostgresPool } from './postgres-client.js';

const lessonDirectory = resolvePersonalStoragePath('lessons');

export const privateLessonRepository = {
  async findAll(): Promise<GeneratedLesson[]> {
    const databaseLessons = await findAllDatabaseLessons();

    if (databaseLessons.length > 0) {
      return databaseLessons;
    }

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

  async upsertMany(lessons: GeneratedLesson[]): Promise<{ importedCount: number }> {
    const pool = getPostgresPool();

    if (!pool) {
      throw new Error('DATABASE_URL is required to import private lessons.');
    }

    await ensurePrivateLessonsTable();

    for (const lesson of lessons) {
      await pool.query(
        `
          INSERT INTO private_lessons (id, lesson, concept, concept_level, activity_type, title, is_active, updated_at)
          VALUES ($1, $2::jsonb, $3, $4, $5, $6, true, now())
          ON CONFLICT (id) DO UPDATE SET
            lesson = EXCLUDED.lesson,
            concept = EXCLUDED.concept,
            concept_level = EXCLUDED.concept_level,
            activity_type = EXCLUDED.activity_type,
            title = EXCLUDED.title,
            is_active = true,
            updated_at = now()
        `,
        [lesson.id, JSON.stringify(lesson), lesson.concept, lesson.conceptLevel, lesson.activityType, lesson.title],
      );
    }

    return { importedCount: lessons.length };
  },
};

export async function ensurePrivateLessonsTable(): Promise<void> {
  const pool = getPostgresPool();

  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS private_lessons (
      id TEXT PRIMARY KEY,
      lesson JSONB NOT NULL,
      concept TEXT,
      concept_level TEXT,
      activity_type TEXT,
      title TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS private_lessons_active_concept_idx ON private_lessons (is_active, concept)');
  await pool.query('CREATE INDEX IF NOT EXISTS private_lessons_updated_at_idx ON private_lessons (updated_at)');
}

async function findAllDatabaseLessons(): Promise<GeneratedLesson[]> {
  const pool = getPostgresPool();

  if (!pool) {
    return [];
  }

  await ensurePrivateLessonsTable();

  const result = await pool.query<{ lesson: GeneratedLesson }>(
    `
      SELECT lesson
      FROM private_lessons
      WHERE is_active = true
      ORDER BY id ASC
    `,
  );

  return result.rows.map((row) => row.lesson).filter(isGeneratedLesson);
}

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

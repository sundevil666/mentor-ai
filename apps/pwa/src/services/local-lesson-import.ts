import { isLessonDeliverable, type GeneratedLesson } from '@mentor-ai/shared';

export function parseLocalLessonImport(text: string): GeneratedLesson[] {
  if (text.length > 1_000_000) throw new Error('Lesson file is too large.');
  const data: unknown = JSON.parse(text);
  const lessons: unknown = Array.isArray(data) ? data : (data as { lessons?: unknown } | null)?.lessons;
  if (!Array.isArray(lessons) || !lessons.length || lessons.length > 100) throw new Error('Choose a lesson library JSON file.');
  const ids = new Set<string>();
  for (const item of lessons) {
    const lesson = item as GeneratedLesson;
    if (!lesson || typeof lesson.id !== 'string' || !lesson.id || ids.has(lesson.id)
      || typeof lesson.planId !== 'string' || typeof lesson.lessonTemplateKey !== 'string'
      || typeof lesson.concept !== 'string' || typeof lesson.conceptLevel !== 'string'
      || typeof lesson.activityType !== 'string' || typeof lesson.createdAt !== 'string'
      || !lesson.teacherDecision || typeof lesson.teacherDecision.reason !== 'string'
      || !lesson.recovery || typeof lesson.recovery.message !== 'string'
      || typeof lesson.title !== 'string' || typeof lesson.purpose !== 'string'
      || !Array.isArray(lesson.targetSkills) || typeof lesson.estimatedMinutes !== 'number'
      || !Array.isArray(lesson.localEvaluation) || !Array.isArray(lesson.exercises)
      || !lesson.exercises.every((e) => e && typeof e.id === 'string' && typeof e.prompt === 'string'
        && ['dialogue-translation', 'repeat-speaking'].includes(e.type)
        && typeof e.expectedResponse === 'string' && Boolean(e.expectedResponse.trim())
        && typeof e.audioText === 'string' && Boolean(e.audioText.trim()))
      || !isLessonDeliverable(lesson)) throw new Error('Invalid spoken lesson. Nothing was imported.');
    ids.add(lesson.id);
  }
  return lessons as GeneratedLesson[];
}

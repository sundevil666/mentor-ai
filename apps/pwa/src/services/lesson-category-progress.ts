import type { GeneratedLesson, LearningMode, SkillArea } from '@mentor-ai/shared';

export type LessonProgressState = 'new' | 'started' | 'completed';
export type LessonCategoryState = 'new' | 'started' | 'progress' | 'complete';
export type GeneratedLessonCategory = 'listening' | 'speaking';
export interface GeneratedLessonLink {
  templateKey: string;
  title: string;
  focus: string;
  mode: GeneratedLessonCategory;
  minutes: number;
  skillLabel: 'Listening' | 'Speaking';
}

const categories: Array<{ key: SkillArea; label: string; icon: string }> = [
  { key: 'grammar', label: 'Grammar', icon: 'spellcheck' },
  { key: 'listening', label: 'Listening', icon: 'headphones' },
  { key: 'speaking', label: 'Speaking', icon: 'record_voice_over' },
  { key: 'vocabulary', label: 'Vocabulary', icon: 'translate' },
  { key: 'review', label: 'Review', icon: 'replay' },
];

export function generatedLessonMode(lesson: GeneratedLesson): LearningMode {
  if (lesson.exercises.some((exercise) => (
    exercise.type === 'listening-text'
    || exercise.type === 'listening-comprehension'
  ))) {
    return 'listening';
  }

  if (lesson.exercises.some((exercise) => (
    exercise.type === 'dialogue-translation'
    || exercise.type === 'repeat-speaking'
    || exercise.targetSkill === 'speaking'
  ))) {
    return 'speaking';
  }

  if (lesson.targetSkills.includes('listening')) return 'listening';
  if (lesson.targetSkills.includes('speaking')) return 'speaking';
  return 'speaking';
}

export function sortGeneratedLessonsNewestFirst(lessons: GeneratedLesson[]): GeneratedLesson[] {
  return [...lessons].sort((left, right) => (
    right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id)
  ));
}

export function buildGeneratedLessonLinks(lessons: GeneratedLesson[]): GeneratedLessonLink[] {
  return sortGeneratedLessonsNewestFirst(lessons).map((lesson) => {
    const mode = generatedLessonMode(lesson) === 'listening' ? 'listening' : 'speaking';
    return {
      templateKey: lesson.lessonTemplateKey ?? lesson.id,
      title: lesson.title,
      focus: lesson.purpose,
      mode,
      minutes: lesson.estimatedMinutes,
      skillLabel: mode === 'listening' ? 'Listening' : 'Speaking',
    };
  });
}

export function buildLessonCategoryProgress(
  lessons: GeneratedLesson[],
  getProgress: (lesson: GeneratedLesson) => LessonProgressState,
) {
  return categories.flatMap((category) => {
    const matching = lessons.filter((lesson) => lesson.targetSkills.includes(category.key));
    if (matching.length === 0) return [];
    const states = matching.map(getProgress);
    const completed = states.filter((state) => state === 'completed').length;
    const started = states.filter((state) => state === 'started').length;
    const state: LessonCategoryState = completed === matching.length
      ? 'complete'
      : completed > 0
        ? 'progress'
        : started > 0
          ? 'started'
          : 'new';
    return [{ ...category, total: matching.length, started, completed, state }];
  });
}

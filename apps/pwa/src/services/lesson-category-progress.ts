import type { GeneratedLesson, LearningMode, SkillArea } from '@mentor-ai/shared';

export type LessonProgressState = 'new' | 'started' | 'completed';
export type LessonCategoryState = 'new' | 'started' | 'progress' | 'complete';
export type GeneratedLessonCategory = 'grammar' | 'listening' | 'speaking';
export interface GeneratedLessonLink {
  templateKey: string;
  title: string;
  focus: string;
  concept: GeneratedLesson['concept'];
  mode: 'home' | 'listening' | 'speaking';
  category: GeneratedLessonCategory;
  minutes: number;
  skillLabel: 'Grammar' | 'Listening' | 'Speaking';
}

const categories: Array<{ key: SkillArea; label: string; icon: string }> = [
  { key: 'grammar', label: 'Grammar', icon: 'spellcheck' },
  { key: 'listening', label: 'Listening', icon: 'headphones' },
  { key: 'speaking', label: 'Speaking', icon: 'record_voice_over' },
  { key: 'vocabulary', label: 'Vocabulary', icon: 'translate' },
  { key: 'review', label: 'Review', icon: 'replay' },
];

export function generatedLessonCategory(lesson: GeneratedLesson): GeneratedLessonCategory {
  if (lesson.exercises.some((exercise) => (
    exercise.type === 'listening-text'
    || exercise.type === 'listening-comprehension'
  ))) {
    return 'listening';
  }

  if (lesson.targetSkills.includes('grammar')
    && !lesson.targetSkills.includes('speaking')
    && lesson.exercises.some((exercise) => exercise.type === 'word-order' && exercise.targetSkill === 'grammar')) {
    return 'grammar';
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
  return 'grammar';
}

export function generatedLessonMode(lesson: GeneratedLesson): LearningMode {
  return generatedLessonCategory(lesson) === 'listening' ? 'listening' : 'speaking';
}

export function sortGeneratedLessonsNewestFirst(lessons: GeneratedLesson[]): GeneratedLesson[] {
  return [...lessons].sort((left, right) => (
    right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id)
  ));
}

export function buildGeneratedLessonLinks(lessons: GeneratedLesson[]): GeneratedLessonLink[] {
  return sortGeneratedLessonsNewestFirst(lessons).map((lesson) => {
    const category = generatedLessonCategory(lesson);
    const mode = category === 'grammar' ? 'home' : category;
    return {
      templateKey: lesson.lessonTemplateKey ?? lesson.id,
      title: lesson.title,
      focus: lesson.purpose,
      concept: lesson.concept,
      mode,
      category,
      minutes: lesson.estimatedMinutes,
      skillLabel: category === 'listening' ? 'Listening' : category === 'speaking' ? 'Speaking' : 'Grammar',
    };
  });
}

export function mergeAvailableLessonCatalog(
  fetched: GeneratedLesson[],
  cached: GeneratedLesson[],
  active: GeneratedLesson | null,
  paused: GeneratedLesson[],
): GeneratedLesson[] {
  const known = new Map<string, GeneratedLesson>();
  for (const lesson of cached) known.set(lesson.id, lesson);
  for (const lesson of paused) known.set(lesson.id, lesson);
  if (active) known.set(active.id, active);
  for (const lesson of fetched) known.set(lesson.id, lesson);
  return [...known.values()];
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

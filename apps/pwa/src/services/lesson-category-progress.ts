import type { GeneratedLesson, SkillArea } from '@mentor-ai/shared';

export type LessonProgressState = 'new' | 'started' | 'completed';
export type LessonCategoryState = 'new' | 'started' | 'progress' | 'complete';

const categories: Array<{ key: SkillArea; label: string; icon: string }> = [
  { key: 'grammar', label: 'Grammar', icon: 'spellcheck' },
  { key: 'listening', label: 'Listening', icon: 'headphones' },
  { key: 'speaking', label: 'Speaking', icon: 'record_voice_over' },
  { key: 'vocabulary', label: 'Vocabulary', icon: 'translate' },
  { key: 'review', label: 'Review', icon: 'replay' },
];

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

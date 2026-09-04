import type { LearningActivityTotals, StatisticsSnapshot, StudentModel } from '@mentor-ai/shared';

const dayMs = 86_400_000;
const inactiveAfterDays = 7;

export interface LevelJourney {
  currentLevel: string;
  nextLevel: string;
  progressPercent: number;
  daysRemaining: number | null;
  daysLabel: string;
  paceLabel: string;
  tooltip: string;
}

export function calculateLevelJourney(
  studentModel: StudentModel,
  activity: LearningActivityTotals,
  statistics: readonly StatisticsSnapshot[],
  now = new Date(),
): LevelJourney {
  const averageSkill = averageSkillScore(studentModel);
  const stage = averageSkill < 0.5
    ? { currentLevel: 'A0', nextLevel: 'A1', start: 0, end: 0.5, guidedHours: 80 }
    : averageSkill < 0.72
      ? { currentLevel: 'A1', nextLevel: 'A2', start: 0.5, end: 0.72, guidedHours: 120 }
      : { currentLevel: 'A2', nextLevel: 'B1', start: 0.72, end: 0.9, guidedHours: 200 };
  const skillProgress = clamp((averageSkill - stage.start) / (stage.end - stage.start));
  const totalHours = Math.max(0, activity.totalSeconds) / 3_600;
  const practiceProgress = clamp(totalHours / stage.guidedHours);
  // Quality evidence remains primary, while real listening/reading/speaking
  // makes the route visibly move even between completed assessments.
  const progress = clamp(skillProgress * 0.75 + practiceProgress * 0.25);
  const progressPercent = Math.min(99, Math.round(progress * 100));
  const firstEvidenceAt = earliestEvidenceDate(studentModel, statistics, now);
  const elapsedDays = Math.max(1, (now.getTime() - firstEvidenceAt.getTime()) / dayMs + 1);
  const hoursPerDay = Math.min(4, totalHours / elapsedDays);
  const lastActivityAt = activity.updatedAt ? Date.parse(activity.updatedAt) : Number.NaN;
  const isInactive = !Number.isFinite(lastActivityAt) || now.getTime() - lastActivityAt > inactiveAfterDays * dayMs;
  const remainingHours = Math.max(0, stage.guidedHours * (1 - progress));
  const daysRemaining = isInactive || hoursPerDay < 0.05 ? null : Math.max(1, Math.ceil(remainingHours / hoursPerDay));
  const daysLabel = daysRemaining === null ? 'paused' : `${daysRemaining}d`;
  const paceLabel = daysRemaining === null
    ? 'Pace paused — activity will restart the forecast'
    : `About ${daysRemaining} days at your current pace`;
  return {
    currentLevel: stage.currentLevel,
    nextLevel: stage.nextLevel,
    progressPercent,
    daysRemaining,
    daysLabel,
    paceLabel,
    tooltip: `${progressPercent}% from ${stage.currentLevel} to ${stage.nextLevel}. ${paceLabel}. The estimate changes with activity and learning results.`,
  };
}

function averageSkillScore(model: StudentModel) {
  return (model.vocabulary.score.value + model.grammar.score.value + model.listening.score.value + model.speaking.score.value) / 4;
}

function earliestEvidenceDate(model: StudentModel, statistics: readonly StatisticsSnapshot[], now: Date) {
  const timestamps = [model.teacherDecision.createdAt, ...statistics.map((snapshot) => snapshot.createdAt)]
    .map(Date.parse)
    .filter(Number.isFinite);
  return new Date(timestamps.length ? Math.min(...timestamps) : now.getTime());
}

function clamp(value: number) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }

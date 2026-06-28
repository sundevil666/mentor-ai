import {
  createLessonPlan,
  createObservationFromResults,
  createRecommendationFromModel,
  updateStudentModelFromResults,
  type ExerciseResult,
  type LearningContext,
  type LessonPlan,
  type Observation,
  type Recommendation,
  type StudentModel,
  type TeacherJournalEntry,
} from '@mentor-ai/shared';

interface TeacherReflection {
  studentModel: StudentModel;
  observations: Observation[];
  recommendation: Recommendation;
  journalEntry: TeacherJournalEntry;
}

export const aiTeacherService = {
  planLesson(model: StudentModel, context: LearningContext, createdAt: string): LessonPlan {
    return createLessonPlan(model, context, createdAt);
  },

  reflectOnResults(studentId: string, model: StudentModel, results: ExerciseResult[], createdAt: string): TeacherReflection {
    const studentModel = updateStudentModelFromResults(model, results, createdAt);
    const observation = createObservationFromResults(studentId, results, createdAt);
    const recommendation = createRecommendationFromModel(studentModel, createdAt);

    return {
      studentModel,
      observations: observation ? [observation] : [],
      recommendation,
      journalEntry: {
        id: `journal-${studentId}-${createdAt}`,
        studentId,
        summary: createJournalSummary(observation, recommendation),
        evidenceIds: results.flatMap((result) => result.evidenceEventIds),
        createdAt,
      },
    };
  },
};

function createJournalSummary(observation: Observation | undefined, recommendation: Recommendation): string {
  if (observation) {
    return `${observation.description} Next lesson direction: ${recommendation.summary}.`;
  }

  return `Latest evidence was stable. Next lesson direction: ${recommendation.summary}.`;
}

import type { ApiResponse, ExerciseResult, LearningEvent, SynchronizationAcknowledgement } from '@mentor-ai/shared';

interface SynchronizationResponse {
  acknowledgements: SynchronizationAcknowledgement[];
  acceptedCount: number;
  pendingAnalysis: boolean;
  studentModelVersion: number;
}

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

export async function synchronizeLearningEvidence(
  events: LearningEvent[],
  exerciseResults: ExerciseResult[],
): Promise<SynchronizationResponse> {
  const response = await fetch(`${apiBaseUrl}/api/synchronization`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events, exerciseResults }),
  });

  if (!response.ok) {
    throw new Error('Synchronization failed.');
  }

  const body = (await response.json()) as ApiResponse<SynchronizationResponse>;
  return body.data;
}

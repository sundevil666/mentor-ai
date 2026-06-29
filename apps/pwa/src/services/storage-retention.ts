export interface RetentionRecord {
  id: string;
  createdAt?: string;
  observedAt?: string;
  occurredAt?: string;
  updatedAt?: string;
  status?: string;
  lessonId?: string;
}

export interface RetentionPolicy {
  maxLessons: number;
  maxStatisticsSnapshots: number;
  maxActivitySnapshots: number;
  maxConceptEvidence: number;
  maxAcknowledgedSyncEvents: number;
}

export const defaultRetentionPolicy: RetentionPolicy = {
  maxLessons: 20,
  maxStatisticsSnapshots: 120,
  maxActivitySnapshots: 80,
  maxConceptEvidence: 120,
  maxAcknowledgedSyncEvents: 40,
};

export function selectRecordsToPrune<T extends RetentionRecord>(
  records: T[],
  maxRecords: number,
  protectedIds: ReadonlySet<string> = new Set(),
): T[] {
  if (maxRecords < 0) {
    return records.filter((record) => !protectedIds.has(record.id));
  }

  const sorted = [...records].sort((left, right) => getRetentionDate(right).localeCompare(getRetentionDate(left)));
  const retained = new Set<string>();

  for (const record of sorted) {
    if (protectedIds.has(record.id) || retained.size < maxRecords) {
      retained.add(record.id);
    }
  }

  return records.filter((record) => !retained.has(record.id));
}

export function compactAcknowledgedSyncEvent<T extends RetentionRecord>(event: T): T {
  if (event.status === 'pending') {
    return event;
  }

  const { exerciseResults: _exerciseResults, speechResults: _speechResults, ...compactEvent } = event as T & {
    exerciseResults?: unknown;
    speechResults?: unknown;
  };
  void _exerciseResults;
  void _speechResults;

  return compactEvent as T;
}

function getRetentionDate(record: RetentionRecord): string {
  return record.createdAt ?? record.observedAt ?? record.occurredAt ?? record.updatedAt ?? '';
}

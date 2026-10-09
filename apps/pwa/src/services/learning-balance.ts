import type { LearningActivityKind, LearningActivityTotals } from '@mentor-ai/shared';

export type LearningBalanceKind = LearningActivityKind | 'movies';

export interface LearningBalanceRow {
  kind: LearningBalanceKind; label: string; description: string; impactPercent: number; targetPercent: number;
  gapPercent: number; status: 'focus' | 'balanced' | 'strong'; seconds: number; estimated: boolean;
  actionLabel: string; route: { name: string; query?: Record<string, string> };
}

const definitions: Array<Omit<LearningBalanceRow, 'impactPercent' | 'gapPercent' | 'status' | 'seconds' | 'estimated'>> = [
  { kind: 'speaking', label: 'Speaking', description: 'Active speech and pronunciation feedback', targetPercent: 23, actionLabel: 'Practice speaking', route: { name: 'dashboard', query: { training: 'speaking' } } },
  { kind: 'listening', label: 'Listening practice', description: 'Listening lessons with comprehension work', targetPercent: 19, actionLabel: 'Practice listening', route: { name: 'dashboard', query: { training: 'listening' } } },
  { kind: 'vocabulary', label: 'Vocabulary', description: 'Recall and use words without a prompt', targetPercent: 17, actionLabel: 'Practice vocabulary', route: { name: 'dashboard', query: { training: 'home' } } },
  { kind: 'reading', label: 'Reading', description: 'Meaningful reading and comprehension', targetPercent: 14, actionLabel: 'Read a book', route: { name: 'reading' } },
  { kind: 'grammar', label: 'Grammar', description: 'Grammar used in checked exercises', targetPercent: 12, actionLabel: 'Practice grammar', route: { name: 'dashboard', query: { training: 'grammar' } } },
  { kind: 'phrases', label: 'Phrases', description: 'Useful patterns and spoken repetition', targetPercent: 10, actionLabel: 'Practice phrases', route: { name: 'patterns' } },
  { kind: 'audio', label: 'Podcasts & audio', description: 'Stories, podcasts and repeated listening', targetPercent: 5, actionLabel: 'Open audio', route: { name: 'audio' } },
  { kind: 'movies', label: 'Movies', description: 'Reports are visible, but viewing time is not measured yet', targetPercent: 0, actionLabel: 'Review a movie', route: { name: 'movies' } },
];

const qualityWeights: Record<LearningBalanceKind, number> = {
  speaking: 1, vocabulary: 0.9, listening: 0.85, grammar: 0.85, phrases: 0.85, reading: 0.7, audio: 0.5, movies: 0,
};

export function calculateLearningBalance(input: { activity: LearningActivityTotals; estimatedMovieSeconds?: number }) {
  const secondsByKind = Object.fromEntries(definitions.map(({ kind }) => [kind, kind === 'movies'
    ? Math.max(0, input.estimatedMovieSeconds ?? 0)
    : Math.max(0, input.activity[`${kind}Seconds`] ?? 0)])) as Record<LearningBalanceKind, number>;
  const weightedTotal = definitions.reduce((sum, item) => sum + secondsByKind[item.kind] * qualityWeights[item.kind], 0);
  const rows = definitions.map((item): LearningBalanceRow => {
    const impactPercent = weightedTotal ? Math.round(secondsByKind[item.kind] * qualityWeights[item.kind] / weightedTotal * 100) : 0;
    const gapPercent = item.targetPercent - impactPercent;
    return { ...item, impactPercent, gapPercent, seconds: secondsByKind[item.kind], estimated: item.kind === 'movies', status: item.kind === 'movies' ? 'balanced' : gapPercent >= 4 ? 'focus' : gapPercent <= -4 ? 'strong' : 'balanced' };
  });
  const measuredRows = rows.filter((row) => row.kind !== 'movies');
  const primaryFocus = [...measuredRows].sort((a, b) => b.gapPercent - a.gapPercent)[0]!;
  const strongestArea = [...measuredRows].sort((a, b) => a.gapPercent - b.gapPercent)[0]!;
  const totalGap = measuredRows.reduce((sum, row) => sum + Math.abs(row.gapPercent), 0);
  return { rows, primaryFocus, strongestArea, balanceScore: Math.max(0, Math.round(100 - totalGap / 2)) };
}

import { learningActivityKinds, type LearningActivityEvent, type LearningActivityKind, type LearningActivityTotals, type MovieLearningReport } from '@mentor-ai/shared';

export type LearningBalanceKind = LearningActivityKind | 'movies';

export interface LearningBalanceRow {
  kind: LearningBalanceKind; label: string; description: string; impactPercent: number; targetPercent: number;
  gapPercent: number; status: 'focus' | 'balanced' | 'strong'; seconds: number; estimated: boolean;
  priorityRank: number | null;
  actionLabel: string; route: { name: string; query?: Record<string, string> };
}

const definitions: Array<Omit<LearningBalanceRow, 'impactPercent' | 'gapPercent' | 'status' | 'seconds' | 'estimated' | 'priorityRank'>> = [
  { kind: 'speaking', label: 'Speaking', description: 'Active speech and pronunciation feedback', targetPercent: 23, actionLabel: 'Practice speaking', route: { name: 'dashboard', query: { training: 'speaking' } } },
  { kind: 'listening', label: 'Listening practice', description: 'Listening lessons with comprehension work', targetPercent: 19, actionLabel: 'Practice listening', route: { name: 'dashboard', query: { training: 'listening' } } },
  { kind: 'vocabulary', label: 'Vocabulary', description: 'Recall and use words without a prompt', targetPercent: 17, actionLabel: 'Practice vocabulary', route: { name: 'dashboard', query: { training: 'vocabulary' } } },
  { kind: 'reading', label: 'Reading', description: 'Meaningful reading and comprehension', targetPercent: 14, actionLabel: 'Read a book', route: { name: 'reading' } },
  { kind: 'grammar', label: 'Grammar', description: 'Grammar used in checked exercises', targetPercent: 12, actionLabel: 'Practice grammar', route: { name: 'dashboard', query: { training: 'grammar' } } },
  { kind: 'phrases', label: 'Phrases', description: 'Useful patterns and spoken repetition', targetPercent: 10, actionLabel: 'Practice phrases', route: { name: 'patterns' } },
  { kind: 'audio', label: 'Podcasts & audio', description: 'Stories, podcasts and repeated listening', targetPercent: 5, actionLabel: 'Open audio', route: { name: 'audio' } },
  { kind: 'movies', label: 'Movies', description: 'English-language films confirmed by a learning report', targetPercent: 0, actionLabel: 'Review a movie', route: { name: 'movies' } },
];

const qualityWeights: Record<LearningBalanceKind, number> = {
  speaking: 1, vocabulary: 0.9, listening: 0.85, grammar: 0.85, phrases: 0.85, reading: 0.7, audio: 0.5, movies: 0,
};
const movieListeningWeight = 0.6;

export function summarizeRecentLearningActivity(events: LearningActivityEvent[], now = new Date(), days = 30): LearningActivityTotals {
  const end = now.getTime();
  const start = end - days * 24 * 60 * 60 * 1_000;
  const totals = Object.fromEntries(learningActivityKinds.map((kind) => [`${kind}Seconds`, 0])) as Omit<LearningActivityTotals, 'totalSeconds' | 'updatedAt'>;
  let updatedAt: string | null = null;
  for (const event of events) {
    const endedAt = Date.parse(event.endedAt);
    if (!Number.isFinite(endedAt) || endedAt < start || endedAt > end || event.contentId === 'historic-device-baseline') continue;
    totals[`${event.kind}Seconds`] += Math.max(0, event.activeSeconds);
    if (!updatedAt || event.endedAt > updatedAt) updatedAt = event.endedAt;
  }
  return {
    ...totals,
    totalSeconds: learningActivityKinds.reduce((sum, kind) => sum + totals[`${kind}Seconds`], 0),
    updatedAt,
  };
}

export function calculateLearningBalance(input: { activity: LearningActivityTotals; estimatedMovieSeconds?: number }) {
  const secondsByKind = Object.fromEntries(definitions.map(({ kind }) => [kind, kind === 'movies'
    ? Math.max(0, input.estimatedMovieSeconds ?? 0)
    : Math.max(0, input.activity[`${kind}Seconds`] ?? 0)])) as Record<LearningBalanceKind, number>;
  const movieListeningImpact = secondsByKind.movies * movieListeningWeight;
  const weightedTotal = definitions.reduce((sum, item) => sum + secondsByKind[item.kind] * qualityWeights[item.kind], movieListeningImpact);
  const rows = definitions.map((item): LearningBalanceRow => {
    const weightedImpact = item.kind === 'movies'
      ? movieListeningImpact
      : secondsByKind[item.kind] * qualityWeights[item.kind] + (item.kind === 'listening' ? movieListeningImpact : 0);
    const impactPercent = weightedTotal ? Math.round(weightedImpact / weightedTotal * 100) : 0;
    const gapPercent = item.targetPercent - impactPercent;
    return { ...item, impactPercent, gapPercent, seconds: secondsByKind[item.kind], estimated: item.kind === 'movies', priorityRank: null, status: item.kind === 'movies' ? 'balanced' : gapPercent >= 4 ? 'focus' : gapPercent <= -4 ? 'strong' : 'balanced' };
  });
  const measuredRows = rows.filter((row) => row.kind !== 'movies');
  const prioritizedRows = [...measuredRows]
    .sort((a, b) => b.gapPercent - a.gapPercent)
    .map((row, index) => ({ ...row, priorityRank: index + 1 }));
  const primaryFocus = prioritizedRows[0]!;
  const strongestArea = [...measuredRows].sort((a, b) => a.gapPercent - b.gapPercent)[0]!;
  const totalGap = measuredRows.reduce((sum, row) => sum + Math.abs(row.gapPercent), 0);
  const movieRows = rows.filter((row) => row.kind === 'movies');
  return { rows: [...prioritizedRows, ...movieRows], primaryFocus, strongestArea, balanceScore: Math.max(0, Math.round(100 - totalGap / 2)) };
}

export interface LearningBalanceChange {
  delta: number; occurredAt: string; action: string; activeSeconds: number; kind: LearningBalanceKind;
}

export function calculateLatestBalanceChange(input: {
  activity: LearningActivityTotals;
  events: LearningActivityEvent[];
  movieReports?: MovieLearningReport[];
  estimatedMovieSecondsPerReport?: number;
  contentTitles?: Record<string, string>;
}): LearningBalanceChange | null {
  const latestActivity = [...input.events].filter((event) => event.activeSeconds > 0).sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0];
  const latestMovie = [...(input.movieReports ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const movieSeconds = Math.max(0, input.estimatedMovieSecondsPerReport ?? 0);
  const estimatedMovieSeconds = (input.movieReports?.length ?? 0) * movieSeconds;
  const movieIsLatest = Boolean(latestMovie && (!latestActivity || latestMovie.createdAt > latestActivity.endedAt));
  if (!latestActivity && !latestMovie) return null;
  const currentScore = calculateLearningBalance({ activity: input.activity, estimatedMovieSeconds }).balanceScore;
  if (movieIsLatest && latestMovie) {
    const previousScore = calculateLearningBalance({ activity: input.activity, estimatedMovieSeconds: Math.max(0, estimatedMovieSeconds - movieSeconds) }).balanceScore;
    return { delta: currentScore - previousScore, occurredAt: latestMovie.createdAt, action: `Watched ${latestMovie.movieTitle}`, activeSeconds: movieSeconds, kind: 'movies' };
  }
  const latest = latestActivity!;
  const activity = input.activity;
  const previousActivity = { ...activity };
  const secondsKey = `${latest.kind}Seconds` as const;
  const removedSeconds = Math.min(previousActivity[secondsKey], latest.activeSeconds);
  previousActivity[secondsKey] -= removedSeconds;
  previousActivity.totalSeconds = Math.max(0, previousActivity.totalSeconds - removedSeconds);
  const previousScore = calculateLearningBalance({ activity: previousActivity, estimatedMovieSeconds }).balanceScore;
  return { delta: currentScore - previousScore, occurredAt: latest.endedAt, action: describeLearningAction(latest, input.contentTitles), activeSeconds: latest.activeSeconds, kind: latest.kind };
}

function describeLearningAction(event: LearningActivityEvent, contentTitles?: Record<string, string>) {
  const labels: Record<LearningActivityKind, string> = {
    speaking: 'Speaking practice', listening: 'Listening practice', vocabulary: 'Vocabulary practice', reading: 'Reading',
    grammar: 'Grammar practice', phrases: 'Phrase practice', audio: 'Podcast or audio listening',
  };
  const title = contentTitles?.[event.contentId]?.trim();
  if (title) return `${labels[event.kind]} · ${title}`;
  if (event.contentId === 'daily-category-total' || event.contentId === event.kind || /^(audio|story|book|phrases)$/.test(event.contentId) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(event.contentId)) return labels[event.kind];
  return `${labels[event.kind]} · ${event.contentId}`;
}

/** Keep one daily priority anchored to the mix before today's practice. */
export function calculateDailyBalanceGoals(events: LearningActivityEvent[], estimatedMovieSeconds: number, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const baseline = summarizeRecentLearningActivity(events, new Date(start.getTime() - 1));
  const balance = calculateLearningBalance({ activity: baseline, estimatedMovieSeconds });
  const today = summarizeRecentLearningActivity(events.filter((event) => Date.parse(event.endedAt) >= start.getTime()), now);
  const goal = balance.primaryFocus;
  const completed = today[`${goal.kind as LearningActivityKind}Seconds`] > 0;
  const goals = [{
    ...goal,
    completed,
  }];
  const pending = goals.filter((goal) => !goal.completed);
  return { goals, pending, current: pending[0] ?? null, completed: pending.length === 0 };
}

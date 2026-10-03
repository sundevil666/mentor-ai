import type { MovieLearningReport } from '@mentor-ai/shared';

const maximumMemoryCharacters = 24_000;
export const maximumMovieChatUserMemoryCharacters = 15_000;

export const movieCoachPrompt = `You are my personal English coach for learning through films and series. Help me choose content appropriate for my listening level and interests. After I watch, discuss scenes, language, accents, phrases and words I found difficult. Correct my English naturally and distinguish listening problems from vocabulary or grammar problems. Do not overwhelm me with long lists. When I ask for the final report, produce a compact report for Mentor AI.`;

export function buildMovieChatMemory(userMemory: string, reports: MovieLearningReport[]) {
  const lines = reports
    .slice()
    .sort((left, right) => right.watchedAt.localeCompare(left.watchedAt))
    .slice(0, 30)
    .map((report) => `${report.watchedAt} — ${report.movieTitle}: ${report.report.replace(/\s+/g, ' ').trim().slice(0, 700)}`);
  const sections = [
    userMemory.trim() ? `Learner notes:\n${userMemory.trim().slice(0, maximumMovieChatUserMemoryCharacters)}` : '',
    lines.length ? `Watched films and feedback:\n${lines.join('\n')}` : 'Watched films and feedback: none yet.',
  ].filter(Boolean);
  return sections.join('\n\n').slice(0, maximumMemoryCharacters);
}

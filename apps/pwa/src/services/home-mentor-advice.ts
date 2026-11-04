import type { BookReadingAnalytics, ContentEngagementEvent, LearningActivityEvent, MovieLearningReport, StatisticsSnapshot } from '@mentor-ai/shared';

export interface MentorAdvice { id: string; title: string; text: string; tone: 'positive' | 'focus' }

/** Observations describe recorded practice, never infer comprehension from time spent. */
export function buildHomeMentorAdvice(input: {
  statistics: StatisticsSnapshot[];
  activity: LearningActivityEvent[];
  engagement: ContentEngagementEvent[];
  movies: MovieLearningReport[];
  books?: BookReadingAnalytics[];
}, now = new Date()): MentorAdvice[] {
  const cutoff = now.getTime() - 30 * 86400000;
  const recent = (date: string) => Number.isFinite(Date.parse(date)) && Date.parse(date) >= cutoff && Date.parse(date) <= now.getTime();
  const sessions = input.statistics.filter(item => recent(item.createdAt));
  const activity = input.activity.filter(item => recent(item.endedAt));
  const engagement = input.engagement.filter(item => recent(item.createdAt));
  const notes: MentorAdvice[] = [];
  const add = (id: string, title: string, text: string, tone: MentorAdvice['tone']) => notes.push({ id, title, text, tone });
  const words = new Map<string, number>();
  for (const session of sessions) for (const word of new Set(session.pronunciationFocus.map(value => value.trim().toLowerCase()).filter(Boolean))) words.set(word, (words.get(word) ?? 0) + 1);
  const focus = [...words].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
  if (focus.length) add(`pronunciation:${focus.map(([word]) => word).join('|')}`, 'Произношение', `В результатах отмечены: ${focus.map(([word]) => word).join(', ')}. Послушай образец и повтори каждое слово в короткой фразе.`, 'focus');
  const exercises = sessions.reduce((sum, item) => sum + item.completedExercises, 0);
  const accuracy = exercises ? sessions.reduce((sum, item) => sum + item.accuracy * item.completedExercises, 0) / exercises : 0;
  if (exercises >= 10) {
    if (accuracy >= 0.8) add('accuracy:strong', 'Ответы получаются', 'В завершённых уроках большинство ответов верные. Продолжай практику и пробуй отвечать своими словами.', 'positive');
    else add('accuracy:practice', 'Закрепи перед новым', 'В завершённых уроках пока много ошибок. Повтори несколько трудных фраз и затем попробуй ответить без образца.', 'focus');
  }
  const seconds = (kinds: string[]) => activity.filter(item => kinds.includes(item.kind)).reduce((sum, item) => sum + Math.max(0, item.activeSeconds), 0);
  const reading = seconds(['reading']);
  const listening = seconds(['listening', 'audio']);
  const speaking = seconds(['speaking', 'phrases']);
  if (reading >= 300) add('reading:habit', 'Чтение входит в привычку', 'Ты уделяешь время книгам — это хорошая опора для словаря. После чтения перескажи пару предложений вслух.', 'positive');
  if (listening >= 300) add('listening:habit', 'Хорошая работа со слухом', 'Ты уделяешь время слушанию. Выбери короткий отрывок и повтори за голосом, сохраняя его ритм.', 'positive');
  if (reading + listening >= 1200 && speaking < (reading + listening) / 5) add('balance:speaking', 'Добавь немного речи', 'Чтения и слушания заметно больше, чем разговорной практики. Добавь 3–5 минут ответов вслух после них.', 'focus');
  const lookups = new Map<string, number>();
  for (const book of input.books ?? []) {
    if (!recent(book.updatedAt)) continue;
    for (const word of book.words) lookups.set(word.text, (lookups.get(word.text) ?? 0) + word.translations);
  }
  const repeated = [...lookups].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([word]) => word);
  if (repeated.length) add(`vocabulary:${repeated.join('|')}`, 'Слова, к которым ты возвращаешься', `В книгах, которые ты недавно читал, повторяются переводы: ${repeated.join(', ')}. Составь с ними свои фразы и проверь себя завтра.`, 'focus');
  if (speaking >= 300) add('speaking:habit', 'Ты практикуешь речь', 'Ты выделяешь время на ответы вслух — продолжай. Попробуй применить знакомую фразу в новой ситуации.', 'positive');
  if (seconds(['vocabulary']) >= 300) add('vocabulary:habit', 'Есть работа со словами', 'Ты уделяешь время словарю. Закрепляй новые слова в коротких фразах о своей жизни.', 'positive');
  if (input.movies.some(item => recent(item.watchedAt))) add('movies:practice', 'Перенеси фразу из фильма в речь', 'Ты отмечаешь просмотр фильмов. Выбери одну полезную реплику и составь с ней свой пример.', 'focus');
  const latestFeedback = new Map<string, ContentEngagementEvent>();
  for (const item of [...engagement].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (item.feedback) latestFeedback.set(`${item.category}:${item.contentId}`, item);
  }
  const difficult = new Set([...latestFeedback].filter(([, item]) => item.feedback === 'too-difficult').map(([key]) => key));
  if (difficult.size >= 2) add('difficulty:lighter', 'Снизь сложность на один шаг', 'Несколько материалов ты отметил как трудные. Возьми более короткий текст или урок и затем вернись к ним.', 'focus');
  if (!notes.length && sessions.length) add('lessons:keep-going', 'Есть завершённая практика', 'Ты завершаешь уроки — хорошее начало. Вернись к трудной фразе завтра и проверь, легче ли отвечать.', 'positive');
  // Keep encouragement and next steps visible even when many sources have signals.
  const selected = [...notes.filter(note => note.tone === 'focus').slice(0, 3), ...notes.filter(note => note.tone === 'positive').slice(0, 3)];
  return selected;
}

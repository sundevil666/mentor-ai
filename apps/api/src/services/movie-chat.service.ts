import { config } from '../config/env.js';

export type MovieChatMessage = { role: 'user' | 'assistant'; content: string };

interface OpenAiResponseBody {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
}

const maximumMessages = 20;
const maximumContextCharacters = 16_000;
export const movieCoachInstructions = `You are a personal English coach for learning through films and series. Help the learner choose content appropriate for their listening level and interests. After they watch, discuss scenes, language, accents, phrases and words they found difficult. Correct their English naturally and distinguish listening problems from vocabulary or grammar problems. Do not overwhelm them with long lists. When they ask for the final report, produce a compact report for Mentor AI with: title, what they watched, listening difficulties, useful new phrases, weak phrases or words, grammar or pronunciation observations, what is already strong, and recommended practice.`;

export async function createMovieChatReply(
  messages: MovieChatMessage[],
  request: typeof fetch = fetch,
) {
  const history = boundedHistory(messages);
  if (!history.length || history.at(-1)?.role !== 'user') {
    throw new Error('A user message is required.');
  }
  if (!config.openAiApiKey) throw new Error('Movie chat is not configured on the server.');

  const response = await request('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openAiMovieChatModel,
      instructions: movieCoachInstructions,
      input: history,
      max_output_tokens: 1_200,
      store: false,
    }),
  });
  const body = await response.json().catch(() => ({})) as OpenAiResponseBody;
  if (!response.ok) throw new Error(body.error?.message || 'Movie chat request failed.');
  const reply = body.output
    ?.flatMap((item) => item.type === 'message' ? item.content ?? [] : [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text!.trim())
    .filter(Boolean)
    .join('\n\n');
  if (!reply) throw new Error('Movie chat returned an empty response.');
  return { reply, model: config.openAiMovieChatModel };
}

export function boundedHistory(messages: MovieChatMessage[]) {
  const valid = messages
    .filter((message) => message?.role === 'user' || message?.role === 'assistant')
    .map((message) => ({ role: message.role, content: sanitizeText(message.content, 4_000) }))
    .filter((message) => message.content)
    .slice(-maximumMessages);
  let usedCharacters = 0;
  const bounded: MovieChatMessage[] = [];
  for (const message of valid.reverse()) {
    if (usedCharacters + message.content.length > maximumContextCharacters) break;
    bounded.unshift(message);
    usedCharacters += message.content.length;
  }
  return bounded;
}

function sanitizeText(value: unknown, maximumLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : '';
}

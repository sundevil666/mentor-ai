import { config } from '../config/env.js';

export type MovieChatMessage = { role: 'user' | 'assistant'; content: string };

interface OpenAiResponseBody {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
}

const maximumMessages = 20;
const maximumContextCharacters = 16_000;

export async function createMovieChatReply(
  initialPrompt: string,
  messages: MovieChatMessage[],
  request: typeof fetch = fetch,
) {
  const prompt = sanitizeText(initialPrompt, 6_000);
  const history = boundedHistory(messages);
  if (!prompt || !history.length || history.at(-1)?.role !== 'user') {
    throw new Error('A movie-learning prompt and a user message are required.');
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
      instructions: prompt,
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

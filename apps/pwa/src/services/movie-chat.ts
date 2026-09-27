import { requestMovieChatReply } from './api-client.js';
import { mentorDb } from './indexed-db.js';

export interface LocalMovieChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const promptStorageKey = 'mentor-ai:movie-chat-prompt:v1';
const maximumLocalMessages = 300;

export function loadMovieChatPrompt() {
  return localStorage.getItem(promptStorageKey) ?? '';
}

export function saveMovieChatPrompt(prompt: string) {
  localStorage.setItem(promptStorageKey, prompt.trim().slice(0, 6_000));
}

export async function loadMovieChatMessages() {
  const messages = await (await mentorDb).getAll('movie-chat-messages') as LocalMovieChatMessage[];
  return messages.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function appendMovieChatMessage(role: LocalMovieChatMessage['role'], content: string) {
  const message: LocalMovieChatMessage = {
    id: `movie-chat:${crypto.randomUUID()}`,
    role,
    content: content.trim().slice(0, 4_000),
    createdAt: new Date().toISOString(),
  };
  await (await mentorDb).put('movie-chat-messages', message);
  await pruneMovieChatMessages();
  return message;
}

export async function sendMovieChatMessage(initialPrompt: string, messages: LocalMovieChatMessage[]) {
  return requestMovieChatReply(initialPrompt, messages.map(({ role, content }) => ({ role, content })));
}

async function pruneMovieChatMessages() {
  const messages = await loadMovieChatMessages();
  for (const message of messages.slice(0, Math.max(0, messages.length - maximumLocalMessages))) {
    await (await mentorDb).delete('movie-chat-messages', message.id);
  }
}

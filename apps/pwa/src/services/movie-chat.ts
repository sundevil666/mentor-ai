import { requestMovieChatReply } from './api-client.js';
import { mentorDb } from './indexed-db.js';
import { defaultMovieCoachPrompt, maximumMovieChatUserMemoryCharacters, maximumMovieCoachPromptCharacters } from './movie-chat-memory.js';

export interface LocalMovieChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const maximumLocalMessages = 300;
const userMemoryStorageKey = 'mentor-ai:movie-chat-user-memory:v1';
const coachPromptStorageKey = 'mentor-ai:movie-chat-coach-prompt:v1';

export function loadMovieCoachPrompt() {
  return localStorage.getItem(coachPromptStorageKey)?.trim() || defaultMovieCoachPrompt;
}

export function saveMovieCoachPrompt(prompt: string) {
  const normalizedPrompt = prompt.trim().slice(0, maximumMovieCoachPromptCharacters);
  localStorage.setItem(coachPromptStorageKey, normalizedPrompt || defaultMovieCoachPrompt);
}

export function loadMovieChatUserMemory() {
  return localStorage.getItem(userMemoryStorageKey) ?? '';
}

export function saveMovieChatUserMemory(memory: string) {
  localStorage.setItem(userMemoryStorageKey, memory.trim().slice(0, maximumMovieChatUserMemoryCharacters));
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

export async function sendMovieChatMessage(messages: LocalMovieChatMessage[], prompt: string, memory: string) {
  return requestMovieChatReply(messages.map(({ role, content }) => ({ role, content })), prompt, memory);
}

async function pruneMovieChatMessages() {
  const messages = await loadMovieChatMessages();
  for (const message of messages.slice(0, Math.max(0, messages.length - maximumLocalMessages))) {
    await (await mentorDb).delete('movie-chat-messages', message.id);
  }
}

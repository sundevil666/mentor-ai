import type { ReaderTextLookup } from '@mentor-ai/shared';
import { config } from '../config/env.js';

const googleTranslateUrl = 'https://translation.googleapis.com/language/translate/v2';
const dictionaryUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export async function lookupReaderText(rawText: unknown): Promise<ReaderTextLookup> {
  const text = normalizeLookupText(rawText);
  if (!text) throw new Error('Select an English word or phrase first.');
  if (text.length > 500) throw new Error('Select no more than 500 characters.');
  if (!config.googleTranslateApiKey) {
    return {
      text,
      translation: '',
      translationError: 'Translation is unavailable because Google Cloud Translation is not configured on the server.',
      sourceLanguage: 'en',
      targetLanguage: 'ru',
    };
  }

  const response = await fetch(`${googleTranslateUrl}?key=${encodeURIComponent(config.googleTranslateApiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ q: text, source: 'en', target: 'ru', format: 'text' }),
  });
  if (!response.ok) throw new Error('Google translation request failed.');
  const body = await response.json() as { data?: { translations?: Array<{ translatedText?: string }> } };
  const translation = decodeHtml(body.data?.translations?.[0]?.translatedText ?? '').trim();
  if (!translation) throw new Error('Google returned an empty translation.');

  return {
    text,
    translation,
    sourceLanguage: 'en',
    targetLanguage: 'ru',
  };
}

export async function lookupReaderPhonetic(rawText: unknown): Promise<{ text: string; phonetic?: string }> {
  const text = normalizeLookupText(rawText);
  if (!text || !isSingleWord(text)) return { text };
  return { text, phonetic: await lookupPhonetic(text) };
}

export function normalizeLookupText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function isSingleWord(text: string) {
  return /^[\p{L}]+(?:[-'’][\p{L}]+)*$/u.test(text);
}

async function lookupPhonetic(word: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${dictionaryUrl}/${encodeURIComponent(word.toLowerCase())}`, {
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return undefined;
    const entries = await response.json() as Array<{ phonetic?: string; phonetics?: Array<{ text?: string }> }>;
    return entries[0]?.phonetic || entries[0]?.phonetics?.find((item) => item.text)?.text || undefined;
  } catch {
    return undefined;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

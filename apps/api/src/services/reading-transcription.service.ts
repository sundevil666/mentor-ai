import { config } from '../config/env.js';

const cloudflareModel = '@cf/openai/whisper-large-v3-turbo';
const maximumAudioBytes = 1_500_000;
const maximumPromptCharacters = 2_000;

type CloudflareCredentials = { accountId?: string; apiToken?: string };

export function isCloudReadingTranscriptionConfigured(credentials = configuredCredentials()): boolean {
  return Boolean(credentials.accountId?.trim() && credentials.apiToken?.trim());
}

export async function transcribeReadingAudio(
  rawAudioBase64: unknown,
  rawPrompt: unknown,
  credentials = configuredCredentials(),
): Promise<{ text: string }> {
  if (!isCloudReadingTranscriptionConfigured(credentials)) {
    throw serviceError(503, 'Online reading transcription is not configured.');
  }
  const audioBase64 = typeof rawAudioBase64 === 'string' ? rawAudioBase64.trim() : '';
  if (!audioBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64)) {
    throw serviceError(400, 'A valid base64 audio fragment is required.');
  }
  const audio = Buffer.from(audioBase64, 'base64');
  if (!audio.length || audio.length > maximumAudioBytes) {
    throw serviceError(413, 'The audio fragment is empty or too large.');
  }
  const initialPrompt = typeof rawPrompt === 'string'
    ? rawPrompt.replace(/\s+/g, ' ').trim().slice(0, maximumPromptCharacters)
    : '';
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(credentials.accountId!)}/ai/run/${cloudflareModel}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: Array.from(audio),
        language: 'en',
        task: 'transcribe',
        vad_filter: true,
        ...(initialPrompt ? { initial_prompt: initialPrompt } : {}),
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!response.ok) throw serviceError(response.status === 429 ? 429 : 502, 'Cloudflare speech recognition is temporarily unavailable.');
  const body = await response.json() as { success?: boolean; result?: { text?: string } };
  if (body.success === false) throw serviceError(502, 'Cloudflare speech recognition failed.');
  return { text: body.result?.text?.replace(/\s+/g, ' ').trim() ?? '' };
}

function configuredCredentials(): CloudflareCredentials {
  return { accountId: config.cloudflareAccountId, apiToken: config.cloudflareApiToken };
}

function serviceError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

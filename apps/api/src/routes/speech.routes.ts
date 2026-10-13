import { Router } from 'express';
import { config } from '../config/env.js';

type SpeechVoice = 'mia' | 'tom';

interface SpeechSegment {
  text: string;
  voice: SpeechVoice;
}

const voices: Record<SpeechVoice, 'coral' | 'echo'> = {
  mia: 'coral',
  tom: 'echo',
};
const maxTextLength = 4_000;
const speechRequestTimeoutMs = 30_000;

export const speechRouter = Router();

speechRouter.post('/', async (request, response) => {
  const segments = normalizeSpeechSegments(request.body?.segments);
  const textLength = segments.reduce((length, segment) => length + segment.text.length, 0);

  if (!segments.length || segments.some((segment) => !segment.text) || textLength > maxTextLength) {
    response.status(400).send('Text must contain between 1 and 4000 characters.');
    return;
  }

  try {
    const audio = await synthesizeSpeechSegments(segments);

    response.status(200);
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', String(audio.length));
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.end(audio);
  } catch (error) {
    console.error(error);
    response.status(502).send('Speech synthesis failed.');
  }
});

export async function synthesizeSpeechSegments(
  segments: SpeechSegment[],
  request: typeof fetch = fetch,
): Promise<Buffer> {
  if (!config.openAiApiKey) throw new Error('Speech synthesis is not configured on the server.');
  const audioParts: Buffer[] = [];
  for (const segment of segments) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), speechRequestTimeoutMs);
    try {
      const response = await request('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice: voices[segment.voice],
          input: segment.text,
          instructions: 'Speak clear, natural American English at a calm learning pace.',
          response_format: 'mp3',
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Speech provider request failed with HTTP ${response.status}.`);
      const audio = Buffer.from(await response.arrayBuffer());
      if (!audio.length) throw new Error('Speech synthesis returned no audio.');
      audioParts.push(audio);
    } finally {
      clearTimeout(timeout);
    }
  }
  return Buffer.concat(audioParts);
}

export function normalizeSpeechSegments(value: unknown): SpeechSegment[] {
  if (!Array.isArray(value)) return [];

  return value.map((segment: unknown) => {
    const candidate = segment as { text?: unknown; voice?: unknown };
    return {
      text: typeof candidate?.text === 'string' ? candidate.text.trim() : '',
      voice: candidate?.voice === 'tom' ? 'tom' : 'mia',
    };
  });
}

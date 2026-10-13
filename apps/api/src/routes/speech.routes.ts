import { Router } from 'express';

type SpeechVoice = 'mia' | 'tom';

interface SpeechChunk {
  type: string;
  data?: Uint8Array;
}

interface SpeechSegment {
  text: string;
  voice: SpeechVoice;
}

const voices: Record<SpeechVoice, string> = {
  mia: 'en-US-AvaMultilingualNeural',
  tom: 'en-US-AndrewMultilingualNeural',
};
const maxTextLength = 4_000;
const speechConnectionTimeoutMs = 20_000;

export const speechRouter = Router();

speechRouter.post('/', async (request, response) => {
  const segments = normalizeSpeechSegments(request.body?.segments);
  const textLength = segments.reduce((length, segment) => length + segment.text.length, 0);

  if (!segments.length || segments.some((segment) => !segment.text) || textLength > maxTextLength) {
    response.status(400).send('Text must contain between 1 and 4000 characters.');
    return;
  }

  try {
    const { Communicate } = await import('edge-tts-universal');
    const audioParts: Buffer[] = [];
    for (const segment of segments) {
      const speech = new Communicate(segment.text, {
        voice: voices[segment.voice],
        connectionTimeout: speechConnectionTimeoutMs,
      });
      audioParts.push(await collectSpeechAudio(speech.stream()));
    }
    const audio = Buffer.concat(audioParts);

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

export async function collectSpeechAudio(chunks: AsyncIterable<SpeechChunk>): Promise<Buffer> {
  const audioParts: Buffer[] = [];
  for await (const chunk of chunks) {
    if (chunk.type === 'audio' && chunk.data?.length) {
      audioParts.push(Buffer.from(chunk.data));
    }
  }
  if (audioParts.length === 0) throw new Error('Speech synthesis returned no audio.');
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

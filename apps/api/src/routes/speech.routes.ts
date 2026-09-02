import { Router } from 'express';

type SpeechVoice = 'mia' | 'tom';

interface SpeechSegment {
  text: string;
  voice: SpeechVoice;
}

const voices: Record<SpeechVoice, string> = {
  mia: 'en-US-AvaMultilingualNeural',
  tom: 'en-US-AndrewMultilingualNeural',
};
const maxTextLength = 4_000;

export const speechRouter = Router();

speechRouter.post('/', async (request, response) => {
  const segments = normalizeSpeechSegments(request.body?.segments);
  const textLength = segments.reduce((length, segment) => length + segment.text.length, 0);

  if (!segments.length || segments.some((segment) => !segment.text) || textLength > maxTextLength) {
    response.status(400).send('Text must contain between 1 and 4000 characters.');
    return;
  }

  try {
    const { EdgeTTS } = await import('edge-tts-universal');
    const audioParts = await Promise.all(
      segments.map(async (segment) => {
        const result = await new EdgeTTS(segment.text, voices[segment.voice]).synthesize();
        return Buffer.from(await result.audio.arrayBuffer());
      }),
    );
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

const { readJsonBody } = require('./_shared');

const voices = {
  mia: 'en-US-AvaMultilingualNeural',
  tom: 'en-US-AndrewMultilingualNeural',
};
const maxTextLength = 4_000;

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.statusCode = 405;
    response.end('Method not allowed');
    return;
  }

  try {
    const body = await readJsonBody(request);
    const segments = Array.isArray(body.segments)
      ? body.segments.map((segment) => ({
          text: typeof segment?.text === 'string' ? segment.text.trim() : '',
          voice: segment?.voice === 'tom' ? 'tom' : 'mia',
        }))
      : [];
    const textLength = segments.reduce((length, segment) => length + segment.text.length, 0);

    if (!segments.length || segments.some((segment) => !segment.text) || textLength > maxTextLength) {
      response.statusCode = 400;
      response.end('Text must contain between 1 and 4000 characters.');
      return;
    }

    const { EdgeTTS } = await import('edge-tts-universal');
    const audioParts = await Promise.all(
      segments.map(async (segment) => {
        const result = await new EdgeTTS(segment.text, voices[segment.voice]).synthesize();
        return Buffer.from(await result.audio.arrayBuffer());
      }),
    );
    const audio = Buffer.concat(audioParts);

    response.statusCode = 200;
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', String(audio.length));
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.end(audio);
  } catch (error) {
    console.error(error);
    response.statusCode = 502;
    response.end('Speech synthesis failed.');
  }
};

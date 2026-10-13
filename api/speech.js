const { readJsonBody } = require('./_shared');

const voices = {
  mia: 'coral',
  tom: 'echo',
};
const maxTextLength = 4_000;
const speechRequestTimeoutMs = 30_000;

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

    if (!process.env.OPENAI_API_KEY) throw new Error('Speech synthesis is not configured.');
    const audioParts = [];
    for (const segment of segments) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), speechRequestTimeoutMs);
      try {
        const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
        if (!speechResponse.ok) {
          throw new Error(`Speech provider request failed with HTTP ${speechResponse.status}.`);
        }
        const audio = Buffer.from(await speechResponse.arrayBuffer());
        if (!audio.length) throw new Error('Speech synthesis returned no audio.');
        audioParts.push(audio);
      } finally {
        clearTimeout(timeout);
      }
    }
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

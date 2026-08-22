const { readJsonBody } = require('./_shared');

const voice = 'en-US-AvaMultilingualNeural';
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
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text || text.length > maxTextLength) {
      response.statusCode = 400;
      response.end('Text must contain between 1 and 4000 characters.');
      return;
    }

    const { EdgeTTS } = await import('edge-tts-universal');
    const result = await new EdgeTTS(text, voice).synthesize();
    const audio = Buffer.from(await result.audio.arrayBuffer());

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

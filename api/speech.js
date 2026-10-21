const { readJsonBody, requireLearningIdentity } = require('./_shared');
const https = require('node:https');

const voices = {
  mia: 'coral',
  tom: 'echo',
};
const maxTextLength = 4_000;
const speechRequestTimeoutMs = 20_000;
const speechRequestAttempts = 2;

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.statusCode = 405;
    response.end('Method not allowed');
    return;
  }

  try {
    if (requireLearningIdentity(request, response) === null) return;
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
      audioParts.push(await requestSpeechAudioWithRetry(segment));
    }
    const audio = Buffer.concat(audioParts);

    response.statusCode = 200;
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', String(audio.length));
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.end(audio);
  } catch (error) {
    console.error(error);
    response.statusCode = error.statusCode === 429 ? 429 : 502;
    if (response.statusCode === 429) response.setHeader('Retry-After', '60');
    response.end('Speech synthesis failed.');
  }
};

async function requestSpeechAudioWithRetry(segment) {
  let lastError;
  for (let attempt = 0; attempt < speechRequestAttempts; attempt += 1) {
    try {
      return await requestSpeechAudio(segment);
    } catch (error) {
      if (error.retryable === false) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function requestSpeechAudio(segment) {
  const payload = Buffer.from(JSON.stringify({
    model: 'gpt-4o-mini-tts',
    voice: voices[segment.voice],
    input: segment.text,
    instructions: 'Speak clear, natural American English at a calm learning pace.',
    response_format: 'mp3',
  }));

  return new Promise((resolve, reject) => {
    const speechRequest = https.request({
      hostname: 'api.openai.com',
      path: '/v1/audio/speech',
      method: 'POST',
      timeout: speechRequestTimeoutMs,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
      },
    }, (speechResponse) => {
      const chunks = [];
      speechResponse.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      speechResponse.on('end', () => {
        const audio = Buffer.concat(chunks);
        if (speechResponse.statusCode !== 200) {
          const error = new Error(`Speech provider request failed with HTTP ${speechResponse.statusCode}.`);
          error.statusCode = speechResponse.statusCode;
          error.retryable = speechResponse.statusCode >= 500;
          reject(error);
          return;
        }
        if (!audio.length) {
          reject(new Error('Speech synthesis returned no audio.'));
          return;
        }
        resolve(audio);
      });
    });
    speechRequest.on('timeout', () => speechRequest.destroy(new Error('Speech provider request timed out.')));
    speechRequest.on('error', reject);
    speechRequest.end(payload);
  });
}

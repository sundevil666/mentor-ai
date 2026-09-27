import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { boundedHistory, createMovieChatReply, movieCoachInstructions } from '../dist/services/movie-chat.service.js';
import { config } from '../dist/config/env.js';

describe('movie chat service', () => {
  it('keeps a bounded recent conversation context', () => {
    const messages = Array.from({ length: 24 }, (_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      content: `message-${index}`,
    }));
    const history = boundedHistory(messages);
    assert.equal(history.length, 20);
    assert.equal(history[0].content, 'message-4');
    assert.equal(history.at(-1).content, 'message-23');
  });

  it('sends the prompt and transcript without server-side response storage', async () => {
    const previousKey = config.openAiApiKey;
    config.openAiApiKey = 'test-key';
    let requestBody;
    try {
      const result = await createMovieChatReply([{ role: 'user', content: 'Recommend a film.' }], async (_url, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Try Arrival.' }] }] }), { status: 200 });
      });
      assert.equal(result.reply, 'Try Arrival.');
      assert.equal(requestBody.instructions, movieCoachInstructions);
      assert.equal(requestBody.store, false);
      assert.equal(requestBody.input[0].content, 'Recommend a film.');
    } finally {
      config.openAiApiKey = previousKey;
    }
  });

  it('publishes the movie chat through the Vercel serverless endpoint', () => {
    const serverlessRoute = readFileSync(new URL('../../../api/movie-chat.js', import.meta.url), 'utf8');

    assert.match(serverlessRoute, /createMovieChatReply\(messages\)/);
    assert.match(serverlessRoute, /request\.method !== 'POST'/);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { boundedHistory, createMovieChatReply } from '../dist/services/movie-chat.service.js';
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
      const result = await createMovieChatReply([{ role: 'user', content: 'Recommend a film.' }], 'Always coach through questions.', 'Learner watched Arrival.', async (_url, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Try Arrival.' }] }] }), { status: 200 });
      });
      assert.equal(result.reply, 'Try Arrival.');
      assert.equal(requestBody.instructions, 'Always coach through questions.');
      assert.equal(requestBody.store, false);
      assert.deepEqual(requestBody.reasoning, { effort: 'low' });
      assert.deepEqual(requestBody.input, [
        { role: 'user', content: 'Starting context for this conversation:\nLearner watched Arrival.' },
        { role: 'user', content: 'Recommend a film.' },
      ]);
    } finally {
      config.openAiApiKey = previousKey;
    }
  });

  it('retries once when the model returns no visible answer', async () => {
    const previousKey = config.openAiApiKey;
    config.openAiApiKey = 'test-key';
    const requestBodies = [];
    try {
      const result = await createMovieChatReply([{ role: 'user', content: 'Explain this scene.' }], '', '', async (_url, init) => {
        requestBodies.push(JSON.parse(String(init?.body)));
        if (requestBodies.length === 1) {
          return new Response(JSON.stringify({
            status: 'incomplete',
            incomplete_details: { reason: 'max_output_tokens' },
            output: [{ type: 'reasoning' }],
          }), { status: 200 });
        }
        return new Response(JSON.stringify({
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'output_text', text: 'Here is the answer.' }] }],
        }), { status: 200 });
      });

      assert.equal(result.reply, 'Here is the answer.');
      assert.equal(requestBodies.length, 2);
      assert.equal(requestBodies[0].max_output_tokens, 1_200);
      assert.equal(requestBodies[1].max_output_tokens, 2_400);
    } finally {
      config.openAiApiKey = previousKey;
    }
  });

  it('publishes the movie chat through the Vercel serverless endpoint', () => {
    const serverlessRoute = readFileSync(new URL('../../../api/synchronization.js', import.meta.url), 'utf8');
    const vercelConfiguration = readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8');

    assert.match(serverlessRoute, /typeof body\?\.prompt === 'string'/);
    assert.match(serverlessRoute, /typeof body\?\.memory === 'string'/);
    assert.match(serverlessRoute, /action === 'movie-chat'/);
    assert.match(vercelConfiguration, /\/api\/movie-chat/);
    assert.match(vercelConfiguration, /\/api\/synchronization\?action=movie-chat/);
  });
});

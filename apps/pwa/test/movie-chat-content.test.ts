import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseMovieChatContent } from '../src/services/movie-chat-content.js';

describe('movie chat content', () => {
  it('separates fenced blocks from surrounding chat text', () => {
    assert.deepEqual(parseMovieChatContent('Copy this:\n```text\nA useful report\n```\nDone.'), [
      { type: 'text', content: 'Copy this:\n' },
      { type: 'code', language: 'text', content: 'A useful report' },
      { type: 'text', content: '\nDone.' },
    ]);
  });

  it('supports an unlabeled fenced block', () => {
    assert.deepEqual(parseMovieChatContent('```\nOne-click content\n```'), [
      { type: 'code', language: '', content: 'One-click content' },
    ]);
  });

  it('keeps an unfinished fence visible as ordinary text', () => {
    assert.deepEqual(parseMovieChatContent('```text\nStill being written'), [
      { type: 'text', content: '```text\nStill being written' },
    ]);
  });
});

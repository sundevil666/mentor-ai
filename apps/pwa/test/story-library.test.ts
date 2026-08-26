import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { storyLibrary } from '../src/services/story-library.js';

describe('audio story library', () => {
  it('contains only focused 30–40 minute listening parts', () => {
    assert.equal(storyLibrary.length, 4);
    for (const story of storyLibrary) {
      assert.ok(story.durationSeconds >= 30 * 60, `${story.title} is shorter than 30 minutes`);
      assert.ok(story.durationSeconds <= 40 * 60, `${story.title} is longer than 40 minutes`);
      assert.match(story.sourceUrl, /^\/audio-stories\/.+\.mp3$/);
    }
  });

  it('keeps the long Mark Twain story split into ordered parts', () => {
    const storyParts = storyLibrary.filter((story) => story.id.startsWith('the-30000-bequest-part-'));
    assert.deepEqual(storyParts.map((story) => story.title), [
      'The $30,000 Bequest · Part 1 of 2',
      'The $30,000 Bequest · Part 2 of 2',
    ]);
  });
});

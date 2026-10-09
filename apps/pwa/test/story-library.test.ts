import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { storyLibrary } from '../src/services/story-library.js';

describe('audio story library', () => {
  it('keeps standalone stories as focused 30–40 minute listening parts', () => {
    const standaloneStories = storyLibrary.filter((story) => !story.id.startsWith('peter-pan-chapter-'));
    assert.equal(standaloneStories.length, 4);
    for (const story of standaloneStories) {
      assert.ok(story.durationSeconds >= 30 * 60, `${story.title} is shorter than 30 minutes`);
      assert.ok(story.durationSeconds <= 40 * 60, `${story.title} is longer than 40 minutes`);
      assert.match(story.sourceUrl, /^https:\/\/archive\.org\/download\/.+_64kb\.mp3$/);
    }
  });

  it('keeps immutable catalog sizes aligned with the external recordings', () => {
    const standaloneStories = storyLibrary.filter((story) => !story.id.startsWith('peter-pan-chapter-'));
    assert.deepEqual(standaloneStories.map((story) => story.sizeBytes), [
      16_854_050,
      17_180_082,
      17_101_287,
      17_900_842,
    ]);
  });

  it('keeps the long Mark Twain story split into ordered parts', () => {
    const storyParts = storyLibrary.filter((story) => story.id.startsWith('the-30000-bequest-part-'));
    assert.deepEqual(storyParts.map((story) => story.title), [
      'The $30,000 Bequest · Part 1 of 2',
      'The $30,000 Bequest · Part 2 of 2',
    ]);
  });

  it('keeps the complete Peter Pan audiobook in chapter order', () => {
    const chapters = storyLibrary.filter((story) => story.id.startsWith('peter-pan-chapter-'));
    assert.equal(chapters.length, 17);
    assert.deepEqual(chapters.map((chapter) => chapter.title), [
      'Peter Pan · 01/17 · Peter Breaks Through',
      'Peter Pan · 02/17 · The Shadow',
      'Peter Pan · 03/17 · Come Away, Come Away!',
      'Peter Pan · 04/17 · The Flight',
      'Peter Pan · 05/17 · The Island Come True',
      'Peter Pan · 06/17 · The Little House',
      'Peter Pan · 07/17 · The Home Underground',
      'Peter Pan · 08/17 · The Mermaids’ Lagoon',
      'Peter Pan · 09/17 · The Never Bird',
      'Peter Pan · 10/17 · The Happy Home',
      'Peter Pan · 11/17 · Wendy’s Story',
      'Peter Pan · 12/17 · The Children Are Carried Off',
      'Peter Pan · 13/17 · Do You Believe in Fairies?',
      'Peter Pan · 14/17 · The Pirate Ship',
      'Peter Pan · 15/17 · Hook or Me This Time',
      'Peter Pan · 16/17 · The Return Home',
      'Peter Pan · 17/17 · When Wendy Grew Up',
    ]);
    assert.ok(chapters.every((chapter) => chapter.reader === 'Phil Chenevert'));
    assert.ok(chapters.every((chapter) => chapter.durationSeconds >= 7 * 60));
    assert.ok(chapters.every((chapter) => chapter.durationSeconds <= 30 * 60));
    assert.ok(chapters.every((chapter) => /^https:\/\/archive\.org\/download\/.+_64kb\.mp3$/.test(chapter.sourceUrl)));
  });
});

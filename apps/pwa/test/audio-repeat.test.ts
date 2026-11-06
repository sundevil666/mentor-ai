import assert from 'node:assert/strict';
import { it } from 'node:test';
import { replayCompletedAudio } from '../src/services/audio-repeat.js';

it('restarts each completed cycle from zero even at a changed playback speed', async () => {
  const positions: number[] = [];
  const player = {
    currentTime: 300,
    playbackRate: 1.5,
    async play() { positions.push(this.currentTime); },
  };
  for (let cycle = 0; cycle < 4; cycle++) {
    player.currentTime = 300;
    await replayCompletedAudio(player);
  }
  assert.deepEqual(positions, [0, 0, 0, 0]);
  assert.equal(player.playbackRate, 1.5);
});

it('exposes replay failures so the player can offer manual playback', async () => {
  await assert.rejects(replayCompletedAudio({
    currentTime: 300,
    play: () => Promise.reject(new Error('Playback blocked')),
  }), /Playback blocked/);
});

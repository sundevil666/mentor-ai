import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCachedMediaResponse } from '../src/services/media-range-response.js';

describe('cached media responses', () => {
  it('returns the complete cached response without a range request', async () => {
    const cached = new Response('complete audio', { status: 200 });

    const response = await createCachedMediaResponse(new Request('https://example.com/audio.mp3'), cached);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'complete audio');
  });

  it('serves byte ranges required by Safari media playback', async () => {
    const cached = new Response('0123456789', {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
    const request = new Request('https://example.com/audio.mp3', {
      headers: { Range: 'bytes=2-5' },
    });

    const response = await createCachedMediaResponse(request, cached);

    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), 'bytes 2-5/10');
    assert.equal(response.headers.get('Content-Length'), '4');
    assert.equal(response.headers.get('Content-Type'), 'audio/mpeg');
    assert.equal(await response.text(), '2345');
  });

  it('rejects ranges outside the cached media body', async () => {
    const request = new Request('https://example.com/audio.mp3', {
      headers: { Range: 'bytes=20-' },
    });

    const response = await createCachedMediaResponse(request, new Response('short'));

    assert.equal(response.status, 416);
    assert.equal(response.headers.get('Content-Range'), 'bytes */5');
  });
  it('slices a Blob without requesting a recording-sized ArrayBuffer', async () => {
    const cached = new Response('0123456789');
    cached.arrayBuffer = async () => { throw new Error('Full JS heap copy'); };
    const response = await createCachedMediaResponse(new Request('https://example.com/audio.mp3', {
      headers: { Range: 'bytes=0-1' },
    }), cached);
    assert.equal(await response.text(), '01');
  });

  for (const [range, expected] of [['bytes=-3', '789'], ['bytes=7-', '789'], ['bytes=8-99', '89'], ['bytes=-99', '0123456789']]) {
    it(`serves ${range}`, async () => {
      const response = await createCachedMediaResponse(new Request('https://example.com/audio.mp3', {
        headers: { Range: range! },
      }), new Response('0123456789'));
      assert.equal(response.status, 206);
      assert.equal(await response.text(), expected);
    });
  }

  for (const range of ['bytes=-0', 'bytes=-', 'bytes=5-2', 'bytes=9007199254740992-']) {
    it(`rejects invalid range ${range}`, async () => {
      const response = await createCachedMediaResponse(new Request('https://example.com/audio.mp3', {
        headers: { Range: range },
      }), new Response('0123456789'));
      assert.equal(response.status, 416);
    });
  }

});

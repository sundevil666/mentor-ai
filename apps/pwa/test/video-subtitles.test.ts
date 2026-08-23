import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWebVtt } from '../src/services/video-subtitles.js';

describe('video subtitles', () => {
  it('parses ready-made WebVTT cues with timestamps and multiline text', () => {
    const cues = parseWebVtt(`WEBVTT

1
00:00:00.500 --> 00:00:02.000
Hello from
the first cue.

2
00:00:02.000 --> 00:00:04.250
This is the second cue.
`);

    assert.deepEqual(cues, [
      { id: '1', start: 0.5, end: 2, text: 'Hello from the first cue.' },
      { id: '2', start: 2, end: 4.25, text: 'This is the second cue.' },
    ]);
  });

  it('ignores malformed cues instead of displaying unsynchronized text', () => {
    const cues = parseWebVtt(`WEBVTT

1
00:00:03.000 --> 00:00:02.000
Invalid range

2
not a timing line
No timestamp
`);

    assert.deepEqual(cues, []);
  });
});

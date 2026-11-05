import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localReadingChunkDurationMs, normalizeReadingAudio, resampleReadingAudio, startLocalReadingTranscriber } from '../src/services/local-reading-transcriber.js';

describe('continuous local reading audio preparation', () => {
  it('uses short PCM batches without restarting capture', () => {
    assert.equal(localReadingChunkDurationMs, 1_200);
  });

  it('resamples tablet audio to the 16 kHz expected by Whisper', () => {
    const input = Float32Array.from({ length: 48_000 }, (_, index) => Math.sin(index / 20));
    const output = resampleReadingAudio(input, 48_000, 16_000);
    assert.equal(output.length, 16_000);
  });

  it('rejects silence before it reaches Whisper', () => {
    assert.equal(normalizeReadingAudio(new Float32Array(16_000)).usable, false);
  });

  it('keeps audible PCM and normalizes a quiet voice', () => {
    const input = Float32Array.from({ length: 16_000 }, (_, index) => Math.sin(index / 20) * 0.02);
    const result = normalizeReadingAudio(input);
    assert.equal(result.usable, true);
    assert.ok(result.gain > 1);
  });
});

describe('whole spoken answer recording', () => {
  it('keeps every audio fragment until Finish and waits for its final transcript', async () => {
    const original = { Worker: globalThis.Worker, window: globalThis.window, AudioContext: globalThis.AudioContext, AudioWorkletNode: globalThis.AudioWorkletNode };
    const requests: Array<{ id?: number; audio?: Float32Array; type?: string }> = [];
    let worker: FakeWorker;
    let processor: FakeProcessor;
    let intervals = 0;
    let completed = 0;
    const transcripts: string[] = [];
    class FakeWorker {
      onmessage: ((event: { data: Record<string, unknown> }) => void) | null = null;
      constructor() { worker = this; }
      postMessage(message: { id?: number; audio?: Float32Array; type?: string }) {
        requests.push(message);
        if (message.type === 'init') queueMicrotask(() => this.onmessage?.({ data: { type: 'ready' } }));
      }
      terminate() {}
    }
    class FakeNode { connect() { return this; } disconnect() {} }
    class FakeProcessor extends FakeNode {
      port = { onmessage: null as ((event: { data: Float32Array }) => void) | null };
      constructor() { super(); processor = this; }
    }
    class FakeContext {
      sampleRate = 16_000;
      state = 'running';
      audioWorklet = { addModule: async () => undefined };
      destination = new FakeNode();
      createMediaStreamSource() { return new FakeNode(); }
      createGain() { return Object.assign(new FakeNode(), { gain: { value: 1 } }); }
      async close() {}
    }
    Object.assign(globalThis, { Worker: FakeWorker, AudioContext: FakeContext, AudioWorkletNode: FakeProcessor,
      window: { setInterval: () => { intervals++; return 1; }, clearInterval: () => undefined } });
    try {
      const recorder = startLocalReadingTranscriber({ active: true } as MediaStream, {
        wholeUtterance: true,
        onTranscript: text => transcripts.push(text),
        onFinished: () => { completed++; },
        onReady: () => undefined, onProgress: () => undefined,
        onError: message => assert.fail(message),
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      // A sentence spans multiple input messages with a pause in between.
      processor!.port.onmessage!({ data: new Float32Array(16_000).fill(0.03) });
      processor!.port.onmessage!({ data: new Float32Array(16_000) });
      processor!.port.onmessage!({ data: new Float32Array(16_000).fill(0.04) });
      assert.equal(intervals, 0);
      assert.equal(requests.filter(r => r.audio).length, 0);
      recorder.finish();
      const sent = requests.filter(r => r.audio);
      assert.equal(sent.length, 1);
      assert.equal(sent[0]!.audio!.length, 48_000);
      assert.equal(completed, 0);
      worker!.onmessage!({ data: { type: 'result', id: sent[0]!.id, text: 'We were at home yesterday.' } });
      assert.deepEqual(transcripts, ['We were at home yesterday.']);
      assert.equal(completed, 1);
      recorder.stop();
    } finally { Object.assign(globalThis, original); }
  });
});

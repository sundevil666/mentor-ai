import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { runInNewContext } from 'node:vm';

describe('Sherpa reader worker lifecycle', () => {
  it('stops decoding during translation and starts a fresh stream afterward', () => {
    const received: string[] = [];
    let created = 0;
    let freed = 0;
    const scope: {
      Module?: { onRuntimeInitialized: () => void };
      onmessage?: (event: { data: { type: string; sessionId: number; audio?: Float32Array } }) => void;
      postMessage: (message: { type: string; text?: string }) => void;
    } = { postMessage(message) { received.push(message.type); } };
    const recognizer = {
      createStream() { created += 1; return { acceptWaveform() { received.push('audio'); }, free() { freed += 1; } }; },
      isReady() { return false; },
      getResult() { return { text: '' }; },
      isEndpoint() { return false; },
      decode() {},
      reset() {},
    };
    const script = readFileSync('public/sherpa-reader-worker.js', 'utf8');
    runInNewContext(script, { self: scope, importScripts() {}, createOnlineRecognizer() { return recognizer; } });
    scope.Module?.onRuntimeInitialized();
    const send = (type: string) => scope.onmessage?.({ data: { type, sessionId: 7, audio: new Float32Array([0.1]) } });
    send('start');
    send('audio');
    send('pause');
    send('audio');
    send('resume');
    send('audio');
    send('reset');
    send('audio');
    assert.equal(received.filter((type) => type === 'audio').length, 3);
    assert.equal(created, 3);
    assert.equal(freed, 2);
  });
});

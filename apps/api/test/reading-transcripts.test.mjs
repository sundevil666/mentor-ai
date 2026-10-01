import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { sanitizeReadingTranscript } from '../dist/services/reading-transcripts.service.js';

describe('reading transcript storage', () => {
  it('normalizes device text and binds it to the authenticated student', () => {
    const saved = sanitizeReadingTranscript({
      id: 'reading-transcript-1', studentId: 'student-1', bookId: 'book-1', pageIndex: 2,
      text: '  I   am reading. ', capturedAt: '2026-08-29T12:00:00.000Z', recognitionEngine: 'sherpa-onnx',
    }, 'student-1');
    assert.equal(saved?.text, 'I am reading.');
    assert.equal(saved?.recognitionEngine, 'sherpa-onnx');
  });

  it('rejects a transcript claiming another student identity', () => {
    const saved = sanitizeReadingTranscript({
      id: 'reading-transcript-2', studentId: 'student-2', bookId: 'book-1', pageIndex: 2,
      text: 'I am reading.', capturedAt: '2026-08-29T12:00:00.000Z', recognitionEngine: 'device-whisper',
    }, 'student-1');
    assert.equal(saved, undefined);
  });

  it('publishes transcript batches through the Vercel serverless endpoint', () => {
    const serverlessRoute = readFileSync(new URL('../../../api/synchronization.js', import.meta.url), 'utf8');
    const vercelConfiguration = readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8');

    assert.match(serverlessRoute, /const chunks = Array\.isArray\(body\?\.chunks\) \? body\.chunks : \[\]/);
    assert.match(serverlessRoute, /storeReadingTranscripts\(chunks, user\)/);
    assert.match(serverlessRoute, /action === 'reading-transcript'/);
    assert.match(vercelConfiguration, /\/api\/reader\/reading-transcripts/);
    assert.match(vercelConfiguration, /\/api\/synchronization\?action=reading-transcript/);
  });
});

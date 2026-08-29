import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeReadingTranscript } from '../dist/services/reading-transcripts.service.js';

describe('reading transcript storage', () => {
  it('normalizes device text and binds it to the authenticated student', () => {
    const saved = sanitizeReadingTranscript({
      id: 'reading-transcript-1', studentId: 'student-1', bookId: 'book-1', pageIndex: 2,
      text: '  I   am reading. ', capturedAt: '2026-08-29T12:00:00.000Z', recognitionEngine: 'device-whisper',
    }, 'student-1');
    assert.equal(saved?.text, 'I am reading.');
    assert.equal(saved?.recognitionEngine, 'device-whisper');
  });

  it('rejects a transcript claiming another student identity', () => {
    const saved = sanitizeReadingTranscript({
      id: 'reading-transcript-2', studentId: 'student-2', bookId: 'book-1', pageIndex: 2,
      text: 'I am reading.', capturedAt: '2026-08-29T12:00:00.000Z', recognitionEngine: 'device-whisper',
    }, 'student-1');
    assert.equal(saved, undefined);
  });
});

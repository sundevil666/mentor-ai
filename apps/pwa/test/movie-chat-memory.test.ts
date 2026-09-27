import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MovieLearningReport } from '@mentor-ai/shared';
import { buildMovieChatMemory } from '../src/services/movie-chat-memory.js';

describe('movie chat memory', () => {
  it('combines learner context with recent film reports in newest-first order', () => {
    const reports = [
      report('older', 'Arrival', '2026-09-20', 'Connected speech was difficult.'),
      report('newer', 'Dune', '2026-09-27', 'The quiet dialogue was hard to follow.'),
    ];
    const memory = buildMovieChatMemory('I prefer science fiction.', reports);

    assert.match(memory, /Learner notes:\nI prefer science fiction\./);
    assert.equal(memory.indexOf('Dune') < memory.indexOf('Arrival'), true);
    assert.match(memory, /quiet dialogue was hard to follow/);
  });

  it('keeps the shared context bounded', () => {
    const reports = Array.from({ length: 50 }, (_, index) =>
      report(String(index), `Film ${index}`, `2026-09-${String((index % 28) + 1).padStart(2, '0')}`, 'x'.repeat(900)),
    );

    assert.equal(buildMovieChatMemory('y'.repeat(5_000), reports).length <= 8_000, true);
  });
});

function report(id: string, movieTitle: string, watchedAt: string, text: string): MovieLearningReport {
  return {
    id,
    studentId: 'demo-student',
    movieTitle,
    watchedAt,
    report: text,
    sourceDeviceId: 'test-device',
    createdAt: `${watchedAt}T12:00:00.000Z`,
    updatedAt: `${watchedAt}T12:00:00.000Z`,
  };
}

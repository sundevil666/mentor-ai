import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/traffic_test';
const { getPostgresPool } = await import('../dist/repositories/postgres-client.js');
const { learningStateRepository } = await import('../dist/repositories/learning-state.repository.js');
const { learningStateService } = await import('../dist/services/learning-state.service.js');
const { listPersonalReadingBookVersions, synchronizePersonalReadingBooks } = await import('../dist/services/personal-reading-books.service.js');
const pool = getPostgresPool();
const user = { id: 'traffic-user', email: 'test@example.com', displayName: 'Test' };

describe('cloud traffic boundaries', () => {
  it('reads only requested state fields and never sends unrelated archives back in a patch', async () => {
    const calls = [];
    pool.query = async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('jsonb_object_agg')) return { rows: [{ state: { recommendations: [] } }] };
      return { rows: [], rowCount: 1 };
    };
    assert.deepEqual(await learningStateService.getRecommendations(user), []);
    const read = calls.find((call) => call.sql.includes('jsonb_object_agg'));
    assert.deepEqual(read.params[1], ['recommendations']);
    await learningStateRepository.writeFields({ recommendations: [] }, user, ['currentLesson']);
    const write = calls.at(-1);
    assert.deepEqual(JSON.parse(write.params[1]), { recommendations: [] });
    assert.deepEqual(write.params[2], ['currentLesson']);
    assert.match(write.sql, /state \|\|/);
  });

  it('exchanges book versions without reading book bodies and filters unchanged downloads in SQL', async () => {
    const calls = [];
    pool.query = async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('AS version')) return { rows: [{ book_id: 'book-1', version: '2026-10-21T12:00:00.000Z' }] };
      return { rows: [], rowCount: 0 };
    };
    const known = await listPersonalReadingBookVersions(user);
    assert.deepEqual(known, { 'book-1': '2026-10-21T12:00:00.000Z' });
    assert.equal(calls.some((call) => /SELECT archive\s/.test(call.sql)), false);
    assert.deepEqual(await synchronizePersonalReadingBooks([], user, known), []);
    const download = calls.at(-1);
    assert.match(download.sql, /IS DISTINCT FROM/);
    assert.deepEqual(JSON.parse(download.params[2]), known);
    assert.equal(calls.filter((call) => call.sql.includes('INSERT INTO')).length, 0);
  });
});

import assert from 'node:assert/strict';
import { it } from 'node:test';
import { config } from '../dist/config/env.js';
import { getPostgresPool } from '../dist/repositories/postgres-client.js';
import { privateLessonRepository } from '../dist/repositories/private-lesson.repository.js';

it('finds recently updated lessons without moving their original library date', async () => {
  const originalDatabaseUrl = config.databaseUrl;
  config.databaseUrl = 'postgres://localhost/catalog-date-test';
  const pool = getPostgresPool();
  const originalQuery = pool.query;
  const lesson = {
    id: 'catalog-date-example', title: 'Example lesson', concept: 'learning',
    exercises: [], localEvaluation: [], createdAt: '2026-01-10T12:00:00.000Z',
  };
  const since = new Date('2026-01-15T00:00:00.000Z');
  let catalogQuery;
  pool.query = async (sql, parameters) => {
    if (!sql.includes('SELECT lesson')) return { rows: [] };
    catalogQuery = { sql, parameters };
    return { rows: [{ lesson, changed_at: '2026-01-16T12:00:00.000Z' }] };
  };
  try {
    const lessons = await privateLessonRepository.findAddedSince(since);
    assert.deepEqual(lessons, [lesson]);
    assert.equal(lessons[0].createdAt, '2026-01-10T12:00:00.000Z');
    assert.match(catalogQuery.sql, /updated_at >= \$1/);
    assert.deepEqual(catalogQuery.parameters, [since.toISOString()]);
  } finally {
    pool.query = originalQuery;
    config.databaseUrl = originalDatabaseUrl;
    await pool.end();
  }
});

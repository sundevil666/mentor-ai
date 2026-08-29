import type { TranslationUsage } from '@mentor-ai/shared';
import { config } from '../config/env.js';
import { getPostgresPool } from '../repositories/postgres-client.js';

export const translationMonthlyLimit = 450_000;

export class TranslationLimitError extends Error {
  statusCode = 429;

  constructor() {
    super('The free Google translation limit has been reached. Translation will be available again next month.');
  }
}

export async function getTranslationUsage(now = new Date()): Promise<TranslationUsage> {
  const period = getUsagePeriod(now);
  const pool = getPostgresPool();
  let usedCharacters = 0;

  if (pool) {
    await ensureUsageTable();
    const result = await pool.query<{ used_characters: number | string }>(
      'SELECT used_characters FROM translation_usage WHERE period = $1',
      [period],
    );
    usedCharacters = Number(result.rows[0]?.used_characters ?? 0);
  }

  return createTranslationUsage(period, usedCharacters, Boolean(config.googleTranslateApiKey));
}

export async function reserveTranslationCharacters(characters: number, now = new Date()): Promise<TranslationUsage> {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error('Translation usage tracking is unavailable because DATABASE_URL is not configured.');
  }

  await ensureUsageTable();
  const period = getUsagePeriod(now);
  const result = await pool.query<{ used_characters: number | string }>(
    `INSERT INTO translation_usage (period, used_characters)
     VALUES ($1, $2)
     ON CONFLICT (period) DO UPDATE
       SET used_characters = translation_usage.used_characters + EXCLUDED.used_characters,
           updated_at = now()
       WHERE translation_usage.used_characters + EXCLUDED.used_characters <= $3
     RETURNING used_characters`,
    [period, characters, translationMonthlyLimit],
  );

  if (result.rowCount === 0) throw new TranslationLimitError();
  return createTranslationUsage(period, Number(result.rows[0].used_characters), true);
}

export async function releaseTranslationCharacters(characters: number, now = new Date()): Promise<void> {
  const pool = getPostgresPool();
  if (!pool) return;
  await pool.query(
    `UPDATE translation_usage
     SET used_characters = GREATEST(0, used_characters - $2), updated_at = now()
     WHERE period = $1`,
    [getUsagePeriod(now), characters],
  );
}

export function countTranslationCharacters(text: string): number {
  return Array.from(text).length;
}

export function createTranslationUsage(period: string, usedCharacters: number, configured: boolean): TranslationUsage {
  const safeUsed = Math.max(0, Math.floor(usedCharacters));
  return {
    period,
    usedCharacters: safeUsed,
    limitCharacters: translationMonthlyLimit,
    remainingCharacters: Math.max(0, translationMonthlyLimit - safeUsed),
    percentUsed: Math.min(100, Number(((safeUsed / translationMonthlyLimit) * 100).toFixed(2))),
    configured,
    exhausted: safeUsed >= translationMonthlyLimit,
  };
}

export function getUsagePeriod(now: Date): string {
  return now.toISOString().slice(0, 7);
}

let ensureTablePromise: Promise<void> | undefined;

function ensureUsageTable(): Promise<void> {
  ensureTablePromise ??= (async () => {
    const pool = getPostgresPool();
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS translation_usage (
        period TEXT PRIMARY KEY,
        used_characters INTEGER NOT NULL DEFAULT 0 CHECK (used_characters >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  })();
  return ensureTablePromise;
}

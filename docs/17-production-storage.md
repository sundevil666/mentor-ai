# Production Storage

Mentor AI currently runs as a Node.js Express API in `apps/api` and a Quasar/Vue PWA in `apps/pwa`.

The local API supports:

- `STORAGE_MODE=demo` for committed synthetic fixtures.
- `STORAGE_MODE=personal` for local private JSON state under `.ai/private/`.

Vercel production should not use filesystem persistence for real learning records. Serverless filesystem writes are ephemeral, and real lessons, lesson results, Teacher Memory, Teacher Journal, recommendations, progress analytics, history, and voice evidence must not pass through Git.

## Recommended Vercel Path

Use Postgres with a private `DATABASE_URL` environment variable:

- Neon Postgres is a good minimal option for Vercel.
- Vercel Postgres is also appropriate if available in the project.
- Supabase Postgres is fine if the project wants Supabase auth/storage later.

Keep `DATABASE_URL` only in Vercel environment variables and local `.env` files. Never commit it.

## API Boundary

The best backend location for durable writes is the existing learning-state flow:

- `apps/api/src/routes/learning-state.routes.ts`
- `apps/api/src/controllers/learning-state.controller.ts`
- `apps/api/src/services/learning-state.service.ts`
- `apps/api/src/repositories/learning-state.repository.ts`

Lesson results, speech results, accepted events, Teacher Journal, Teacher Memory, statistics, observations, recommendations, and generated lessons should be saved by repository implementations behind this boundary. The PWA should upload evidence to the backend; the backend should persist it directly to Postgres.

## Minimal Schema

Use `migrations/001_private_learning_state.sql` as the first production storage shape. It stores the current domain objects as JSONB so the teacher loop can evolve quickly while preserving private data in a durable database. Later migrations can normalize high-volume objects such as exercise results, speech evidence, and generated lessons.

## Local Privacy

Local personal mode defaults to `.ai/private/learning-state.json`. This is for private development only and is fully ignored by Git.

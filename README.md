# Mentor AI

Mentor AI is a personal AI English learning platform prepared as a production-ready npm monorepo. This bootstrap contains architecture, tooling, and storage boundaries only. Business logic is intentionally not implemented yet.

## Architecture

- `apps/pwa` - Quasar 2, Vue 3, TypeScript PWA with Pinia, Vue Router, IndexedDB utilities, and service worker configuration.
- `apps/api` - Node.js, Express, TypeScript REST API shell.
- `packages/shared` - shared TypeScript contracts used by frontend and backend.
- `docs` - architecture and operating notes.
- `storage` - local personal data directory ignored by Git except for `.gitkeep`.

## Run Frontend

```bash
npm install
npm run dev:pwa
```

The PWA runs with Quasar dev tooling. PWA mode and Workbox service worker generation are configured for production builds.

```bash
npm run build:pwa
```

## Run Backend

```bash
npm install
npm run dev:api
```

The API defaults to `http://localhost:4000` and exposes health, demo user, lesson, and statistics route placeholders.

```bash
npm run build:api
npm run start --workspace @mentor-ai/api
```

## Demo Mode

Set `STORAGE_MODE=demo` or leave the default from `.env.example`. Demo mode uses committed fake fixtures in `apps/api/src/data/demo` so the app can run safely without personal files.

## Personal Mode

Set `STORAGE_MODE=personal`. Real lessons, progress, statistics, AI notes, and speech recognition results belong under `storage/`.

The `storage/` directory is ignored by Git so personal data stays local. Only `storage/.gitkeep` is committed to preserve the folder after cloning.

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run format
```

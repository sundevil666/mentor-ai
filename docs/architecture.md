# Architecture

Mentor AI is split into app workspaces and shared packages.

## Workspaces

- `apps/pwa` contains the offline-first user experience.
- `apps/api` contains REST endpoints and data-access boundaries.
- `packages/shared` contains stable contracts shared across app boundaries.

## Storage Modes

`demo` mode reads committed fixture data for public examples.

`personal` mode reads and writes only inside `storage/`, which is ignored by Git.

## Future Boundaries

- Speech features should live under `apps/pwa/src/features/speech` and API speech services.
- Sync logic should live under `apps/pwa/src/features/sync` and API repositories.
- AI-generated lessons, audio, notes, and exports should use ignored output folders.

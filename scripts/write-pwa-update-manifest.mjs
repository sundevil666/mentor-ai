import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(rootDir, 'apps/pwa/public/app-update.json');
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));

const version = createBuildVersion(packageJson.version);
const releasedAt = new Date().toISOString();

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      version,
      releasedAt,
      notes: ['A new Mentor AI build is ready.'],
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote PWA update manifest ${version}`);

function createBuildVersion(packageVersion) {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? readGitCommitSha();
  const shortSha = commitSha ? commitSha.slice(0, 12) : 'local';

  return `${packageVersion}+${shortSha}`;
}

function readGitCommitSha() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

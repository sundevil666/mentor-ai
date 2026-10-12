import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(rootDir, 'apps/pwa/public/app-update.json');
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));

const version = createBuildVersion(packageJson.version);
const releasedAt = new Date().toISOString();
// Every PWA deployment replaces one shared application bundle. Restricting an
// update to the files changed by only the latest commit can strand clients when
// several production deployments happen before they accept the first update.
const affectedRoutes = ['*'];

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      version,
      releasedAt,
      notes: ['A new Mentor AI build is ready.'],
      affectedRoutes,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote PWA update manifest ${version}`);

function createBuildVersion(packageVersion) {
  // Prefer the commit that is actually checked out and being built. Vercel can
  // retain stale Git metadata when a deployment is promoted across branches.
  const commitSha = readGitCommitSha() ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
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

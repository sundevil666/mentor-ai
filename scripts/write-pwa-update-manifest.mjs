import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(rootDir, 'apps/pwa/public/app-update.json');
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));

const version = createBuildVersion(packageJson.version);
const releasedAt = new Date().toISOString();
const affectedRoutes = detectAffectedRoutes();

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
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? readGitCommitSha();
  const shortSha = commitSha ? commitSha.slice(0, 12) : 'local';

  return `${packageVersion}+${shortSha}`;
}

function detectAffectedRoutes() {
  const changedFiles = readChangedFiles();
  const pageRoutes = new Map([
    ['apps/pwa/src/pages/DashboardPage.vue', '/'],
    ['apps/pwa/src/pages/PatternsPage.vue', '/patterns'],
    ['apps/pwa/src/pages/AudioPage.vue', '/audio'],
    ['apps/pwa/src/pages/StoriesPage.vue', '/stories'],
    ['apps/pwa/src/pages/StoragePage.vue', '/storage'],
    ['apps/pwa/src/pages/StatisticsPage.vue', '/statistics'],
    ['apps/pwa/src/pages/SettingsPage.vue', '/settings'],
  ]);
  const pwaFiles = changedFiles.filter((file) => file.startsWith('apps/pwa/'));

  if (pwaFiles.length === 0) return [];
  if (pwaFiles.every((file) => pageRoutes.has(file))) {
    return [...new Set(pwaFiles.map((file) => pageRoutes.get(file)))];
  }
  return ['*'];
}

function readChangedFiles() {
  try {
    return execSync('git diff --name-only HEAD^ HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
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

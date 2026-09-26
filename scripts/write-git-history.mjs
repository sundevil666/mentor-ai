import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(rootDir, 'apps/pwa/public/git-history.json');
const repositoryUrl = readRepositoryUrl();
let commits = readCommits();

if (commits.length <= 1 && repositoryUrl?.startsWith('https://github.com/')) {
  commits = await readGitHubCommits(repositoryUrl).catch(() => commits);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), repositoryUrl, commits }, null, 2)}\n`);
console.log(`Wrote Git history with ${commits.length} commits`);

function runGit(args) {
  return execFileSync(process.env.GIT_EXECUTABLE || 'git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function readCommits() {
  try {
    const output = runGit([
      'log',
      '--max-count=300',
      '--date=iso-strict',
      '--pretty=format:%H%x1f%aI%x1f%s%x1e',
    ]);

    return output
      .split('\x1e')
      .map((record) => record.trim())
      .filter(Boolean)
      .map((record) => {
        const [hash, committedAt, ...subjectParts] = record.split('\x1f');
        return { hash, committedAt, subject: subjectParts.join('\x1f') };
      })
      .filter((commit) => commit.hash && commit.committedAt && commit.subject);
  } catch {
    const hash = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
    const subject = process.env.VERCEL_GIT_COMMIT_MESSAGE;
    return hash && subject
      ? [{ hash, committedAt: new Date().toISOString(), subject: subject.split('\n')[0] }]
      : [];
  }
}

function readRepositoryUrl() {
  try {
    return normalizeRepositoryUrl(runGit(['remote', 'get-url', 'origin']));
  } catch {
    const repository = process.env.GITHUB_REPOSITORY;
    return repository ? `https://github.com/${repository}` : null;
  }
}

function normalizeRepositoryUrl(value) {
  if (!value) return null;
  if (value.startsWith('git@github.com:')) return `https://github.com/${value.slice('git@github.com:'.length).replace(/\.git$/, '')}`;
  if (value.startsWith('https://github.com/')) return value.replace(/\.git$/, '');
  return null;
}

async function readGitHubCommits(url) {
  const repository = url.slice('https://github.com/'.length);
  const pages = await Promise.all([1, 2, 3].map(async (page) => {
    const response = await fetch(`https://api.github.com/repos/${repository}/commits?per_page=100&page=${page}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'mentor-ai-build' },
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    return response.json();
  }));

  return pages.flat().map((entry) => ({
    hash: entry.sha,
    committedAt: entry.commit.author?.date ?? entry.commit.committer?.date,
    subject: entry.commit.message.split('\n')[0],
  })).filter((commit) => commit.hash && commit.committedAt && commit.subject);
}

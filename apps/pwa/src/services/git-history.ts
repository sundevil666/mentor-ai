export interface GitHistoryCommit {
  hash: string;
  committedAt: string;
  subject: string;
}

export interface GitHistory {
  generatedAt: string;
  repositoryUrl: string | null;
  commits: GitHistoryCommit[];
}

export async function fetchGitHistory(): Promise<GitHistory> {
  const response = await fetch(new URL('git-history.json', document.baseURI), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Git history request failed with ${response.status}`);
  return parseGitHistory(await response.json());
}

export function parseGitHistory(value: unknown): GitHistory {
  if (!value || typeof value !== 'object') throw new Error('Git history is invalid');
  const candidate = value as Partial<GitHistory>;
  const commits = Array.isArray(candidate.commits)
    ? candidate.commits.filter(isGitHistoryCommit)
    : [];

  return {
    generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : '',
    repositoryUrl: typeof candidate.repositoryUrl === 'string' ? candidate.repositoryUrl : null,
    commits,
  };
}

export function paginateGitHistory(commits: GitHistoryCommit[], page: number, pageSize: number) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(commits.length / safePageSize));
  const safePage = Math.min(pageCount, Math.max(1, Math.floor(page)));
  const start = (safePage - 1) * safePageSize;
  return { page: safePage, pageCount, items: commits.slice(start, start + safePageSize) };
}

function isGitHistoryCommit(value: unknown): value is GitHistoryCommit {
  if (!value || typeof value !== 'object') return false;
  const commit = value as Partial<GitHistoryCommit>;
  return typeof commit.hash === 'string'
    && /^[0-9a-f]{7,40}$/i.test(commit.hash)
    && typeof commit.committedAt === 'string'
    && !Number.isNaN(Date.parse(commit.committedAt))
    && typeof commit.subject === 'string'
    && commit.subject.trim().length > 0;
}

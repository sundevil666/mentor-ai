import assert from 'node:assert/strict';
import test from 'node:test';
import { paginateGitHistory, parseGitHistory, type GitHistoryCommit } from '../src/services/git-history.js';

const commits: GitHistoryCommit[] = Array.from({ length: 23 }, (_, index) => ({
  hash: String(index).padStart(40, 'a'),
  committedAt: '2026-09-26T12:00:00.000Z',
  subject: `Commit ${index + 1}`,
}));

test('paginateGitHistory returns ten commits and clamps the final page', () => {
  assert.deepEqual(paginateGitHistory(commits, 2, 10).items.map((item) => item.subject), [
    'Commit 11', 'Commit 12', 'Commit 13', 'Commit 14', 'Commit 15',
    'Commit 16', 'Commit 17', 'Commit 18', 'Commit 19', 'Commit 20',
  ]);
  const finalPage = paginateGitHistory(commits, 99, 10);
  assert.equal(finalPage.page, 3);
  assert.equal(finalPage.pageCount, 3);
  assert.equal(finalPage.items.length, 3);
});

test('parseGitHistory discards malformed commit data', () => {
  const history = parseGitHistory({
    generatedAt: '2026-09-26T12:00:00.000Z',
    repositoryUrl: 'https://github.com/example/repository',
    commits: [commits[0], { hash: 'not-a-hash', committedAt: 'yesterday', subject: '' }],
  });
  assert.deepEqual(history.commits, [commits[0]]);
});

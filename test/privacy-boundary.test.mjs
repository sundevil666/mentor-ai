import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
const trackedFiles = () =>
  execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

const pwaApiClient = source('apps/pwa/src/services/api-client.ts');
const pwaStore = source('apps/pwa/src/stores/app-store.ts');
const sharedContracts = source('packages/shared/src/index.ts');
const apiLearningStateService = source('apps/api/src/services/learning-state.service.ts');

const forbiddenPrivateFields = [
  'address',
  'authorization',
  'bearer',
  'cardNumber',
  'cookie',
  'email',
  'firstName',
  'fullName',
  'lastName',
  'location',
  'password',
  'phone',
  'rawAudio',
  'recording',
  'refreshToken',
  'response',
  'ssn',
  'transcript',
];

const forbiddenTrackedPathPatterns = [
  /^\.env(?!\.example$)($|\.)/,
  /^\.ai\/private\//,
  /^storage\/(?!\.gitkeep$)/,
  /(^|\/)(voice-cache|exports|generated-audio|lesson-results|teacher-memory|teacher-journal|learning-history|progress-analytics|speech-recordings|recordings|private-lessons)\//,
  /\.(sqlite|sqlite3|db)$/i,
];

const highConfidenceSecretPatterns = [
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/,
  /\bsk-[A-Za-z0-9]{32,}\b/,
  /\bghp_[A-Za-z0-9_]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{80,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"\s]*(?:live|prod|real)[^'"\s]*['"]/i,
];

const trackedTextFiles = () =>
  trackedFiles().filter((path) => {
    if (/\.(png|jpe?g|webp|ico|pdf|zip|gz)$/i.test(path)) {
      return false;
    }

    return !path.startsWith('node_modules/');
  });

describe('privacy boundary', () => {
  it('keeps local secrets and private learning artifacts out of version control', () => {
    const leakedPaths = trackedFiles().filter((path) =>
      forbiddenTrackedPathPatterns.some((pattern) => pattern.test(path)),
    );

    assert.deepEqual(
      leakedPaths,
      [],
      `Tracked files must not include local secrets or private learning artifacts: ${leakedPaths.join(', ')}`,
    );
  });

  it('does not commit high-confidence secrets in tracked text files', () => {
    const leakedSecrets = [];

    for (const path of trackedTextFiles()) {
      const contents = source(path);

      for (const pattern of highConfidenceSecretPatterns) {
        if (pattern.test(contents)) {
          leakedSecrets.push(`${path} matches ${pattern}`);
        }
      }
    }

    assert.deepEqual(
      leakedSecrets,
      [],
      `Tracked source must not contain committed secrets:\n${leakedSecrets.join('\n')}`,
    );
  });

  it('synchronizes only learning evidence envelopes', () => {
    assert.match(
      pwaApiClient,
      /body:\s*JSON\.stringify\(\{\s*events,\s*exerciseResults,\s*speechResults\s*\}\)/s,
      'Synchronization payload must stay limited to evidence arrays.',
    );
  });

  it('does not send raw learner answers in events or exercise results', () => {
    assert.doesNotMatch(
      pwaStore,
      /createLearningEvent\([\s\S]*?\{\s*response\s*\}[\s\S]*?\)/,
      'Learning events must not include raw learner responses.',
    );
    assert.doesNotMatch(
      pwaStore,
      /function createExerciseResult[\s\S]*?return\s*\{[\s\S]*?\n\s*response\s*,/m,
      'Exercise results must not include raw learner responses.',
    );
  });

  it('keeps private identifiers and secrets out of synchronized contracts', () => {
    const synchronizedContracts = ['LearningEvent', 'ExerciseResult', 'SpeechResult']
      .map((name) => extractInterface(name, sharedContracts))
      .join('\n');

    for (const field of forbiddenPrivateFields) {
      const fieldPattern = new RegExp(`\\b${field}\\??\\s*:`, 'i');

      assert.equal(
        fieldPattern.test(synchronizedContracts),
        false,
        `Synchronized contracts must not expose private field "${field}".`,
      );
    }
  });

  it('strips private payload fields before synchronized evidence is persisted', () => {
    assert.match(
      apiLearningStateService,
      /function sanitizeLearningEvent[\s\S]*?const \{ data: _data, \.\.\.safeEvent \}/,
      'Learning events must drop arbitrary data payloads before persistence.',
    );
    assert.match(
      apiLearningStateService,
      /function sanitizeExerciseResult[\s\S]*?response: _response/,
      'Exercise results must drop legacy raw learner responses before persistence.',
    );
    assert.match(
      apiLearningStateService,
      /function sanitizeSpeechResult[\s\S]*?rawAudio: _rawAudio[\s\S]*?recording: _recording[\s\S]*?transcript: _transcript/,
      'Speech results must drop raw audio, recordings, and transcripts before persistence.',
    );
  });

  it('does not add unreviewed browser network channels in the PWA source', () => {
    const pwaSources = [
      ['api-client.ts', pwaApiClient],
      ['app-store.ts', pwaStore],
    ];

    for (const [name, contents] of pwaSources) {
      assert.doesNotMatch(contents, /navigator\.sendBeacon|XMLHttpRequest|new\s+WebSocket|EventSource/);

      if (name !== 'api-client.ts') {
        assert.doesNotMatch(contents, /\bfetch\s*\(/, 'Only the reviewed API client may perform network fetches.');
      }
    }
  });
});

function extractInterface(name, contents) {
  const match = contents.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));

  assert.ok(match, `Expected ${name} interface to exist.`);
  return match[1];
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import sharedApi from '../api/_shared.js';

describe('public API errors', () => {
  it('explains a cloud database quota failure without exposing internals', () => {
    assert.deepEqual(sharedApi.publicErrorDetails({
      code: '53000',
      message: 'Your account or project has exceeded the quota. Upgrade your plan to increase limits.',
    }), {
      statusCode: 503,
      message: 'Cloud database quota is exhausted. Uploads will resume after the quota resets or the database plan is upgraded.',
    });
  });

  it('keeps unknown server failures private', () => {
    assert.deepEqual(sharedApi.publicErrorDetails(new Error('secret connection detail')), {
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});

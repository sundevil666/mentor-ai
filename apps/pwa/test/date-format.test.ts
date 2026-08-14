import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDisplayDate } from '../src/services/date-format.js';

describe('display date formatting', () => {
  it('always shows day, month, and year with leading zeroes', () => {
    assert.equal(formatDisplayDate(new Date(2026, 7, 4, 12, 30)), '04.08.2026');
  });

  it('keeps an invalid server value visible', () => {
    assert.equal(formatDisplayDate('built-in'), 'built-in');
  });
});

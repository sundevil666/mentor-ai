import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { expressionLibrary, expressionPractice } from '../src/services/expression-library.js';

describe('English expression library', () => {
  it('contains a complete first set of unique situational chunks', () => {
    assert.equal(expressionLibrary.length, 20);
    assert.equal(new Set(expressionLibrary.map((expression) => expression.id)).size, 20);
    assert.equal(new Set(expressionLibrary.map((expression) => expression.phrase)).size, 20);
    assert.ok(expressionLibrary.every((expression) => expression.meaning && expression.situation && expression.insight));
  });

  it('includes the expressions noticed in the listening journal', () => {
    assert.ok(expressionLibrary.some((expression) => expression.phrase === 'Way to go!'));
    assert.ok(expressionLibrary.some((expression) => expression.phrase === 'I knew he had it in him.'));
  });

  it('builds a 20-phrase practice set for the shared playlist flow', () => {
    assert.equal(expressionPractice.id, 'everyday-expressions');
    assert.deepEqual(expressionPractice.examples.map((example) => example.phrase), expressionLibrary.map((expression) => expression.phrase));
  });
});

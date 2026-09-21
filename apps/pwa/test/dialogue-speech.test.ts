import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chooseBestDialogueTranscript,
  dialogueAnswerCoverage,
  getDialogueExpectedSegments,
  isConfidentDialogueAnswer,
  resolveDialogueExpectedText,
} from '../src/services/dialogue-speech.js';

describe('dialogue speech recognition', () => {
  it('uses the expected response when a generated dialogue exercise omits audio text', () => {
    assert.equal(
      resolveDialogueExpectedText({ expectedResponse: 'The majority voted for the new schedule.' }),
      'The majority voted for the new schedule.',
    );
    assert.equal(
      resolveDialogueExpectedText({ audioText: 'Preferred audio text.', expectedResponse: 'Fallback answer.' }),
      'Preferred audio text.',
    );
  });

  it('stops for a phrase that confidently matches the native answer', () => {
    assert.equal(isConfidentDialogueAnswer('What time do you start work today?', 'What time do you start work today?'), true);
    assert.equal(isConfidentDialogueAnswer('What time start today?', 'What time do you start work today?'), false);
  });

  it('treats recognized clock digits as the same spoken number words', () => {
    assert.equal(
      isConfidentDialogueAnswer(
        'I start at 7, but I need to leave home at 6.',
        'I start at seven, but I need to leave home at six.',
      ),
      true,
    );
  });

  it('accepts spoken contractions for a conditional and highlights the model answer', () => {
    const expected = 'If he were president, he would solve this problem.';
    const heard = "If he were president, he'd solve this problem.";
    assert.equal(isConfidentDialogueAnswer(heard, expected), true);
    assert.equal(
      getDialogueExpectedSegments(heard, expected).filter((segment) => segment.matched === false).length,
      0,
    );
    assert.equal(isConfidentDialogueAnswer('If he was president, he would solve this problem.', expected), false);
  });

  it('measures expected words without rewarding invented words', () => {
    assert.equal(dialogueAnswerCoverage('What time do you start work today, thank you', 'What time do you start work today?'), 1);
    assert.equal(isConfidentDialogueAnswer('What time do you start work today, thank you very much', 'What time do you start work today?'), false);
  });

  it('keeps the transcript closest to the expected phrase', () => {
    assert.equal(
      chooseBestDialogueTranscript('What time start', 'What time do you start work today', 'What time do you start work today?'),
      'What time do you start work today',
    );
  });

  it('marks the correctly recognized expected words in order', () => {
    const segments = getDialogueExpectedSegments(
      'I ran Pavel near the station morning',
      'I ran into Pavel near the station this morning.',
    );
    const wordSegments = segments.filter((segment) => segment.matched !== null);

    assert.deepEqual(
      wordSegments.map((segment) => [segment.text, segment.matched]),
      [
        ['I', true],
        ['ran', true],
        ['into', false],
        ['Pavel', true],
        ['near', true],
        ['the', true],
        ['station', true],
        ['this', false],
        ['morning', true],
      ],
    );
  });

  it('uses the same number normalization for highlighting and assessment', () => {
    const segments = getDialogueExpectedSegments('I start at 7', 'I start at seven');
    assert.equal(segments.filter((segment) => segment.matched === true).length, 4);
  });
});

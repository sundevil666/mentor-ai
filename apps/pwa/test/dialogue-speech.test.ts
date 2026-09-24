import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chooseBestDialogueTranscript,
  dialogueAnswerCoverage,
  dialoguePreviewStatus,
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

  it('accepts tens written as digits or words in both directions', () => {
    const written = 'The bride was late for the wedding by forty minutes.';
    const recognized = 'The bride was late for the wedding by 40 minutes.';

    assert.equal(isConfidentDialogueAnswer(recognized, written), true);
    assert.equal(isConfidentDialogueAnswer(written, recognized), true);
    assert.equal(dialoguePreviewStatus(recognized, written, true), 'correct');
    assert.equal(getDialogueExpectedSegments(recognized, written).filter((segment) => segment.matched === false).length, 0);
    assert.equal(getDialogueExpectedSegments(written, recognized).filter((segment) => segment.matched === false).length, 0);
  });

  it('normalizes compound numbers instead of only single number words', () => {
    assert.equal(isConfidentDialogueAnswer('It took 42 minutes', 'It took forty-two minutes'), true);
    assert.equal(isConfidentDialogueAnswer('There were 1,125 people', 'There were one thousand one hundred twenty five people'), true);
    assert.equal(isConfidentDialogueAnswer('It took 40 minutes', 'It took fourteen minutes'), false);
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

  it('accepts theater and theatre as the same recognized word without marking the model word wrong', () => {
    const expected = 'I want this play to be performed in the school theatre';
    const recognized = 'I want this play to be performed in the school theater';

    assert.equal(dialoguePreviewStatus(recognized, expected, true), 'correct');
    assert.equal(isConfidentDialogueAnswer(expected, recognized), true);
    assert.equal(getDialogueExpectedSegments(recognized, expected).filter((segment) => segment.matched === false).length, 0);
    assert.equal(isConfidentDialogueAnswer('I want this play to be performed in the school cafeteria', expected), false);
  });

  it('accepts supported regional spellings in both directions for assessment and highlighting', () => {
    const variants = [
      ['analyze', 'analyse'],
      ['canceled', 'cancelled'],
      ['center', 'centre'],
      ['color', 'colour'],
      ['favorite', 'favourite'],
      ['gray', 'grey'],
      ['honor', 'honour'],
      ['neighbor', 'neighbour'],
      ['organize', 'organise'],
      ['realize', 'realise'],
      ['theater', 'theatre'],
      ['traveling', 'travelling'],
    ];

    for (const [american, british] of variants) {
      assert.equal(dialoguePreviewStatus(american!, british!, true), 'correct', `${american}/${british}`);
      assert.equal(dialoguePreviewStatus(british!, american!, true), 'correct', `${british}/${american}`);
      assert.deepEqual(getDialogueExpectedSegments(american!, british!), [{ text: british, matched: true }]);
      assert.deepEqual(getDialogueExpectedSegments(british!, american!), [{ text: american, matched: true }]);
    }
  });

  it('accepts common spoken reductions without accepting a different word', () => {
    assert.equal(isConfidentDialogueAnswer('I wanna go to the theatre', 'I want to go to the theater'), true);
    assert.equal(isConfidentDialogueAnswer('I am gonna watch the play', 'I am going to watch the play'), true);
    assert.equal(isConfidentDialogueAnswer('I want to go to the teacher', 'I want to go to the theater'), false);
    assert.equal(isConfidentDialogueAnswer('If he where president', 'If he were president'), false);
  });

  it('accepts the exact browser transcript shown in the answer field before local transcription finishes', () => {
    const expected = 'If he were president he would solve this problem';
    const recognized = 'if he were president he would solve this problem';

    assert.equal(dialoguePreviewStatus(recognized, expected, false), 'correct');
    assert.equal(dialoguePreviewStatus(recognized, expected, true), 'correct');
    assert.equal(dialoguePreviewStatus('if he were president', expected, false), 'idle');
    assert.equal(dialoguePreviewStatus('if he were president', expected, true), 'incorrect');
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

import assert from 'node:assert/strict';
import { it } from 'node:test';
import { splitExercisePrompt } from '../src/services/exercise-prompt-parts.js';
it('separates context, spoken quote and supporting instructions without using an answer', () => {
  assert.deepEqual(splitExercisePrompt('В магазине попроси: «Покажите другой размер». Используй please.'), {
    context: 'В магазине попроси', phrase: 'Покажите другой размер', support: 'Используй please.',
  });
});
it('does not promote a quoted context phrase into the spoken answer', () => {
  assert.equal(splitExercisePrompt('Друг сказал «Привет». Объясни ситуацию.').phrase, '');
});
it('keeps malformed and unquoted prompts intact', () => {
  for (const prompt of ['Скажи: «Незавершённая реплика', 'Прослушай запись']) {
    assert.deepEqual(splitExercisePrompt(prompt), { context: prompt, phrase: '', support: '' });
  }
});
it('recognizes a colon-led practice phrase with an explicit vocabulary instruction', () => {
  assert.deepEqual(splitExercisePrompt('Днём: «Магазин закрыт». Используй closed.'), {
    context: 'Днём', phrase: 'Магазин закрыт', support: 'Используй closed.',
  });
});
it('uses an explicit native prompt without searching the model answer', () => {
  assert.deepEqual(splitExercisePrompt('Translate and say it aloud', 'Доброе утро'), {
    context: 'Translate and say it aloud', phrase: 'Доброе утро', support: '',
  });
});

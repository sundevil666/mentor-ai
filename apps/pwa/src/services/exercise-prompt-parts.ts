/** Presentation only: never infer or reveal the model answer. */
export function splitExercisePrompt(prompt: string, nativePrompt?: string) {
  if (nativePrompt) return { context: prompt, phrase: nativePrompt, support: '' };
  const spokenQuote = /(?:скажи|повтори|попроси|расскажи|произнеси)[^«"\n]*[«"]/i.exec(prompt)
    ?? (/Используй/i.test(prompt) ? /:\s*[«"]/.exec(prompt) : null);
  if (!spokenQuote) return { context: prompt, phrase: '', support: '' };
  const openingIndex = spokenQuote.index + spokenQuote[0].length - 1;
  const closingQuote = prompt[openingIndex] === '«' ? '»' : '"';
  const closingIndex = prompt.indexOf(closingQuote, openingIndex + 1);
  if (closingIndex < 0) return { context: prompt, phrase: '', support: '' };
  return {
    context: prompt.slice(0, openingIndex).trim().replace(/:\s*$/, ''),
    phrase: prompt.slice(openingIndex + 1, closingIndex).trim(),
    support: prompt.slice(closingIndex + 1).trim().replace(/^[.,:;]\s*/, ''),
  };
}

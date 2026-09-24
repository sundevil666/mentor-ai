import type { BookDifficultyAssessment, ReaderVocabularyItem, ReadingPage } from '@mentor-ai/shared';
import type { ReadingPageSpeechSummary } from './reading-page-speech';

const commonWords = new Set(`the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because these give day most us is are was were been being am has had did does doing should may might must shall very more much many any each every both few own same too s t don didn isn aren wasn weren won wouldn couldn shouldn hasn hadn doesn`.split(/\s+/));

export interface BookDifficultyInput {
  pages: ReadingPage[];
  vocabulary: ReaderVocabularyItem[];
  pageSpeech?: Record<string, ReadingPageSpeechSummary>;
  now?: string;
}

export function assessBookDifficulty(input: BookDifficultyInput): BookDifficultyAssessment {
  const sample = sampleBook(input.pages, 25_000, 60);
  const words = sample.words;
  const uniqueWords = new Set(words);
  const uncommonRatio = ratio(words.filter((word) => !commonWords.has(word) && word.length >= 6).length, words.length);
  const longRatio = ratio(words.filter((word) => word.length >= 9).length, words.length);
  const sentenceLength = ratio(words.length, Math.max(1, sample.sentenceCount));
  const diversity = ratio(uniqueWords.size, words.length);

  const difficultVocabulary = input.vocabulary.filter((item) => (item.lookupCount + (item.pronunciationCount ?? 0)) > 0);
  const difficultWords = new Set(difficultVocabulary.map((item) => normalizeWord(item.normalizedText)).filter(Boolean));
  const personalMatches = words.filter((word) => difficultWords.has(word)).length;
  const vocabularyInteractions = difficultVocabulary.reduce((sum, item) => sum + item.lookupCount + (item.pronunciationCount ?? 0), 0);
  const speech = Object.values(input.pageSpeech ?? {});
  const speechWords = speech.reduce((sum, page) => sum + page.totalWords, 0);
  const speechMisses = speech.reduce((sum, page) => sum + page.missedWords.length, 0);
  const personalEvidenceCount = vocabularyInteractions + speechWords;

  const textScore = clamp(
    18 + uncommonRatio * 85 + longRatio * 120 + Math.max(0, sentenceLength - 12) * 1.25 + diversity * 20,
    0,
    100,
  );
  const matchPenalty = Math.min(22, ratio(personalMatches, words.length) * 900);
  const speechPenalty = speechWords >= 80 ? Math.min(22, ratio(speechMisses, speechWords) * 65) : 0;
  const score = Math.round(clamp(textScore + matchPenalty + speechPenalty, 0, 100));
  const recommendation = score >= 58 ? 'rewrite' : 'read';
  const confidence = personalEvidenceCount >= 500 || vocabularyInteractions >= 30
    ? 'high'
    : personalEvidenceCount >= 80 || vocabularyInteractions >= 10
      ? 'medium'
      : 'low';
  const reasons = [
    recommendation === 'rewrite'
      ? 'The text has enough dense or uncommon language to interrupt fluent reading.'
      : 'The text should allow mostly continuous reading without stopping at every sentence.',
  ];
  if (personalMatches > 0) reasons.push(`${personalMatches} sampled words match vocabulary that has already caused difficulty.`);
  if (speechWords >= 80) reasons.push(`Your reading history in this book includes ${speechMisses} missed words out of ${speechWords} tracked words.`);
  if (confidence === 'low') reasons.push('There is little personal reading evidence, so this estimate relies mainly on the book text.');

  return {
    version: 1,
    recommendation,
    score,
    confidence,
    sampledWords: words.length,
    personalEvidenceCount,
    reasons,
    analyzedAt: input.now ?? new Date().toISOString(),
  };
}

function sampleBook(pages: ReadingPage[], wordLimit: number, pageLimit: number) {
  const selectedPages = pages.length <= pageLimit
    ? pages
    : Array.from({ length: pageLimit }, (_, index) => pages[Math.floor(index * pages.length / pageLimit)]!).filter(Boolean);
  const wordsPerPage = Math.max(1, Math.floor(wordLimit / Math.max(1, selectedPages.length)));
  const words: string[] = [];
  let sentenceCount = 0;
  for (const page of selectedPages) {
    const pageWords = page.text.toLocaleLowerCase('en').match(/[a-z]+(?:['’][a-z]+)*/g) ?? [];
    const step = Math.max(1, pageWords.length / wordsPerPage);
    for (let index = 0; index < pageWords.length && words.length < wordLimit; index += step) {
      const word = normalizeWord(pageWords[Math.floor(index)] ?? '');
      if (word) words.push(word);
    }
    sentenceCount += page.text.match(/[.!?]+/g)?.length ?? 1;
  }
  return { words, sentenceCount };
}

function normalizeWord(value: string) { return value.replace(/[’]/g, "'").trim(); }
function ratio(value: number, total: number) { return total > 0 ? value / total : 0; }
function clamp(value: number, minimum: number, maximum: number) { return Math.max(minimum, Math.min(maximum, value)); }

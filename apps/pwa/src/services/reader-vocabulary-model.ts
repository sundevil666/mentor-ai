import type { ReaderVocabularyContext, ReaderVocabularyItem } from '@mentor-ai/shared';

export function isReaderVocabularyBatchAcknowledged(sent: ReaderVocabularyItem, serverItem?: ReaderVocabularyItem) {
  return sent.syncMode !== 'delta-v1'
    ? Boolean(serverItem)
    : Boolean(sent.syncBatchId && (
      serverItem?.syncBatchId === sent.syncBatchId
      || serverItem?.appliedSyncBatchIds?.includes(sent.syncBatchId)
    ));
}

export function mergeVocabularyContexts(
  current: readonly ReaderVocabularyContext[] | undefined,
  incoming: ReaderVocabularyContext,
): ReaderVocabularyContext[] {
  const normalizedText = normalizeContext(incoming.text);
  if (!normalizedText) return [...(current ?? [])];
  const key = contextKey({ ...incoming, text: normalizedText });
  const contexts = new Map((current ?? []).map((context) => [contextKey(context), context]));
  const previous = contexts.get(key);
  contexts.set(key, previous ? {
    ...previous,
    lookupCount: previous.lookupCount + incoming.lookupCount,
    firstLookedUpAt: previous.firstLookedUpAt < incoming.firstLookedUpAt ? previous.firstLookedUpAt : incoming.firstLookedUpAt,
    lastLookedUpAt: previous.lastLookedUpAt > incoming.lastLookedUpAt ? previous.lastLookedUpAt : incoming.lastLookedUpAt,
  } : { ...incoming, text: normalizedText });
  return [...contexts.values()]
    .sort((left, right) => right.lastLookedUpAt.localeCompare(left.lastLookedUpAt))
    .slice(0, 5);
}

function normalizeContext(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function contextKey(context: Pick<ReaderVocabularyContext, 'text' | 'bookId' | 'chapterId' | 'pageIndex'>) {
  return [context.bookId, context.chapterId ?? '', context.pageIndex ?? '', normalizeContext(context.text).toLocaleLowerCase('en')].join(':');
}

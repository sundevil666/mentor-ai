export interface ReaderLookupInteractionOptions {
  revealSelection: () => void;
  pauseListening?: () => void;
  pronounce?: () => void;
  lookup: () => Promise<void>;
}

/** Start user-visible work before the comparatively expensive capture cleanup. */
export function beginReaderLookupInteraction(options: ReaderLookupInteractionOptions): Promise<void> {
  options.revealSelection();
  options.pronounce?.();
  const lookup = options.lookup();
  options.pauseListening?.();
  return lookup;
}

export function shouldProcessLateReadingTranscript(lookupInProgress: boolean): boolean {
  return !lookupInProgress;
}

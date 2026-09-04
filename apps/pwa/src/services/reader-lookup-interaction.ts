export interface ReaderLookupInteractionOptions {
  revealSelection: () => void;
  suppressListening?: () => void;
  pronounce?: () => void;
  lookup: () => Promise<void>;
}

/** Start user-visible work first; listening is gated without tearing capture down. */
export function beginReaderLookupInteraction(options: ReaderLookupInteractionOptions): Promise<void> {
  options.revealSelection();
  options.suppressListening?.();
  options.pronounce?.();
  return options.lookup();
}

export function shouldProcessReadingTranscript(listeningSuppressed: boolean): boolean {
  return !listeningSuppressed;
}

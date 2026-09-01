export interface ReaderLookupInteractionOptions {
  revealSelection: () => void;
  pauseListening?: () => void;
  pronounce?: () => void;
  lookup: () => Promise<void>;
}

/** Keep visible lookup work ahead of MediaRecorder's late final chunk. */
export function beginReaderLookupInteraction(options: ReaderLookupInteractionOptions): Promise<void> {
  options.revealSelection();
  options.pauseListening?.();
  options.pronounce?.();
  return options.lookup();
}

export function shouldProcessLateReadingTranscript(lookupInProgress: boolean): boolean {
  return !lookupInProgress;
}

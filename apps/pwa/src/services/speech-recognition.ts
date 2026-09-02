type SpeechRecognitionResult = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

type SpeechRecognitionResultEventLike = Event & {
  resultIndex?: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
};

export type ContinuousSpeechRecognition = {
  stop: () => void;
};

type ContinuousSpeechRecognitionOptions = {
  lang?: string;
  onInterim?: (transcript: string) => void;
  onFinal: (transcript: string, confidence: number) => void;
  onError?: (message: string) => void;
  onListeningChange?: (listening: boolean) => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

let activeRecognition: SpeechRecognitionLike | null = null;
let activeRecognitionStop: (() => void) | null = null;
let recognitionRequestId = 0;

const defaultRecognitionTimeoutMs = 15_000;
const finalSpeechPauseMs = 1_500;

export function isSpeechRecognitionAvailable(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function stopSpeechRecognition() {
  recognitionRequestId += 1;
  const stopActiveRecognition = activeRecognitionStop;
  activeRecognitionStop = null;
  if (stopActiveRecognition) {
    stopActiveRecognition();
  } else {
    try {
      activeRecognition?.stop();
    } catch {
      activeRecognition?.abort();
    }
  }
  activeRecognition = null;
}

export function startContinuousSpeechRecognition(options: ContinuousSpeechRecognitionOptions): ContinuousSpeechRecognition {
  const SpeechRecognition = getSpeechRecognitionConstructor();
  if (!SpeechRecognition) throw new Error('Speech recognition is not available in this browser.');
  stopSpeechRecognition();
  let shouldRun = true;
  let recognition: SpeechRecognitionLike | null = null;
  let restartTimer: number | undefined;

  const start = () => {
    if (!shouldRun) return;
    recognition = new SpeechRecognition();
    activeRecognition = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options.lang ?? 'en-US';
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const startIndex = Math.max(0, event.resultIndex ?? 0);
      const interim: string[] = [];
      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result?.[0];
        const transcript = alternative?.transcript.replace(/\s+/g, ' ').trim();
        if (!transcript) continue;
        if (result?.isFinal) options.onFinal(transcript, alternative.confidence || 0);
        else interim.push(transcript);
      }
      options.onInterim?.(interim.join(' '));
    };
    recognition.onerror = (event) => {
      const error = event.error ?? 'Speech recognition failed.';
      if (error !== 'no-speech' && error !== 'aborted') options.onError?.(error);
    };
    recognition.onend = () => {
      options.onListeningChange?.(false);
      if (activeRecognition === recognition) activeRecognition = null;
      if (shouldRun) restartTimer = window.setTimeout(start, 300);
    };
    try {
      recognition.start();
      options.onListeningChange?.(true);
    } catch (error) {
      options.onError?.(error instanceof Error ? error.message : 'Speech recognition failed.');
      restartTimer = window.setTimeout(start, 700);
    }
  };

  start();
  return {
    stop() {
      shouldRun = false;
      if (restartTimer !== undefined) window.clearTimeout(restartTimer);
      const current = recognition;
      recognition = null;
      if (activeRecognition === current) activeRecognition = null;
      current?.abort();
      options.onListeningChange?.(false);
    },
  };
}

export async function recognizeSpeechOnce(
  lang = 'en-US',
  timeoutMs = defaultRecognitionTimeoutMs,
  onTranscript?: (transcript: string) => void,
): Promise<SpeechRecognitionResult> {
  const SpeechRecognition = getSpeechRecognitionConstructor();

  if (!SpeechRecognition) {
    throw new Error('Speech recognition is not available in this browser.');
  }

  stopSpeechRecognition();
  const requestId = recognitionRequestId + 1;
  recognitionRequestId = requestId;
  const microphoneStream = await requestMicrophoneStream();

  if (requestId !== recognitionRequestId) {
    stopMicrophoneStream(microphoneStream);
    throw new Error('Recording stopped.');
  }

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    let settled = false;
    let explicitlyStopped = false;
    let bestResult: SpeechRecognitionResult = { transcript: '', confidence: 0 };
    let finalSpeechPauseTimer: number | undefined;
    let restartTimer: number | undefined;
    const startedAt = Date.now();

    activeRecognition = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    const timeout = window.setTimeout(() => {
      if (bestResult.transcript) {
        finish(() => resolve(bestResult));
        return;
      }

      finish(() => reject(new Error('No speech was detected.')));
    }, timeoutMs);

    function finish(callback: () => void) {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      if (finalSpeechPauseTimer !== undefined) {
        window.clearTimeout(finalSpeechPauseTimer);
      }
      if (restartTimer !== undefined) {
        window.clearTimeout(restartTimer);
      }
      stopMicrophoneStream(microphoneStream);
      activeRecognition = null;
      if (activeRecognitionStop === stopCurrentRecognition) activeRecognitionStop = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      callback();
    }

    function stopCurrentRecognition() {
      explicitlyStopped = true;
      try {
        recognition.stop();
      } catch {
        recognition.abort();
      }
    }

    function startRecognition() {
      if (settled || explicitlyStopped || requestId !== recognitionRequestId) return;

      try {
        recognition.start();
      } catch (error) {
        finish(() => reject(new Error(
          error instanceof Error ? error.message : 'Speech recognition failed.',
        )));
      }
    }

    activeRecognitionStop = stopCurrentRecognition;

    recognition.onresult = (event) => {
      const collectedResult = collectSpeechRecognitionResult(event.results);

      if (!collectedResult.transcript) {
        return;
      }

      bestResult = collectedResult;
      onTranscript?.(bestResult.transcript);

      if (finalSpeechPauseTimer !== undefined) {
        window.clearTimeout(finalSpeechPauseTimer);
      }

      const latestResult = event.results[event.results.length - 1];
      if (latestResult?.isFinal) {
        finalSpeechPauseTimer = window.setTimeout(() => recognition.stop(), finalSpeechPauseMs);
      }
    };

    recognition.onerror = (event) => {
      const error = event.error ?? 'Speech recognition failed.';
      if (error === 'no-speech' && shouldRestartSpeechRecognition(
        Boolean(bestResult.transcript),
        explicitlyStopped,
        Date.now() - startedAt,
        timeoutMs,
      )) {
        return;
      }
      finish(() => reject(new Error(speechRecognitionErrorMessage(error))));
    };

    recognition.onend = () => {
      if (bestResult.transcript) {
        finish(() => resolve(bestResult));
        return;
      }

      if (shouldRestartSpeechRecognition(
        false,
        explicitlyStopped,
        Date.now() - startedAt,
        timeoutMs,
      )) {
        restartTimer = window.setTimeout(startRecognition, 300);
        return;
      }

      finish(() => reject(new Error(
        explicitlyStopped ? 'Recording stopped before speech was detected.' : 'No speech was detected.',
      )));
    };

    startRecognition();
  });
}

export function shouldRestartSpeechRecognition(
  hasTranscript: boolean,
  explicitlyStopped: boolean,
  elapsedMs: number,
  timeoutMs: number,
): boolean {
  return !hasTranscript && !explicitlyStopped && elapsedMs < timeoutMs;
}

export function speechRecognitionErrorMessage(error: string): string {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'Microphone access was blocked. Allow microphone access for this site and try again.';
  }
  if (error === 'audio-capture') {
    return 'No working microphone was found. Check the selected input device and try again.';
  }
  if (error === 'network') {
    return 'The browser speech recognition service could not connect. Check the connection or try Chrome.';
  }
  if (error === 'aborted') return 'Recording was stopped.';
  return error || 'Speech recognition failed.';
}

export function collectSpeechRecognitionResult(
  results: SpeechRecognitionResultEventLike['results'],
): SpeechRecognitionResult {
  const transcripts: string[] = [];
  let confidence = 0;

  for (let index = 0; index < results.length; index += 1) {
    const alternative = results[index]?.[0];
    const transcript = alternative?.transcript.trim();

    if (!transcript) {
      continue;
    }

    transcripts.push(transcript);
    confidence = Math.max(confidence, alternative.confidence || 0);
  }

  return {
    transcript: transcripts.join(' ').replace(/\s+/g, ' ').trim(),
    confidence,
  };
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

async function requestMicrophoneStream(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw new Error(speechRecognitionErrorMessage('not-allowed'));
    }
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      throw new Error(speechRecognitionErrorMessage('audio-capture'));
    }
    throw error;
  }
}

function stopMicrophoneStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

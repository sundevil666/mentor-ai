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

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

let activeRecognition: SpeechRecognitionLike | null = null;

const defaultRecognitionTimeoutMs = 15_000;
const finalSpeechPauseMs = 1_500;

export function isSpeechRecognitionAvailable(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function stopSpeechRecognition() {
  activeRecognition?.stop();
  activeRecognition = null;
}

export function recognizeSpeechOnce(
  lang = 'en-US',
  timeoutMs = defaultRecognitionTimeoutMs,
  onTranscript?: (transcript: string) => void,
): Promise<SpeechRecognitionResult> {
  const SpeechRecognition = getSpeechRecognitionConstructor();

  if (!SpeechRecognition) {
    return Promise.reject(new Error('Speech recognition is not available in this browser.'));
  }

  stopSpeechRecognition();

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    let settled = false;
    let bestResult: SpeechRecognitionResult = { transcript: '', confidence: 0 };
    let finalSpeechPauseTimer: number | undefined;

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
      activeRecognition = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      callback();
    }

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
      finish(() => reject(new Error(event.error ?? 'Speech recognition failed.')));
    };

    recognition.onend = () => {
      if (bestResult.transcript) {
        finish(() => resolve(bestResult));
        return;
      }

      finish(() => reject(new Error('No speech was detected.')));
    };

    recognition.start();
  });
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

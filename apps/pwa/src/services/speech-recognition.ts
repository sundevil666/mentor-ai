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

export function isSpeechRecognitionAvailable(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function stopSpeechRecognition() {
  activeRecognition?.stop();
  activeRecognition = null;
}

export function recognizeSpeechOnce(lang = 'en-US', timeoutMs = 8000): Promise<SpeechRecognitionResult> {
  const SpeechRecognition = getSpeechRecognitionConstructor();

  if (!SpeechRecognition) {
    return Promise.reject(new Error('Speech recognition is not available in this browser.'));
  }

  stopSpeechRecognition();

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    let settled = false;
    let bestResult: SpeechRecognitionResult = { transcript: '', confidence: 0 };

    activeRecognition = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error('No speech was detected.')));
    }, timeoutMs);

    function finish(callback: () => void) {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      activeRecognition = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      callback();
    }

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]?.[0];

      if (!result?.transcript) {
        return;
      }

      bestResult = {
        transcript: result.transcript.trim(),
        confidence: result.confidence || bestResult.confidence,
      };

      if (event.results[event.results.length - 1]?.isFinal) {
        finish(() => resolve(bestResult));
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

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

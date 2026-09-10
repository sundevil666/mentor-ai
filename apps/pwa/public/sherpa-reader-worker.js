/* global importScripts, createOnlineRecognizer */

let recognizer = null;
let recognitionStream = null;
let lastPartial = '';
let activeSession = 0;

self.Module = {
  locateFile(path) {
    return `/sherpa/${path}`;
  },
  setStatus(status) {
    const match = status.match(/Downloading data\.\.\. \((\d+)\/(\d+)\)/);
    if (match) {
      self.postMessage({ type: 'progress', loaded: Number(match[1]), total: Number(match[2]) });
    }
  },
  onRuntimeInitialized() {
    try {
      recognizer = createOnlineRecognizer(self.Module);
      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  },
};

importScripts('/sherpa/sherpa-onnx-asr.js', '/sherpa/sherpa-onnx-wasm-main-asr.js');

self.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'start') {
    activeSession = message.sessionId;
    recognitionStream?.free();
    recognitionStream = recognizer?.createStream() ?? null;
    lastPartial = '';
    return;
  }
  if (message.type === 'stop') {
    if (message.sessionId !== activeSession) return;
    recognitionStream?.free();
    recognitionStream = null;
    lastPartial = '';
    return;
  }
  if (message.type !== 'audio' || message.sessionId !== activeSession || !recognizer || !recognitionStream) return;

  recognitionStream.acceptWaveform(16_000, message.audio);
  while (recognizer.isReady(recognitionStream)) recognizer.decode(recognitionStream);
  const text = String(recognizer.getResult(recognitionStream).text ?? '').trim();
  if (text && text !== lastPartial) {
    lastPartial = text;
    self.postMessage({ type: 'interim', sessionId: activeSession, text });
  }
  if (!recognizer.isEndpoint(recognitionStream)) return;
  if (lastPartial) self.postMessage({ type: 'final', sessionId: activeSession, text: lastPartial });
  recognizer.reset(recognitionStream);
  lastPartial = '';
};

// Count captured audio time, not wall time: background scheduling must not
// mistake a delayed audio callback for a pause in the user's sentence.
export function createSpeechEndpointDetector() {
  let speechMs = 0;
  let quietMs = 0;
  let ended = false;
  return (rms: number, durationMs: number, completeAnswer = false): boolean => {
    if (ended || !Number.isFinite(rms) || !Number.isFinite(durationMs) || durationMs <= 0) return false;
    if (rms >= 0.006) {
      speechMs += durationMs;
      quietMs = 0;
      return false;
    }
    if (speechMs < 120) return false;
    quietMs += durationMs;
    // A full exact transcript needs only a short pause. Otherwise allow time
    // for thinking between words before sending the complete recording.
    ended = quietMs >= (completeAnswer ? 650 : 2_000);
    return ended;
  };
}

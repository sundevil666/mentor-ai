class ReadingAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    let sourceOffset = 0;
    while (sourceOffset < input.length) {
      const copied = Math.min(input.length - sourceOffset, this.buffer.length - this.offset);
      this.buffer.set(input.subarray(sourceOffset, sourceOffset + copied), this.offset);
      sourceOffset += copied;
      this.offset += copied;
      if (this.offset === this.buffer.length) {
        const completed = this.buffer;
        this.port.postMessage(completed, [completed.buffer]);
        this.buffer = new Float32Array(4096);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('reading-audio-processor', ReadingAudioProcessor);

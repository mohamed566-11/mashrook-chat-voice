export class AudioStreamer {
  private audioCtx: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private sourceNodes: AudioBufferSourceNode[] = [];

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext({ sampleRate: 24000 });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playChunk(base64Audio: string) {
    if (!this.audioCtx) return;
    
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const audioBuffer = this.audioCtx.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768;
    }
    
    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioCtx.destination);
    
    const currentTime = this.audioCtx.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }
    
    source.start(this.nextPlayTime);
    this.sourceNodes.push(source);
    
    source.onended = () => {
      this.sourceNodes = this.sourceNodes.filter(n => n !== source);
    };
    
    this.nextPlayTime += audioBuffer.duration;
  }

  stop() {
    this.sourceNodes.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.sourceNodes = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }
}

export class AudioRecorder {
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async start(onData: (base64: string) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
    this.audioCtx = new AudioContext({ sampleRate: 16000 });
    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }
      const buffer = new ArrayBuffer(pcm16.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(i * 2, pcm16[i], true);
      }
      
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      onData(btoa(binary));
    };
    
    this.source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
  }

  stop() {
    if (this.processor && this.audioCtx) {
      this.processor.disconnect();
      this.source?.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}

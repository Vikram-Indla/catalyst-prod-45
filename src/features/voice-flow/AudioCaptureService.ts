import { VOICE_FLOW_CONFIG } from './voiceFlow.config';

export interface AudioCaptureCallbacks {
  onSilenceTimeout?: () => void;
  onMaxDuration?: () => void;
}

/**
 * Wraps MediaRecorder for Phase 1 voice capture.
 * Records as audio/webm (Gemini accepts this natively).
 * Also creates an AnalyserNode for real-time amplitude visualisation.
 */
export class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTimeMs = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private amplitudePollId: number | null = null;
  private callbacks: AudioCaptureCallbacks = {};

  // Amplitude below which audio is treated as silence (0–255 RMS scale).
  // Tune upward in noisy environments; 15 comfortably rejects background hum.
  private static readonly SILENCE_THRESHOLD = 15;

  // Web Audio API for real-time waveform bars
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  get durationMs(): number {
    return this.startTimeMs ? Date.now() - this.startTimeMs : 0;
  }

  /** Returns the AnalyserNode for real-time amplitude data, or null if not recording. */
  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /** Live mic stream — shared with the realtime transcriber (CatyFlow). */
  getStream(): MediaStream | null {
    return this.stream;
  }

  static getSupportedMimeType(): string {
    for (const mt of VOICE_FLOW_CONFIG.preferredMimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) return mt;
    }
    return '';
  }

  async start(callbacks: AudioCaptureCallbacks = {}): Promise<void> {
    if (this.mediaRecorder) throw new Error('AudioCaptureService: already recording');

    this.callbacks = callbacks;
    this.chunks = [];

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16_000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // ── Web Audio analyser (amplitude → waveform bars) ────────────────────
    try {
      this.audioCtx = new AudioContext();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 32;               // 16 frequency bins — enough for 5 bars
      this.analyserNode.smoothingTimeConstant = 0.5; // moderate smoothing
      source.connect(this.analyserNode);
    } catch {
      // Non-fatal — bars fall back to CSS animation
      this.analyserNode = null;
    }

    const mimeType = AudioCaptureService.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
      // Silence timer is now driven by amplitude polling, not chunk size.
      // WebM container always produces non-zero chunks even during silence,
      // so chunk-based silence detection never fires — hence this is data-only.
    };

    this.mediaRecorder.start(250);
    this.startTimeMs = Date.now();

    // Start silence timer and amplitude polling.
    // Polling resets the timer whenever voice is detected; true silence lets it run.
    this.resetSilenceTimer();
    this.startAmplitudePoll();
    this.maxDurationTimer = setTimeout(() => {
      this.callbacks.onMaxDuration?.();
    }, VOICE_FLOW_CONFIG.maxDurationMs);
  }

  async stop(): Promise<{ blob: Blob; durationMs: number }> {
    this.clearTimers();
    const durationMs = this.durationMs;

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('AudioCaptureService: not recording'));
        return;
      }
      const recorder = this.mediaRecorder;

      recorder.onstop = () => {
        const blob = new Blob(this.chunks, {
          type: recorder.mimeType || 'audio/webm',
        });
        this.cleanup();
        resolve({ blob, durationMs });
      };

      recorder.onerror = (e) => {
        this.cleanup();
        reject(new Error((e as MediaRecorderErrorEvent).error?.message ?? 'MediaRecorder error'));
      };

      if (recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        this.cleanup();
        resolve({ blob: new Blob(this.chunks, { type: 'audio/webm' }), durationMs });
      }
    });
  }

  cancel(): void {
    this.clearTimers();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.onerror = null;
      try { this.mediaRecorder.stop(); } catch { /* swallow */ }
    }
    this.cleanup();
  }

  /** Polls the AnalyserNode for RMS amplitude. Resets the silence timer
   *  when voice is detected; silence lets the timer run to onSilenceTimeout. */
  private startAmplitudePoll(): void {
    if (!this.analyserNode) return; // no analyser — silence detection disabled (graceful)
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    const poll = () => {
      if (!this.analyserNode || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;
      this.analyserNode.getByteFrequencyData(data);
      const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
      if (rms > AudioCaptureService.SILENCE_THRESHOLD) this.resetSilenceTimer();
      this.amplitudePollId = requestAnimationFrame(poll);
    };
    this.amplitudePollId = requestAnimationFrame(poll);
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.callbacks.onSilenceTimeout?.();
    }, VOICE_FLOW_CONFIG.silenceAutoStopMs);
  }

  private clearTimers(): void {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.maxDurationTimer) { clearTimeout(this.maxDurationTimer); this.maxDurationTimer = null; }
    if (this.amplitudePollId !== null) { cancelAnimationFrame(this.amplitudePollId); this.amplitudePollId = null; }
  }

  private cleanup(): void {
    if (this.amplitudePollId !== null) { cancelAnimationFrame(this.amplitudePollId); this.amplitudePollId = null; }
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.startTimeMs = 0;
    // Release Web Audio resources
    this.analyserNode = null;
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
  }
}

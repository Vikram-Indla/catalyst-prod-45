import { VOICE_FLOW_CONFIG } from './voiceFlow.config';

export interface AudioCaptureCallbacks {
  onMaxDuration?: () => void;
}

/**
 * Wraps MediaRecorder for voice capture.
 * Records as audio/webm (Gemini accepts this natively).
 * Also creates an AnalyserNode for real-time amplitude visualisation.
 *
 * There is intentionally NO silence auto-stop (CAT-VOICE-UX-PREMIUM-20260708-001
 * S1): thinking pauses must never end a session. The only automatic stop is the
 * 15-minute cap, and paused time does not burn that budget.
 */
export class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTimeMs = 0;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: AudioCaptureCallbacks = {};

  // Pause accounting: durationMs and the max-duration cap both count only
  // un-paused time, so a long thinking pause never eats the 15-min budget.
  private pausedAccumMs = 0;
  private pauseStartedAt: number | null = null;
  private capRemainingMs = 0;

  // Web Audio API for real-time waveform bars
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  get isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused';
  }

  /** Un-paused elapsed time. */
  get durationMs(): number {
    if (!this.startTimeMs) return 0;
    const pausedLive = this.pauseStartedAt ? Date.now() - this.pauseStartedAt : 0;
    return Date.now() - this.startTimeMs - this.pausedAccumMs - pausedLive;
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
    this.pausedAccumMs = 0;
    this.pauseStartedAt = null;

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
    };

    this.mediaRecorder.start(250);
    this.startTimeMs = Date.now();

    this.capRemainingMs = VOICE_FLOW_CONFIG.maxDurationMs;
    this.armMaxDurationTimer();
  }

  /** Pause capture: recorder pauses (stream stays live so the analyser and a
   *  later resume keep working) and the cap timer freezes. */
  pause(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;
    this.mediaRecorder.pause();
    this.pauseStartedAt = Date.now();
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
    this.capRemainingMs = Math.max(0, VOICE_FLOW_CONFIG.maxDurationMs - this.durationMs);
  }

  resume(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'paused') return;
    if (this.pauseStartedAt) {
      this.pausedAccumMs += Date.now() - this.pauseStartedAt;
      this.pauseStartedAt = null;
    }
    this.mediaRecorder.resume();
    this.armMaxDurationTimer();
  }

  async stop(): Promise<{ blob: Blob; durationMs: number }> {
    this.clearTimers();
    // Close out a live pause so durationMs is final.
    if (this.pauseStartedAt) {
      this.pausedAccumMs += Date.now() - this.pauseStartedAt;
      this.pauseStartedAt = null;
    }
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

  private armMaxDurationTimer(): void {
    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
    this.maxDurationTimer = setTimeout(() => {
      this.callbacks.onMaxDuration?.();
    }, this.capRemainingMs);
  }

  private clearTimers(): void {
    if (this.maxDurationTimer) { clearTimeout(this.maxDurationTimer); this.maxDurationTimer = null; }
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.startTimeMs = 0;
    this.pausedAccumMs = 0;
    this.pauseStartedAt = null;
    // Release Web Audio resources
    this.analyserNode = null;
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
  }
}

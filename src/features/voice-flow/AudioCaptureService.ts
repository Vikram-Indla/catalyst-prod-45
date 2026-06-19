import { VOICE_FLOW_CONFIG } from './voiceFlow.config';

export interface AudioCaptureCallbacks {
  onSilenceTimeout?: () => void;
  onMaxDuration?: () => void;
}

/**
 * Wraps MediaRecorder for Phase 1 voice capture.
 * Records as audio/webm (Gemini accepts this natively).
 */
export class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTimeMs = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: AudioCaptureCallbacks = {};

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  get durationMs(): number {
    return this.startTimeMs ? Date.now() - this.startTimeMs : 0;
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

    const mimeType = AudioCaptureService.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
        this.resetSilenceTimer();
      }
    };

    this.mediaRecorder.start(250); // 250ms timeslice — drives silence detection
    this.startTimeMs = Date.now();

    this.resetSilenceTimer();
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

  private resetSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.callbacks.onSilenceTimeout?.();
    }, VOICE_FLOW_CONFIG.silenceAutoStopMs);
  }

  private clearTimers(): void {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.maxDurationTimer) { clearTimeout(this.maxDurationTimer); this.maxDurationTimer = null; }
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.startTimeMs = 0;
  }
}

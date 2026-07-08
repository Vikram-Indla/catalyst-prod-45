/**
 * RealtimeTranscriber — CatyFlow live streaming ASR over the Gemini Live
 * API (CAT-VOICE-FLOW-20260704-001). Gemini-native, no OpenAI dependency.
 *
 * Flow: catyflow-token mints a single-session ephemeral token (locked to
 * a transcription-only Live config) from the server-side GEMINI_API_KEY →
 * the browser opens a BidiGenerateContent WebSocket straight to Gemini
 * with that token (audio never transits Supabase) → PCM16 tapped from the
 * shared mic stream is streamed up → input-transcription text streams
 * back → live Arabic/English captions while speaking.
 *
 * The MediaRecorder in AudioCaptureService keeps running independently for
 * the batch fallback, so a realtime failure costs nothing.
 */
import { supabase } from '@/integrations/supabase/client';

const TARGET_RATE = 16000;
const FRAME = 4096;
/** Setup must complete this soon after the WS opens or the lane is dead. */
const SETUP_TIMEOUT_MS = 3000;
/** Speaking but no transcription delta for this long → degraded. */
const DELTA_WATCHDOG_MS = 8000;
const WATCHDOG_POLL_MS = 5000;
/** PCM frame mean-amplitude above this counts as speech (int16 scale). */
const SPEECH_AMPLITUDE = 500;

export type RealtimeLaneState = 'connecting' | 'live' | 'degraded' | 'failed' | 'closed';

export interface RealtimeCallbacks {
  onLive: (text: string) => void;
  onError?: (message: string) => void;
  /** Health transitions — the UI must never be silently caption-less
   *  (CAT-VOICE-UX-PREMIUM-20260708-001 S3a). */
  onState?: (state: RealtimeLaneState) => void;
}

interface MintResult {
  access_token: string;
  ws_url: string;
  model: string;
}

let availability: Promise<boolean> | null = null;

async function mint(vocabulary?: string[]): Promise<MintResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('catyflow-token', {
      body: { vocabulary: vocabulary ?? [] },
    });
    if (error) return null;
    const d = data as Partial<MintResult> | null;
    if (!d?.access_token || !d.ws_url || !d.model) return null;
    return d as MintResult;
  } catch {
    return null;
  }
}

/** One cheap probe per page load — avoids a mint round-trip on every
 *  dictation when Gemini Live isn't reachable. */
export function realtimeAvailable(): Promise<boolean> {
  if (!availability) availability = mint().then((r) => r !== null);
  return availability;
}

/** Downsample a Float32 frame from srcRate to 16 kHz and pack as Int16 LE. */
function toPcm16(input: Float32Array, srcRate: number): ArrayBuffer {
  const ratio = srcRate / TARGET_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const s = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

function base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export class RealtimeTranscriber {
  private ws: WebSocket | null = null;
  private ctx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private finals: string[] = [];
  private current = '';
  private closed = false;
  private setupDone = false;
  private paused = false;
  private state: RealtimeLaneState = 'connecting';
  private onState: ((s: RealtimeLaneState) => void) | undefined;
  private lastDeltaAt = 0;
  private lastSpeechAt = 0;
  private setupAt = 0;
  private watchdogId: ReturnType<typeof setInterval> | null = null;

  private setState(s: RealtimeLaneState): void {
    if (this.state === s || this.state === 'closed') return;
    this.state = s;
    this.onState?.(s);
  }

  /** Pause gate: while paused no PCM frames are sent upstream (the WS stays
   *  open; server VAD seals the in-flight segment via turnComplete). Never
   *  send audioStreamEnd here — that ends input for the whole session. */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  get hasTranscript(): boolean {
    return this.finals.length > 0 || this.current.trim().length > 0;
  }

  get transcript(): string {
    return [...this.finals, this.current].join(' ').replace(/\s+/g, ' ').trim();
  }

  async start(stream: MediaStream, callbacks: RealtimeCallbacks, vocabulary?: string[]): Promise<boolean> {
    this.onState = callbacks.onState;
    this.setState('connecting');
    const minted = await mint(vocabulary);
    if (!minted) {
      this.setState('failed');
      return false;
    }

    try {
      const ws = new WebSocket(`${minted.ws_url}?access_token=${encodeURIComponent(minted.access_token)}`);
      this.ws = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        if (this.closed) return;
        // Constrained endpoint: the session config is LOCKED into the
        // ephemeral token server-side; the first message must still be a
        // setup, but an empty one — restating model/config here is rejected
        // ("model not found for v1main", live-probed 2026-07-08).
        ws.send(JSON.stringify({ setup: {} }));
      };

      ws.onmessage = async (ev) => {
        if (this.closed) return;
        let text: string;
        if (ev.data instanceof ArrayBuffer) text = new TextDecoder().decode(ev.data);
        else if (ev.data instanceof Blob) text = await ev.data.text();
        else text = ev.data as string;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(text);
        } catch {
          return;
        }
        if ('setupComplete' in msg) {
          this.setupDone = true;
          this.setupAt = Date.now();
          this.setState('live');
          this.startAudioPump(stream);
          this.startWatchdog();
          return;
        }
        const server = msg.serverContent as
          | { inputTranscription?: { text?: string }; turnComplete?: boolean }
          | undefined;
        const delta = server?.inputTranscription?.text;
        if (delta) {
          this.lastDeltaAt = Date.now();
          if (this.state === 'degraded') this.setState('live');
          this.current += delta;
          callbacks.onLive(this.transcript);
        }
        if (server?.turnComplete && this.current.trim()) {
          this.finals.push(this.current.trim());
          this.current = '';
          callbacks.onLive(this.transcript);
        }
      };

      ws.onerror = () => {
        this.setState(this.setupDone ? 'degraded' : 'failed');
        callbacks.onError?.('Realtime transcription error');
      };
      ws.onclose = () => {
        // A close after setup is a dead lane mid-session (batch fallback
        // still covers the result) — surface it, don't stay silently mute.
        if (!this.closed) this.setState(this.setupDone ? 'degraded' : 'failed');
      };

      // Resolve on setupComplete — a bare WS `open` is NOT a working lane
      // (the old resolve-on-open is why dead lanes showed "Listening…" with
      // no words). Setup must land within SETUP_TIMEOUT_MS of the open.
      return await new Promise<boolean>((resolve) => {
        const fail = () => {
          if (this.setupDone) return;
          this.setState('failed');
          resolve(false);
        };
        const overall = setTimeout(fail, 4000 + SETUP_TIMEOUT_MS);
        ws.addEventListener('open', () => {
          setTimeout(fail, SETUP_TIMEOUT_MS);
        });
        ws.addEventListener('close', () => {
          clearTimeout(overall);
          resolve(this.setupDone);
        });
        const poll = setInterval(() => {
          if (this.setupDone) {
            clearInterval(poll);
            clearTimeout(overall);
            resolve(true);
          } else if (this.closed || this.state === 'failed') {
            clearInterval(poll);
          }
        }, 100);
      });
    } catch {
      this.setState('failed');
      this.dispose();
      return false;
    }
  }

  /** Detect "connected but mute": user audibly speaking, lane live, yet no
   *  transcription deltas — the exact silent-failure mode users hit. */
  private startWatchdog(): void {
    if (this.watchdogId) clearInterval(this.watchdogId);
    this.watchdogId = setInterval(() => {
      if (this.closed || this.paused || this.state !== 'live') return;
      const now = Date.now();
      const speakingRecently = now - this.lastSpeechAt < DELTA_WATCHDOG_MS;
      const lastSignal = Math.max(this.lastDeltaAt, this.setupAt);
      if (speakingRecently && now - lastSignal > DELTA_WATCHDOG_MS) {
        this.setState('degraded');
      }
    }, WATCHDOG_POLL_MS);
  }

  private startAudioPump(stream: MediaStream): void {
    if (this.closed) return;
    try {
      const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AC();
      this.ctx = ctx;
      const source = ctx.createMediaStreamSource(stream);
      this.source = source;
      const processor = ctx.createScriptProcessor(FRAME, 1, 1);
      this.processor = processor;
      processor.onaudioprocess = (e) => {
        if (this.closed || this.paused || this.ws?.readyState !== WebSocket.OPEN) return;
        const channel = e.inputBuffer.getChannelData(0);
        // Cheap speech detector for the delta watchdog (mean |amplitude|).
        let sum = 0;
        for (let i = 0; i < channel.length; i += 16) sum += Math.abs(channel[i]);
        if ((sum / (channel.length / 16)) * 0x7fff > SPEECH_AMPLITUDE) {
          this.lastSpeechAt = Date.now();
        }
        const pcm = toPcm16(channel, ctx.sampleRate);
        this.ws.send(
          JSON.stringify({
            realtimeInput: { audio: { mimeType: `audio/pcm;rate=${TARGET_RATE}`, data: base64(pcm) } },
          }),
        );
      };
      source.connect(processor);
      // ScriptProcessor needs a destination to pump; a muted gain avoids echo.
      const sink = ctx.createGain();
      sink.gain.value = 0;
      processor.connect(sink);
      sink.connect(ctx.destination);
    } catch {
      /* audio tap failed — batch fallback still active */
    }
  }

  dispose(): void {
    this.closed = true;
    this.setState('closed');
    if (this.watchdogId) { clearInterval(this.watchdogId); this.watchdogId = null; }
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
      void this.ctx?.close();
    } catch {
      /* already torn down */
    }
    this.processor = null;
    this.source = null;
    this.ctx = null;
    try {
      this.ws?.close();
    } catch {
      /* already closed */
    }
    this.ws = null;
  }
}

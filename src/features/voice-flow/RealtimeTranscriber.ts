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

export interface RealtimeCallbacks {
  onLive: (text: string) => void;
  onError?: (message: string) => void;
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

  get hasTranscript(): boolean {
    return this.finals.length > 0 || this.current.trim().length > 0;
  }

  get transcript(): string {
    return [...this.finals, this.current].join(' ').replace(/\s+/g, ' ').trim();
  }

  async start(stream: MediaStream, callbacks: RealtimeCallbacks, vocabulary?: string[]): Promise<boolean> {
    const minted = await mint(vocabulary);
    if (!minted) return false;

    try {
      const ws = new WebSocket(`${minted.ws_url}?access_token=${encodeURIComponent(minted.access_token)}`);
      this.ws = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        if (this.closed) return;
        // Setup (matches the token's locked constraints).
        ws.send(
          JSON.stringify({
            setup: {
              model: minted.model,
              generationConfig: { responseModalities: ['TEXT'] },
              inputAudioTranscription: {},
            },
          }),
        );
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
          this.startAudioPump(stream);
          return;
        }
        const server = msg.serverContent as
          | { inputTranscription?: { text?: string }; turnComplete?: boolean }
          | undefined;
        const delta = server?.inputTranscription?.text;
        if (delta) {
          this.current += delta;
          callbacks.onLive(this.transcript);
        }
        if (server?.turnComplete && this.current.trim()) {
          this.finals.push(this.current.trim());
          this.current = '';
          callbacks.onLive(this.transcript);
        }
      };

      ws.onerror = () => callbacks.onError?.('Realtime transcription error');

      // Resolve once the socket is open; setup/audio proceed on their own.
      return await new Promise<boolean>((resolve) => {
        const t = setTimeout(() => resolve(this.ws?.readyState === WebSocket.OPEN), 4000);
        ws.addEventListener('open', () => {
          clearTimeout(t);
          resolve(true);
        });
        ws.addEventListener('close', () => {
          clearTimeout(t);
          resolve(this.setupDone);
        });
      });
    } catch {
      this.dispose();
      return false;
    }
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
        if (this.closed || this.ws?.readyState !== WebSocket.OPEN) return;
        const pcm = toPcm16(e.inputBuffer.getChannelData(0), ctx.sampleRate);
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

/**
 * RealtimeTranscriber — CatyFlow live streaming ASR over WebRTC
 * (CAT-VOICE-FLOW-20260704-001).
 *
 * Flow: catyflow-token mints an ephemeral client secret for a
 * transcription-type realtime session (config server-side) → browser
 * opens an RTCPeerConnection straight to the provider (audio never
 * transits Supabase) → transcription deltas stream back on the data
 * channel → live captions for BOTH Arabic and English while speaking.
 *
 * Availability is probed once per page load; a 503 (gateway key not
 * configured) caches as unavailable so the engine silently keeps its
 * batch fallback with zero extra latency.
 */
import { supabase } from '@/integrations/supabase/client';

export interface RealtimeCallbacks {
  /** Full accumulated live text (finished utterances + current partial). */
  onLive: (text: string) => void;
  onError?: (message: string) => void;
}

interface MintResult {
  client_secret: string;
  realtime_url: string;
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
    if (!d?.client_secret || !d.realtime_url) return null;
    return d as MintResult;
  } catch {
    return null;
  }
}

/** One cheap probe per page load — avoids a mint round-trip on every dictation
 *  when the gateway key isn't configured yet. */
export function realtimeAvailable(): Promise<boolean> {
  if (!availability) {
    availability = mint().then((r) => r !== null);
  }
  return availability;
}

export class RealtimeTranscriber {
  private pc: RTCPeerConnection | null = null;
  private finals: string[] = [];
  private currentDelta = '';
  private closed = false;

  /** True once at least one delta/final arrived — the signal that this
   *  session's transcript can replace the batch round-trip. */
  get hasTranscript(): boolean {
    return this.finals.length > 0 || this.currentDelta.trim().length > 0;
  }

  get transcript(): string {
    return [...this.finals, this.currentDelta].join(' ').replace(/\s+/g, ' ').trim();
  }

  async start(stream: MediaStream, callbacks: RealtimeCallbacks, vocabulary?: string[]): Promise<boolean> {
    const minted = await mint(vocabulary);
    if (!minted) return false;

    try {
      const pc = new RTCPeerConnection();
      this.pc = pc;
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      const channel = pc.createDataChannel('oai-events');
      channel.onmessage = (ev) => {
        if (this.closed) return;
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string; delta?: string; transcript?: string };
          if (msg.type?.endsWith('input_audio_transcription.delta') && msg.delta) {
            this.currentDelta += msg.delta;
            callbacks.onLive(this.transcript);
          } else if (msg.type?.endsWith('input_audio_transcription.completed')) {
            const finalText = (msg.transcript ?? this.currentDelta).trim();
            if (finalText) this.finals.push(finalText);
            this.currentDelta = '';
            callbacks.onLive(this.transcript);
          } else if (msg.type === 'error') {
            callbacks.onError?.('Realtime transcription error');
          }
        } catch {
          /* non-JSON frame — ignore */
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(`${minted.realtime_url}/calls?model=${encodeURIComponent(minted.model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${minted.client_secret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });
      if (!resp.ok) {
        this.dispose();
        return false;
      }
      const answerSdp = await resp.text();
      if (this.closed) return false;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      return true;
    } catch {
      this.dispose();
      return false;
    }
  }

  dispose(): void {
    this.closed = true;
    try {
      this.pc?.getSenders().forEach((s) => s.track && this.pc?.removeTrack(s));
      this.pc?.close();
    } catch {
      /* already closed */
    }
    this.pc = null;
  }
}

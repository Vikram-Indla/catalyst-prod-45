/**
 * useStandupSpeech — browser-native speech recognition wired for the
 * standup panel. Captures continuous audio transcript at the STANDUP
 * level (no per-speaker buffer). Each final result chunk is pushed
 * onto a JSONB-friendly `{ts, text}` array that the modal hands to
 * the parent for End-standup persistence into
 * `standups.transcript_chunks`.
 *
 * Why no speaker attribution: browser SR has no diarization, and the
 * panel's "current speaker" state lags real speech — tagging would
 * lie whenever someone interjects. Phase 3 cross-references the
 * timestamped transcript against `standup_events` turn windows to
 * attribute utterances honestly.
 *
 * Browser support: Chrome / Edge native (`SpeechRecognition` or
 * `webkitSpeechRecognition`). Firefox / Safari return
 * `status: 'unsupported'` and the panel falls back gracefully — the
 * standup still works, just without transcripts.
 *
 * State machine: unsupported / denied / error are terminal. idle is
 * the initial state before the first `start()`. listening flips on
 * after permission grant. The hook auto-restarts on engine `onend`
 * (Chrome stops on long silences) until `stop()` is called.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type StandupSpeechStatus =
  | 'unsupported'
  | 'denied'
  | 'idle'
  | 'listening'
  | 'error';

/** Single finalised transcript chunk. ts is ISO 8601 UTC so Postgres
 *  jsonb stores it cleanly and Phase 3 can compare against
 *  standup_events.started_at / ended_at without parsing. */
export interface StandupTranscriptChunk {
  ts: string;
  text: string;
}

interface Options {
  /** Master switch — when false, the hook is inert (no permission
   *  prompt, no recognition). Toggle this if a future setting lets
   *  the user opt out of mic recording. */
  enabled: boolean;
  /** Standup-level array the hook appends finalised chunks to. The
   *  modal creates it as `useRef<StandupTranscriptChunk[]>([])` and
   *  passes it down; the parent reads from the SAME ref via
   *  prop-drilling so End standup can persist it. */
  chunksRef: React.MutableRefObject<StandupTranscriptChunk[]>;
  lang?: string;
}

interface Result {
  status: StandupSpeechStatus;
  /** Live interim text — re-rendered as the speaker talks, cleared
   *  on finalisation. Display-only. */
  interimText: string;
  /** Promotes the in-flight interim into the chunks array as a final
   *  chunk. Call before End standup so half-spoken phrases aren't
   *  lost. */
  flushInterim: () => void;
}

function getSR(): unknown {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useStandupSpeech({
  enabled,
  chunksRef,
  lang = 'en-US',
}: Options): Result {
  const SR = getSR() as (new () => unknown) | null;
  const isSupported = !!SR;

  const [status, setStatus] = useState<StandupSpeechStatus>(
    isSupported ? 'idle' : 'unsupported',
  );
  const [interimText, setInterimText] = useState('');

  const recognitionRef = useRef<unknown>(null);
  /* True while we WANT recognition running — onend uses this to decide
     whether to auto-restart. */
  const wantsRunningRef = useRef(false);
  const interimRef = useRef<string>('');
  const langRef = useRef(lang);
  langRef.current = lang;

  const stopRecognition = useCallback(() => {
    wantsRunningRef.current = false;
    const r = recognitionRef.current as
      | {
          onend?: unknown;
          onresult?: unknown;
          onerror?: unknown;
          stop: () => void;
        }
      | null;
    if (r) {
      try {
        r.onend = null;
        r.onresult = null;
        r.onerror = null;
        r.stop();
      } catch {
        /* swallow */
      }
      recognitionRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!isSupported || !SR || recognitionRef.current) return;
    let recognition: any;
    try {
      recognition = new (SR as any)();
    } catch {
      setStatus('error');
      return;
    }
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langRef.current;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript ?? '';
        if (res.isFinal) {
          const next = transcript.trim();
          if (next) {
            chunksRef.current.push({ ts: new Date().toISOString(), text: next });
          }
        } else {
          interim += transcript;
        }
      }
      interimRef.current = interim;
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      const err = event?.error;
      if (err === 'no-speech' || err === 'aborted') return;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setStatus('denied');
        wantsRunningRef.current = false;
        return;
      }
      // eslint-disable-next-line no-console
      console.warn('[useStandupSpeech] recognition error', err);
      setStatus('error');
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        if (wantsRunningRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            /* fall through */
          }
        }
        recognitionRef.current = null;
        // If we didn't ask to stop, surface that recognition died.
        if (wantsRunningRef.current) setStatus('error');
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      wantsRunningRef.current = true;
      setStatus('listening');
    } catch {
      setStatus('error');
    }
  }, [SR, isSupported, chunksRef]);

  /* Auto-start when enabled + supported. Permission dialog is shown
     synchronously by the browser on the first `recognition.start()`
     call — no separate getUserMedia call needed. */
  useEffect(() => {
    if (!enabled || !isSupported) return;
    startRecognition();
    return () => stopRecognition();
  }, [enabled, isSupported, startRecognition, stopRecognition]);

  const flushInterim = useCallback(() => {
    const pending = interimRef.current.trim();
    if (!pending) return;
    chunksRef.current.push({ ts: new Date().toISOString(), text: pending });
    interimRef.current = '';
    setInterimText('');
  }, [chunksRef]);

  return { status, interimText, flushInterim };
}

/**
 * useStandupSpeech — browser-native speech recognition wired for the
 * standup panel. Modelled on the rich-text editor's
 * `useMicVoiceRecorder` (sections/Description/hooks/useMicVoiceRecorder.ts)
 * but decoupled from the editor — it accumulates a per-turn transcript
 * into a parent-supplied ref so the modal can snapshot it on speaker
 * advance the same way it snapshots `elapsedThisTurnRef`.
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

interface Options {
  /** Master switch — when false, the hook is inert (no permission
   *  prompt, no recognition). Toggle this if a future setting lets
   *  the user opt out of mic recording. */
  enabled: boolean;
  /** Buffer of finalised transcript chunks for the CURRENT turn.
   *  Updated by the hook on every final result. Parent reads this
   *  in captureTimerThenAdvance to snapshot. */
  transcriptRef: React.MutableRefObject<string>;
  /** Optional parent-owned mirror — pushed the latest accumulated
   *  buffer on every finalisation. Same pattern as
   *  `currentTurnTimerSecondsRef`. Lets End standup buttons outside
   *  the modal flush the in-flight transcript without reaching in. */
  parentMirrorRef?: React.MutableRefObject<string | null>;
  lang?: string;
}

interface Result {
  status: StandupSpeechStatus;
  /** Live interim text — re-rendered as the speaker talks, cleared
   *  on finalisation. Display-only. */
  interimText: string;
  /** Promotes the in-flight interim into the final buffer. Call
   *  before reading `transcriptRef.current` for a snapshot (e.g.
   *  on speaker advance / End standup) so half-spoken phrases
   *  aren't lost. */
  flushInterim: () => void;
  /** Empties both interim + buffer + parent mirror. Call from the
   *  step-reset effect when a new speaker takes the turn. */
  reset: () => void;
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
  transcriptRef,
  parentMirrorRef,
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
      let bufferChanged = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript ?? '';
        if (res.isFinal) {
          const next = transcript.trim();
          if (next) {
            transcriptRef.current = transcriptRef.current
              ? `${transcriptRef.current} ${next}`
              : next;
            bufferChanged = true;
          }
        } else {
          interim += transcript;
        }
      }
      interimRef.current = interim;
      setInterimText(interim);
      if (bufferChanged && parentMirrorRef) {
        parentMirrorRef.current = transcriptRef.current || null;
      }
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
  }, [SR, isSupported, parentMirrorRef, transcriptRef]);

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
    transcriptRef.current = transcriptRef.current
      ? `${transcriptRef.current} ${pending}`
      : pending;
    if (parentMirrorRef) parentMirrorRef.current = transcriptRef.current || null;
    interimRef.current = '';
    setInterimText('');
  }, [parentMirrorRef, transcriptRef]);

  const reset = useCallback(() => {
    transcriptRef.current = '';
    interimRef.current = '';
    setInterimText('');
    if (parentMirrorRef) parentMirrorRef.current = null;
  }, [parentMirrorRef, transcriptRef]);

  return { status, interimText, flushInterim, reset };
}

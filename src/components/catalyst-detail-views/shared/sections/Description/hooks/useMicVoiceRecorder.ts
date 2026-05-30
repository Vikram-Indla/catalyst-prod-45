/**
 * useMicVoiceRecorder — programmatic voice-to-text for the mic toolbar
 * button. Different from useVoiceToText (which auto-inserts as soon as
 * each chunk is finalised): this one BUFFERS the entire session and
 * inserts the full transcript only when `stop()` is called. `cancel()`
 * discards the buffer entirely.
 *
 * State machine:
 *   idle  ──start──▶ recording  ──pause──▶ paused  ──resume──▶ recording
 *                       │                              │
 *                       └────────────stop────────┐     │
 *                                                ▼     ▼
 *                                       insert buffer → idle
 *                       │
 *                       └────────────cancel─────────▶  discard → idle
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type MinimalView = {
  state: {
    doc: { content: { size: number } };
    selection: { from: number; to: number };
    tr: {
      insertText: (text: string, from?: number, to?: number) => unknown;
    };
  };
  dispatch: (tr: unknown) => void;
} | null;

interface Options {
  editorRootRef: React.RefObject<HTMLElement | null>;
  getEditorView: () => MinimalView;
  lang?: string;
}

/** Three-phase AI state shown in the "Caty is …" pill. */
export type MicPhase = 'listening' | 'transcribing' | 'translating';

interface Result {
  isSupported: boolean;
  /** True from start() until stop()/cancel(). */
  isActive: boolean;
  /** Active but paused — recognition stopped, buffer kept. */
  isPaused: boolean;
  /** Latest interim transcript (display-only). */
  interimText: string;
  /** Finalised transcript accumulated so far in this session (display + insert). */
  recordedText: string;
  /** Current Caty AI phase for display in the status pill. */
  phase: MicPhase;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  cancel: () => void;
}

function getSR(): any {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useMicVoiceRecorder({
  editorRootRef,
  getEditorView,
  lang = 'en-US',
}: Options): Result {
  const SR = getSR();
  const isSupported = !!SR;

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [recordedText, setRecordedText] = useState('');
  // Phase drives the "Caty is …" pill label.
  // listening    → mic open, no words heard yet
  // transcribing → interim or final text is arriving
  // translating  → auto-lang switched mid-session (brief visual hint)
  const [phase, setPhase] = useState<MicPhase>('listening');
  const prevLangRef = useRef<string>(lang);

  const recognitionRef = useRef<any>(null);
  // True while we WANT the recognition running — onend uses this to
  // decide whether to auto-restart (some engines stop on silence).
  const wantsRunningRef = useRef(false);
  const bufferRef = useRef<string>('');
  const interimRef = useRef<string>('');
  const langRef = useRef(lang);
  langRef.current = lang;

  const insertText = useCallback(
    (text: string) => {
      const view = getEditorView();
      if (!view) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        const active = document.activeElement;
        const editorHasFocus =
          active instanceof HTMLElement &&
          active.isContentEditable &&
          !!editorRootRef.current?.contains(active);
        const insertPos = editorHasFocus
          ? view.state.selection.to
          : view.state.doc.content.size;
        const padded = insertPos > 0 ? ` ${trimmed}` : trimmed;
        const tr = view.state.tr.insertText(padded, insertPos, insertPos);
        view.dispatch(tr);
      } catch {
        /* PM may reject if state went stale — skip */
      }
    },
    [editorRootRef, getEditorView],
  );

  const stopRecognition = useCallback(() => {
    wantsRunningRef.current = false;
    const r = recognitionRef.current;
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
    if (!isSupported || recognitionRef.current) return;
    let recognition: any;
    try {
      recognition = new SR();
    } catch {
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
            // Detect language switch mid-session → show "translating" briefly.
            const arabic = (next.match(/[؀-ۿ]/g) || []).length;
            const latin = (next.match(/[A-Za-z]/g) || []).length;
            const detectedLang = arabic > latin ? 'ar-SA' : 'en-US';
            if (prevLangRef.current !== detectedLang && bufferRef.current) {
              setPhase('translating');
              setTimeout(() => setPhase('transcribing'), 1200);
            } else {
              setPhase('transcribing');
            }
            prevLangRef.current = detectedLang;
            bufferRef.current = bufferRef.current
              ? `${bufferRef.current} ${next}`
              : next;
            bufferChanged = true;
          }
        } else {
          interim += transcript;
          // As soon as any interim text arrives, move from listening → transcribing.
          if (interim.trim()) setPhase('transcribing');
        }
      }
      interimRef.current = interim;
      setInterimText(interim);
      if (bufferChanged) setRecordedText(bufferRef.current);
    };

    recognition.onerror = (event: any) => {
      const err = event?.error;
      if (err === 'no-speech' || err === 'aborted') return;
      console.warn('[useMicVoiceRecorder] recognition error', err);
    };

    recognition.onend = () => {
      // Engine ended on its own (often after a silence gap). Restart if
      // the user hasn't asked us to stop.
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
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      wantsRunningRef.current = true;
    } catch (e) {
      console.warn('[useMicVoiceRecorder] failed to start', e);
    }
  }, [SR, isSupported]);

  const start = useCallback(() => {
    if (!isSupported || isActive) return;
    bufferRef.current = '';
    interimRef.current = '';
    prevLangRef.current = langRef.current;
    setInterimText('');
    setRecordedText('');
    setPhase('listening');
    setIsActive(true);
    setIsPaused(false);
    startRecognition();
  }, [isSupported, isActive, startRecognition]);

  const pause = useCallback(() => {
    if (!isActive || isPaused) return;
    setIsPaused(true);
    stopRecognition();
    // Promote any in-flight interim into the buffer before discarding —
    // SpeechRecognition only finalises after a silence gap, so if the
    // user pauses mid-phrase the spoken words live only in interim.
    // Without this, those words would be lost on pause.
    const pendingInterim = interimRef.current.trim();
    if (pendingInterim) {
      bufferRef.current = bufferRef.current
        ? `${bufferRef.current} ${pendingInterim}`
        : pendingInterim;
      setRecordedText(bufferRef.current);
    }
    interimRef.current = '';
    setInterimText('');
  }, [isActive, isPaused, stopRecognition]);

  const resume = useCallback(() => {
    if (!isActive || !isPaused) return;
    setIsPaused(false);
    startRecognition();
  }, [isActive, isPaused, startRecognition]);

  const stop = useCallback(() => {
    if (!isActive) return;
    // Flush remaining interim into the final transcript before insert.
    const finalText = bufferRef.current
      ? interimRef.current.trim()
        ? `${bufferRef.current} ${interimRef.current.trim()}`
        : bufferRef.current
      : interimRef.current.trim();
    stopRecognition();
    if (finalText) insertText(finalText);
    bufferRef.current = '';
    interimRef.current = '';
    setInterimText('');
    setRecordedText('');
    setIsActive(false);
    setIsPaused(false);
  }, [isActive, insertText, stopRecognition]);

  const cancel = useCallback(() => {
    if (!isActive) return;
    stopRecognition();
    bufferRef.current = '';
    interimRef.current = '';
    setInterimText('');
    setRecordedText('');
    setIsActive(false);
    setIsPaused(false);
  }, [isActive, stopRecognition]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, [stopRecognition]);

  return {
    isSupported,
    isActive,
    isPaused,
    interimText,
    recordedText,
    phase,
    start,
    pause,
    resume,
    stop,
    cancel,
  };
}

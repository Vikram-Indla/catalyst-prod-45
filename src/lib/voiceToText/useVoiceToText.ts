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
  focus: () => void;
} | null;

interface VoiceToTextOptions {
  editorRootRef: React.RefObject<HTMLElement | null>;
  getEditorView: () => MinimalView;
  enabled: boolean;
  lang?: string;
}

interface VoiceToTextState {
  isSupported: boolean;
  isRecording: boolean;
  interimText: string;
  error: string | null;
}

const HOLD_DELAY_MS = 250;

function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useVoiceToText({
  editorRootRef,
  getEditorView,
  enabled,
  lang = 'en-US',
}: VoiceToTextOptions): VoiceToTextState {
  const SRCtor = getSpeechRecognitionCtor();
  const isSupported = Boolean(SRCtor);

  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const ctrlHeldRef = useRef(false);
  const startTimerRef = useRef<number | null>(null);
  const otherKeyDuringHoldRef = useRef(false);
  const latestInterimRef = useRef('');
  const getViewRef = useRef(getEditorView);
  getViewRef.current = getEditorView;

  const insertFinalText = useCallback((text: string) => {
    const view = getViewRef.current?.();
    if (!view) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      // Decide insertion position:
      //   - If the editor's contenteditable has focus, the user has
      //     placed a cursor explicitly → respect it (selection.to).
      //   - Otherwise (just entered edit mode, no click yet, or focus
      //     is on a toolbar button) → append at the end of the doc.
      // Either way we use (pos, pos) so existing content is never
      // replaced.
      const active = document.activeElement;
      const editorRoot = editorRootRef.current;
      const editorHasFocus =
        active instanceof HTMLElement &&
        active.isContentEditable &&
        !!editorRoot?.contains(active);
      const insertPos = editorHasFocus
        ? view.state.selection.to
        : view.state.doc.content.size;
      const padded = insertPos > 0 ? ` ${trimmed}` : trimmed;
      const tr = view.state.tr.insertText(padded, insertPos, insertPos);
      view.dispatch(tr);
    } catch {
      /* PM may reject if state went stale — skip */
    }
  }, [editorRootRef]);

  const stop = useCallback(() => {
    if (startTimerRef.current !== null) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    // Speech engines only mark a result "final" after a silence gap.
    // If the user releases Ctrl mid-phrase, the engine still has the
    // last words in interim state — those would be lost otherwise.
    // Flush whatever interim transcript we have as if it were final.
    const pendingInterim = latestInterimRef.current;
    latestInterimRef.current = '';
    if (pendingInterim.trim()) {
      insertFinalText(pendingInterim);
    }
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
    setIsRecording(false);
    setInterimText('');
  }, [insertFinalText]);

  const start = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;
    setError(null);
    let recognition: any;
    try {
      recognition = new SRCtor();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speech recognition failed to start');
      return;
    }
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript ?? '';
        if (res.isFinal) {
          insertFinalText(transcript);
        } else {
          interim += transcript;
        }
      }
      latestInterimRef.current = interim;
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      const errName = event?.error ?? 'unknown';
      if (errName === 'no-speech' || errName === 'aborted') return;
      setError(String(errName));
    };

    recognition.onend = () => {
      // Auto-restart only while Ctrl is still held (some engines stop on silence)
      if (ctrlHeldRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
          return;
        } catch {
          /* fall through to teardown */
        }
      }
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setIsRecording(false);
        setInterimText('');
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speech recognition failed to start');
    }
  }, [SRCtor, isSupported, lang, insertFinalText]);

  useEffect(() => {
    if (!enabled || !isSupported) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        if (ctrlHeldRef.current) return;
        // Editor is mounted (this hook only runs while it is) — that's
        // enough. We don't require the contenteditable to already have
        // focus; insertFinalText falls back to end-of-doc when no
        // cursor is placed.
        if (!editorRootRef.current?.isConnected) return;
        ctrlHeldRef.current = true;
        otherKeyDuringHoldRef.current = false;
        startTimerRef.current = window.setTimeout(() => {
          if (ctrlHeldRef.current && !otherKeyDuringHoldRef.current) {
            start();
          }
          startTimerRef.current = null;
        }, HOLD_DELAY_MS);
      } else if (ctrlHeldRef.current) {
        // user pressed another key while holding Ctrl → it's a shortcut
        otherKeyDuringHoldRef.current = true;
        if (startTimerRef.current !== null) {
          window.clearTimeout(startTimerRef.current);
          startTimerRef.current = null;
        }
        if (recognitionRef.current) stop();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlHeldRef.current = false;
        if (startTimerRef.current !== null) {
          window.clearTimeout(startTimerRef.current);
          startTimerRef.current = null;
        }
        if (recognitionRef.current) stop();
      }
    };

    const onBlur = () => {
      // window/tab blur — bail out cleanly
      ctrlHeldRef.current = false;
      if (recognitionRef.current) stop();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      if (recognitionRef.current) stop();
    };
  }, [enabled, isSupported, editorRootRef, start, stop]);

  // Cleanup on disable
  useEffect(() => {
    if (enabled) return;
    if (recognitionRef.current) stop();
  }, [enabled, stop]);

  return { isSupported, isRecording, interimText, error };
}

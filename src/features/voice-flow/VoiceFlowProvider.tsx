import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';
import { useAuth } from '@/hooks/useAuth';
import { VOICE_FLOW_CONFIG, getPreferredLanguage, setPreferredLanguage } from './voiceFlow.config';
import { AudioCaptureService } from './AudioCaptureService';
import { insertTextIntoTarget, restoreFieldSnapshot } from './insertTextIntoTarget';
import { cleanupTranscript } from './cleanupTranscript';
import { RealtimeTranscriber, realtimeAvailable } from './RealtimeTranscriber';
import { armCorrectionLearner, getActiveTerms } from './dictionary';
import { useVoiceHotkey } from './useVoiceHotkey';
import { VoiceFloatingCapsule } from './VoiceFloatingCapsule';
import { DictationCTA } from './DictationCTA';
import type { ActiveField, VoiceFlowContextValue, VoiceResult, VoiceStatus } from './voiceFlow.types';

const VoiceFlowContext = createContext<VoiceFlowContextValue>({
  status: 'idle',
  result: null,
  errorMessage: null,
  isActive: false,
  commit: () => {},
  cancel: () => {},
});

export const useVoiceFlow = () => useContext(VoiceFlowContext);

interface Props { children?: React.ReactNode }

// Edge function URL — reconstructed for streaming fetch (supabase.functions.invoke doesn't stream)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lmqwtldpfacrrlvdnmld.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const VOICE_FN_URL = `${SUPABASE_URL}/functions/v1/voice-transcribe`;

export function VoiceFlowProvider({ children }: Props) {
  const { isModuleEnabled } = useFeatureFlags();
  const { isAuthenticated, loading: authLoading } = useAuth();
  // CatyFlow is a signed-in feature ONLY: the login page (and every other
  // public surface) must never show the mic. Every dictation lane needs the
  // user's JWT anyway, so signed-out dictation could never work. While auth
  // state is still resolving we stay OFF (public-safe default).
  const featureEnabled =
    import.meta.env.VITE_VOICE_DICTATION_ENABLED === 'true' &&
    isModuleEnabled('voice_dictation') &&
    !authLoading &&
    isAuthenticated;

  // One-time migration: remove stale localStorage language key that caused
  // Urdu/Arabic/Hindi sessions to bypass Groq and use native SpeechRecognition.
  useEffect(() => {
    try { localStorage.removeItem('catalyst.voice.language'); } catch { /* ignore */ }
  }, []);

  const [status, setStatus]                     = useState<VoiceStatus>('idle');
  const [result, setResult]                     = useState<VoiceResult | null>(null);
  const [errorMessage, setErrorMessage]         = useState<string | null>(null);
  const [elapsedMs, setElapsedMs]               = useState<number>(0);
  const [canPause, setCanPause]                 = useState<boolean>(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode]         = useState<AnalyserNode | null>(null);
  const [partialText, setPartialText]           = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const statusRef         = useRef<VoiceStatus>('idle');
  const captureRef        = useRef<AudioCaptureService>(new AudioCaptureService());
  const realtimeRef       = useRef<RealtimeTranscriber | null>(null);
  const commandRef        = useRef<{ selectedText: string } | null>(null);
  const [commandMode, setCommandMode] = useState(false);
  const fieldRef          = useRef<ActiveField | null>(null);
  const sessionIdRef      = useRef<string | null>(null);
  const stopAndProcessRef = useRef<() => Promise<void>>(() => Promise.resolve());
  // Native SpeechRecognition path (English only — skips edge function entirely)
  const recognitionRef  = useRef<SpeechRecognition | null>(null);
  const nativeModeRef   = useRef(false);

  const setStatusBoth = (s: VoiceStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const reset = useCallback(() => {
    realtimeRef.current?.dispose();
    realtimeRef.current = null;
    commandRef.current = null;
    setCommandMode(false);
    if (nativeModeRef.current) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      nativeModeRef.current = false;
    } else {
      captureRef.current.cancel();
    }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    fieldRef.current     = null;
    sessionIdRef.current = null;
    statusRef.current    = 'idle';
    setStatus('idle');
    setResult(null);
    setErrorMessage(null);
    setDetectedLanguage(null);
    setElapsedMs(0);
    setCanPause(false);
    setAnalyserNode(null);
    setPartialText(null);
  }, []);

  /** Schedules reset() guarded by session ID — prevents stale error/cancel
   *  timeouts from killing a session that started after the error fired.
   *  Root cause of "second attempt fails": setTimeout(reset, N) was fire-and-forget;
   *  a new session would start but the old timer would call reset() mid-flight. */
  const scheduleReset = useCallback((delayMs: number) => {
    const snapshotId = sessionIdRef.current;
    setTimeout(() => {
      if (sessionIdRef.current === snapshotId) reset();
    }, delayMs);
  }, [reset]);

  // ─── Stop recording → Gemini (streaming) → result ────────────────────
  const stopAndProcess = useCallback(async () => {
    if (nativeModeRef.current) {
      // Native path: stop() triggers onend → handleResult called there
      recognitionRef.current?.stop();
      return;
    }
    if (
      !captureRef.current.isRecording &&
      !captureRef.current.isPaused &&
      statusRef.current !== 'listening' &&
      statusRef.current !== 'paused'
    ) return;
    setStatusBoth('processing');
    setAnalyserNode(null); // stop waveform; mic stops below

    // ── CatyFlow realtime shortcut ─────────────────────────────────────
    // If the live WebRTC lane produced a transcript, it IS the result —
    // no batch round-trip. Small grace wait lets the final delta land.
    const rt = realtimeRef.current;
    if (rt?.hasTranscript) {
      const rtStart = Date.now();
      await new Promise((r) => setTimeout(r, 350));
      const transcript = rt.transcript;
      rt.dispose();
      realtimeRef.current = null;
      let durationRt = 0;
      try {
        ({ durationMs: durationRt } = await captureRef.current.stop());
      } catch { /* recording stop failure is irrelevant on this lane */ }
      if (transcript) {
        setPartialText(null);
        await handleResult(transcript, undefined, 'high', durationRt, rtStart);
        return;
      }
    } else if (rt) {
      rt.dispose();
      realtimeRef.current = null;
    }

    let blob: Blob;
    let durationMs: number;

    try {
      ({ blob, durationMs } = await captureRef.current.stop());
    } catch (e) {
      console.warn('[VoiceFlow] stop capture failed:', e);
      setErrorMessage('Failed to capture audio');
      setStatusBoth('error');
      scheduleReset(3000);
      return;
    }

    if (blob.size < 1000) {
      setErrorMessage('No audio captured — speak after the capsule appears');
      setStatusBoth('error');
      scheduleReset(3000);
      return;
    }

    // Convert blob → base64
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binaryStr = '';
    for (let i = 0; i < uint8.length; i++) binaryStr += String.fromCharCode(uint8[i]);
    const audioBase64 = btoa(binaryStr);
    const mimeType = blob.type || 'audio/webm';

    const geminiStart = Date.now();

    // Get auth token for direct fetch
    let authToken = SUPABASE_ANON_KEY;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        authToken = sessionData.session.access_token;
      }
    } catch { /* fall back to anon key */ }

    const preferredLanguage = getPreferredLanguage();

    try {
      const resp = await fetch(VOICE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          sessionId: sessionIdRef.current,
          sourceLanguages: VOICE_FLOW_CONFIG.sourceLanguages,
          cleanupEnabled: VOICE_FLOW_CONFIG.cleanupEnabled,
          preferredLanguage: preferredLanguage ?? undefined,
          streaming: true,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({})) as Record<string, unknown>;
        const friendlyMsg = resp.status === 429
          ? 'Busy — try again in a moment'
          : (errBody?.message as string | undefined) ?? `Transcription error (${resp.status})`;
        throw new Error(friendlyMsg);
      }

      const contentType = resp.headers.get('content-type') ?? '';

      // ── SSE streaming path ────────────────────────────────────────────
      if (contentType.includes('text/event-stream') && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let finalData: Record<string, unknown> | null = null;

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') break outer;
              try {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                // Final result packet — no candidates, carries result fields
                if ('englishText' in parsed) {
                  finalData = parsed;
                  break outer;
                }
                // Gemini SSE candidate delta
                const candidates = parsed.candidates as Array<{content:{parts:Array<{text:string}>}}> | undefined;
                if (candidates?.[0]?.content?.parts?.[0]?.text) {
                  accumulated += candidates[0].content.parts[0].text;
                  if (statusRef.current === 'processing') {
                    setPartialText(accumulated);
                  }
                }
              } catch { /* malformed line — skip */ }
            }
          }
        }

        // Parse final SSE packet or fall back to accumulated text
        let englishText: string;
        let detectedLang: string | undefined;
        let confidence: 'high' | 'low' | undefined;

        if (finalData) {
          englishText  = finalData.englishText as string;
          detectedLang = finalData.detectedLanguage as string | undefined;
          confidence   = finalData.confidence as 'high' | 'low' | undefined;
        } else {
          // Parse accumulated streaming text for markers
          let text = accumulated;
          if (text.startsWith('[LOW_CONFIDENCE]:')) {
            confidence = 'low';
            text = text.slice('[LOW_CONFIDENCE]:'.length).trim();
          }
          const langMatch = text.match(/\[LANG:([^\]]+)\]\s*$/);
          if (langMatch) {
            detectedLang = langMatch[1];
            text = text.slice(0, langMatch.index).trim();
          }
          englishText = text;
        }

        if (!englishText) throw new Error('Empty transcription');

        setPartialText(null);
        await handleResult(englishText, detectedLang, confidence, durationMs, geminiStart);

      } else {
        // ── Non-streaming JSON fallback ──────────────────────────────────
        const data = await resp.json() as Record<string, unknown>;
        if (!data?.englishText) throw new Error((data?.error as string) ?? 'Empty transcription');

        setPartialText(null);
        await handleResult(
          data.englishText as string,
          data.detectedLanguage as string | undefined,
          data.confidence as 'high' | 'low' | undefined,
          durationMs,
          geminiStart,
        );
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Translation failed';
      console.error('[VoiceFlow] transcription error:', e);
      setPartialText(null);
      setErrorMessage(msg);
      setStatusBoth('error');
      void updateSession('error', undefined, msg);
      scheduleReset(4000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, scheduleReset]);

  const handleResult = useCallback(async (
    englishText: string,
    detectedLang: string | undefined,
    confidence: 'high' | 'low' | undefined,
    durationMs: number,
    geminiStart: number,
  ) => {
    // Session identity at entry: the cleanup/rewrite awaits below take up to
    // ~1.5s, during which the user may press Escape. A cancelled (or
    // superseded) session must never write into the field afterwards.
    const sessId = sessionIdRef.current;
    const sessionCancelled = () =>
      statusRef.current === 'cancelled' ||
      statusRef.current === 'idle' ||
      sessionIdRef.current !== sessId;

    // Command mode: the transcript is an INSTRUCTION applied to the text
    // that was selected at activation. The rewrite replaces the selection
    // (insertTextIntoTarget writes over the saved range). ~1.5s is
    // acceptable here, so no deadline race — failure is surfaced.
    const command = commandRef.current;
    if (command) {
      commandRef.current = null;
      setCommandMode(false);
      try {
        const { data, error } = await supabase.functions.invoke('catyflow-clean', {
          body: { mode: 'command', text: englishText, selected_text: command.selectedText },
        });
        const rewritten = (data as { cleaned?: string } | null)?.cleaned?.trim();
        if (error || !rewritten) throw new Error('command rewrite failed');
        const voiceResultCmd: VoiceResult = {
          englishText: rewritten,
          rawText: command.selectedText,
          detectedLanguage: detectedLang,
          confidence: 'high',
          durationMs,
          geminiLatencyMs: Date.now() - geminiStart,
        };
        if (sessionCancelled()) return;
        setResult(voiceResultCmd);
        if (VOICE_FLOW_CONFIG.autoCommit && fieldRef.current) {
          setStatusBoth('committing');
          try {
            insertTextIntoTarget(fieldRef.current, rewritten);
          } catch (insertErr) {
            console.warn('[VoiceFlow] command insert failed:', insertErr);
          }
          void updateSession('completed', voiceResultCmd);
          scheduleReset(200);
        } else {
          setStatusBoth('ready');
        }
      } catch {
        setErrorMessage('Could not apply the change — selection left untouched');
        setStatusBoth('error');
        scheduleReset(4000);
      }
      return;
    }

    // CatyFlow polish pass (CAT-VOICE-FLOW-20260704-001): register-aware
    // cleanup raced against a deadline — a late/failed cleanup silently
    // falls back to the raw transcript, dictation never blocks on it.
    let finalText = englishText;
    let rawText: string | undefined;
    let cleanupProvider: string | undefined;
    if (VOICE_FLOW_CONFIG.cleanupEnabled) {
      try {
        const dictionary = await getActiveTerms().catch(() => [] as string[]);
        const outcome = await cleanupTranscript(englishText, fieldRef.current?.element, { dictionary });
        if (outcome && outcome.cleaned !== englishText) {
          rawText = englishText;
          finalText = outcome.cleaned;
          cleanupProvider = outcome.provider;
        }
      } catch { /* raw transcript stands */ }
    }

    const voiceResult: VoiceResult = {
      englishText: finalText,
      rawText,
      cleanupProvider,
      detectedLanguage: detectedLang,
      confidence,
      durationMs,
      geminiLatencyMs: Date.now() - geminiStart,
    };

    if (detectedLang) {
      setDetectedLanguage(detectedLang);
      setPreferredLanguage(detectedLang); // pin for next session
    }

    // The cleanup pass above awaited — bail if the user cancelled meanwhile.
    if (sessionCancelled()) return;

    setResult(voiceResult);

    const isLowConfidence =
      confidence === 'low' && VOICE_FLOW_CONFIG.confidenceReviewEnabled;

    if (isLowConfidence) {
      setStatusBoth('review');
      return;
    }

    if (VOICE_FLOW_CONFIG.autoCommit && fieldRef.current) {
      setStatusBoth('committing');
      try {
        insertTextIntoTarget(fieldRef.current, finalText);
        // Dictionary learning: if the user types over what we inserted,
        // the correction becomes vocabulary (fires on blur / 45s).
        armCorrectionLearner(fieldRef.current.element);
      } catch (insertErr) {
        console.warn('[VoiceFlow] auto-commit insert failed:', insertErr);
      }
      void updateSession('completed', voiceResult);
      scheduleReset(200);
    } else {
      setStatusBoth('ready');
    }
  }, [reset, scheduleReset]);

  stopAndProcessRef.current = stopAndProcess;

  // Count-up tick while listening (CAT-VOICE-UX-PREMIUM-20260708-001 S1:
  // count-up reassures, countdown reads as a deadline). Paused time does not
  // tick — the interval only runs in 'listening'.
  useEffect(() => {
    if (status === 'listening') {
      countdownRef.current = setInterval(() => {
        setElapsedMs(prev => prev + 1000);
      }, 1000);
    } else {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    }
    return () => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } };
  }, [status]);

  // ─── Pause / Resume ───────────────────────────────────────────────────
  const pause = useCallback(() => {
    if (statusRef.current !== 'listening' || nativeModeRef.current) return;
    captureRef.current.pause();
    realtimeRef.current?.setPaused(true);
    setStatusBoth('paused');
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    captureRef.current.resume();
    realtimeRef.current?.setPaused(false);
    setStatusBoth('listening');
  }, []);

  // ─── Cancel ──────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    if (statusRef.current === 'idle') return;
    realtimeRef.current?.dispose();
    realtimeRef.current = null;
    if (nativeModeRef.current) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      nativeModeRef.current = false;
    } else {
      captureRef.current.cancel();
    }
    setStatusBoth('cancelled');
    // A cancelled session must leave the field exactly as it was before
    // activation — this restores the space double-space activation removed
    // (and any session insert that raced the cancel) for input/textarea.
    if (fieldRef.current) {
      try {
        restoreFieldSnapshot(fieldRef.current);
      } catch { /* best-effort */ }
    }
    void updateSession('cancelled');
    scheduleReset(400);
  }, [reset, scheduleReset]);

  // ─── Commit ──────────────────────────────────────────────────────────
  const commit = useCallback(() => {
    const s = statusRef.current;
    if (s === 'listening' || s === 'paused') {
      void stopAndProcessRef.current();
      return;
    }
    // 'ready' and 'review' both commit the result text into the target field
    if ((s === 'ready' || s === 'review') && fieldRef.current) {
      const r = result;
      if (!r) return;
      setStatusBoth('committing');
      try {
        insertTextIntoTarget(fieldRef.current, r.englishText);
      } catch (e) {
        console.warn('[VoiceFlow] insert failed:', e);
      }
      void updateSession('completed', r);
      scheduleReset(200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, reset, scheduleReset]);

  // ─── Activation ──────────────────────────────────────────────────────
  const handleActivate = useCallback(async (field: ActiveField) => {
    console.log('[VF] handleActivate status=', statusRef.current, 'prefLang=', getPreferredLanguage());
    if (statusRef.current !== 'idle') {
      // Allow re-activation from terminal non-active states (error, committing)
      if (statusRef.current === 'error' || statusRef.current === 'committing') reset();
      else return;
    }

    fieldRef.current = field;

    // Command mode (Wispr parity): a non-collapsed selection at activation
    // means "apply my spoken instruction to this text" instead of dictation.
    let selectedText = '';
    if (field.kind === 'contenteditable') {
      selectedText = field.savedRange?.toString() ?? '';
    } else {
      const el = field.element as HTMLInputElement | HTMLTextAreaElement;
      if (
        typeof el.value === 'string' &&
        field.savedStart >= 0 &&
        field.savedEnd > field.savedStart
      ) {
        selectedText = el.value.slice(field.savedStart, field.savedEnd);
      }
    }
    commandRef.current = selectedText.trim() ? { selectedText } : null;
    setCommandMode(!!commandRef.current);

    setStatusBoth('arming');

    const sessId = crypto.randomUUID();
    sessionIdRef.current = sessId;
    void logSessionStart(sessId, field.kind);

    const prefLang = getPreferredLanguage();
    const SR: (new () => SpeechRecognition) | undefined =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;

    if (prefLang === 'en' && SR) {
      // ── Native English path: zero edge-function calls, zero latency ──
      // Native SpeechRecognition has no pause API — hide the pause control.
      nativeModeRef.current = true;
      setCanPause(false);
      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      const sessionStart = Date.now();
      let finalTranscript = '';

      recognition.onstart = () => { console.log('[VF] native SR onstart'); setStatusBoth('listening'); };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += t;
          else interim += t;
        }
        // Live caption accumulates finals + interim so the speaker sees the
        // whole utterance build up, not just the trailing fragment.
        if (statusRef.current === 'listening') {
          const live = (finalTranscript + interim).trim();
          if (live) setPartialText(live);
        }
      };

      recognition.onend = async () => {
        nativeModeRef.current = false;
        recognitionRef.current = null;
        if (statusRef.current !== 'listening' && statusRef.current !== 'processing') return;
        setStatusBoth('processing');
        setPartialText(null);
        const durationMs = Date.now() - sessionStart;
        if (finalTranscript.trim()) {
          await handleResult(finalTranscript.trim(), 'en', 'high', durationMs, sessionStart);
        } else {
          setErrorMessage('No speech detected');
          setStatusBoth('error');
          scheduleReset(3000);
        }
      };

      recognition.onerror = (event) => {
        nativeModeRef.current = false;
        recognitionRef.current = null;
        const err = (event as SpeechRecognitionErrorEvent).error;
        console.error('[VF] native SR onerror=', err, 'status=', statusRef.current);
        const msg = err === 'not-allowed'
          ? 'Microphone access denied. Check browser permissions.'
          : err === 'no-speech' ? 'No speech detected' : `Speech recognition error: ${err}`;
        setErrorMessage(msg);
        setStatusBoth('error');
        scheduleReset(3000);
      };

      try {
        console.log('[VF] calling recognition.start() nativeModeRef=', nativeModeRef.current);
        recognition.start();
      } catch {
        nativeModeRef.current = false;
        recognitionRef.current = null;
        setErrorMessage('Speech recognition unavailable');
        setStatusBoth('error');
        scheduleReset(3000);
      }
      return;
    }

    // ── Groq / Gemini path (AR/UR/HI + first-ever session) ───────────
    nativeModeRef.current = false;
    setCanPause(true);
    // Fresh instance every activation — guarantees clean stream/AudioContext state
    captureRef.current = new AudioCaptureService();

    try {
      await captureRef.current.start({
        onMaxDuration: () => {
          void stopAndProcessRef.current();
        },
      });

      const node = captureRef.current.getAnalyserNode();
      setAnalyserNode(node);

      // CatyFlow realtime lane: when the AI gateway is configured, stream
      // live transcription over WebRTC in parallel with the recording —
      // Arabic/English words appear on screen while speaking, and the
      // final transcript replaces the batch round-trip on stop. The
      // MediaRecorder keeps recording regardless, so a realtime failure
      // costs nothing: stopAndProcess falls back to the batch path.
      realtimeRef.current?.dispose();
      realtimeRef.current = null;
      const micStream = captureRef.current.getStream();
      if (micStream) {
        void realtimeAvailable().then((ok) => {
          if (!ok || (statusRef.current !== 'listening' && statusRef.current !== 'arming')) return;
          const rt = new RealtimeTranscriber();
          realtimeRef.current = rt;
          void getActiveTerms()
            .catch(() => [] as string[])
            .then((vocabulary) =>
              rt.start(
                micStream,
                {
                  onLive: (text) => {
                    if ((statusRef.current === 'listening' || statusRef.current === 'paused') && text) {
                      setPartialText(text);
                    }
                  },
                },
                vocabulary,
              ),
            )
            .then((started) => {
              if (!started && realtimeRef.current === rt) realtimeRef.current = null;
            });
        });
      }

      setStatusBoth('listening');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Microphone access denied';
      setErrorMessage(msg.includes('NotAllowedError') || msg.includes('Permission')
        ? 'Microphone access denied. Check browser permissions.'
        : msg);
      setStatusBoth('error');
      scheduleReset(3000);
    }
  }, [reset, scheduleReset]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────
  useVoiceHotkey({
    enabled: featureEnabled,
    // Only block hotkeys while actively recording/processing/reviewing.
    // 'error' and 'committing' are terminal transitions — allow re-activation.
    isVoiceActive: status === 'arming' || status === 'listening' || status === 'paused' || status === 'processing' || status === 'ready' || status === 'review',
    onActivate: handleActivate,
    onCommit: commit,
    onCancel: cancel,
    getActiveField: () => fieldRef.current,
  });

  // ─── Audit helpers ────────────────────────────────────────────────────
  async function logSessionStart(id: string, kind: string) {
    try {
      await supabase.from('voice_dictation_sessions' as never).insert({
        id,
        target_field_kind: kind,
        status: 'started',
      } as never);
    } catch { /* non-blocking */ }
  }

  async function updateSession(newStatus: string, vr?: VoiceResult, errorCode?: string) {
    if (!sessionIdRef.current) return;
    try {
      await supabase.from('voice_dictation_sessions' as never).update({
        status:            newStatus,
        duration_ms:       vr?.durationMs,
        detected_language: vr?.detectedLanguage,
        gemini_latency_ms: vr?.geminiLatencyMs,
        error_code:        errorCode,
      } as never).eq('id' as never, sessionIdRef.current as never);
    } catch { /* non-blocking */ }
  }

  const contextValue: VoiceFlowContextValue = {
    status,
    result,
    errorMessage,
    isActive: status !== 'idle',
    commit,
    cancel,
  };

  return (
    <VoiceFlowContext.Provider value={contextValue}>
      {children}
      {featureEnabled && (
        <DictationCTA sessionActive={status !== 'idle'} onActivate={handleActivate} />
      )}
      {featureEnabled && (
        <VoiceFloatingCapsule
          status={status}
          anchorElement={fieldRef.current?.element ?? null}
          resultText={result?.englishText ?? null}
          errorMessage={errorMessage}
          onCommit={commit}
          onCancel={cancel}
          onPause={pause}
          onResume={resume}
          canPause={canPause}
          elapsedMs={elapsedMs}
          detectedLanguage={detectedLanguage}
          analyserNode={analyserNode}
          partialText={partialText}
          commandMode={commandMode}
        />
      )}
    </VoiceFlowContext.Provider>
  );
}

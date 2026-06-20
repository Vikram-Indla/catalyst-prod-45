import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';
import { VOICE_FLOW_CONFIG, getPreferredLanguage, setPreferredLanguage } from './voiceFlow.config';
import { AudioCaptureService } from './AudioCaptureService';
import { insertTextIntoTarget } from './insertTextIntoTarget';
import { useVoiceHotkey } from './useVoiceHotkey';
import { VoiceFloatingCapsule } from './VoiceFloatingCapsule';
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
  const featureEnabled =
    import.meta.env.VITE_VOICE_DICTATION_ENABLED === 'true' &&
    isModuleEnabled('voice_dictation');

  // One-time migration: remove stale localStorage language key that caused
  // Urdu/Arabic/Hindi sessions to bypass Groq and use native SpeechRecognition.
  useEffect(() => {
    try { localStorage.removeItem('catalyst.voice.language'); } catch { /* ignore */ }
  }, []);

  const [status, setStatus]                     = useState<VoiceStatus>('idle');
  const [result, setResult]                     = useState<VoiceResult | null>(null);
  const [errorMessage, setErrorMessage]         = useState<string | null>(null);
  const [remainingMs, setRemainingMs]           = useState<number>(VOICE_FLOW_CONFIG.maxDurationMs);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode]         = useState<AnalyserNode | null>(null);
  const [partialText, setPartialText]           = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const statusRef         = useRef<VoiceStatus>('idle');
  const captureRef        = useRef<AudioCaptureService>(new AudioCaptureService());
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
    setRemainingMs(VOICE_FLOW_CONFIG.maxDurationMs);
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
    if (!captureRef.current.isRecording && statusRef.current !== 'listening') return;
    setStatusBoth('processing');
    setAnalyserNode(null); // stop waveform; mic stops below

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
    const voiceResult: VoiceResult = {
      englishText,
      detectedLanguage: detectedLang,
      confidence,
      durationMs,
      geminiLatencyMs: Date.now() - geminiStart,
    };

    if (detectedLang) {
      setDetectedLanguage(detectedLang);
      setPreferredLanguage(detectedLang); // pin for next session
    }

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
        insertTextIntoTarget(fieldRef.current, englishText);
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

  // Countdown tick while listening
  useEffect(() => {
    if (status === 'listening') {
      setRemainingMs(VOICE_FLOW_CONFIG.maxDurationMs);
      countdownRef.current = setInterval(() => {
        setRemainingMs(prev => Math.max(0, prev - 1000));
      }, 1000);
    } else {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    }
    return () => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } };
  }, [status]);

  // ─── Cancel ──────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    if (statusRef.current === 'idle') return;
    if (nativeModeRef.current) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      nativeModeRef.current = false;
    } else {
      captureRef.current.cancel();
    }
    setStatusBoth('cancelled');
    void updateSession('cancelled');
    scheduleReset(400);
  }, [reset, scheduleReset]);

  // ─── Commit ──────────────────────────────────────────────────────────
  const commit = useCallback(() => {
    const s = statusRef.current;
    if (s === 'listening') {
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
    // Block re-activation ONLY while a recording is genuinely in flight. Every
    // other non-idle state (ready/review parked result, committing, cancelled,
    // error) is terminal for that session — a fresh double-space means
    // "re-dictate", so discard whatever is parked and start clean. This is the
    // fix for "voice only works once": low-confidence Arabic parks at 'review'
    // and the session never returned to idle, so the next activation was blocked.
    const recordingInFlight =
      statusRef.current === 'arming' ||
      statusRef.current === 'listening' ||
      statusRef.current === 'processing';
    if (recordingInFlight) return;
    if (statusRef.current !== 'idle') reset();

    fieldRef.current = field;
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
      nativeModeRef.current = true;
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
        if (interim && statusRef.current === 'listening') setPartialText(interim);
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
    // Fresh instance every activation — guarantees clean stream/AudioContext state
    captureRef.current = new AudioCaptureService();

    try {
      await captureRef.current.start({
        onSilenceTimeout: () => {
          if (statusRef.current === 'listening') void stopAndProcessRef.current();
        },
        onMaxDuration: () => {
          void stopAndProcessRef.current();
        },
      });

      const node = captureRef.current.getAnalyserNode();
      setAnalyserNode(node);

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
    // Recording phase: mic capturing or blob transcribing — Space commits/stops.
    isRecording: status === 'arming' || status === 'listening' || status === 'processing',
    // Pending phase: result parked for confirm (ready/review), mic OFF — Enter
    // commits, Escape discards, and a fresh double-space re-arms a new recording.
    isResultPending: status === 'ready' || status === 'review',
    onActivate: handleActivate,
    onCommit: commit,
    onCancel: cancel,
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
        <VoiceFloatingCapsule
          status={status}
          anchorElement={fieldRef.current?.element ?? null}
          resultText={result?.englishText ?? null}
          errorMessage={errorMessage}
          onCommit={commit}
          onCancel={cancel}
          remainingMs={remainingMs}
          detectedLanguage={detectedLanguage}
          analyserNode={analyserNode}
          partialText={partialText}
        />
      )}
    </VoiceFlowContext.Provider>
  );
}

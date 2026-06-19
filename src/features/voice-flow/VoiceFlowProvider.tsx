import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';
import { VOICE_FLOW_CONFIG } from './voiceFlow.config';
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

export function VoiceFlowProvider({ children }: Props) {
  const { isModuleEnabled } = useFeatureFlags();
  const featureEnabled =
    import.meta.env.VITE_VOICE_DICTATION_ENABLED === 'true' &&
    isModuleEnabled('voice_dictation');

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(VOICE_FLOW_CONFIG.maxDurationMs);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref mirror of status — timer/async callbacks read this to avoid stale closure
  const statusRef         = useRef<VoiceStatus>('idle');
  const captureRef        = useRef(new AudioCaptureService());
  const fieldRef          = useRef<ActiveField | null>(null);
  const sessionIdRef      = useRef<string | null>(null);
  // Stable ref to stopAndProcess so commit can always call the current version
  const stopAndProcessRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const setStatusBoth = (s: VoiceStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const reset = useCallback(() => {
    captureRef.current.cancel();
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    fieldRef.current     = null;
    sessionIdRef.current = null;
    statusRef.current    = 'idle';
    setStatus('idle');
    setResult(null);
    setErrorMessage(null);
    setDetectedLanguage(null);
    setRemainingMs(VOICE_FLOW_CONFIG.maxDurationMs);
  }, []);

  // ─── Stop recording → Gemini → commit ────────────────────────────────
  const stopAndProcess = useCallback(async () => {
    if (!captureRef.current.isRecording && statusRef.current !== 'listening') return;
    setStatusBoth('processing');

    let blob: Blob;
    let durationMs: number;

    try {
      ({ blob, durationMs } = await captureRef.current.stop());
    } catch (e) {
      console.warn('[VoiceFlow] stop capture failed:', e);
      setErrorMessage('Failed to capture audio');
      setStatusBoth('error');
      setTimeout(reset, 3000);
      return;
    }

    if (blob.size < 1000) {
      setErrorMessage('No audio captured — speak after the capsule appears');
      setStatusBoth('error');
      setTimeout(reset, 3000);
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

    try {
      const { data, error } = await supabase.functions.invoke('voice-transcribe', {
        body: {
          audioBase64,
          mimeType,
          sessionId: sessionIdRef.current,
          sourceLanguages: VOICE_FLOW_CONFIG.sourceLanguages,
          cleanupEnabled: VOICE_FLOW_CONFIG.cleanupEnabled,
        },
      });

      if (error || !data?.englishText) {
        throw new Error(data?.error ?? error?.message ?? 'Empty transcription');
      }

      const voiceResult: VoiceResult = {
        englishText: data.englishText as string,
        detectedLanguage: data.detectedLanguage as string | undefined,
        durationMs,
        geminiLatencyMs: Date.now() - geminiStart,
      };

      if (data.detectedLanguage) setDetectedLanguage(data.detectedLanguage as string);
      setResult(voiceResult);

      if (VOICE_FLOW_CONFIG.autoCommit && fieldRef.current) {
        setStatusBoth('committing');
        try {
          insertTextIntoTarget(fieldRef.current, voiceResult.englishText);
        } catch (insertErr) {
          console.warn('[VoiceFlow] auto-commit insert failed:', insertErr);
        }
        void updateSession('completed', voiceResult);
        setTimeout(reset, 200);
      } else {
        setStatusBoth('ready');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Translation failed';
      console.error('[VoiceFlow] transcription error:', e);
      setErrorMessage(msg);
      setStatusBoth('error');
      void updateSession('error', undefined, msg);
      setTimeout(reset, 4000);
    }
  }, [reset]);

  // Keep ref current so timer callbacks always call the latest version
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
    captureRef.current.cancel();
    setStatusBoth('cancelled');
    void updateSession('cancelled');
    setTimeout(reset, 400);
  }, [reset]);

  // ─── Commit ──────────────────────────────────────────────────────────
  const commit = useCallback(() => {
    const s = statusRef.current;
    if (s === 'listening') {
      void stopAndProcessRef.current();
      return;
    }
    if (s === 'ready' && fieldRef.current) {
      const r = result; // capture from closure
      if (!r) return;
      setStatusBoth('committing');
      try {
        insertTextIntoTarget(fieldRef.current, r.englishText);
      } catch (e) {
        console.warn('[VoiceFlow] insert failed:', e);
      }
      void updateSession('completed', r);
      setTimeout(reset, 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, reset]);

  // ─── Activation ──────────────────────────────────────────────────────
  const handleActivate = useCallback(async (field: ActiveField) => {
    if (statusRef.current !== 'idle') return;

    fieldRef.current = field;
    setStatusBoth('arming');

    const sessId = crypto.randomUUID();
    sessionIdRef.current = sessId;
    void logSessionStart(sessId, field.kind);

    try {
      await captureRef.current.start({
        // Use ref so these callbacks always see the live version of stopAndProcess
        onSilenceTimeout: () => {
          if (statusRef.current === 'listening') void stopAndProcessRef.current();
        },
        onMaxDuration: () => {
          void stopAndProcessRef.current();
        },
      });
      setStatusBoth('listening');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Microphone access denied';
      setErrorMessage(msg.includes('NotAllowedError') || msg.includes('Permission')
        ? 'Microphone access denied. Check browser permissions.'
        : msg);
      setStatusBoth('error');
      setTimeout(reset, 3000);
    }
  }, [reset]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────
  useVoiceHotkey({
    enabled: featureEnabled,
    isVoiceActive: status !== 'idle' && status !== 'cancelled',
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
        />
      )}
    </VoiceFlowContext.Provider>
  );
}

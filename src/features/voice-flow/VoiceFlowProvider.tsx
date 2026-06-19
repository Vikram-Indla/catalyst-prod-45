import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
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

/**
 * VoiceFlowProvider — global singleton for voice translate dictation.
 *
 * Gate: feature flag `voice_dictation` must be enabled in the DB.
 * Also requires env var VITE_VOICE_DICTATION_ENABLED=true for the flag
 * to take effect (double gate — admin toggle + deploy toggle).
 *
 * Phase 1 flow:
 *   double-space → arming → listening (MediaRecorder) → processing (Gemini) → commit → idle
 */
export function VoiceFlowProvider({ children }: Props) {
  const { isModuleEnabled } = useFeatureFlags();
  const featureEnabled =
    import.meta.env.VITE_VOICE_DICTATION_ENABLED === 'true' &&
    isModuleEnabled('voice_dictation');

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const captureRef   = useRef(new AudioCaptureService());
  const fieldRef     = useRef<ActiveField | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const recordStartRef = useRef(0);

  const reset = useCallback(() => {
    captureRef.current.cancel();
    fieldRef.current     = null;
    sessionIdRef.current = null;
    recordStartRef.current = 0;
    setStatus('idle');
    setResult(null);
    setErrorMessage(null);
  }, []);

  // ─── Cancel ──────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    if (status === 'idle') return;
    captureRef.current.cancel();
    setStatus('cancelled');
    void updateSession('cancelled');
    setTimeout(reset, 400); // brief "cancelled" flash, then idle
  }, [status, reset]);

  // ─── Commit ──────────────────────────────────────────────────────────
  const commit = useCallback(() => {
    if (status === 'listening') {
      // User pressed Space/Enter while recording — stop and process
      void stopAndProcess();
      return;
    }
    if (status === 'ready' && result && fieldRef.current) {
      setStatus('committing');
      try {
        insertTextIntoTarget(fieldRef.current, result.englishText);
      } catch (e) {
        console.warn('[VoiceFlow] insert failed:', e);
      }
      void updateSession('completed');
      setTimeout(reset, 200);
    }
  }, [status, result, reset]);

  // ─── Activation (double-space detected) ─────────────────────────────
  const handleActivate = useCallback(async (field: ActiveField) => {
    if (status !== 'idle') return;

    fieldRef.current = field;
    setStatus('arming');

    // Log session start
    const sessId = crypto.randomUUID();
    sessionIdRef.current = sessId;
    void logSessionStart(sessId, field.kind);

    try {
      await captureRef.current.start({
        onSilenceTimeout: () => {
          if (status === 'listening') void stopAndProcess();
        },
        onMaxDuration: () => {
          void stopAndProcess();
        },
      });
      recordStartRef.current = Date.now();
      setStatus('listening');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Microphone access denied';
      setErrorMessage(msg.includes('NotAllowedError') || msg.includes('Permission')
        ? 'Microphone access denied. Check browser permissions.'
        : msg);
      setStatus('error');
      setTimeout(reset, 3000);
    }
  }, [status, reset]);

  // ─── Stop recording → send to Gemini ─────────────────────────────────
  const stopAndProcess = useCallback(async () => {
    if (captureRef.current.isRecording === false && status !== 'listening') return;
    setStatus('processing');

    let blob: Blob;
    let durationMs: number;

    try {
      ({ blob, durationMs } = await captureRef.current.stop());
    } catch (e) {
      console.warn('[VoiceFlow] stop capture failed:', e);
      setErrorMessage('Failed to capture audio');
      setStatus('error');
      setTimeout(reset, 3000);
      return;
    }

    if (blob.size < 1000) {
      setErrorMessage('No audio captured — speak after the capsule appears');
      setStatus('error');
      setTimeout(reset, 3000);
      return;
    }

    // Convert to base64
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

      setResult(voiceResult);

      if (VOICE_FLOW_CONFIG.autoCommit && fieldRef.current) {
        setStatus('committing');
        try {
          insertTextIntoTarget(fieldRef.current, voiceResult.englishText);
        } catch (insertErr) {
          console.warn('[VoiceFlow] auto-commit insert failed:', insertErr);
        }
        void updateSession('completed', voiceResult);
        setTimeout(reset, 200);
      } else {
        setStatus('ready');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Translation failed';
      console.error('[VoiceFlow] transcription error:', e);
      setErrorMessage(msg);
      setStatus('error');
      void updateSession('error', undefined, msg);
      setTimeout(reset, 4000);
    }
  }, [status, reset]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────
  useVoiceHotkey({
    enabled: featureEnabled,
    isVoiceActive: status !== 'idle' && status !== 'cancelled' && status !== 'committed',
    onActivate: handleActivate,
    onCommit: commit,
    onCancel: cancel,
  });

  // ─── Supabase audit helpers ───────────────────────────────────────────
  async function logSessionStart(id: string, kind: string) {
    try {
      await supabase.from('voice_dictation_sessions' as never).insert({
        id,
        target_field_kind: kind,
        status: 'started',
      } as never);
    } catch { /* non-blocking */ }
  }

  async function updateSession(
    newStatus: string,
    vr?: VoiceResult,
    errorCode?: string,
  ) {
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
        />
      )}
    </VoiceFlowContext.Provider>
  );
}

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';
import { useAuth } from '@/hooks/useAuth';
import { VOICE_FLOW_CONFIG } from './voiceFlow.config';
import { AudioCaptureService } from './AudioCaptureService';
import { insertTextIntoTarget, restoreFieldSnapshot } from './insertTextIntoTarget';
import { cleanupTranscript } from './cleanupTranscript';
import { RealtimeTranscriber, realtimeAvailable } from './RealtimeTranscriber';
import { LivePartialsController, type LiveLaneStatus, type LivePartial } from './livePartials';
import { containsArabicScript } from '@/lib/i18n/detectScript';
import { playListenPing, playStopPing } from './soundPing';
import { useVoiceFlowSettings } from './useVoiceSettings';
import { armCorrectionLearner, getActiveTerms } from './dictionary';
import { useVoiceHotkey } from './useVoiceHotkey';
import { VoiceFloatingCapsule } from './VoiceFloatingCapsule';
import { ComposerGhostText } from './ComposerGhostText';
import type { ActiveField, VoiceFlowContextValue, VoiceResult, VoiceStatus } from './voiceFlow.types';

const VoiceFlowContext = createContext<VoiceFlowContextValue>({
  status: 'idle',
  result: null,
  errorMessage: null,
  isActive: false,
  enabled: false,
  activeElement: null,
  canPause: false,
  livePartial: null,
  liveLaneStatus: null,
  activate: () => {},
  commit: () => {},
  cancel: () => {},
  pause: () => {},
  resume: () => {},
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
  const [livePartial, setLivePartial]           = useState<LivePartial | null>(null);
  const [liveLaneStatus, setLiveLaneStatus]     = useState<LiveLaneStatus | null>(null);
  const partialsRef = useRef(new LivePartialsController());

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // S6a reliability: retained audio for one-click retry + latency metric.
  const lastBlobRef = useRef<{ blob: Blob; durationMs: number } | null>(null);
  const processBlobRef = useRef<(blob: Blob, durationMs: number) => Promise<void>>(async () => {});
  const listenStartRef = useRef<number | null>(null);
  const firstPartialMsRef = useRef<number | null>(null);
  const [retryAvailable, setRetryAvailable] = useState(false);

  const markFirstPartial = () => {
    if (firstPartialMsRef.current == null && listenStartRef.current != null) {
      firstPartialMsRef.current = Date.now() - listenStartRef.current;
    }
  };

  const statusRef         = useRef<VoiceStatus>('idle');
  const captureRef        = useRef<AudioCaptureService>(new AudioCaptureService());
  const realtimeRef       = useRef<RealtimeTranscriber | null>(null);
  const commandRef        = useRef<{ selectedText: string } | null>(null);
  const [commandMode, setCommandMode] = useState(false);
  const fieldRef          = useRef<ActiveField | null>(null);
  const sessionIdRef      = useRef<string | null>(null);
  const stopAndProcessRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const setStatusBoth = (s: VoiceStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const reset = useCallback(() => {
    realtimeRef.current?.dispose();
    realtimeRef.current = null;
    commandRef.current = null;
    setCommandMode(false);
    captureRef.current.cancel();
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
    setLivePartial(null);
    setLiveLaneStatus(null);
    partialsRef.current.reset();
    lastBlobRef.current = null;
    listenStartRef.current = null;
    firstPartialMsRef.current = null;
    setRetryAvailable(false);
  }, []);

  /** Schedules reset() guarded by session ID — prevents stale error/cancel
   *  timeouts from killing a session that started after the error fired.
   *  Root cause of "second attempt fails": setTimeout(reset, N) was fire-and-forget;
   *  a new session would start but the old timer would call reset() mid-flight. */
  const pendingResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReset = useCallback((delayMs: number) => {
    const snapshotId = sessionIdRef.current;
    if (pendingResetRef.current) clearTimeout(pendingResetRef.current);
    pendingResetRef.current = setTimeout(() => {
      pendingResetRef.current = null;
      if (sessionIdRef.current === snapshotId) reset();
    }, delayMs);
  }, [reset]);

  // ─── Stop recording → transcript/translation → result ────────────────
  const stopAndProcess = useCallback(async () => {
    if (
      !captureRef.current.isRecording &&
      !captureRef.current.isPaused &&
      statusRef.current !== 'listening' &&
      statusRef.current !== 'paused'
    ) return;
    setStatusBoth('processing');
    setAnalyserNode(null); // stop waveform; mic stops below

    // Grace wait lets the final live delta land before we read the lane.
    const rt = realtimeRef.current;
    let rtTranscript = '';
    const rtStart = Date.now();
    if (rt?.hasTranscript) {
      await new Promise((r) => setTimeout(r, 350));
      rtTranscript = rt.transcript;
    }
    if (rt) {
      rt.dispose();
      realtimeRef.current = null;
    }

    // Always collect the recording — it is the retry artifact AND the
    // fallback when the live lane produced Arabic that fails to translate.
    let blob: Blob | null = null;
    let durationMs = 0;
    try {
      ({ blob, durationMs } = await captureRef.current.stop());
    } catch (e) {
      console.warn('[VoiceFlow] stop capture failed:', e);
      blob = null;
    }

    // ── CatyFlow realtime shortcut — LANGUAGE-AWARE (Arabic demo fix,
    // 2026-07-08). Gemini Live transcribes speech in its SPOKEN language:
    // Arabic speech yields Arabic text. The old shortcut inserted that raw
    // transcript as the final "English" result, silently skipping the
    // translating batch lane — the exact "Arabic doesn't work" failure.
    if (rtTranscript) {
      setPartialText(null);
      if (!containsArabicScript(rtTranscript)) {
        // Latin transcript — already the deliverable. Fast path.
        await handleResult(rtTranscript, undefined, 'high', durationMs, rtStart);
        return;
      }
      // Arabic transcript → translate the TEXT (seconds) instead of
      // re-uploading audio; on any failure fall through to the batch
      // audio lane, which translates via Groq/Gemini.
      try {
        const { data, error } = await supabase.functions.invoke('ai-translate-field', {
          body: { text: rtTranscript, target: 'en' },
        });
        const translated = (data as { translated?: string } | null)?.translated?.trim();
        if (error || !translated) throw new Error(error?.message ?? 'translate_empty');
        await handleResult(translated, 'ar-SA', 'high', durationMs, rtStart);
        return;
      } catch (e) {
        console.warn('[VoiceFlow] live-transcript translate failed, using batch lane:', e);
        /* fall through to batch below */
      }
    }

    if (!blob) {
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

    // Keep the audio for one-click retry — a failed upload must never cost
    // the user their words (S6a never-lose-words).
    lastBlobRef.current = { blob, durationMs };
    await processBlobRef.current(blob, durationMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, scheduleReset]);

  // ─── Batch transcription of a captured blob (retry-safe) ─────────────
  const processBlob = useCallback(async (blob: Blob, durationMs: number) => {
    // Convert blob → base64 via FileReader — the old byte-by-byte string
    // concat janked the main thread for seconds on multi-MB recordings.
    const audioBase64 = await new Promise<string>((resolvePromise, rejectPromise) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        resolvePromise(url.slice(url.indexOf(',') + 1));
      };
      reader.onerror = () => rejectPromise(new Error('Failed to read audio'));
      reader.readAsDataURL(blob);
    }).catch((e) => {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to read audio');
      setStatusBoth('error');
      scheduleReset(3000);
      return null;
    });
    if (audioBase64 === null) return;
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
          streaming: true,
        }),
      });

      if (!resp.ok) {
        // 422 no_speech is an OUTCOME, not an error (S6a): silence or a
        // muted mic. Calm copy, no retry (re-uploading silence is useless).
        if (resp.status === 422) {
          lastBlobRef.current = null;
          setPartialText(null);
          setErrorMessage('Didn’t catch that — check your mic and try again');
          setStatusBoth('error');
          void updateSession('no_speech');
          scheduleReset(2500);
          return;
        }
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
        lastBlobRef.current = null;
        await handleResult(englishText, detectedLang, confidence, durationMs, geminiStart);

      } else {
        // ── Non-streaming JSON fallback ──────────────────────────────────
        const data = await resp.json() as Record<string, unknown>;
        if (!data?.englishText) throw new Error((data?.error as string) ?? 'Empty transcription');

        setPartialText(null);
        lastBlobRef.current = null;
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
      // The blob is retained in lastBlobRef — the capsule offers Retry
      // without re-recording (never-lose-words).
      setRetryAvailable(lastBlobRef.current != null);
      setErrorMessage(msg);
      setStatusBoth('error');
      void updateSession('error', undefined, msg);
      scheduleReset(8000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, scheduleReset]);
  processBlobRef.current = processBlob;

  // Retry the last failed batch upload with the retained audio.
  const retryTranscription = useCallback(() => {
    const last = lastBlobRef.current;
    if (!last || statusRef.current !== 'error') return;
    // Cancel the error-state auto-reset so it can't fire mid-retry.
    if (pendingResetRef.current) {
      clearTimeout(pendingResetRef.current);
      pendingResetRef.current = null;
    }
    setErrorMessage(null);
    setRetryAvailable(false);
    setStatusBoth('processing');
    void processBlobRef.current(last.blob, last.durationMs);
  }, []);

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
      // Display only — language history must NEVER change how the next
      // session is recognized (the old 'en' pin sent Arabic speech through
      // an en-US recognizer; Arabic demo fix 2026-07-08).
      setDetectedLanguage(detectedLang);
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
      // Polish transparency (S6b): when the cleanup pass changed the raw
      // transcript, say so and keep the raw one a click away. Non-blocking.
      if (rawText) {
        void import('@/lib/catalystToast').then(({ catalystToast }) => {
          catalystToast.show({
            type: 'info',
            title: 'CatyFlow polished your dictation',
            message: cleanupProvider ? `Cleaned via ${cleanupProvider}.` : undefined,
            action: {
              label: 'Copy raw transcript',
              onClick: () => void navigator.clipboard.writeText(rawText),
            },
            duration: 6000,
          });
        });
      }
      void updateSession('completed', voiceResult);
      scheduleReset(200);
    } else {
      setStatusBoth('ready');
    }
  }, [reset, scheduleReset]);

  stopAndProcessRef.current = stopAndProcess;

  // Sound ping on mic open/close — off by default, user preference
  // (S6b; never the only state signal).
  const { soundEnabled } = useVoiceFlowSettings();
  const prevStatusRef = useRef<VoiceStatus>('idle');
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (!soundEnabled) return;
    if (status === 'listening' && prev === 'arming') playListenPing();
    if (status === 'processing' && (prev === 'listening' || prev === 'paused')) playStopPing();
  }, [status, soundEnabled]);

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
    if (statusRef.current !== 'listening') return;
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
    captureRef.current.cancel();
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

    // ONE language-agnostic engine for every session (Arabic demo fix,
    // 2026-07-08): the old native-SpeechRecognition "English fast path"
    // activated whenever a previous result detected 'en' — after which
    // Arabic speech went through an en-US recognizer and came out as
    // phonetic garbage. Deleted: recording + Gemini Live captions handle
    // English and Arabic identically, so language history can never
    // poison the next utterance.
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
        setLiveLaneStatus('connecting');
        void realtimeAvailable().then((ok) => {
          if (!ok || (statusRef.current !== 'listening' && statusRef.current !== 'arming')) {
            if (!ok) setLiveLaneStatus('unavailable');
            return;
          }
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
                      markFirstPartial();
                      setPartialText(text);
                      setLivePartial(partialsRef.current.update(text));
                    }
                  },
                  onState: (s) => {
                    if (realtimeRef.current !== rt) return;
                    if (s === 'connecting') setLiveLaneStatus('connecting');
                    else if (s === 'live') setLiveLaneStatus('live');
                    else if (s === 'degraded' || s === 'failed') setLiveLaneStatus('unavailable');
                    // 'closed' = normal teardown — leave the last UI state.
                  },
                },
                vocabulary,
              ),
            )
            .then((started) => {
              if (!started && realtimeRef.current === rt) {
                realtimeRef.current = null;
                setLiveLaneStatus('unavailable');
              }
            });
        });
      } else {
        setLiveLaneStatus('unavailable');
      }

      listenStartRef.current = Date.now();
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
        first_partial_ms:  firstPartialMsRef.current ?? undefined,
        error_code:        errorCode,
      } as never).eq('id' as never, sessionIdRef.current as never);
    } catch { /* non-blocking */ }
  }

  const contextValue: VoiceFlowContextValue = {
    status,
    result,
    errorMessage,
    isActive: status !== 'idle',
    enabled: featureEnabled,
    activeElement: status !== 'idle' ? fieldRef.current?.element ?? null : null,
    canPause,
    livePartial,
    liveLaneStatus,
    activate: handleActivate,
    commit,
    cancel,
    pause,
    resume,
  };

  return (
    <VoiceFlowContext.Provider value={contextValue}>
      {children}
      {/* The global hover DictationCTA is retired (CAT-VOICE-UX-PREMIUM-
          20260708-001 S2b): visible mics are composer-anchored VoiceMicButtons
          on key surfaces; hotkeys (double-space / ⌘⇧V) still work on every
          eligible field. */}
      {featureEnabled && (status === 'listening' || status === 'paused') && livePartial && (
        <ComposerGhostText
          targetEl={fieldRef.current?.element ?? null}
          stable={livePartial.stable}
          provisional={livePartial.provisional}
        />
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
          onRetry={retryTranscription}
          retryAvailable={retryAvailable}
          canPause={canPause}
          elapsedMs={elapsedMs}
          liveLaneStatus={liveLaneStatus}
          detectedLanguage={detectedLanguage}
          analyserNode={analyserNode}
          partialText={partialText}
          commandMode={commandMode}
        />
      )}
    </VoiceFlowContext.Provider>
  );
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

/**
 * NATIVE-PATH REPRODUCTION.
 * Session 1 = Groq (prefLang starts null), returns detectedLanguage='en' →
 * pins prefLang='en'. Session 2 therefore takes the native SpeechRecognition
 * path. Assert session 2 actually starts a native recognition (re-arm).
 */
const groqStart = vi.fn();
vi.mock('../AudioCaptureService', () => ({
  AudioCaptureService: class {
    isRecording = false;
    async start() { groqStart(); this.isRecording = true; }
    async stop() {
      this.isRecording = false;
      const blob = { size: 5000, type: 'audio/webm', arrayBuffer: async () => new ArrayBuffer(5000) } as unknown as Blob;
      return { blob, durationMs: 1200 };
    }
    cancel() { this.isRecording = false; }
    getAnalyserNode() { return null; }
  },
}));
vi.mock('@/contexts/FeatureFlagContext', () => ({ useFeatureFlags: () => ({ isModuleEnabled: () => true }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
    from: () => ({ insert: async () => ({ error: null }), update: () => ({ eq: async () => ({ error: null }) }) }),
  },
}));

import { VoiceFlowProvider, useVoiceFlow } from '../VoiceFlowProvider';

// ── Native SpeechRecognition mock ─────────────────────────────────────────
const nativeStart = vi.fn();
const nativeInstances: any[] = [];
class MockSR {
  lang = ''; continuous = false; interimResults = false;
  onstart: any = null; onresult: any = null; onend: any = null; onerror: any = null;
  constructor() { nativeInstances.push(this); }
  start() { nativeStart(); this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() {}
}

function StatusProbe({ onStatus }: { onStatus: (s: string) => void }) {
  const { status } = useVoiceFlow();
  onStatus(status);
  return null;
}
function dblSpace() {
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }));
}
function space() { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true })); }

describe('REPRO (native): session 2 takes native path after session 1 pins English', () => {
  let input: HTMLInputElement;
  let statuses: string[];
  beforeEach(() => {
    groqStart.mockClear(); nativeStart.mockClear(); nativeInstances.length = 0;
    statuses = [];
    vi.stubEnv('VITE_VOICE_DICTATION_ENABLED', 'true');
    (window as any).webkitSpeechRecognition = MockSR;
    (window as any).SpeechRecognition = MockSR;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ englishText: 'hello', confidence: 'high', detectedLanguage: 'en', provider: 'groq' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )));
    input = document.createElement('input'); input.type = 'text';
    document.body.appendChild(input); input.focus();
  });
  afterEach(() => {
    document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.restoreAllMocks();
    delete (window as any).webkitSpeechRecognition; delete (window as any).SpeechRecognition;
  });

  // REGRESSION GUARD for the "voice only works once" fix: after session 1 pins
  // English, session 2 must STAY on the proven Groq path and never switch to the
  // fragile native SpeechRecognition path. Fails on pre-fix code (session 2 went
  // native); passes with useNativeRecognition=false.
  it('session 2 stays on Groq (never native) and re-arms to listening', async () => {
    render(<VoiceFlowProvider><StatusProbe onStatus={(s) => statuses.push(s)} /></VoiceFlowProvider>);

    // Session 1 — Groq, returns English → pins prefLang='en'
    await act(async () => { dblSpace(); await Promise.resolve(); });
    expect(groqStart, 'session1 groq start').toHaveBeenCalledTimes(1);
    await act(async () => { space(); await new Promise(r => setTimeout(r, 0)); }); // commit
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });        // reset → idle

    input.value = ''; input.focus();

    // Session 2 — must re-arm on Groq, NOT native
    await act(async () => { dblSpace(); await Promise.resolve(); });
    expect(nativeStart, 'session2 must NOT use native path').toHaveBeenCalledTimes(0);
    expect(groqStart, 'session2 must re-arm on Groq').toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe('listening');
  });
});

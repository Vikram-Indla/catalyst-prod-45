/**
 * useReleaseSummaryStream — wires the `useCatyReleaseSummarize` store
 * to the `summarize-release` (NDJSON) edge function, with the same
 * typewriter buffer as `useCommentsSummaryStream`.
 *
 * Lifecycle: subscribe to payload identity only. When payload becomes
 * truthy AND matches `mountedForReleaseId`, fire the stream. The edge
 * function fetches all release context server-side (release row +
 * linked items via service role), so the client just passes the id.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { useCatyReleaseSummarize } from './catyReleaseSummarizeStore';
import {
  computeSprintInsightHash,
  readSprintInsightCache,
  writeSprintInsightCache,
} from './sprintInsightHash';

interface Options {
  mountedForReleaseId: string | null | undefined;
}

const CHARS_PER_TICK = 2;
const TICK_MS = 20;

export function useReleaseSummaryStream({ mountedForReleaseId }: Options) {
  const payload = useCatyReleaseSummarize((s) => s.payload);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!payload) return;
    if (!mountedForReleaseId) return;
    if (payload.releaseId !== mountedForReleaseId) return;
    if (useCatyReleaseSummarize.getState().status !== 'fetching') return;

    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let charBuffer = '';
    let fullText = '';
    let streamComplete = false;
    let firstDeltaSeen = false;

    const stopTypewriter = () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const tick = () => {
      if (cancelled) {
        stopTypewriter();
        return;
      }
      if (charBuffer.length === 0) {
        if (streamComplete) {
          stopTypewriter();
          useCatyReleaseSummarize.getState().complete(fullText);
        }
        return;
      }
      const chunk = charBuffer.slice(0, CHARS_PER_TICK);
      charBuffer = charBuffer.slice(CHARS_PER_TICK);
      useCatyReleaseSummarize.getState().appendDelta(chunk);
    };

    const startTypewriter = () => {
      if (timerRef.current !== null) return;
      timerRef.current = window.setInterval(tick, TICK_MS);
    };

    const enqueueDelta = (delta: string) => {
      fullText += delta;
      charBuffer += delta;
      if (!firstDeltaSeen) {
        firstDeltaSeen = true;
        useCatyReleaseSummarize.getState().setStreaming();
      }
      startTypewriter();
    };

    (async () => {
      try {
        let sprintCacheHash: string | null = null;
        if (payload.entityKind === 'sprint') {
          // 2026-07-03: sprint summaries are cached by structural hash — a
          // hit skips the edge-function call entirely (CAT-SPRINTS-NATIVE
          // Phase 3 Slice 3). Release summaries are never cached.
          sprintCacheHash = await computeSprintInsightHash(payload.releaseId);
          if (sprintCacheHash) {
            const cached = await readSprintInsightCache(payload.releaseId, sprintCacheHash);
            if (cached) {
              if (!cancelled) useCatyReleaseSummarize.getState().complete(cached);
              return;
            }
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;

        const res = await fetchFunction('summarize-release', {
          method: 'POST',
          accessToken,
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            improve_type: 'summarize_release_v2',
            stream: true,
            release_id: payload.releaseId,
            entity_kind: payload.entityKind ?? 'release',
          }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          let humanMsg = text;
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed.message === 'string') {
              humanMsg = parsed.message;
            }
          } catch {
            /* not JSON */
          }
          throw new Error(humanMsg || `AI request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });

          let nlIdx: number;
          while ((nlIdx = lineBuffer.indexOf('\n')) !== -1) {
            const line = lineBuffer.slice(0, nlIdx).trim();
            lineBuffer = lineBuffer.slice(nlIdx + 1);
            if (!line) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.type === 'text' && typeof evt.delta === 'string') {
                enqueueDelta(evt.delta);
              } else if (evt.type === 'done') {
                if (typeof evt.full_text === 'string' && evt.full_text.length > 0) {
                  fullText = evt.full_text;
                  const alreadyShown = useCatyReleaseSummarize.getState().streamingText;
                  const remaining = fullText.slice(alreadyShown.length);
                  if (remaining.length > charBuffer.length) {
                    charBuffer = remaining;
                  }
                }
                streamComplete = true;
                if (sprintCacheHash && fullText) {
                  void writeSprintInsightCache(payload.releaseId, sprintCacheHash, fullText);
                }
                if (charBuffer.length === 0) {
                  stopTypewriter();
                  useCatyReleaseSummarize.getState().complete(fullText);
                }
                return;
              } else if (evt.type === 'error') {
                stopTypewriter();
                useCatyReleaseSummarize
                  .getState()
                  .error(typeof evt.message === 'string' ? evt.message : 'AI error');
                return;
              }
            } catch {
              /* malformed chunk — skip */
            }
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        stopTypewriter();
        useCatyReleaseSummarize
          .getState()
          .error(err instanceof Error ? err.message : 'Stream failed');
      }
    })();

    return () => {
      cancelled = true;
      stopTypewriter();
      try {
        ctrl.abort();
      } catch {
        /* swallow */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, mountedForReleaseId]);
}

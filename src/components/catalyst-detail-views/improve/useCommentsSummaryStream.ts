/**
 * useCommentsSummaryStream — wires the `useCatySummarize` store to the
 * `ai-improve-story` (`summarize_comments_v2`, stream:true) NDJSON
 * endpoint, with a typewriter buffer for ChatGPT-style char-by-char
 * rendering.
 *
 * Lifecycle:
 *   1. Subscribe to the store's `payload` (identity only — NOT status,
 *      because re-firing the effect on status change would abort the
 *      in-flight stream).
 *   2. When the payload becomes truthy AND its `issueKey` matches the
 *      `mountedForIssueKey`, fire the fetch:
 *       a. Pull last 50 comments from `ph_comments` for the workItemId.
 *       b. Resolve author display names via `profiles`.
 *       c. If 0 comments → toast "There are no comments to summarize"
 *          and `dismiss()`. The card vanishes immediately.
 *       d. Else → open the NDJSON stream and enqueue each delta into a
 *          char buffer. A typewriter timer drains 2 chars / 20ms into
 *          the store via `appendDelta`, producing the live-typing feel.
 *   3. On unmount (or payload change), abort the in-flight stream and
 *      stop the typewriter.
 */
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { useCatySummarize } from './catySummarizeStore';

interface UseCommentsSummaryStreamOptions {
  /**
   * The issue key this hook instance is mounted for. Only fires the
   * stream when the store's payload matches this key.
   */
  mountedForIssueKey: string | null | undefined;
}

interface RawComment {
  id: string;
  author_id: string | null;
  body: string | null;
  created_at: string;
}

// Typewriter pacing: drain N chars every TICK_MS. 2 chars / 20ms =
// ~100 chars/sec — fast enough to feel responsive, slow enough to read.
const CHARS_PER_TICK = 2;
const TICK_MS = 20;

export function useCommentsSummaryStream({
  mountedForIssueKey,
}: UseCommentsSummaryStreamOptions) {
  // Subscribe ONLY to payload identity. Status changes during the
  // stream lifecycle must NOT re-run this effect (that would abort the
  // active fetch).
  const payload = useCatySummarize((s) => s.payload);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!payload) return;
    if (!mountedForIssueKey) return;
    if (payload.issueKey !== mountedForIssueKey) return;

    // Only kick off when the store just transitioned to 'fetching'.
    // Reading via getState() avoids subscribing to status (see above).
    if (useCatySummarize.getState().status !== 'fetching') return;

    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Typewriter state — owned by this effect's closure.
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
          // Authoritative final text — covers any divergence between
          // accumulated deltas and the server's full_text.
          useCatySummarize.getState().complete(fullText);
        }
        return;
      }
      const chunk = charBuffer.slice(0, CHARS_PER_TICK);
      charBuffer = charBuffer.slice(CHARS_PER_TICK);
      useCatySummarize.getState().appendDelta(chunk);
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
        useCatySummarize.getState().setStreaming();
      }
      startTypewriter();
    };

    (async () => {
      try {
        // ── 1. Fetch comments ───────────────────────────────────────
        const { data: rawComments, error: e1 } = await supabase
          .from('ph_comments')
          .select('id, author_id, body, created_at')
          .eq('work_item_id', payload.workItemId)
          .order('created_at', { ascending: true })
          .limit(50);
        if (cancelled) return;
        if (e1) throw e1;

        const list: RawComment[] = (rawComments || []) as RawComment[];

        if (list.length === 0) {
          toast.info('There are no comments to summarize');
          useCatySummarize.getState().dismiss();
          return;
        }

        // ── 2. Resolve author display names ─────────────────────────
        const authorIds = [
          ...new Set(list.map((c) => c.author_id).filter(Boolean)),
        ] as string[];
        const profileMap = new Map<string, string>();
        if (authorIds.length) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', authorIds);
          if (cancelled) return;
          for (const p of profiles || []) {
            profileMap.set(
              p.id as string,
              ((p.full_name as string) || (p.email as string) || (p.id as string)) ?? '(unknown)',
            );
          }
        }

        const aiPayload = list.map((c) => ({
          author: c.author_id ? profileMap.get(c.author_id) || c.author_id : '(unknown)',
          created_at: c.created_at,
          body: c.body || '',
        }));

        // ── 3. Open the NDJSON stream ───────────────────────────────
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;

        const res = await fetchFunction('ai-improve-story', {
          method: 'POST',
          accessToken,
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            improve_type: 'summarize_comments_v2',
            stream: true,
            issue_type: payload.issueType ?? 'Default',
            issue_summary: payload.issueSummary ?? '',
            comments: aiPayload,
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

        // ── 4. Pump NDJSON ──────────────────────────────────────────
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
                // Server's full_text wins for the final state.
                if (typeof evt.full_text === 'string' && evt.full_text.length > 0) {
                  fullText = evt.full_text;
                  // Also drain any chars the typewriter hasn't reached
                  // yet by appending the diff to the buffer.
                  const alreadyShown = useCatySummarize.getState().streamingText;
                  const remaining = fullText.slice(alreadyShown.length);
                  if (remaining.length > charBuffer.length) {
                    charBuffer = remaining;
                  }
                }
                streamComplete = true;
                // If buffer is already empty (no deltas were sent or
                // everything's already drained), finalize immediately.
                if (charBuffer.length === 0) {
                  stopTypewriter();
                  useCatySummarize.getState().complete(fullText);
                }
                return;
              } else if (evt.type === 'error') {
                stopTypewriter();
                useCatySummarize
                  .getState()
                  .error(typeof evt.message === 'string' ? evt.message : 'AI error');
                return;
              }
            } catch {
              // Malformed chunk — skip
            }
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        stopTypewriter();
        useCatySummarize
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
    // ONLY re-run on payload identity change or remount target change.
    // `mountedForIssueKey` is stable across renders once resolved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, mountedForIssueKey]);
}

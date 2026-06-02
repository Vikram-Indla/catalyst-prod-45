/**
 * useCatyImproveStream — owns the network pipeline for the Caty
 * "Improve description" stream. Extracted from the deleted
 * CatyStreamingOverlay so the streamed text can be piped directly into
 * the Tiptap editor by `Description.tsx` instead of rendered into a
 * separate read-only preview overlay.
 *
 * Lifecycle (mirrors what the old overlay did):
 *   analyzing → streaming → done       (natural completion)
 *                       ↘ stopped     (user pressed Esc / Stop)
 *                       ↘ errored     (network / upstream error)
 *
 * Throttling: deltas accumulate in `fullTextRef` and the timer pushes
 * the accumulator into React state every 80ms. That keeps the editor
 * `setContent` call rate reasonable while still feeling live.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFunction } from "@/integrations/supabase/functionsRouter";
import { supabase } from "@/integrations/supabase/client";
import type { CatyImprovePayload } from "./catyImproveStore";

export type CatyImprovePhase =
  | "idle"
  | "analyzing"
  | "streaming"
  | "stopped"
  | "done"
  | "errored";

export interface UseCatyImproveStreamResult {
  /** Current phase. `idle` when no payload is active. */
  phase: CatyImprovePhase;
  /** Throttled accumulated text — safe to render or pipe into an editor. */
  text: string;
  /** Human-readable error message when `phase === 'errored'`. */
  errorMessage: string | null;
  /** User-initiated halt. Aborts upstream, flushes final text. */
  stop: () => void;
}

/**
 * Drives the streaming request when `payload` is non-null. When
 * `payload` becomes null (improve session cleared from the store), the
 * hook resets to `idle` and discards any in-flight state.
 */
/**
 * Typewriter tuning. The visible text catches up to the accumulator
 * at a controlled rate, decoupled from how bursty the AI's deltas are.
 *   - TICK_MS: how often the timer fires (16ms ≈ one animation frame).
 *   - CHARS_PER_TICK: how many chars are revealed per tick.
 * 3 chars per 16ms ≈ 187 chars/sec — close to a human-readable typing
 * cadence, fast enough that a 2000-char response finishes in ~10s.
 */
const TYPEWRITER_TICK_MS = 16;
const TYPEWRITER_CHARS_PER_TICK = 3;

export function useCatyImproveStream(
  payload: CatyImprovePayload | null,
): UseCatyImproveStreamResult {
  const [phase, setPhase] = useState<CatyImprovePhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [text, setText] = useState<string>("");

  const abortRef = useRef<AbortController | null>(null);
  // Full text received from the AI (may be ahead of what's been
  // revealed to the UI).
  const fullTextRef = useRef<string>("");
  // Number of characters currently revealed in `text`. The typewriter
  // tick advances this until it catches up to `fullTextRef.current.length`.
  const visibleCharsRef = useRef<number>(0);
  // True once the AI has sent its `done` event. The typewriter keeps
  // running after this until it finishes revealing whatever was queued;
  // then it flips `phase` to 'done'.
  const streamCompleteRef = useRef<boolean>(false);
  const flushTimerRef = useRef<number | null>(null);

  const stopFlushTimer = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const targetLen = fullTextRef.current.length;
    const visible = visibleCharsRef.current;
    if (visible < targetLen) {
      const next = Math.min(visible + TYPEWRITER_CHARS_PER_TICK, targetLen);
      visibleCharsRef.current = next;
      setText(fullTextRef.current.slice(0, next));
    } else if (streamCompleteRef.current) {
      // Caught up AND the AI is done — finalize.
      stopFlushTimer();
      setPhase("done");
    }
    // Otherwise: caught up but stream still in flight — keep the timer
    // running so the next delta gets revealed promptly.
  }, [stopFlushTimer]);

  const startFlushTimer = useCallback(() => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setInterval(tick, TYPEWRITER_TICK_MS);
  }, [tick]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    // Reveal everything that was received so the user sees the full
    // output Caty actually produced, not a half-typed version.
    visibleCharsRef.current = fullTextRef.current.length;
    setText(fullTextRef.current);
    stopFlushTimer();
    // Stopping during analyzing (no text yet) is effectively the same
    // as cancelling — the consumer can read `phase` and decide.
    setPhase((p) => (p === "done" || p === "errored" ? p : "stopped"));
  }, [stopFlushTimer]);

  // (Re-)kick off the stream when the issue key changes (or first
  // becomes set). Cleanup aborts the upstream fetch + stops the timer.
  // We deliberately do NOT depend on the whole payload object —
  // referential identity churn from the Zustand store would re-fire
  // the effect even when nothing meaningful changed.
  const issueKey = payload?.issueKey ?? null;
  useEffect(() => {
    if (!payload || !issueKey) {
      fullTextRef.current = "";
      visibleCharsRef.current = 0;
      streamCompleteRef.current = false;
      setText("");
      setPhase("idle");
      setErrorMessage(null);
      return;
    }

    fullTextRef.current = "";
    visibleCharsRef.current = 0;
    streamCompleteRef.current = false;
    setText("");
    setErrorMessage(null);
    setPhase("analyzing");

    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;

        const requestBody = {
          improve_type: "improve_description_v2",
          stream: true,
          improve_sub_type: payload.improveSubType ?? "improve_clarify",
          issue_type: payload.issueType ?? "Default",
          issue_summary: payload.issueSummary ?? "",
          current_description: payload.currentDescription ?? "",
          current_ac: payload.currentAcceptanceCriteria ?? "",
          attachment_urls: payload.attachmentUrls ?? [],
        };

        const res = await fetchFunction("ai-improve-story", {
          method: "POST",
          accessToken,
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify(requestBody),
        });

        if (!res.ok || !res.body) {
          const raw = await res.text().catch(() => "");
          let human = raw;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.message === "string") {
              human = parsed.message;
            }
          } catch {
            /* not JSON */
          }
          throw new Error(human || `AI request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });

          let nlIdx;
          while ((nlIdx = lineBuffer.indexOf("\n")) !== -1) {
            const line = lineBuffer.slice(0, nlIdx).trim();
            lineBuffer = lineBuffer.slice(nlIdx + 1);
            if (!line) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.type === "text" && typeof evt.delta === "string") {
                // Append to the buffer; the typewriter timer will
                // reveal these chars to the UI at a controlled rate.
                fullTextRef.current += evt.delta;
                setPhase((p) => (p === "analyzing" ? "streaming" : p));
                startFlushTimer();
              } else if (evt.type === "done") {
                if (
                  typeof evt.full_text === "string" &&
                  evt.full_text.length > 0
                ) {
                  fullTextRef.current = evt.full_text;
                }
                // Don't flip phase to 'done' here — let the typewriter
                // finish revealing whatever's still queued. It checks
                // `streamCompleteRef` and flips to 'done' once visible
                // catches up to full.
                streamCompleteRef.current = true;
                startFlushTimer();
              } else if (evt.type === "error") {
                stopFlushTimer();
                setErrorMessage(
                  typeof evt.message === "string" ? evt.message : "AI error",
                );
                setPhase("errored");
              }
            } catch {
              /* malformed line — skip */
            }
          }
        }
      } catch (err: unknown) {
        if (
          cancelled ||
          (err instanceof DOMException && err.name === "AbortError")
        )
          return;
        setErrorMessage(err instanceof Error ? err.message : "Stream failed");
        setPhase("errored");
      }
    })();

    return () => {
      cancelled = true;
      stopFlushTimer();
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueKey]);

  return { phase, text, errorMessage, stop };
}

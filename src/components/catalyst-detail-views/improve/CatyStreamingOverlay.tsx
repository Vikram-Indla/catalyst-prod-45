/**
 * CatyStreamingOverlay — Jira-Rovo-style live "Improve description"
 * surface. Mounts inside the description section, takes over the
 * visible body until the user accepts or discards the AI's output.
 *
 * Lifecycle:
 *   analyzing → streaming → done
 *      │           │          │
 *      │           │          └─ user clicks Accept (calls onApply)
 *      │           │             or Discard (calls onCancel)
 *      │           └─ first NDJSON `text` delta arrived, render
 *      │              streamed content over the muted snapshot
 *      └─ stream connection open, no deltas yet — show "Caty is
 *         analyzing" pulse with logo at the end of the muted snapshot
 *
 * Esc behaviour: shows an inline confirm pill ("Cancel request and
 * discard response? No / Yes"). Yes → abort fetch, call onCancel.
 * No → resume.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// `/caty.svg` lives in `public/` — Vite serves it at site root, so the
// string literal is the production path. Avoids a bundle round-trip
// for what is a small static asset that may be swapped behind the
// scenes (brand refresh, dark/light variants, etc.).
const catalystAiLogo = "/caty.svg";
import { fetchFunction } from "@/integrations/supabase/functionsRouter";
import { supabase } from "@/integrations/supabase/client";
import "./caty-streaming-overlay.css";

type Phase = "analyzing" | "streaming" | "stopped" | "done" | "errored";

export interface CatyStreamingOverlayProps {
  /** Issue key the AI is improving — used as the React key + cancel routing. */
  issueKey: string;
  issueType: string | null;
  issueSummary: string | null;
  /** Plain-text version of the current description. Becomes the muted snapshot. */
  currentDescription: string | null;
  /** Plain-text current acceptance criteria. Becomes part of the prompt. */
  currentAcceptanceCriteria: string | null;
  /** Public URLs of attachments (images) — Caty includes them as multimodal context. */
  attachmentUrls: string[];
  /** Sub-instruction for the AI. Defaults to `improve_clarify`. */
  improveSubType?: string;
  /**
   * Which edge-function branch to call. Defaults to `improve_description_v2`
   * (structured Description + AC output). Pass `improve_comment_v1` for the
   * natural-prose comment refinement branch (no headings, single block).
   */
  improveType?: string;
  /** Called with the final markdown when the user accepts. */
  onApply: (
    fullMarkdown: string,
    parts: { description: string; acceptanceCriteria: string },
  ) => void;
  /** Called when the user discards (Esc → Yes, or stop) — overlay should unmount. */
  onCancel: () => void;
}

/** Splits the AI output into two sections by `## Description` / `## Acceptance criteria` headings. */
function splitImproveOutput(md: string): {
  description: string;
  acceptanceCriteria: string;
} {
  const acIdx = md.search(/^##\s+Acceptance criteria\s*$/im);
  if (acIdx === -1) {
    return {
      description: md.replace(/^##\s+Description\s*\n+/im, "").trim(),
      acceptanceCriteria: "",
    };
  }
  const descPart = md
    .slice(0, acIdx)
    .replace(/^##\s+Description\s*\n+/im, "")
    .trim();
  const acPart = md
    .slice(acIdx)
    .replace(/^##\s+Acceptance criteria\s*\n+/im, "")
    .trim();
  return { description: descPart, acceptanceCriteria: acPart };
}

export function CatyStreamingOverlay({
  issueKey,
  issueType,
  issueSummary,
  currentDescription,
  currentAcceptanceCriteria,
  attachmentUrls,
  improveSubType = "improve_clarify",
  improveType = "improve_description_v2",
  onApply,
  onCancel,
}: CatyStreamingOverlayProps) {
  const [phase, setPhase] = useState<Phase>("analyzing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  // Typewriter pipeline:
  //   AI deltas → charBufferRef (raw queue of characters not yet shown)
  //   typewriter tick (interval) → drains 1–5 chars per tick straight
  //   into the DOM via appendChild on streamingTextRef. NO React state
  //   for the streaming text — direct DOM mutation skips reconciliation
  //   so a 2000-char doc renders smoothly instead of triggering 100+
  //   React re-renders.
  //
  // fullTextRef is the authoritative accumulator — it always equals
  // every char received from the stream. The typewriter renders OUT of
  // this; on Accept we read FROM this so we don't have to wait for the
  // typewriter to finish draining.
  const charBufferRef = useRef<string>("");
  const fullTextRef = useRef<string>("");
  const streamingTextRef = useRef<HTMLSpanElement>(null);
  const typewriterTimerRef = useRef<number | null>(null);
  const streamCompleteRef = useRef<boolean>(false);

  const stopTypewriter = useCallback(() => {
    if (typewriterTimerRef.current !== null) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
  }, []);

  const tickTypewriter = useCallback(() => {
    const buf = charBufferRef.current;
    if (buf.length === 0) {
      if (streamCompleteRef.current) {
        stopTypewriter();
        setPhase("done");
      }
      return;
    }
    if (!streamingTextRef.current) {
      // Span not mounted yet (phase === 'analyzing' before first delta
      // commit). Hold the buffer; next tick will catch up.
      return;
    }
    const chunk = buf.slice(0, 1);
    charBufferRef.current = buf.slice(1);
    streamingTextRef.current.appendChild(document.createTextNode(chunk));
  }, [stopTypewriter]);

  const startTypewriter = useCallback(() => {
    if (typewriterTimerRef.current !== null) return;
    typewriterTimerRef.current = window.setInterval(tickTypewriter, 10);
  }, [tickTypewriter]);

  const enqueueDelta = useCallback(
    (delta: string) => {
      fullTextRef.current += delta;
      charBufferRef.current += delta;
      // Phase flip happens once on first delta; React re-renders to
      // mount the streaming-text span. From then on the typewriter
      // owns DOM mutation directly.
      setPhase((p) => (p === "analyzing" ? "streaming" : p));
      startTypewriter();
    },
    [startTypewriter],
  );

  const markStreamComplete = useCallback(() => {
    streamCompleteRef.current = true;
    // If buffer's already empty, finalize now. Otherwise let the
    // typewriter drain naturally and finalize from there.
    if (charBufferRef.current.length === 0) {
      stopTypewriter();
      setPhase("done");
    }
  }, [stopTypewriter]);

  // Flush any chars the typewriter hasn't drained yet straight to the
  // DOM. Used when the user stops mid-stream — they should see all the
  // text Caty actually produced, not just what the typewriter happened
  // to have rendered when they hit Stop.
  const flushBufferedChars = useCallback(() => {
    const buf = charBufferRef.current;
    if (buf && streamingTextRef.current) {
      streamingTextRef.current.appendChild(document.createTextNode(buf));
      charBufferRef.current = "";
    }
  }, []);

  /**
   * Esc / Stop button handler. Three things, in order:
   *   1. Abort the upstream fetch (signals the edge function to halt
   *      via our cancel() handler — saves AI tokens).
   *   2. Stop the typewriter timer + flush any buffered characters
   *      to the DOM (so the user sees every char Caty actually
   *      generated, not a half-rendered version).
   *   3. Phase → 'stopped'. The floating pill flips to "Keep what
   *      Caty wrote, or discard?" — the user makes the call.
   *
   * No "are you sure?" guard before stopping — the user's intent on
   * Esc / Stop click is unambiguous (they wanted to halt). The
   * Keep/Discard prompt afterwards is the only confirmation surface.
   */
  const handleStopRequest = useCallback(() => {
    abortRef.current?.abort();
    stopTypewriter();
    flushBufferedChars();
    setPhase("stopped");
  }, [stopTypewriter, flushBufferedChars]);

  // Kick off the streaming request once on mount.
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        // Forward the user's session token so the function call hits RLS
        // as the authenticated user.
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;

        const isCommentMode = improveType === "improve_comment_v1";
        const endpointName = isCommentMode
          ? "ai-improve-comment"
          : "ai-improve-story";
        const requestBody = isCommentMode
          ? {
              current_comment: currentDescription ?? "",
              issue_summary: issueSummary ?? "",
            }
          : {
              improve_type: improveType,
              stream: true,
              improve_sub_type: improveSubType,
              issue_type: issueType ?? "Default",
              issue_summary: issueSummary ?? "",
              current_description: currentDescription ?? "",
              current_ac: currentAcceptanceCriteria ?? "",
              attachment_urls: attachmentUrls,
            };
        const res = await fetchFunction(endpointName, {
          method: "POST",
          accessToken,
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify(requestBody),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          // Edge function errors are returned as JSON `{ error, message }`.
          // Extract `.message` so the UI shows the human-readable string
          // ("Rate limits exceeded, please try again later.") instead of
          // the raw `{"error":"rate_limited",…}` payload.
          let humanMsg = text;
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed.message === "string") {
              humanMsg = parsed.message;
            }
          } catch {
            /* not JSON — keep raw text */
          }
          throw new Error(humanMsg || `AI request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });

          // NDJSON: one JSON object per line
          let nlIdx;
          while ((nlIdx = lineBuffer.indexOf("\n")) !== -1) {
            const line = lineBuffer.slice(0, nlIdx).trim();
            lineBuffer = lineBuffer.slice(nlIdx + 1);
            if (!line) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.type === "text" && typeof evt.delta === "string") {
                enqueueDelta(evt.delta);
              } else if (evt.type === "done") {
                // Server's full_text wins as the canonical accumulator
                // — covers the rare case where individual deltas had
                // a hiccup but the server has the complete result.
                // Display keeps draining whatever's already in the
                // typewriter buffer; markStreamComplete flips to
                // `done` phase once that buffer drains.
                if (
                  typeof evt.full_text === "string" &&
                  evt.full_text.length > 0
                ) {
                  fullTextRef.current = evt.full_text;
                }
                markStreamComplete();
              } else if (evt.type === "error") {
                stopTypewriter();
                setErrorMessage(
                  typeof evt.message === "string" ? evt.message : "AI error",
                );
                setPhase("errored");
              }
            } catch {
              // Malformed line — ignore, keep streaming
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
      stopTypewriter();
      ctrl.abort();
    };
    // Only re-fire when the issueKey changes (i.e. user opens improve on
    // a different ticket — should never happen mid-session because the
    // overlay is unmounted on cancel/accept, but guard anyway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueKey]);

  // Esc handler — capture phase so we beat the editor's bubble-phase
  // listener (CLAUDE.md 2026-05-08 pattern).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      if (phase === "errored" || phase === "stopped" || phase === "done") {
        // Already terminal — Esc just closes.
        onCancel();
        return;
      }
      // Mid-stream — halt immediately and flip to the Keep/Discard prompt.
      handleStopRequest();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [phase, onCancel, handleStopRequest]);

  const handleAccept = useCallback(() => {
    // Read from the authoritative accumulator, NOT from what's
    // currently rendered in the DOM — the user can hit Accept while
    // the typewriter is still draining, and we want to save the full
    // received text, not the half-rendered version.
    const text = fullTextRef.current;
    const parts =
      improveType === "improve_comment_v1"
        ? { description: text.trim(), acceptanceCriteria: "" }
        : splitImproveOutput(text);
    onApply(text, parts);
  }, [onApply, improveType]);

  const mutedSnapshot = useMemo(() => {
    const desc = (currentDescription ?? "").trim();
    const ac = (currentAcceptanceCriteria ?? "").trim();
    if (!desc && !ac) return "(no existing description)";
    if (!ac) return desc;
    return `${desc}\n\n## Acceptance criteria\n${ac}`;
  }, [currentDescription, currentAcceptanceCriteria]);

  const showSnapshot = phase === "analyzing" || phase === "streaming";
  const streamingNeedsGap = phase === "streaming" && showSnapshot;
  const showStrap =
    phase === "analyzing" || phase === "streaming" || phase === "stopped";

  return (
    <div data-testid="caty-streaming-overlay" className="caty-improve">
      {(phase === "streaming" || phase === "done") && (
        <div
          className={
            streamingNeedsGap
              ? "caty-improve__output caty-improve__output--with-snapshot"
              : "caty-improve__output"
          }
        >
          <span ref={streamingTextRef} />
          {phase === "streaming" && (
            <span aria-hidden="true" className="caty-improve__caret">
              <img
                src={catalystAiLogo}
                alt=""
                width={14}
                height={14}
                className="caty-pulse caty-improve__caret-img"
              />
            </span>
          )}
        </div>
      )}

      {showSnapshot && (
        <div aria-hidden={phase === "streaming"} className="caty-improve__snapshot">
          {mutedSnapshot}
        </div>
      )}

      {phase === "errored" && (
        <div role="alert" className="caty-improve__error">
          <span className="caty-improve__error-text">
            {errorMessage ?? "Caty couldn’t finish — please try again."}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="caty-improve__error-close"
          >
            Close
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="caty-improve__done">
          <button
            type="button"
            onClick={onCancel}
            className="caty-improve__btn caty-improve__btn--secondary"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="caty-improve__btn caty-improve__btn--primary"
          >
            Accept
          </button>
        </div>
      )}

      {showStrap && (
        <div className="caty-improve__strap-anchor">
          <div className="caty-improve__strap caty-pill-enter">
            {phase === "stopped" ? (
              <>
                <img
                  src={catalystAiLogo}
                  alt=""
                  width={18}
                  height={18}
                  className="caty-improve__strap-logo caty-improve__strap-logo--sm"
                />
                <span>Keep what Caty wrote, or discard?</span>
                <button
                  type="button"
                  onClick={onCancel}
                  className="caty-improve__strap-btn"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="caty-improve__strap-btn caty-improve__strap-btn--keep"
                >
                  Keep
                </button>
              </>
            ) : (
              <>
                <img
                  src={catalystAiLogo}
                  alt=""
                  width={20}
                  height={20}
                  className={
                    phase === "analyzing"
                      ? "caty-improve__strap-logo caty-pulse"
                      : "caty-improve__strap-logo"
                  }
                />
                <span className="caty-improve__strap-label">
                  {phase === "analyzing"
                    ? "Caty is analyzing"
                    : "Caty is editing"}
                </span>
                <span className="caty-improve__strap-esc">Esc</span>
                <button
                  type="button"
                  onClick={handleStopRequest}
                  aria-label="Stop"
                  title="Stop"
                  className="caty-improve__strap-stop"
                >
                  <span className="caty-improve__strap-stop-icon" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AskCatyInlineBar — the rainbow-bordered AI search bar that replaces a
 * toolbar when the user opens Ask Caty. Extracted from AllWorkToolbar so
 * both /project-hub/{key}/list (AllWork) and /project-hub/{key}/backlog
 * (Backlog) can share one implementation.
 *
 * Behavior:
 *   - Fires `useCatySearch.submit()` on Enter / Go click
 *   - Parent reads `useCatySearch` (filter, status) and applies the
 *     filter to its own item list. This component does NOT navigate or
 *     auto-open results — it only translates the query into a structured
 *     filter spec.
 *   - Always-editable input (lets the user iterate without closing the
 *     bar) plus a "Search work" secondary filter once results land.
 *   - Typewriter-rotating placeholder while idle.
 *   - "X" close button clears any active filter so the parent table
 *     reverts to its default view.
 *
 * Parent contract:
 *   <AskCatyInlineBar projectKey="BAU" onClose={() => setOpen(false)} />
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import SearchIconCore from "@atlaskit/icon/core/search";
import ThumbsUpIconCore from "@atlaskit/icon/core/thumbs-up";
import ThumbsDownIconCore from "@atlaskit/icon/core/thumbs-down";
import InfoIconCore from "@atlaskit/icon/core/information";
import SparkIconCore from "@atlaskit/icon/core/ai-chat";
import { useCatySearch } from "@/components/caty/catySearchStore";
import { useAuth } from "@/lib/auth";
import { catyFilterToJql } from "@/lib/filters/catyFilterToJql";
import "@/pages/project-hub/jira-list/components/ask-caty-input.css";

const SUBTLE = "var(--ds-text-subtlest, #6B778C)";
const SparkIcon = () => <SparkIconCore label="" color={SUBTLE} />;

const ASK_CATY_PLACEHOLDER_SAMPLES: string[] = [
  "Show me high-priority bugs assigned to me in ${project} that are still open",
  "Which work items in ${project} have been blocked for more than three days?",
  "Find stories I'm watching in ${project} that haven't moved in over a week",
  "List all critical incidents in ${project} reported in the last seven days",
  "Show unassigned bugs in ${project} that need triage",
  "Which tasks in ${project} are due before the end of this week?",
  "Find work items in ${project} that are currently in code review",
  "Show me everything in ${project} created this week but not started",
];

export interface AskCatyInlineBarProps {
  projectKey: string | null;
  onClose: () => void;
  /** Called with the JQL string when CATY finishes generating a filter. */
  onJqlGenerated?: (jql: string) => void;
}

export function AskCatyInlineBar({ projectKey, onClose, onJqlGenerated }: AskCatyInlineBarProps) {
  const [askCatyQuery, setAskCatyQuery] = useState("");
  const askCatyInputRef = useRef<HTMLInputElement>(null);

  const catySubmit = useCatySearch((s) => s.submit);
  const catyClear = useCatySearch((s) => s.clear);
  const catyStatus = useCatySearch((s) => s.status);
  const catyStoreProjectKey = useCatySearch((s) => s.projectKey);
  const catyReason = useCatySearch((s) => s.reason);
  const catyErrorMessage = useCatySearch((s) => s.errorMessage);
  const catySecondaryQuery = useCatySearch((s) => s.secondaryQuery);
  const catySetSecondaryQuery = useCatySearch((s) => s.setSecondaryQuery);
  const catyFilter = useCatySearch((s) => s.filter);

  const askCatyLoading =
    catyStatus === "loading" && catyStoreProjectKey === projectKey;
  const askCatyHasResults =
    catyStatus === "ready" && catyStoreProjectKey === projectKey;
  const askCatyHasError =
    catyStatus === "errored" && catyStoreProjectKey === projectKey;

  const [askCatyFeedback, setAskCatyFeedback] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (catyStatus === "loading") setAskCatyFeedback(null);
  }, [catyStatus]);

  // Fire onJqlGenerated when CATY produces a result for this project
  useEffect(() => {
    if (askCatyHasResults && catyFilter && onJqlGenerated) {
      const jql = catyFilterToJql(catyFilter);
      if (jql) onJqlGenerated(jql);
    }
  }, [askCatyHasResults, catyFilter, onJqlGenerated]);

  const { user } = useAuth();

  // Focus input on mount.
  useEffect(() => {
    const t = setTimeout(() => askCatyInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  // Rotating typewriter placeholder — 4-phase state machine.
  type PhMode = "type" | "pauseAfter" | "erase" | "pauseBefore";
  const [phIdx, setPhIdx] = useState(0);
  const [phText, setPhText] = useState("");
  const [phMode, setPhMode] = useState<PhMode>("type");

  useEffect(() => {
    if (askCatyQuery !== "") return;

    const sample = (ASK_CATY_PLACEHOLDER_SAMPLES[phIdx] ?? "").replace(
      "${project}",
      projectKey ?? "this project",
    );

    let timeoutId: ReturnType<typeof setTimeout>;
    if (phMode === "type") {
      if (phText.length < sample.length) {
        const delay = 45 + Math.random() * 30;
        timeoutId = setTimeout(() => {
          setPhText(sample.slice(0, phText.length + 1));
        }, delay);
      } else {
        timeoutId = setTimeout(() => setPhMode("pauseAfter"), 1500);
      }
    } else if (phMode === "pauseAfter") {
      timeoutId = setTimeout(() => setPhMode("erase"), 0);
    } else if (phMode === "erase") {
      if (phText.length > 0) {
        timeoutId = setTimeout(() => {
          setPhText(phText.slice(0, -1));
        }, 22);
      } else {
        timeoutId = setTimeout(() => setPhMode("pauseBefore"), 0);
      }
    } else if (phMode === "pauseBefore") {
      timeoutId = setTimeout(() => {
        setPhIdx((i) => (i + 1) % ASK_CATY_PLACEHOLDER_SAMPLES.length);
        setPhMode("type");
      }, 500);
    }

    return () => clearTimeout(timeoutId);
  }, [askCatyQuery, phIdx, phText, phMode, projectKey]);

  const handleSubmit = useCallback(() => {
    const q = askCatyQuery.trim();
    if (!q || askCatyLoading) return;
    catySubmit({
      query: q,
      projectKey: projectKey ?? "",
      currentUser:
        user && (user as { id?: string }).id
          ? {
              id: (user as { id: string }).id,
              name:
                (user as { user_metadata?: { full_name?: string }; email?: string }).user_metadata?.full_name ??
                (user as { email?: string }).email ??
                "me",
            }
          : null,
    });
    window.dispatchEvent(
      new CustomEvent("catalyst:ask-caty", { detail: { query: q, projectKey } }),
    );
  }, [askCatyQuery, askCatyLoading, catySubmit, projectKey, user]);

  const handleClose = useCallback(() => {
    setAskCatyQuery("");
    if (askCatyHasResults || askCatyHasError || askCatyLoading) {
      catyClear();
    }
    onClose();
  }, [askCatyHasResults, askCatyHasError, askCatyLoading, catyClear, onClose]);

  return (
    <div
      data-testid="ask-caty-inline-bar"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 12px",
        borderBottom: "1px solid var(--ds-border, #DFE1E6)",
        background: "transparent",
        flexShrink: 0,
        fontFamily: "var(--cp-font-body)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          className={`ask-caty-frame${askCatyLoading ? " is-loading" : ""}`}
          style={{ flex: 1, minHeight: 40 }}
        >
          <div className="ask-caty-stack">
            <label className="ask-caty-row">
              <span className="ask-caty-row__prefix" aria-hidden="true">
                <SparkIcon />
              </span>
              <span className="ask-caty-row__field">
                <input
                  ref={askCatyInputRef}
                  className="ask-caty-row__input"
                  value={askCatyQuery}
                  onChange={(e) => setAskCatyQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                    if (e.key === "Escape") handleClose();
                  }}
                  placeholder=""
                  disabled={askCatyLoading}
                  aria-label="Ask Caty"
                  autoComplete="off"
                  spellCheck={false}
                />
                {askCatyQuery === "" && (
                  <span className="ask-caty-row__placeholder" aria-hidden="true">
                    {phText}
                    <span className="ask-caty-cursor" />
                  </span>
                )}
              </span>
              <span
                className="ask-caty-row__suffix"
                onMouseDown={(e) => e.preventDefault()}
              >
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!askCatyQuery.trim() || askCatyLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    border: "none",
                    borderRadius: 4,
                    background:
                      askCatyQuery.trim() && !askCatyLoading
                        ? "var(--ds-background-brand-bold, #0C66E4)"
                        : "var(--ds-background-neutral, #F4F5F7)",
                    color:
                      askCatyQuery.trim() && !askCatyLoading
                        ? "#FFFFFF"
                        : "var(--ds-text-disabled, #8590A2)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor:
                      askCatyQuery.trim() && !askCatyLoading ? "pointer" : "default",
                    fontFamily: "inherit",
                    transition: "background 120ms ease",
                    flexShrink: 0,
                  }}
                  aria-label="Submit"
                >
                  <span>Go</span>
                  <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
                    ⏎
                  </span>
                </button>
              </span>
            </label>

            {askCatyHasResults && (
              <>
                <div className="ask-caty-divider" aria-hidden="true" />
                {/* "Search work" row — fully chromeless. No wrapper
                    background; the rainbow frame already provides the
                    visible boundary. Icon glyph sits next to the input
                    with a small gap; the input fills the rest. Reads as
                    one continuous search filter, matches the AI query
                    row above stylistically. */}
                <label
                  className="ask-caty-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 40,
                    padding: "0 12px",
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      flex: "0 0 auto",
                      color: "var(--ds-text-subtlest, #6B778C)",
                    }}
                  >
                    <SearchIconCore label="" color="currentColor" />
                  </span>
                  <input
                    value={catySecondaryQuery}
                    onChange={(e) => catySetSecondaryQuery(e.target.value)}
                    placeholder="Search work"
                    aria-label="Search work"
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: "100%",
                      margin: 0,
                      padding: 0,
                      border: 0,
                      outline: 0,
                      background: "transparent",
                      boxShadow: "none",
                      font: "inherit",
                      fontSize: 14,
                      color: "var(--ds-text, #292A2E)",
                      appearance: "none",
                      WebkitAppearance: "none",
                    }}
                  />
                </label>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleClose}
          style={{
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 4,
            background: "transparent",
            cursor: "pointer",
            color: "var(--ds-text-subtle, #505258)",
            fontSize: 16,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Close Ask Caty"
        >
          ✕
        </button>
      </div>
      {(askCatyHasResults || askCatyHasError) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "0 4px",
            fontSize: 12,
            color: "var(--ds-text-subtlest, #6B778C)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <InfoIconCore label="" color="currentColor" />
            </span>
            <span>Uses AI. Verify results.</span>
            {askCatyHasResults && catyReason && (
              <span
                style={{
                  color: "var(--ds-text-subtle, #505258)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                · {catyReason}
              </span>
            )}
            {askCatyHasError && catyErrorMessage && (
              <span style={{ color: "var(--ds-text-danger, #AE2A19)" }}>
                · {catyErrorMessage}
              </span>
            )}
            {askCatyHasResults && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setAskCatyFeedback((f) => (f === "up" ? null : "up"))
                  }
                  aria-label="Helpful"
                  title="Helpful"
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color:
                      askCatyFeedback === "up"
                        ? "var(--ds-text-brand, #0C66E4)"
                        : "var(--ds-text-subtlest, #6B778C)",
                  }}
                >
                  <ThumbsUpIconCore label="" color="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAskCatyFeedback((f) => (f === "down" ? null : "down"))
                  }
                  aria-label="Not helpful"
                  title="Not helpful"
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color:
                      askCatyFeedback === "down"
                        ? "var(--ds-text-danger, #AE2A19)"
                        : "var(--ds-text-subtlest, #6B778C)",
                  }}
                >
                  <ThumbsDownIconCore label="" color="currentColor" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

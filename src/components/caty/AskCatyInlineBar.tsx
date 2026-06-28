/**
 * AskCatyInlineBar — the canonical, rainbow-bordered AI search bar (expanded
 * state of CatyAiSearch). Shared by every surface: backlog, AllWork list,
 * kanban, and the filter-preview pages.
 *
 * Canonical contract (2026-06-18 unification):
 *   - Leading mark is ALWAYS CatyPulseIcon (magenta #CD519D) — the single AI
 *     signifier across the app. No chat-bubble / spark variants.
 *   - A muted "ghost" predictive query sits in the empty box. Enter / Tab / →
 *     accepts it as the query; typing or clicking-in clears it (ghostReducer).
 *   - Surface-aware suggestion chips (curated, instant) sit under the field
 *     while idle, so users learn what they can ask. getCuratedSuggestions().
 *   - Arabic is first-class: the input flips to RTL automatically when the
 *     text is Arabic (containsArabic), and ai-search-issues matches either
 *     language.
 *   - Fires useCatySearch.submit() on Enter / Go. The parent reads the store
 *     (filter, status) and applies it to its own list. This component only
 *     turns a query into a structured filter spec; it does not navigate.
 *
 * Parent contract:
 *   <AskCatyInlineBar projectKey="BAU" surface="backlog" onClose={…} />
 */
import React, { useCallback, useEffect, useReducer, useState } from "react";
import SearchIconCore from "@atlaskit/icon/core/search";
import ThumbsUpIconCore from "@atlaskit/icon/core/thumbs-up";
import ThumbsDownIconCore from "@atlaskit/icon/core/thumbs-down";
import InfoIconCore from "@atlaskit/icon/core/information";
import { CatyPulseIcon } from "@/components/ui/CatyPulseIcon";
import { useCatySearch } from "@/components/caty/catySearchStore";
import { useAuth } from "@/lib/auth";
import { catyFilterToJql } from "@/lib/filters/catyFilterToJql";
import { containsArabic } from "@/lib/detectArabic";
import {
  getCuratedSuggestions,
  type SearchSurface,
} from "@/components/caty/searchSuggestions";
import { ghostReducer, type GhostState } from "@/components/caty/ghostState";
import "@/pages/project-hub/jira-list/components/ask-caty-input.css";

export interface AskCatyInlineBarProps {
  projectKey: string | null;
  onClose: () => void;
  /** Surface this search sits on — drives the curated suggestion set. */
  surface?: SearchSurface;
  /** Called with the JQL string when CATY finishes generating a filter. */
  onJqlGenerated?: (jql: string) => void;
}

const GHOST_INITIAL: GhostState = { input: "", ghost: null, dismissed: false };

export function AskCatyInlineBar({
  projectKey,
  onClose,
  surface = "list",
  onJqlGenerated,
}: AskCatyInlineBarProps) {
  const askCatyInputRef = React.useRef<HTMLInputElement>(null);

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

  const suggestions = React.useMemo(
    () => getCuratedSuggestions(surface, projectKey),
    [surface, projectKey],
  );

  // Ghost (muted predictive default) — pure logic lives in ghostReducer.
  const [ghostState, dispatch] = useReducer(ghostReducer, GHOST_INITIAL);
  const query = ghostState.input;

  // Arm the ghost with the top suggestion on mount.
  useEffect(() => {
    dispatch({ type: "open", ghost: suggestions[0] ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [askCatyFeedback, setAskCatyFeedback] = useState<"up" | "down" | null>(
    null,
  );
  useEffect(() => {
    if (catyStatus === "loading") setAskCatyFeedback(null);
  }, [catyStatus]);

  useEffect(() => {
    if (askCatyHasResults && catyFilter && onJqlGenerated) {
      const jql = catyFilterToJql(catyFilter);
      if (jql) onJqlGenerated(jql);
    }
  }, [askCatyHasResults, catyFilter, onJqlGenerated]);

  const { user } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => askCatyInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const runQuery = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q || askCatyLoading) return;
      catySubmit({
        query: q,
        projectKey: projectKey ?? "",
        currentUser:
          user && (user as { id?: string }).id
            ? {
                id: (user as { id: string }).id,
                name:
                  (user as { user_metadata?: { full_name?: string }; email?: string })
                    .user_metadata?.full_name ??
                  (user as { email?: string }).email ??
                  "me",
              }
            : null,
      });
      window.dispatchEvent(
        new CustomEvent("catalyst:ask-caty", { detail: { query: q, projectKey } }),
      );
    },
    [askCatyLoading, catySubmit, projectKey, user],
  );

  const handleSubmit = useCallback(() => {
    // Empty box + live ghost → accept the ghost as the query.
    const effective = query.trim() || (ghostState.ghost ?? "");
    if (query.trim() === "" && ghostState.ghost) {
      dispatch({ type: "acceptGhost" });
    }
    runQuery(effective);
  }, [query, ghostState.ghost, runQuery]);

  const acceptGhost = useCallback(() => {
    if (query !== "" || !ghostState.ghost) return false;
    dispatch({ type: "acceptGhost" });
    return true;
  }, [query, ghostState.ghost]);

  const handleClose = useCallback(() => {
    dispatch({ type: "open", ghost: null });
    if (askCatyHasResults || askCatyHasError || askCatyLoading) {
      catyClear();
    }
    onClose();
  }, [askCatyHasResults, askCatyHasError, askCatyLoading, catyClear, onClose]);

  const showGhost = query === "" && !!ghostState.ghost && !askCatyHasResults;
  const ghostText = ghostState.ghost ?? "";
  const dirText = query || ghostText;
  const isRtl = containsArabic(dirText);
  const showChips =
    !askCatyHasResults &&
    !askCatyHasError &&
    !askCatyLoading &&
    query.trim() === "" &&
    suggestions.length > 0;

  return (
    <div
      data-testid="ask-caty-inline-bar"
      data-voice-zone="true"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 12px",
        borderBottom: "1px solid var(--ds-border)",
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
                <CatyPulseIcon size={16} />
              </span>
              <span className="ask-caty-row__field">
                <input
                  ref={askCatyInputRef}
                  className="ask-caty-row__input"
                  value={query}
                  dir={isRtl ? "rtl" : "ltr"}
                  style={{ textAlign: isRtl ? "right" : "left" }}
                  onChange={(e) =>
                    dispatch({ type: "change", value: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmit();
                    } else if (
                      (e.key === "Tab" || e.key === "ArrowRight") &&
                      query === "" &&
                      ghostState.ghost
                    ) {
                      if (acceptGhost()) e.preventDefault();
                    } else if (e.key === "Escape") {
                      handleClose();
                    }
                  }}
                  placeholder=""
                  disabled={askCatyLoading}
                  aria-label="Ask Caty"
                  autoComplete="off"
                  spellCheck={false}
                />
                {showGhost && (
                  <span
                    className="ask-caty-row__placeholder"
                    dir={isRtl ? "rtl" : "ltr"}
                    style={{
                      justifyContent: isRtl ? "flex-end" : "flex-start",
                    }}
                    aria-hidden="true"
                  >
                    {ghostText}
                  </span>
                )}
              </span>
              {showGhost && (
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    fontSize: 'var(--ds-font-size-100)',
                    color: "var(--ds-text-subtlest)",
                    border: "0.5px solid var(--ds-border)",
                    borderRadius: 4,
                    padding: "0px 6px",
                  }}
                >
                  Tab
                </span>
              )}
              <span
                className="ask-caty-row__suffix"
                onMouseDown={(e) => e.preventDefault()}
              >
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    (!query.trim() && !ghostState.ghost) || askCatyLoading
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    border: "none",
                    borderRadius: 4,
                    background:
                      (query.trim() || ghostState.ghost) && !askCatyLoading
                        ? "var(--ds-background-brand-bold)"
                        : "var(--ds-background-neutral)",
                    color:
                      (query.trim() || ghostState.ghost) && !askCatyLoading
                        ? "var(--ds-surface)"
                        : "var(--ds-text-disabled)",
                    fontSize: 'var(--ds-font-size-300)',
                    fontWeight: 500,
                    cursor:
                      (query.trim() || ghostState.ghost) && !askCatyLoading
                        ? "pointer"
                        : "default",
                    fontFamily: "inherit",
                    transition: "background 120ms ease",
                    flexShrink: 0,
                  }}
                  aria-label="Submit"
                >
                  <span>Go</span>
                  <span aria-hidden="true" style={{ fontSize: 'var(--ds-font-size-400)', lineHeight: 1 }}>
                    ⏎
                  </span>
                </button>
              </span>
            </label>

            {askCatyHasResults && (
              <>
                <div className="ask-caty-divider" aria-hidden="true" />
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
                      color: "var(--ds-text-subtlest)",
                    }}
                  >
                    <SearchIconCore label="" color="currentColor" />
                  </span>
                  <input
                    value={catySecondaryQuery}
                    onChange={(e) => catySetSecondaryQuery(e.target.value)}
                    dir={containsArabic(catySecondaryQuery) ? "rtl" : "ltr"}
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
                      outline: "2px solid var(--ds-border-focused)",
                      background: "transparent",
                      boxShadow: "none",
                      font: "inherit",
                      fontSize: 'var(--ds-font-size-400)',
                      color: "var(--ds-text)",
                      textAlign: containsArabic(catySecondaryQuery)
                        ? "right"
                        : "left",
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
            color: "var(--ds-text-subtle)",
            fontSize: 'var(--ds-font-size-500)',
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

      {showChips && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "0 2px",
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                dispatch({ type: "change", value: s });
                runQuery(s);
              }}
              dir={containsArabic(s) ? "rtl" : "ltr"}
              style={{
                border: "none",
                borderRadius: 14,
                padding: "4px 10px",
                background: "var(--ds-background-neutral)",
                color: "var(--ds-text-subtle)",
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 400,
                fontFamily: "inherit",
                cursor: "pointer",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {(askCatyHasResults || askCatyHasError) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "0 4px",
            fontSize: 'var(--ds-font-size-200)',
            color: "var(--ds-text-subtlest)",
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
                  color: "var(--ds-text-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                · {catyReason}
              </span>
            )}
            {askCatyHasError && catyErrorMessage && (
              <span style={{ color: "var(--ds-text-danger)" }}>
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
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color:
                      askCatyFeedback === "up"
                        ? "var(--ds-text-brand)"
                        : "var(--ds-text-subtlest)",
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
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color:
                      askCatyFeedback === "down"
                        ? "var(--ds-text-danger)"
                        : "var(--ds-text-subtlest)",
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

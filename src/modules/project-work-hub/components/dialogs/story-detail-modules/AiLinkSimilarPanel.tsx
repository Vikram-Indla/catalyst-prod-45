/**
 * AiLinkSimilarPanel — "Link similar work items" AI suggestion panel
 * Collapsed by default: shows "Link similar work items" + "Show N result" button.
 * Expands to show checkbox list, select/deselect all, feedback, link-type dropdown.
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { catalystToast } from "@/lib/catalystToast";
import { Spinner } from "@/components/ads";
/* jira-compare 2026-05-03 — Patch D3 (lucide sweep) ·
   ChevronDown → @atlaskit/icon/glyph/chevron-down
   ThumbsUp / ThumbsDown → @atlaskit/icon/core/thumbs-up / thumbs-down
   Info → @atlaskit/icon/core/information
   Loader2 → Spinner from @/components/ads
   RefreshCw → @atlaskit/icon/core/refresh
   Direct @atlaskit/icon/* imports are the documented hub-scope alternative
   to lucide-react (eslint.config.js §lucideRestrictedPattern) until icon
   wrappers land in @/components/ads. */
/* eslint-disable no-restricted-imports */
import ChevronDown from "@atlaskit/icon/glyph/chevron-down";
import ThumbsUp from "@atlaskit/icon/core/thumbs-up";
import ThumbsDown from "@atlaskit/icon/core/thumbs-down";
import Info from "@atlaskit/icon/core/information";
import RefreshCw from "@atlaskit/icon/core/refresh";
/* eslint-enable no-restricted-imports */
import { IssueIcon } from "./shared-components";
import { LINK_TYPE_OPTIONS } from "./constants";
import "./ai-link-similar-panel.css";

// Typewriter copy for the loading state — taken verbatim from Jira's
// AI suggestions panel so the experience is familiar to users moving
// between the two products.
const SEARCH_PLACEHOLDER = "Searching for similar work items";

interface AiSuggestion {
  issue_key: string;
  summary: string;
  issue_type: string | null;
  status: string | null;
  status_category: string | null;
}

interface AiLinkSimilarPanelProps {
  issueKey: string;
  existingLinkedKeys: string[];
  onLinked: () => void;
}

/* ── Sparkle glyph (4-point star + small flares) ──
 * Inline SVG so the icon ships with the panel; matches Jira's "AI"
 * sparkle without pulling another @atlaskit/icon dependency. Size +
 * colour are prop-controlled for future reuse.
 */
function SparkleIcon({
  size = 16,
  color = "var(--ds-text-subtlest, #6B778C)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* main 4-point star */}
      <path
        d="M12 2.5l1.7 5.3a2 2 0 0 0 1.3 1.3l5.3 1.7-5.3 1.7a2 2 0 0 0-1.3 1.3L12 19.1l-1.7-5.3a2 2 0 0 0-1.3-1.3L3.7 10.8l5.3-1.7a2 2 0 0 0 1.3-1.3L12 2.5z"
        fill={color}
      />
      {/* small flare top-right */}
      <path
        d="M19 14l.6 1.7L21.3 16l-1.7.6L19 18l-.6-1.7L16.7 16l1.7-.6L19 14z"
        fill={color}
      />
      {/* small flare bottom-left */}
      <path
        d="M5 18l.4 1.1L6.5 19.5l-1.1.4L5 21l-.4-1.1L3.5 19.5l1.1-.4L5 18z"
        fill={color}
      />
    </svg>
  );
}

/* ── Link-type split button ──
 * Two clickable halves separated by a 1px divider:
 *   • Left text  → primary link action (`onLink` — links the active
 *                  selection scope, e.g. all checked items, or just
 *                  the row this button lives on)
 *   • Right chevron → opens the link-type picker dropdown so the user
 *                  can change the relationship word ("relates to" /
 *                  "blocks" / etc.)
 * Used both in the panel footer (links every checked suggestion) and
 * inline on each suggestion row (links only that row).
 */
function LinkAsSplitButton({
  value,
  onChange,
  onLink,
  isPending = false,
  size = "normal",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onLink: () => void;
  isPending?: boolean;
  size?: "normal" | "small";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const height = size === "small" ? 26 : 30;
  const fontSize = size === "small" ? 12 : 13;
  const chevronWidth = size === "small" ? 24 : 28;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        border: "1px solid var(--ds-border, #DFE1E6)",
        borderRadius: 3,
        background: "var(--ds-surface, #fff)",
        overflow: "visible",
      }}
    >
      <button
        onClick={onLink}
        disabled={isPending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 32,
          padding: "0 10px 0 12px",
          border:
            "1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))",
          borderRadius: 3,
          background: "var(--ds-surface, #fff)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "inherit",
          color:
            "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
          whiteSpace: "nowrap",
        }}
      >
        Link as {value}
      </button>
      {/* 1px vertical divider so the chevron reads as its own affordance */}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          alignSelf: "stretch",
          background: "var(--ds-border, #DFE1E6)",
          flexShrink: 0,
        }}
      />
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change link type"
        aria-expanded={open}
        style={{
          height,
          width: chevronWidth,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: open ? "var(--ds-link, #0052CC)" : "var(--ds-text-subtlest, #6B778C)",
          padding: 0,
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3,
        }}
      >
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            right: 0,
            minWidth: 200,
            background: "var(--ds-surface, #fff)",
            border:
              "1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))",
            borderRadius: 4,
            boxShadow: "0 4px 8px var(--ds-shadow-raised, rgba(9,30,66,.25))",
            zIndex: 70,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {LINK_TYPE_OPTIONS.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                height: 36,
                padding: "0 12px",
                cursor: "pointer",
                fontSize: 14,
                color:
                  "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
                background:
                  opt === value
                    ? "var(--ds-background-information, #DEEBFF)"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                if (opt !== value)
                  e.currentTarget.style.background =
                    "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))";
              }}
              onMouseLeave={(e) => {
                if (opt !== value)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Checkbox ── */
function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{
        width: 18,
        height: 18,
        borderRadius: 3,
        border: checked ? "none" : "2px solid var(--ds-border, #C1C7D0)",
        background: checked
          ? "var(--cp-primary-60, #0052CC)"
          : "var(--ds-surface, #fff)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
      }}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5L19 7"
            stroke="var(--ds-surface, #fff)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function AiLinkSimilarPanel({
  issueKey,
  existingLinkedKeys,
  onLinked,
}: AiLinkSimilarPanelProps) {
  const queryClient = useQueryClient();
  // Default collapsed — after AI completes the panel lands on the
  // "Show N results" pill so the suggestion list doesn't shove the
  // user's existing linked items down the page. Clicking the pill
  // expands; the chevron in the expanded header collapses back.
  const [expanded, setExpanded] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // Tracks whether the initial "pre-select all" has fired. Without this
  // ref a background refetch (network blip, focus return, etc.) would
  // wipe the user's manual deselections by repopulating selectedKeys.
  const didPreselectRef = useRef(false);
  // Must match a value in LINK_TYPE_OPTIONS (constants.ts) — these are
  // the only values the DB `ph_issue_links_link_type_check` constraint
  // accepts. Defaulting to "relates to" mirrors the existing
  // LinkedWorkItems `createLinkType` default.
  const [linkType, setLinkType] = useState("relates to");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [dismissedKeys] = useState<Set<string>>(new Set());
  const [linkedThisSession, setLinkedThisSession] = useState<Set<string>>(
    new Set(),
  );

  const {
    data: suggestions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["aiSimilarItems", issueKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "ai-similar-items",
        {
          body: { issueKey, existingLinkedKeys },
        },
      );

      if (error) throw error;

      // Handle rate-limit / payment errors
      if (data?.error) throw new Error(data.error);

      return (data?.suggestions ?? []) as AiSuggestion[];
    },
    staleTime: 10 * 60 * 1000, // 10 min — AI results are expensive
    retry: 1,
  });

  const filteredSuggestions = useMemo(() => {
    const excludeSet = new Set([
      ...existingLinkedKeys,
      ...dismissedKeys,
      ...linkedThisSession,
    ]);
    return suggestions.filter((s) => !excludeSet.has(s.issue_key));
  }, [suggestions, existingLinkedKeys, dismissedKeys, linkedThisSession]);

  // Pre-select every suggestion the first time AI results land. Ref
  // gate prevents a later refetch (focus return, network retry) from
  // wiping the user's manual deselections.
  useEffect(() => {
    if (didPreselectRef.current) return;
    if (filteredSuggestions.length === 0) return;
    setSelectedKeys(new Set(filteredSuggestions.map((s) => s.issue_key)));
    didPreselectRef.current = true;
  }, [filteredSuggestions]);

  const count = filteredSuggestions.length;
  const allSelected =
    count > 0 &&
    filteredSuggestions.every((s) => selectedKeys.has(s.issue_key));

  const toggleAll = () => {
    if (allSelected) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(filteredSuggestions.map((s) => s.issue_key)));
  };

  const toggleOne = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const linkMutation = useMutation({
    mutationFn: async (overrideKeys?: string[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const targets =
        overrideKeys && overrideKeys.length > 0
          ? overrideKeys
          : Array.from(selectedKeys);
      const results: { key: string; ok: boolean }[] = [];
      for (const targetKey of targets) {
        const { error } = await supabase.from("ph_issue_links").insert({
          source_id: issueKey,
          target_id: targetKey,
          link_type: linkType,
          created_by: user.id,
        });
        results.push({ key: targetKey, ok: !error });
      }
      return results;
    },
    onSuccess: (results) => {
      const successKeys = results.filter((r) => r.ok).map((r) => r.key);
      setLinkedThisSession((prev) => new Set([...prev, ...successKeys]));
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        successKeys.forEach((k) => next.delete(k));
        return next;
      });
      const failedKeys = results.filter((r) => !r.ok).map((r) => r.key);
      if (successKeys.length)
        catalystToast.success(
          `Linked ${successKeys.length} similar item${successKeys.length > 1 ? "s" : ""}`,
        );
      if (failedKeys.length)
        catalystToast.error(`Failed to link: ${failedKeys.join(", ")}`);
      onLinked();
      queryClient.invalidateQueries({ queryKey: ["linkedIssues", issueKey] });
    },
  });

  // Typewriter state for the loading frame. Re-runs whenever
  // `isLoading` flips back to true (e.g. user opens panel for a
  // different ticket). Mounting effect cleans the interval on
  // unmount or when loading completes.
  const [typedText, setTypedText] = useState("");
  useEffect(() => {
    if (!isLoading) {
      setTypedText("");
      return;
    }
    let i = 0;
    setTypedText("");
    const interval = setInterval(() => {
      i += 1;
      if (i > SEARCH_PLACEHOLDER.length) {
        clearInterval(interval);
        return;
      }
      setTypedText(SEARCH_PLACEHOLDER.substring(0, i));
    }, 55);
    return () => clearInterval(interval);
  }, [isLoading]);

  /* ── LOADING STATE ──
   * Inserted between the section header and the existing linked-items
   * list while AI is fetching. Rainbow border rotates, dots bounce,
   * and the placeholder text types itself in — matches Jira's
   * "Searching for similar work items" affordance so users don't
   * think the click did nothing.
   */
  if (isLoading) {
    return (
      <div
        className="als-loading-frame"
        role="status"
        aria-live="polite"
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span className="als-bouncing-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span style={{ fontSize: 13, color: "var(--ds-text-subtle, #42526E)" }}>
          {typedText}
          <span className="als-typewriter-caret" aria-hidden="true" />
        </span>
        <span className="sr-only">Searching for similar work items</span>
      </div>
    );
  }

  /* ── COLLAPSED STATE ── only entered after the user clicks the
   * chevron in the expanded header. Loading is handled above so this
   * branch never sees `isLoading === true`. */
  if (!expanded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          border:
            "1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))",
          borderRadius: 8,
          background: "var(--ds-surface-sunken, #FAFBFC)",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              stroke="var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color:
                "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
            }}
          >
            Link similar work items
          </span>
        </div>
        {count > 0 ? (
          <button
            onClick={() => setExpanded(true)}
            style={{
              height: 28,
              padding: "0 12px",
              border:
                "1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))",
              borderRadius: 3,
              background: "var(--ds-surface, #fff)",
              cursor: "pointer",
              fontSize: 13,
              color:
                "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
              fontFamily: "inherit",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Show {count} result{count !== 1 ? "s" : ""}
          </button>
        ) : (
          <span
            style={{
              fontSize: 12,
              color:
                "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
              fontStyle: "italic",
            }}
          >
            No results found.
          </span>
        )}
      </div>
    );
  }

  /* ── EXPANDED STATE ── */
  return (
    <div
      style={{
        border:
          "1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))",
        borderRadius: 8,
        marginBottom: 8,
        overflow: "hidden",
      }}
    >
      {/* Header — click to collapse */}
      <div
        onClick={() => setExpanded(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          cursor: "pointer",
          background: "var(--ds-surface-sunken, #FAFBFC)",
          borderBottom:
            "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SparkleIcon size={16} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ds-text, #172B4D)",
            }}
          >
            Link similar work items
          </span>
        </div>
        <ChevronDown
          size={16}
          color="var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))"
          style={{ transform: "rotate(180deg)" }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: "0 12px 12px" }}>
        {/* Error */}
        {isError && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 0",
            }}
          >
            <span
              style={{ fontSize: 13, color: "var(--ds-text-danger, #AE2A19)" }}
            >
              Failed to load suggestions
            </span>
            <button
              onClick={() => refetch()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border:
                  "1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))",
                borderRadius: 3,
                background: "var(--ds-surface, #fff)",
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
                color:
                  "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
              }}
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Empty after filter */}
        {!isError && count === 0 && (
          <div
            style={{
              padding: "12px 0",
              fontSize: 13,
              color:
                "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
              fontStyle: "italic",
            }}
          >
            No similar work items found.
          </div>
        )}

        {/* Suggestions */}
        {count > 0 && (
          <>
            {/* Select all / Deselect all */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 0 6px",
                borderBottom:
                  "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))",
              }}
            >
              <Checkbox checked={allSelected} onChange={toggleAll} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color:
                    "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
                }}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </span>
            </div>

            {/* Rows — each row reveals an inline split button on hover so
                the user can link a single item without unticking the
                others. The .als-suggestion-row hook drives the
                opacity-on-hover transition (CSS file). */}
            {filteredSuggestions.map((s) => (
              <div
                key={s.issue_key}
                className="als-suggestion-row"
                onClick={() => toggleOne(s.issue_key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom:
                    "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "var(--ds-surface-sunken, #FAFBFC)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Checkbox
                  checked={selectedKeys.has(s.issue_key)}
                  onChange={() => toggleOne(s.issue_key)}
                />
                <IssueIcon type={s.issue_type || "task"} size={16} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    color: "var(--ds-text, #172B4D)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{s.issue_key}:</span>{" "}
                  {s.summary}
                </span>
                <div
                  className="als-row-action"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkAsSplitButton
                    value={linkType}
                    onChange={setLinkType}
                    onLink={() => linkMutation.mutate([s.issue_key])}
                    isPending={linkMutation.isPending}
                    size="small"
                  />
                </div>
              </div>
            ))}

            {/* Footer: disclaimer + feedback | link-type dropdown */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 10,
                marginTop: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Info
                    size={14}
                    color="var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))"
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color:
                        "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
                    }}
                  >
                    Uses AI. Verify results.
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeedback("up");
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 2,
                    color:
                      feedback === "up"
                        ? "var(--cp-primary-60, #0052CC)"
                        : "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
                  }}
                  title="Helpful"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeedback("down");
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 2,
                    color:
                      feedback === "down"
                        ? "var(--ds-background-danger-bold, #C9372C)"
                        : "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
                  }}
                  title="Not helpful"
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
              {/* Single split button replaces the legacy "LinkAsDropdown +
                  separate Link N items pill" pair. Disabled until at
                  least one row is checked. */}
              <LinkAsSplitButton
                value={linkType}
                onChange={setLinkType}
                onLink={() => linkMutation.mutate(undefined)}
                isPending={linkMutation.isPending || selectedKeys.size === 0}
              />
            </div>

            {selectedKeys.size > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  paddingTop: 8,
                }}
              >
                <button
                  onClick={() => linkMutation.mutate(undefined)}
                  disabled={linkMutation.isPending}
                  style={{
                    height: 32,
                    padding: "0 16px",
                    border: "none",
                    borderRadius: 3,
                    background:
                      "var(--ds-background-brand-bold, var(--cp-primary-60, #0052CC))",
                    color: "var(--ds-surface, #fff)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: linkMutation.isPending ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: linkMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {linkMutation.isPending ? (
                    <Spinner size="small" />
                  ) : (
                    `Link ${selectedKeys.size} item${selectedKeys.size > 1 ? "s" : ""}`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

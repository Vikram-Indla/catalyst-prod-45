/**
 * CANONICAL — Parent / Link picker for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Supports two modes:
 *   single — one parent via parent_key field (Story→Epic, Subtask→Story, etc.)
 *   multi  — multiple links via ph_issue_links table (Defect→Stories, Incident→Stories)
 *
 * The picker shows items grouped by Active (todo + in_progress) and Done,
 * following the Jira pattern. Items are filtered by the allowed parent types
 * defined in parent-rules.ts.
 */
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { flag } from "@/components/shared/JiraTable/flags";
import { useGlobalSearchStore } from "@/store/globalSearchStore";
import SearchIcon from "@atlaskit/icon/core/search";
import CrossIcon from "@atlaskit/icon/glyph/cross";
import CrossCircleIcon from "@atlaskit/icon/glyph/cross-circle";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import CheckIcon from "@atlaskit/icon/glyph/check";
import AddIcon from "@atlaskit/icon/core/add";
import type { PhIssue, CatalystItemType } from "../types";
import { PARENT_LINK_RULES, type ParentLinkRule } from "../parent-rules";
import {
  IssueIcon,
  StatusLozenge,
} from "@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components";

/* ═══════════════════════════════════════════════
   CANONICAL TRIGGER — Jira-parity "None" placeholder.
   jira-compare 2026-05-05: Jira's Parent field shows "None" as a plain
   muted text placeholder (not a dashed button). Clicking anywhere on the
   field row opens the picker. Removed dashed border + AddIcon — replaced
   with an inline plain-text trigger matching Jira's DOM-probed style:
   fontSize 14px, color var(--ds-text-subtle), no border, subtle hover background.
   ═══════════════════════════════════════════════ */
function SidebarAddTrigger({
  label,
  onClick,
  isOpen,
}: {
  label: string;
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={isOpen}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "0px 6px",
        background: "none",
        border: "2px solid transparent",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 'var(--ds-font-size-400)',
        color: "var(--ds-text-subtle)",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
      }}
    >
      {label === "Add parent" ? "None" : label}
    </button>
  );
}

interface CatalystParentLinkerProps {
  /** The current issue */
  issue: PhIssue | null;
  /** Current item ID */
  itemId: string;
  /** Resolved Catalyst item type */
  itemType: CatalystItemType;
  /** Project key for scoping the search */
  projectKey?: string;
  /** Callback when a parent link is clicked to open its detail */
  onOpenItem?: (itemId: string) => void;
}

interface CandidateItem {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
}

/* jira-compare Patch #6 (2026-04-28) — Parent lozenge tokens.
 * Renders parent as an Atlaskit-style SUBTLE lozenge: a tinted type-color
 * background with matching accent text. Jira renders the parent chip subtle
 * (not a solid/bold fill), and ADS `*-subtler` backgrounds are theme-aware so
 * the chip adapts correctly in dark mode (a dark tint + light accent text)
 * instead of a flat bold slab.
 * 2026-06-27: corrected bold (`*-bolder` + inverse text) → subtle to match
 * both Jira parity and this block's own stated intent.
 */
const PARENT_TOKENS: Record<string, { bg: string; text: string }> = {
  Epic: {
    bg: "var(--ds-background-accent-purple-subtler)",
    text: "var(--ds-text-accent-purple)",
  },
  Story: {
    bg: "var(--ds-background-accent-green-subtler)",
    text: "var(--ds-text-accent-green)",
  },
  Feature: {
    bg: "var(--ds-background-accent-purple-subtler)",
    text: "var(--ds-text-accent-purple)",
  },
  Task: {
    bg: "var(--ds-background-accent-blue-subtler)",
    text: "var(--ds-text-accent-blue)",
  },
  Subtask: {
    bg: "var(--ds-background-accent-blue-subtler)",
    text: "var(--ds-text-accent-blue)",
  },
  Defect: {
    bg: "var(--ds-background-accent-red-subtler)",
    text: "var(--ds-text-accent-red)",
  },
  Bug: {
    bg: "var(--ds-background-accent-red-subtler)",
    text: "var(--ds-text-accent-red)",
  },
  "QA Bug": {
    bg: "var(--ds-background-accent-red-subtler)",
    text: "var(--ds-text-accent-red)",
  },
  "Production Incident": {
    bg: "var(--ds-background-accent-red-subtler)",
    text: "var(--ds-text-accent-red)",
  },
  "Change Request": {
    bg: "var(--ds-background-accent-orange-subtler)",
    text: "var(--ds-text-accent-orange)",
  },
  "Business Request": {
    bg: "var(--ds-background-accent-gray-subtler)",
    text: "var(--ds-text-accent-gray)",
  },
  default: {
    bg: "var(--ds-background-accent-gray-subtler)",
    text: "var(--ds-text-accent-gray)",
  },
};
/** Exported for unit tests only — do not use outside tests. */
export const PARENT_TOKENS_FOR_TEST = PARENT_TOKENS;

function ParentLozenge({
  parentType,
  parentKey,
  parentSummary,
  onClick,
  onOpenParent,
}: {
  parentType: string;
  parentKey: string;
  parentSummary?: string;
  onClick?: () => void;
  onOpenParent?: () => void;
}) {
  const tok = PARENT_TOKENS[parentType] ?? PARENT_TOKENS.default;
  return (
    <span
      data-cp-parent-lozenge
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        maxWidth: 360,
        cursor: onClick ? "pointer" : "default",
      }}
      title={`${parentKey} ${parentSummary ?? ""}`}
    >
      <IssueIcon type={parentType} size={14} />
      <span
        role="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenParent?.();
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.textDecoration = "underline";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.textDecoration = "none";
        }}
        style={{
          display: "inline-block",
          padding: "0px 8px",
          borderRadius: 4,
          background: tok.bg,
          color: tok.text,
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 400,
          cursor: "pointer",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecorationColor: "currentColor",
          textUnderlineOffset: "2px",
        }}
      >
        {parentKey}
        {parentSummary ? ` ${parentSummary}` : ""}
      </span>
    </span>
  );
}

export function CatalystParentLinker({
  issue,
  itemId,
  itemType,
  projectKey,
  onOpenItem,
}: CatalystParentLinkerProps) {
  const rule = PARENT_LINK_RULES[itemType];

  // If no allowed parents, don't render
  if (!rule || rule.allowedParentTypes.length === 0) return null;

  if (rule.useBusinessRequests) {
    return (
      <BusinessRequestParentPicker
        issue={issue}
        itemId={itemId}
        rule={rule}
        projectKey={projectKey}
        onOpenItem={onOpenItem}
      />
    );
  }

  return rule.mode === "single" ? (
    <SingleParentPicker
      issue={issue}
      itemId={itemId}
      rule={rule}
      projectKey={projectKey}
      onOpenItem={onOpenItem}
    />
  ) : (
    <MultiLinkPicker
      issue={issue}
      itemId={itemId}
      rule={rule}
      projectKey={projectKey}
      onOpenItem={onOpenItem}
    />
  );
}

/* ═══════════════════════════════════════════════
   BUSINESS REQUEST PARENT PICKER — queries business_requests table
   ═══════════════════════════════════════════════ */
interface BrCandidate {
  id: string;
  request_key: string | null;
  title: string;
  process_step: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PORTAL POSITIONING HOOK (jira-compare 2026-05-11 — Vikram defect "Priority
   click shows long text box"). The parent picker's dropdown was rendered
   `position: absolute; top: 48%` INSIDE the trigger's relative container,
   which placed it visually over the next FieldRow (Priority).  Clicks on
   the visually-Priority pixels landed on the picker dropdown (higher
   z-index), so the click-outside handler treated them as "inside" the
   picker and never closed → user perceived "clicking Priority opens a
   text box."
   Fix: render the dropdown via createPortal to document.body using
   position:fixed coordinates from the trigger's getBoundingClientRect.
   This breaks the stacking context so sibling rows (Priority) receive
   clicks correctly, and the dropdown no longer occupies their visual
   slot.  Pattern matches CLAUDE.md 2026-05-08 (GlobalSearchPanel filter
   chips) and WatchersChip self-rolled popover.
   ═══════════════════════════════════════════════════════════════════════════ */
function usePickerPosition(
  triggerRef: React.RefObject<HTMLElement>,
  isOpen: boolean,
): { top: number; left: number; width: number } | null {
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  useEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }
    const recompute = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(r.width, 240);
      const spaceRight = window.innerWidth - r.left;
      const openLeft = spaceRight < w + 16;
      const rawLeft = openLeft ? r.right - w : r.left;
      const left = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8));
      setPos({
        top: r.bottom + 4,
        left,
        width: w,
      });
    };
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [isOpen, triggerRef]);
  return pos;
}

function BusinessRequestParentPicker({
  issue,
  itemId,
  rule,
  projectKey,
  onOpenItem,
}: {
  issue: PhIssue | null;
  itemId: string;
  rule: ParentLinkRule;
  projectKey?: string;
  onOpenItem?: (id: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const pickerPos = usePickerPosition(triggerRef, showPicker);
  const queryClient = useQueryClient();

  // Close on outside click — guards both the trigger and the portaled dropdown.
  useEffect(() => {
    if (!showPicker) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setShowPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPicker]);

  // Fetch active business requests
  const { data: candidates = [] } = useQuery({
    queryKey: ["cv-br-parent-candidates"],
    enabled: showPicker,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_requests")
        .select("id, request_key, title, process_step")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200);
      return (data || []) as BrCandidate[];
    },
    staleTime: 30000,
  });

  // Resolve current parent — stored as parent_key on ph_issues, matching request_key on business_requests
  const { data: currentParent } = useQuery({
    queryKey: ["cv-br-parent-resolved", issue?.parent_key],
    enabled: !!issue?.parent_key,
    queryFn: async () => {
      // Try matching parent_key to request_key
      const { data } = await supabase
        .from("business_requests")
        .select("id, request_key, title, process_step")
        .eq("request_key", issue!.parent_key!)
        .is("deleted_at", null)
        .maybeSingle();
      return data as BrCandidate | null;
    },
  });

  const updateParent = useMutation({
    mutationFn: async (newParentKey: string | null) => {
      await supabase
        .from("ph_issues")
        .update({ parent_key: newParentKey })
        .eq("issue_key", itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-issue-detail", itemId] });
      queryClient.invalidateQueries({ queryKey: ["cv-br-parent-resolved"] });
      setShowPicker(false);
      setSearch("");
    },
  });

  const DONE_STEPS = ["done", "completed", "closed", "cancelled", "rejected", "won't do"];
  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.request_key?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q)
    );
  });
  const active = filtered.filter(
    (c) => !DONE_STEPS.includes(c.process_step?.toLowerCase()),
  );
  const done = filtered.filter((c) =>
    DONE_STEPS.includes(c.process_step?.toLowerCase()),
  );

  /* Shell-free render: CatalystKeyDetails.FieldRow now owns the "Parent"
     label + left column. This picker returns only the VALUE cell so the
     label doesn't double up. */
  return (
    <div style={{ position: "relative" }} ref={triggerRef}>
      {/* Current parent display */}
      {currentParent ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
          }}
          onClick={() => setShowPicker(!showPicker)}
        >
          <IssueIcon type="Business Request" size={16} />
          <span
            style={{
              fontFamily: "var(--cp-font-mono)",
              fontSize: 'var(--ds-font-size-400)',
              color: "var(--ds-link, var(--cp-primary-60))",
              flexShrink: 0,
            }}
          >
            {currentParent.request_key}
          </span>
          <span
            style={{
              fontSize: 'var(--ds-font-size-400)',
              color: "var(--ds-text)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentParent.title}
          </span>
        </div>
      ) : (
        <SidebarAddTrigger
          label="Add parent"
          isOpen={showPicker}
          onClick={() => setShowPicker(!showPicker)}
        />
      )}

      {/* Picker dropdown — portaled to document.body to avoid overlapping sibling rows (Priority) */}
      {showPicker &&
        pickerPos &&
        createPortal(
          <div
            ref={portalRef}
            data-cv-parent-picker="true"
            style={{
              position: "fixed",
              top: pickerPos.top,
              left: pickerPos.left,
              width: pickerPos.width,
              background:
                "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))",
              border:
                "1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))",
              borderRadius: 6,
              boxShadow: "0 8px 16px var(--ds-shadow-raised, rgba(9,30,66,0.15))",
              zIndex: 1000,
              maxHeight: 400,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Search */}
            <div
              style={{
                padding: "8px 12px",
                borderBottom:
                  "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  border: "2px solid var(--ds-border-focused)",
                  borderRadius: 4,
                  padding: "4px 8px",
                }}
              >
                <SearchIcon
                  size="small"
                  primaryColor="var(--ds-icon-subtle)"
                />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search business requests…"
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: 'var(--ds-font-size-300)',
                    color: "var(--ds-text)",
                    width: "100%",
                    fontFamily: "inherit",
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color:
                        "var(--ds-text-subtlest, var(--cp-text-secondary))",
                      display: "flex",
                      padding: 0,
                    }}
                  >
                    <CrossIcon
                      size="small"
                      primaryColor="var(--ds-text-subtlest, var(--cp-text-secondary))"
                    />
                  </button>
                )}
              </div>
            </div>
            <div style={{ overflowY: "auto", maxHeight: 300 }}>
              {renderBrGroup("ACTIVE", active, issue?.parent_key, (key) =>
                updateParent.mutate(key),
              )}
              {renderBrGroup("DONE", done, issue?.parent_key, (key) =>
                updateParent.mutate(key),
              )}
              {filtered.length === 0 && (
                <div
                  style={{
                    padding: "16px",
                    fontSize: 'var(--ds-font-size-300)',
                    color:
                      "var(--ds-text-subtlest, var(--cp-text-secondary))",
                    textAlign: "center",
                  }}
                >
                  No matching business requests
                </div>
              )}
            </div>
            {currentParent && (
              <div
                style={{
                  borderTop:
                    "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken))",
                  padding: "4px 0",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    updateParent.mutate(null);
                    setShowPicker(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "4px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 'var(--ds-font-size-300)',
                    color: "var(--ds-text-danger)",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--ds-background-danger-hovered)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "none";
                  }}
                >
                  Remove parent
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Render a group (ACTIVE / DONE) for business request parent picker */
function renderBrGroup(
  label: string,
  items: BrCandidate[],
  currentParentKey: string | null | undefined,
  onSelect: (key: string) => void,
) {
  if (items.length === 0) return null;
  const DONE_STEPS = ["done", "completed", "closed", "cancelled", "rejected", "won't do"];
  return (
    <>
      <div
        style={{
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          color: "var(--ds-text-subtlest, var(--cp-text-secondary))",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "8px 12px 4px",
        }}
      >
        {label}
      </div>
      {items.map((item) => {
        const isSelected = currentParentKey === item.request_key;
        const statusCat = DONE_STEPS.includes(item.process_step?.toLowerCase())
          ? "done"
          : ["in_progress", "in progress", "implementation", "testing", "in development"].some(
                (s) => item.process_step?.toLowerCase().includes(s),
              )
            ? "indeterminate"
            : "new";
        return (
          <div
            key={item.id}
            onClick={() => item.request_key && onSelect(item.request_key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              cursor: "pointer",
              background: isSelected
                ? "var(--ds-background-information)"
                : "transparent",
              transition: "background 80ms",
            }}
            onMouseEnter={(e) => {
              if (!isSelected)
                e.currentTarget.style.background =
                  "var(--ds-surface-sunken, var(--cp-bg-sunken))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isSelected
                ? "var(--ds-background-information)"
                : "transparent";
            }}
          >
            <IssueIcon type="Business Request" size={14} />
            <span
              style={{
                fontFamily: "var(--cp-font-mono)",
                fontSize: 'var(--ds-font-size-200)',
                color: "var(--ds-text-subtle)",
                flexShrink: 0,
              }}
            >
              {item.request_key || "—"}
            </span>
            <span
              style={{
                fontSize: 'var(--ds-font-size-300)',
                color: "var(--ds-text)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.title}
            </span>
            <StatusLozenge status={item.process_step} category={statusCat} />
            {isSelected && (
              <CheckIcon
                size="small"
                primaryColor="var(--ds-background-brand-bold, var(--cp-primary-60))"
              />
            )}
          </div>
        );
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════
   SINGLE PARENT PICKER — uses parent_key
   ═══════════════════════════════════════════════ */
function SingleParentPicker({
  issue,
  itemId,
  rule,
  projectKey,
  onOpenItem,
}: {
  issue: PhIssue | null;
  itemId: string;
  rule: ParentLinkRule;
  projectKey?: string;
  onOpenItem?: (id: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const pickerPos = usePickerPosition(triggerRef, showPicker);
  const queryClient = useQueryClient();

  // Close on outside click — guards trigger + portaled dropdown
  useEffect(() => {
    if (!showPicker) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setShowPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPicker]);

  // Fetch candidates
  const pk = projectKey || issue?.project_key;
  const { data: candidates = [] } = useQuery({
    queryKey: ["cv-parent-candidates", pk, rule.allowedParentTypes.join(",")],
    enabled: showPicker && !!pk,
    queryFn: async () => {
      const { data } = await supabase
        .from("ph_issues")
        .select("id, issue_key, summary, issue_type, status, status_category")
        .eq("project_key", pk!)
        .in("issue_type", rule.allowedParentTypes)
        .is("deleted_at", null)
        .order("jira_updated_at", { ascending: false })
        .limit(200);
      return (data || []) as CandidateItem[];
    },
    staleTime: 30000,
  });

  // Resolve current parent.
  // `isLoading` + `isFetched` are needed so the render path can distinguish
  // (a) query hasn't fired yet / still in flight — treat as loading,
  // (b) query fired and returned null — parent exists by `parent_key` but
  //     is not in ph_issues (e.g. Feature stored in another table, or the
  //     row is soft-deleted). In both cases we must still render the
  //     parent_key lozenge instead of falling through to "+ Add parent",
  //     which misleads users (ICP-411 / BAU-5534: breadcrumb proves the
  //     parent exists but the picker was rendering the "add" affordance).
  const { data: currentParent, isFetched: parentFetched } = useQuery({
    queryKey: ["cv-parent-resolved", issue?.parent_key],
    enabled: !!issue?.parent_key,
    queryFn: async () => {
      const { data } = await supabase
        .from("ph_issues")
        .select("id, issue_key, summary, issue_type, status, status_category")
        .eq("issue_key", issue!.parent_key!)
        .is("deleted_at", null)
        .maybeSingle();
      return data as CandidateItem | null;
    },
  });

  const updateParent = useMutation({
    mutationFn: async (newParentKey: string | null) => {
      await supabase
        .from("ph_issues")
        .update({ parent_key: newParentKey })
        .eq("issue_key", itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-issue-detail", itemId] });
      queryClient.invalidateQueries({ queryKey: ["cv-parent-resolved"] });
      setShowPicker(false);
    },
  });

  const filtered = candidates;
  const isDone = (c: CandidateItem) => c.status_category?.toLowerCase() === 'done';
  const active = filtered.filter((c) => !isDone(c));
  const done = filtered.filter(isDone);

  /* Shell-free render: CatalystKeyDetails.FieldRow now owns the "Parent"
     label + left column. This picker returns only the VALUE cell so the
     label doesn't double up.
     Three value states (ordered by priority):
       1. `currentParent` resolved     → full lozenge (issue icon + key + summary)
       2. `issue.parent_key` set but   → minimal key-only lozenge so the row
          resolve returned null/loading  never claims the parent is missing
       3. no parent_key                → SidebarAddTrigger "+ Add parent"
     State 2 covers BAU-5534-style cases where the breadcrumb proves a
     parent exists but the parent row lives outside ph_issues (e.g. stored
     in a separate Features table) — we still honour the link. */
  const rawParentKey = issue?.parent_key ?? null;
  const hasRawParent = !!rawParentKey;
  // When picker is open, the trigger morphs into an input-style field
  // with a blue border + plain-text display of the selected parent + X
  // button to clear (Jira parity).
  const displayedParentText = currentParent
    ? `${currentParent.issue_key} ${currentParent.summary}`
    : hasRawParent
      ? `${rawParentKey}${(issue as any)?.parent_summary ? ` ${(issue as any).parent_summary}` : ""}`
      : "";
  return (
    <div style={{ position: "relative" }} ref={triggerRef}>
      {showPicker ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            border: "2px solid var(--ds-border-focused)",
            borderRadius: 4,
            padding: "0px 6px",
            background: "var(--ds-background-input)",
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 'var(--ds-font-size-400)',
              color: "var(--ds-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayedParentText}
          </span>
          {(currentParent || hasRawParent) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateParent.mutate(null);
                setShowPicker(false);
              }}
              aria-label="Remove parent"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <CrossCircleIcon
                label="Clear parent"
                size="small"
                primaryColor="var(--ds-text-subtle)"
              />
            </button>
          )}
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <ChevronDownIcon
              label=""
              size="large"
              primaryColor="var(--ds-text-subtle)"
            />
          </span>
        </div>
      ) : currentParent ? (
        <ParentLozenge
          parentType={currentParent.issue_type}
          parentKey={currentParent.issue_key}
          parentSummary={currentParent.summary}
          onClick={() => setShowPicker(!showPicker)}
          onOpenParent={() => {
            if (onOpenItem) onOpenItem(currentParent.issue_key);
            else
              useGlobalSearchStore
                .getState()
                .openDetail({ id: currentParent.issue_key });
          }}
        />
      ) : hasRawParent ? (
        <ParentLozenge
          parentType={(issue as any)?.parent_issue_type || "Epic"}
          parentKey={rawParentKey!}
          parentSummary={(issue as any)?.parent_summary}
          onClick={() => setShowPicker(!showPicker)}
          onOpenParent={() => {
            if (!rawParentKey) return;
            if (onOpenItem) onOpenItem(rawParentKey);
            else
              useGlobalSearchStore.getState().openDetail({ id: rawParentKey });
          }}
        />
      ) : (
        <SidebarAddTrigger
          label="Add parent"
          isOpen={showPicker}
          onClick={() => setShowPicker(!showPicker)}
        />
      )}

      {/* Picker dropdown — portaled to document.body (jira-compare 2026-05-11 Vikram fix) */}
      {showPicker &&
        pickerPos &&
        createPortal(
          <div
            ref={portalRef}
            data-cv-parent-picker="true"
            style={{
              position: "fixed",
              top: pickerPos.top,
              left: pickerPos.left,
              width: pickerPos.width,
              background:
                "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))",
              border:
                "1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))",
              borderRadius: 6,
              boxShadow: "0 8px 16px var(--ds-shadow-raised, rgba(9,30,66,0.15))",
              zIndex: 1000,
              maxHeight: 400,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* "Show done work items" checkbox (Jira parity) */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderBottom: "1px solid var(--ds-border)",
                cursor: "pointer",
                fontSize: 'var(--ds-font-size-400)',
                color: "var(--ds-text)",
              }}
            >
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                style={{ width: 14, height: 14, margin: 0, cursor: "pointer" }}
              />
              Show done work items
            </label>
            <div style={{ overflowY: "auto", maxHeight: 300 }}>
              {renderGroup("ACTIVE", active, issue?.parent_key, (key) =>
                updateParent.mutate(key),
              )}
              {showDone &&
                renderGroup("DONE", done, issue?.parent_key, (key) =>
                  updateParent.mutate(key),
                )}
              {active.length + (showDone ? done.length : 0) === 0 && (
                <div
                  style={{
                    padding: "16px",
                    fontSize: 'var(--ds-font-size-300)',
                    color:
                      "var(--ds-text-subtlest, var(--cp-text-secondary))",
                    textAlign: "center",
                  }}
                >
                  No matching items
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MULTI LINK PICKER — uses ph_issue_links
   ═══════════════════════════════════════════════ */
function MultiLinkPicker({
  issue,
  itemId,
  rule,
  projectKey,
  onOpenItem,
}: {
  issue: PhIssue | null;
  itemId: string;
  rule: ParentLinkRule;
  projectKey?: string;
  onOpenItem?: (id: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const pickerPos = usePickerPosition(triggerRef, showPicker);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!showPicker) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setShowPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPicker]);

  const pk = projectKey || issue?.project_key;

  // Fetch existing links for this item
  const { data: existingLinks = [] } = useQuery({
    queryKey: ["cv-parent-links", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ph_issue_links")
        .select("id, target_id, link_type")
        .eq("source_id", itemId)
        .eq("link_type", "is_child_of");
      if (!data?.length) return [];
      const targetIds = data.map((l) => l.target_id);
      const { data: targets } = await supabase
        .from("ph_issues")
        .select("id, issue_key, summary, issue_type, status, status_category")
        .in("id", targetIds)
        .is("deleted_at", null);
      return (targets || []).map((t) => ({
        ...t,
        linkId: data.find((l) => l.target_id === t.id)?.id,
      }));
    },
  });

  // Fetch candidates
  const { data: candidates = [] } = useQuery({
    queryKey: ["cv-parent-candidates", pk, rule.allowedParentTypes.join(",")],
    enabled: showPicker && !!pk,
    queryFn: async () => {
      const { data } = await supabase
        .from("ph_issues")
        .select("id, issue_key, summary, issue_type, status, status_category")
        .eq("project_key", pk!)
        .in("issue_type", rule.allowedParentTypes)
        .is("deleted_at", null)
        .order("jira_updated_at", { ascending: false })
        .limit(200);
      return (data || []) as CandidateItem[];
    },
    staleTime: 30000,
  });

  const linkedIds = new Set(existingLinks.map((l: any) => l.id));

  const addLink = useMutation({
    mutationFn: async (targetId: string) => {
      await supabase.from("ph_issue_links").insert({
        source_id: itemId,
        target_id: targetId,
        link_type: "is_child_of",
        created_by: (await supabase.auth.getUser()).data.user?.id ?? "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-parent-links", itemId] });
      flag.success("Link added");
    },
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      await supabase.from("ph_issue_links").delete().eq("id", linkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-parent-links", itemId] });
      flag.success("Link removed");
    },
  });

  const toggleLink = (candidate: CandidateItem) => {
    const existing = existingLinks.find((l: any) => l.id === candidate.id);
    if (existing) {
      removeLink.mutate((existing as any).linkId);
    } else {
      addLink.mutate(candidate.id);
    }
  };

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.issue_key?.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q)
    );
  });
  const active = filtered.filter((c) => c.status_category !== "done");
  const done = filtered.filter((c) => c.status_category === "done");

  return (
    <div style={{ position: "relative" }} ref={triggerRef}>
      <div>
        {/* Current links display */}
        {existingLinks.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginBottom: 8,
            }}
          >
            {existingLinks.map((link: any) => (
              <div
                key={link.id}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <IssueIcon type={link.issue_type} size={16} />
                <span
                  style={{
                    fontFamily: "var(--cp-font-mono)",
                    fontSize: 'var(--ds-font-size-400)',
                    color: "var(--ds-link, var(--cp-primary-60))",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  onClick={() => setShowPicker(!showPicker)}
                >
                  {link.issue_key}
                </span>
                <span
                  style={{
                    fontSize: 'var(--ds-font-size-400)',
                    color: "var(--ds-text)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowPicker(!showPicker)}
                >
                  {link.summary}
                </span>
                <StatusLozenge
                  status={link.status}
                  category={link.status_category}
                />
                <button
                  onClick={() => removeLink.mutate(link.linkId)}
                  title="Remove link"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color:
                      "var(--ds-text-subtlest, var(--cp-text-secondary))",
                    display: "flex",
                  }}
                >
                  <CrossIcon
                    size="small"
                    primaryColor="var(--ds-text-subtlest, var(--cp-text-secondary))"
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        <SidebarAddTrigger
          label="Add link"
          isOpen={showPicker}
          onClick={() => setShowPicker(!showPicker)}
        />

        {/* Picker dropdown — portaled to document.body (jira-compare 2026-05-11 Vikram fix) */}
        {showPicker &&
          pickerPos &&
          createPortal(
            <div
              ref={portalRef}
              data-cv-parent-picker="true"
              style={{
                position: "fixed",
                top: pickerPos.top,
                left: pickerPos.left,
                width: pickerPos.width,
                background:
                  "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))",
                border:
                  "1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))",
                borderRadius: 6,
                boxShadow: "0 8px 16px var(--ds-shadow-raised, rgba(9,30,66,0.15))",
                zIndex: 1000,
                maxHeight: 400,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom:
                    "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    border: "2px solid var(--ds-border-focused)",
                    borderRadius: 4,
                    padding: "4px 8px",
                  }}
                >
                  <SearchIcon
                    size="small"
                    primaryColor="var(--ds-icon-subtle)"
                  />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: 'var(--ds-font-size-300)',
                      color: "var(--ds-text)",
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color:
                          "var(--ds-text-subtlest, var(--cp-text-secondary))",
                        display: "flex",
                        padding: 0,
                      }}
                    >
                      <CrossIcon
                        size="small"
                        primaryColor="var(--ds-text-subtlest, var(--cp-text-secondary))"
                      />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ overflowY: "auto", maxHeight: 340 }}>
                {renderGroupMulti("ACTIVE", active, linkedIds, toggleLink)}
                {renderGroupMulti("DONE", done, linkedIds, toggleLink)}
                {filtered.length === 0 && (
                  <div
                    style={{
                      padding: "16px",
                      fontSize: 'var(--ds-font-size-300)',
                      color:
                        "var(--ds-text-subtlest, var(--cp-text-secondary))",
                      textAlign: "center",
                    }}
                  >
                    No matching items
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SHARED RENDER HELPERS
   ═══════════════════════════════════════════════ */

/** Render a group (ACTIVE / DONE) for single-parent picker */
function renderGroup(
  label: string,
  items: CandidateItem[],
  currentParentKey: string | null | undefined,
  onSelect: (key: string) => void,
) {
  if (items.length === 0) return null;
  return (
    <>
      {label !== "ACTIVE" && (
        <div
          style={{
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 700,
            color: "var(--ds-text-subtlest, var(--cp-text-secondary))",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "8px 12px 4px",
          }}
        >
          {label}
        </div>
      )}
      {items.map((item) => {
        const isSelected = currentParentKey === item.issue_key;
        const swatch = (PARENT_TOKENS[item.issue_type] ?? PARENT_TOKENS.default)
          .bg;
        return (
          <div
            key={item.id}
            onClick={() => onSelect(item.issue_key)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              padding: "8px 12px",
              cursor: "pointer",
              background: isSelected
                ? "var(--ds-background-information)"
                : "transparent",
              transition: "background 80ms",
            }}
            onMouseEnter={(e) => {
              if (!isSelected)
                e.currentTarget.style.background =
                  "var(--ds-surface-sunken, var(--cp-bg-sunken))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isSelected
                ? "var(--ds-background-information)"
                : "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: swatch,
                  flexShrink: 0,
                }}
              />
              <IssueIcon type={item.issue_type} size={14} />
              <span
                style={{
                  fontFamily: "var(--cp-font-mono)",
                  fontSize: 'var(--ds-font-size-300)',
                  color: "var(--ds-text-subtle)",
                }}
              >
                {item.issue_key}
              </span>
              {isSelected && (
                <CheckIcon
                  size="small"
                  primaryColor="var(--ds-background-brand-bold, var(--cp-primary-60))"
                />
              )}
            </div>
            <div
              style={{
                fontSize: 'var(--ds-font-size-400)',
                color: "var(--ds-text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.summary}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Render a group (ACTIVE / DONE) for multi-link picker — checkboxes */
function renderGroupMulti(
  label: string,
  items: CandidateItem[],
  linkedIds: Set<string>,
  onToggle: (item: CandidateItem) => void,
) {
  if (items.length === 0) return null;
  return (
    <>
      <div
        style={{
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          color: "var(--ds-text-subtlest, var(--cp-text-secondary))",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "8px 12px 4px",
        }}
      >
        {label}
      </div>
      {items.map((item) => {
        const isLinked = linkedIds.has(item.id);
        return (
          <div
            key={item.id}
            onClick={() => onToggle(item)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              cursor: "pointer",
              background: isLinked
                ? "var(--ds-background-information)"
                : "transparent",
              transition: "background 80ms",
            }}
            onMouseEnter={(e) => {
              if (!isLinked)
                e.currentTarget.style.background =
                  "var(--ds-surface-sunken, var(--cp-bg-sunken))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isLinked
                ? "var(--ds-background-information)"
                : "transparent";
            }}
          >
            {/* Checkbox */}
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                flexShrink: 0,
                border: `1.5px solid ${isLinked ? "var(--ds-text-brand, var(--cp-workstream-catalyst-primary))" : "var(--ds-border-disabled)"}`,
                background: isLinked
                  ? "var(--ds-text-brand, var(--cp-workstream-catalyst-primary))"
                  : "var(--ds-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.12s, border-color 0.12s",
              }}
            >
              {isLinked && (
                <CheckIcon
                  size="small"
                  primaryColor="var(--ds-surface)"
                />
              )}
            </div>
            <IssueIcon type={item.issue_type} size={14} />
            <span
              style={{
                fontFamily: "var(--cp-font-mono)",
                fontSize: 'var(--ds-font-size-200)',
                color: "var(--ds-text-subtle)",
                flexShrink: 0,
              }}
            >
              {item.issue_key}
            </span>
            <span
              style={{
                fontSize: 'var(--ds-font-size-300)',
                color: "var(--ds-text)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.summary}
            </span>
            <StatusLozenge
              status={item.status}
              category={item.status_category}
            />
          </div>
        );
      })}
    </>
  );
}

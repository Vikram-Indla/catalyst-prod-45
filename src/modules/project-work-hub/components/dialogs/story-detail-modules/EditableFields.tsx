// @ts-nocheck
/**
 * EditableFields — EditableAssignee, EditablePriority, EditableLabels, ParentFieldPicker
 * Rebuilt to exact Jira parity — no pencil icons, Jira-native priority SVGs, 28px avatars, 14px names
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Select, { CreatableSelect } from "@atlaskit/select";
import CheckIcon from "@atlaskit/icon/glyph/check";
import CrossCircleIcon from "@atlaskit/icon/glyph/cross-circle";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import type { ProjectMember, ParentIssue } from "./types";
import { PRIORITY_LIST } from "./constants";
import { getAvatarColor, getInitials } from "./helpers";
import { resolveAvatarUrl } from "@/lib/avatars";
import { PriorityIcon as CanonicalPriorityIcon } from "@/components/icons";

/* jira-compare 2026-05-10 (P2): Hide dropdown indicator chevron from Priority
   select in Key details at rest — Jira's Key details rows show no visible
   chevron in idle state. Show only on hover/focus (matching the right-rail
   select idle-state rule from K.12). Inject once per session. */
if (
  typeof document !== "undefined" &&
  !document.getElementById("cv-priority-select-idle-style-v4")
) {
  const s = document.createElement("style");
  s.id = "cv-priority-select-idle-style-v4";
  s.textContent = `
    .cv-priority-select__dropdown-indicator { display: none !important; }
    .cv-priority-select__control:hover .cv-priority-select__dropdown-indicator,
    .cv-priority-select__control--is-focused .cv-priority-select__dropdown-indicator,
    .cv-priority-select__control--menu-is-open .cv-priority-select__dropdown-indicator { display: flex !important; }
    .cv-priority-select__control { border-color: transparent !important; background: transparent !important; box-shadow: none !important; }
    .cv-priority-select__control:hover { background: var(--ds-background-neutral-subtle-hovered, var(--cp-bg-sunken, #F4F5F7)) !important; }
    .cv-assignee-select__value-container, .cv-reporter-select__value-container { display: flex !important; }
    .cv-assignee-select__input-container, .cv-reporter-select__input-container { order: 99 !important; }
  `;
  document.head.appendChild(s);
}

/** Atlassian-spec dropdown container styles */
const ATLASSIAN_DROPDOWN: React.CSSProperties = {
  background:
    "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))",
  borderRadius: 4,
  border: "none",
  boxShadow: "var(--ds-shadow-overlay, 0 8px 12px rgba(9,30,66,.15))",
  padding: "4px 0",
  zIndex: 9999,
};

/** Atlassian checkmark icon — uses ADS tokens */
const CheckmarkIcon = () => (
  <CheckIcon
    size="small"
    primaryColor="var(--ds-icon-selected, var(--cp-primary-60, #0052CC))"
  />
);

/** Jira-native priority SVG icons — exact parity */
const PRIORITY_SVG: Record<string, React.ReactNode> = {
  Highest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        d="M3 8l5-5 5 5"
        fill="none"
        stroke="var(--ds-icon-danger, #FF5630)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12l5-5 5 5"
        fill="none"
        stroke="var(--ds-icon-danger, #FF5630)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  High: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        d="M3 10l5-5 5 5"
        fill="none"
        stroke="var(--ds-icon-danger, #FF5630)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Medium: (
    /* jira-compare S-23 (2026-04-28): Jira renders Medium as three
     * horizontal bars (≡), not two. Match Jira's medium_new.svg. */
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        d="M3 4.5h10"
        fill="none"
        stroke="var(--ds-icon-warning, #FFAB00)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 8h10"
        fill="none"
        stroke="var(--ds-icon-warning, #FFAB00)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 11.5h10"
        fill="none"
        stroke="var(--ds-icon-warning, #FFAB00)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Low: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        d="M3 6l5 5 5-5"
        fill="none"
        stroke="var(--ds-link, #2684FF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Lowest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        d="M3 4l5 5 5-5"
        fill="none"
        stroke="var(--ds-link, #2684FF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 8l5 5 5-5"
        fill="none"
        stroke="var(--ds-link, #2684FF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

/* ── Avatar helper — prioritises real image, falls back to initials (GUARDRAIL) ──
   Exported so peer fields (Reporter etc.) can reuse the canonical fallback and
   we stop fragmenting into hand-rolled initials tiles for the same user.
   Uses ADS tokens for color and text styling. See CLAUDE.md §19 + 2026-04-20 critique §P0-2. */
export function AvatarCircle({
  userId,
  name,
  avatarUrl,
  size = 28,
}: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  const initials = getInitials(name);
  const fontSize = Math.max(10, Math.round(size * 0.35));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: getAvatarColor(userId),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          color:
            "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))",
        }}
      >
        {initials}
      </span>
    </div>
  );
}

/* ── EditableAssignee ──────────────────────── */
/**
 * Jira parity (2026-04-20, Drawer Phase 5 Atlaskit sweep — §P0-7):
 *
 * Replaced the bespoke dropdown with `@atlaskit/select` (single, searchable)
 * matching the EditablePriority pattern. Benefits:
 *   - Keyboard semantics (arrow keys, Enter, Esc, type-to-filter) come
 *     from Atlaskit for free.
 *   - Consistent menu chrome with every other select in the drawer.
 *   - No more manual outside-click / focus dance / fixed-position math.
 *   - appearance="subtle" removes the field border in rest state so the
 *     row reads as plain editable text (matches Jira's Details sidebar).
 *
 * Option shape: `{ value: string | null; label: string; userId: string | null;
 * avatarUrl: string | null }`. `value === null` represents the "Unassigned"
 * row. `formatOptionLabel` renders avatar + name inline.
 */
type AssigneeOption = {
  value: string;
  label: string;
  userId: string | null; // null for Unassigned
  avatarUrl: string | null;
  jiraAccountId?: string | null; // Jira account ID — different ID space from userId (UUID)
};
const UNASSIGNED_VALUE = "__unassigned__";

export function EditableAssignee({
  issueId,
  issueKey,
  projectId,
  currentAssigneeId,
  currentAssigneeName,
  onUpdate,
}: {
  issueId: string;
  issueKey?: string;
  projectId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  onUpdate: () => void;
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  // Pull from `profiles` (approved users) so every user is searchable —
  // not just the project_members row. Mirrors Jira's "assignable user"
  // search which spans the whole org, not just project membership.
  const { data: members = [] } = useQuery({
    queryKey: ["assignee-profiles-approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, jira_account_id")
        .eq("approval_status", "APPROVED")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => {
        const full_name = p.full_name ?? p.email ?? "Unknown";
        return {
          user_id: p.id,
          full_name,
          avatar_url: resolveAvatarUrl(full_name) ?? null,
          role: null,
          // Preserve jira_account_id so the assignee picker can match
          // ph_issues.assignee_account_id (Jira account ID space, not UUID space).
          jira_account_id: (p as any).jira_account_id ?? null,
        };
      }) as ProjectMember[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const updateData = {
        assignee_account_id: userId,
        assignee_display_name: userId
          ? (members.find((m) => m.user_id === userId)?.full_name ?? null)
          : null,
      };
      const query = issueKey
        ? supabase
            .from("ph_issues")
            .update(updateData as any)
            .eq("issue_key", issueKey)
        : supabase
            .from("ph_issues")
            .update(updateData as any)
            .eq("id", issueId);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      onUpdate();
    },
  });

  const options: AssigneeOption[] = useMemo(() => {
    const memberOptions: AssigneeOption[] = members.map((m) => ({
      value: m.user_id,
      label: m.full_name,
      userId: m.user_id,
      avatarUrl: m.avatar_url ?? null,
      jiraAccountId: (m as any).jira_account_id ?? null,
    }));
    return [
      {
        value: UNASSIGNED_VALUE,
        label: "Unassigned",
        userId: null,
        avatarUrl: null,
      },
      ...memberOptions,
    ];
  }, [members]);

  /**
   * §19 chokepoint (2026-04-20): synchronous avatar resolution from
   * display name. Avoids direct profiles.avatar_url fetch (BANNED per
   * CLAUDE.md §19).
   */
  const selected: AssigneeOption = useMemo(() => {
    if (!currentAssigneeId) {
      return {
        value: UNASSIGNED_VALUE,
        label: "Unassigned",
        userId: null,
        avatarUrl: null,
      };
    }
    // Try UUID match first (issues edited inside Catalyst), then Jira account ID
    // match (issues synced from Jira where assignee_account_id is a Jira account ID,
    // not a Catalyst UUID). Mirrors the same dual-match applied to EditableReporter.
    const matched =
      options.find((o) => o.userId === currentAssigneeId) ??
      options.find((o) => o.jiraAccountId && o.jiraAccountId === currentAssigneeId);
    if (matched) return matched;
    // Fallback when members haven't loaded yet: render from props.
    return {
      value: currentAssigneeId,
      label: currentAssigneeName ?? "Unknown",
      userId: currentAssigneeId,
      avatarUrl: currentAssigneeName
        ? resolveAvatarUrl(currentAssigneeName)
        : null,
    };
  }, [currentAssigneeId, currentAssigneeName, options]);

  const inputId = `assignee-${issueKey ?? issueId}`;
  const [inputValue, setInputValue] = useState("");

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      outline: menuIsOpen ? "2px solid var(--ds-border-focused, #388BFF)" : "none",
      borderRadius: 4,
    }}>
      <Select<AssigneeOption>
        inputId={inputId}
        appearance="subtle"
        spacing="compact"
        isSearchable
        isClearable
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => {
          setMenuIsOpen(true);
          const initial =
            selected.value === UNASSIGNED_VALUE ? "" : (selected.label ?? "");
          setInputValue(initial);
          if (initial.length > 0) {
            setTimeout(() => {
              const el = document.getElementById(inputId) as HTMLInputElement | null;
              el?.select();
            }, 0);
          }
        }}
        onMenuClose={() => {
          setMenuIsOpen(false);
          setInputValue("");
        }}
        inputValue={inputValue}
        onInputChange={(next, meta) => {
          if (meta.action === "input-change") setInputValue(next);
        }}
        controlShouldRenderValue={!menuIsOpen}
        classNamePrefix="cv-assignee-select"
        placeholder="Select Assignee"
        components={{
          ClearIndicator: (props) => (
            <div
              {...props.innerProps}
              style={{ display: "flex", alignItems: "center", padding: "0 4px", cursor: "pointer" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Clear the value (unassign)
                updateMutation.mutate(null);
                // Keep menu open + focus input for immediate re-search
                setMenuIsOpen(true);
                setInputValue("");
                setTimeout(() => {
                  const el = document.getElementById(inputId) as HTMLInputElement | null;
                  el?.focus();
                }, 0);
              }}
            >
              <CrossCircleIcon label="Clear" size="small" primaryColor="var(--ds-text-subtle, #5E6C84)" />
            </div>
          ),
        }}
        styles={{
          indicatorsContainer: (base) => ({ ...base, display: menuIsOpen ? "flex" : "none" }),
        }}
        options={options}
        value={selected}
        onChange={(v) => {
          const nextUserId =
            v === null
              ? null
              : v.value === UNASSIGNED_VALUE
                ? null
                : v.userId;
          if (nextUserId === (currentAssigneeId ?? null)) return;
          updateMutation.mutate(nextUserId);
        }}
        formatOptionLabel={(opt: AssigneeOption) => (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            {opt.value === UNASSIGNED_VALUE ? (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  flexShrink: 0,
                  border: "1px dashed var(--ds-border, #C1C7D0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: "var(--ds-text-disabled, #C1C7D0)",
                }}
              >
                ?
              </div>
            ) : (
              <AvatarCircle
                userId={opt.userId ?? opt.value}
                name={opt.label}
                avatarUrl={opt.avatarUrl}
                size={24}
              />
            )}
            <span
              style={{
                fontSize: 14,
                color:
                  opt.value === UNASSIGNED_VALUE
                    ? "var(--ds-text-subtlest, #6B6E76)"
                    : "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
                fontWeight: 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {opt.label}
            </span>
          </span>
        )}
      />
    </div>
  );
}

/* ── EditableReporter ──────────────────────── */
/**
 * Jira parity (2026-05-03, Defect-2 Cycle 6):
 * Reporter field made editable following the EditableAssignee pattern.
 * Allows changing who is designated as the reporter for an issue.
 * Uses @atlaskit/select with project members as options.
 */
type ReporterOption = {
  value: string;
  label: string;
  userId: string | null; // null for None
  avatarUrl: string | null;
  /** Jira account ID (e.g. 5b10ac8d82e05b22cc7d4ef5) — different ID space
   *  from userId (Catalyst UUID). We match on EITHER to resolve the reporter. */
  jiraAccountId?: string | null;
};
const REPORTER_NONE_VALUE = "__none__";

export function EditableReporter({
  issueId,
  projectId,
  currentReporterId,
  currentReporterName,
  onUpdate,
}: {
  issueId: string;
  projectId: string;
  currentReporterId: string | null;
  currentReporterName: string | null;
  onUpdate: () => void;
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const { data: members = [] } = useQuery({
    queryKey: ["reporter-profiles-approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, jira_account_id")
        .eq("approval_status", "APPROVED")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => {
        const full_name = p.full_name ?? p.email ?? "Unknown";
        return {
          user_id: p.id,
          full_name,
          avatar_url: resolveAvatarUrl(full_name) ?? null,
          role: null,
          // jira_account_id bridges Catalyst UUID space ↔ Jira account ID space
          jira_account_id: p.jira_account_id ?? null,
        };
      }) as ProjectMember[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const updateData = {
        reporter_account_id: userId,
        reporter_display_name: userId
          ? (members.find((m) => m.user_id === userId)?.full_name ?? null)
          : null,
      };
      const { error } = await supabase
        .from("ph_issues")
        .update(updateData as any)
        .eq("id", issueId);
      if (error) throw error;
    },
    onSuccess: () => {
      onUpdate();
    },
  });

  const options: ReporterOption[] = useMemo(() => {
    const memberOptions: ReporterOption[] = members.map((m) => ({
      value: m.user_id,
      label: m.full_name,
      userId: m.user_id,
      avatarUrl: m.avatar_url ?? null,
      // Carry jira_account_id so the "selected" memo can match Jira account IDs
      jiraAccountId: (m as any).jira_account_id ?? null,
    }));
    return [
      {
        value: REPORTER_NONE_VALUE,
        label: "None",
        userId: null,
        avatarUrl: null,
      },
      ...memberOptions,
    ];
  }, [members]);

  const selected: ReporterOption = useMemo(() => {
    if (!currentReporterId) {
      return {
        value: REPORTER_NONE_VALUE,
        label: "None",
        userId: null,
        avatarUrl: null,
      };
    }
    // ph_issues.reporter_account_id is a Jira account ID (e.g. "5b10ac8d82e05b22cc7d4ef5"),
    // but profiles.id is a Catalyst UUID. Match on EITHER so existing Jira-synced
    // issues resolve the reporter name instead of showing "Unknown".
    const matched =
      options.find((o) => o.userId === currentReporterId) ??
      options.find((o) => o.jiraAccountId && o.jiraAccountId === currentReporterId);
    if (matched) return matched;
    return {
      value: currentReporterId,
      label: currentReporterName ?? "Unknown",
      userId: currentReporterId,
      avatarUrl: currentReporterName
        ? resolveAvatarUrl(currentReporterName)
        : null,
    };
  }, [currentReporterId, currentReporterName, options]);

  const inputId = `reporter-${issueId}`;
  const [inputValue, setInputValue] = useState("");

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      outline: menuIsOpen ? "2px solid var(--ds-border-focused, #388BFF)" : "none",
      borderRadius: 4,
    }}>
      <Select<ReporterOption>
        inputId={inputId}
        appearance="subtle"
        spacing="compact"
        isSearchable
        isClearable
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => {
          setMenuIsOpen(true);
          const initial =
            selected.value === REPORTER_NONE_VALUE ? "" : (selected.label ?? "");
          setInputValue(initial);
          if (initial.length > 0) {
            setTimeout(() => {
              const el = document.getElementById(inputId) as HTMLInputElement | null;
              el?.select();
            }, 0);
          }
        }}
        onMenuClose={() => {
          setMenuIsOpen(false);
          setInputValue("");
        }}
        inputValue={inputValue}
        onInputChange={(next, meta) => {
          if (meta.action === "input-change") setInputValue(next);
        }}
        controlShouldRenderValue={!menuIsOpen}
        classNamePrefix="cv-reporter-select"
        placeholder="Select Reporter"
        components={{
          ClearIndicator: (props) => (
            <div
              {...props.innerProps}
              style={{ display: "flex", alignItems: "center", padding: "0 4px", cursor: "pointer" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Clear the value (unassign)
                updateMutation.mutate(null);
                // Keep menu open + focus input for immediate re-search
                setMenuIsOpen(true);
                setInputValue("");
                setTimeout(() => {
                  const el = document.getElementById(inputId) as HTMLInputElement | null;
                  el?.focus();
                }, 0);
              }}
            >
              <CrossCircleIcon label="Clear" size="small" primaryColor="var(--ds-text-subtle, #5E6C84)" />
            </div>
          ),
        }}
        styles={{
          indicatorsContainer: (base) => ({ ...base, display: menuIsOpen ? "flex" : "none" }),
        }}
        options={options}
        value={selected}
        onChange={(v) => {
          const nextUserId =
            v === null
              ? null
              : v.value === REPORTER_NONE_VALUE
                ? null
                : v.userId;
          if (nextUserId === (currentReporterId ?? null)) return;
          updateMutation.mutate(nextUserId);
        }}
        formatOptionLabel={(opt: ReporterOption) => (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            {opt.value === REPORTER_NONE_VALUE ? (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  flexShrink: 0,
                  border: "1px dashed var(--ds-border, #C1C7D0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: "var(--ds-text-disabled, #C1C7D0)",
                }}
              >
                ?
              </div>
            ) : (
              <AvatarCircle
                userId={opt.userId ?? opt.value}
                name={opt.label}
                avatarUrl={opt.avatarUrl}
                size={24}
              />
            )}
            <span
              style={{
                fontSize: 14,
                color:
                  opt.value === REPORTER_NONE_VALUE
                    ? "var(--ds-text-subtlest, #6B6E76)"
                    : "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
                fontWeight: 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {opt.label}
            </span>
          </span>
        )}
      />
    </div>
  );
}

/* ── EditablePriority ──────────────────────── */
/**
 * Jira parity (2026-04-20, Drawer Phase 5 Atlaskit sweep):
 * replaced the bespoke dropdown with `@atlaskit/select` (single). Behaviour
 * preserved: optimistic-off (refetch via onUpdate), canonical priority SVGs
 * rendered inline via formatOptionLabel, no pencil icon, no coloured text.
 * Benefits over the old hand-rolled dropdown:
 *   - Keyboard semantics come from the Atlaskit select (arrow keys, Enter,
 *     Esc, type-to-filter).
 *   - Consistent menu chrome with every other Atlaskit select in the app.
 *   - No more manual outside-click handler / useEffect dance.
 *   - Appearance="subtle" removes the field border in the inactive state
 *     so the row reads as editable text (matches Jira's Details sidebar
 *     rendering).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function PriorityChip({ value }: { value: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
      }}
    >
      <CanonicalPriorityIcon level={value} size={16} label="" />
      <span style={{ fontSize: 14, color: "var(--ds-text, #292A2E)" }}>
        {value}
      </span>
    </span>
  );
}

export function EditablePriority({
  issueId,
  issueKey,
  currentPriority,
  onUpdate,
  options,
  onChange,
}: {
  /** ph_issues row id — required only when `onChange` is NOT provided (default ph_issues write path). */
  issueId?: string;
  issueKey?: string;
  currentPriority: string;
  onUpdate: () => void;
  /** Custom priority option list. Defaults to PRIORITY_LIST (5-level Jira: Highest/High/Medium/Low/Lowest).
   *  Other data sources (e.g. business_requests.urgency with 3 levels) pass their own option set here. */
  options?: string[];
  /** Custom write callback. When provided, called INSTEAD of the default ph_issues mutation.
   *  Receives the selected value (or null on clear). Enables this canonical component to write to
   *  ANY data source without forking — see CLAUDE.md "Adopt canonical components" rule (2026-06-01). */
  onChange?: (value: string | null) => Promise<void> | void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [pickerPos, setPickerPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (priority: string | null) => {
      // If a custom onChange is provided, the call site owns the write (e.g. business_requests.urgency).
      // Otherwise fall back to the canonical ph_issues mutation.
      if (onChange) {
        await onChange(priority);
        return;
      }
      const query = issueKey
        ? supabase
            .from("ph_issues")
            .update({ priority } as any)
            .eq("issue_key", issueKey)
        : supabase
            .from("ph_issues")
            .update({ priority } as any)
            .eq("id", issueId);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      setShowPicker(false);
      onUpdate();
    },
  });

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

  useEffect(() => {
    if (!showPicker) {
      setPickerPos(null);
      return;
    }
    const recompute = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setPickerPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 180),
      });
    };
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [showPicker]);

  const hasValue = !!currentPriority;

  return (
    <div ref={triggerRef}>
      {showPicker ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "2px solid var(--ds-border-focused, #388BFF)",
            borderRadius: 4,
            padding: "2px 6px",
            background: "var(--ds-background-input, #fff)",
          }}
        >
          <span
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              color: hasValue
                ? "var(--ds-text, #292A2E)"
                : "var(--ds-text-subtlest, #8993A4)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hasValue && (
              <CanonicalPriorityIcon
                level={currentPriority}
                size={16}
                label=""
              />
            )}
            <span>{currentPriority || "Select priority"}</span>
          </span>
          {hasValue && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateMutation.mutate(null);
              }}
              aria-label="Clear priority"
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
                label="Clear priority"
                size="small"
                primaryColor="var(--ds-text-subtle, #5E6C84)"
              />
            </button>
          )}
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <ChevronDownIcon
              label=""
              size="large"
              primaryColor="var(--ds-text-subtle, #5E6C84)"
            />
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            background: "none",
            border: "2px solid transparent",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: 4,
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          {hasValue ? (
            <PriorityChip value={currentPriority} />
          ) : (
            <span
              style={{ fontSize: 14, color: "var(--ds-text-subtle, #5E6C84)" }}
            >
              None
            </span>
          )}
        </button>
      )}

      {showPicker &&
        pickerPos &&
        createPortal(
          <div
            ref={portalRef}
            style={{
              position: "fixed",
              top: pickerPos.top,
              left: pickerPos.left,
              width: pickerPos.width,
              background: "var(--ds-surface, #fff)",
              border: "1px solid var(--ds-border, #DFE1E6)",
              borderRadius: 6,
              boxShadow: "0 8px 16px rgba(9,30,66,0.15)",
              zIndex: 1000,
              padding: "6px 0",
            }}
          >
            {(options ?? PRIORITY_LIST).map((p) => {
              const isSelected = currentPriority === p;
              return (
                <div
                  key={p}
                  onClick={() => updateMutation.mutate(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 12px",
                    cursor: "pointer",
                    background: isSelected
                      ? "var(--ds-background-information, #DEEBFF)"
                      : "transparent",
                    borderLeft: isSelected
                      ? "3px solid var(--ds-border-focused, #388BFF)"
                      : "3px solid transparent",
                    transition: "background 80ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--ds-surface-sunken, #F4F5F7)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      isSelected
                        ? "var(--ds-background-information, #DEEBFF)"
                        : "transparent";
                  }}
                >
                  <PriorityChip value={p} />
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ── EditableLabels — Jira-parity: type + Enter to create, reuse existing ── */

const LABEL_COLORS = [
  "var(--ds-background-accent-blue-bold, #4C9AFF)",
  "var(--ds-background-accent-teal-bold, #00B8D9)",
  "var(--ds-background-accent-green-bold, #36B37E)",
  "var(--ds-background-accent-yellow-bold, #FFAB00)",
  "var(--ds-background-accent-red-bold, #FF5630)",
  "var(--ds-background-accent-purple-bold, #6554C0)",
  "var(--ds-background-accent-orange-bold, #FF7452)",
  "var(--ds-background-accent-green-bolder, #57D9A3)",
  "var(--ds-background-accent-yellow-bolder, #FFC400)",
  "var(--ds-background-accent-purple-bolder, #998DD9)",
  "var(--ds-background-accent-teal-bolder, #79E2F2)",
  "var(--ds-background-accent-red-bolder, #FF8F73)",
];
function getLabelColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

/**
 * Jira parity (2026-04-20, Drawer Phase 5 Atlaskit sweep — §P0-8):
 *
 * Replaced the bespoke search/create dropdown with `@atlaskit/select`
 * CreatableSelect (multi). Jira's label picker supports both type-to-search
 * and type-to-create, which maps directly to CreatableSelect's behaviour.
 * Existing labels across ph_issues are still pre-loaded so the suggestion
 * list stays populated, matching Jira's "Begin typing to find..." UX.
 *
 * Keeping `getLabelColor` so the Atlaskit MultiValue chips can inherit a
 * per-label hue — matches the legacy pill border colour — via `styles`.
 */
type LabelOption = { value: string; label: string };

export function EditableLabels({
  issueId,
  issueKey,
  currentLabels,
  onUpdate,
}: {
  issueId: string;
  issueKey?: string;
  currentLabels: string[];
  onUpdate: () => void;
}) {
  const updateMutation = useMutation({
    mutationFn: async (labels: string[]) => {
      const query = issueKey
        ? supabase
            .from("ph_issues")
            .update({ labels: labels as any })
            .eq("issue_key", issueKey)
        : supabase
            .from("ph_issues")
            .update({ labels: labels as any })
            .eq("id", issueId);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => onUpdate(),
  });

  // Fetch all unique labels used across issues for reuse
  const { data: allLabels = [] } = useQuery({
    queryKey: ["ph-all-labels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ph_issues")
        .select("labels")
        .is("deleted_at", null)
        .not("labels", "is", null);
      if (error) throw error;
      const labelSet = new Set<string>();
      (data ?? []).forEach((row) => {
        if (Array.isArray(row.labels)) {
          (row.labels as string[]).forEach((l) => {
            if (typeof l === "string" && l.trim()) labelSet.add(l.trim());
          });
        }
      });
      return Array.from(labelSet).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 30000,
  });

  const options: LabelOption[] = useMemo(
    () => allLabels.map((l) => ({ value: l, label: l })),
    [allLabels],
  );
  const selected: LabelOption[] = currentLabels.map((l) => ({
    value: l,
    label: l,
  }));

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <CreatableSelect<LabelOption, true>
        inputId={`labels-${issueKey ?? issueId}`}
        isMulti
        appearance="subtle"
        spacing="compact"
        classNamePrefix="cv-labels-select"
        placeholder="None"
        options={options}
        value={selected}
        onChange={(v) => {
          // @atlaskit/select's CreatableSelect yields both existing and
          // newly-created options with the same { value, label } shape.
          const next: string[] = (v ?? [])
            .map((o) => String(o.value).trim())
            .filter(Boolean);
          // Dedupe (case-sensitive match) before persisting.
          const deduped: string[] = Array.from(new Set<string>(next));
          updateMutation.mutate(deduped);
        }}
        formatCreateLabel={(input) => `Create "${input}"`}
        noOptionsMessage={() => "Type to create a label"}
        // Give each chip a per-label border colour (Jira-parity rainbow pill).
        styles={{
          multiValue: (base, state) => ({
            ...base,
            border: `1px solid ${getLabelColor((state.data as LabelOption).value)}`,
            background:
              "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))",
            borderRadius: 3,
          }),
          multiValueLabel: (base) => ({
            ...base,
            color:
              "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
            fontSize: 12,
            fontWeight: 500,
          }),
        }}
      />
    </div>
  );
}

/* ── EditableStoryPoints — Jira-parity inline numeric picker ── */

const FIBONACCI_POINTS = [0, 0.5, 1, 2, 3, 5, 8, 13, 21];

export function EditableStoryPoints({
  issueId,
  currentPoints,
  onUpdate,
}: {
  issueId: string;
  currentPoints: number | null | undefined;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const updateMutation = useMutation({
    mutationFn: async (points: number | null) => {
      const { error } = await supabase
        .from("ph_issues")
        .update({ story_points: points } as any)
        .eq("id", issueId);
      if (error) throw error;
    },
    onSuccess: () => {
      onUpdate();
      setOpen(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ flex: 1, position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 4,
          transition: "background .12s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background =
            "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span
          style={{
            fontSize: 14,
            color:
              currentPoints != null
                ? "var(--ds-text, #172B4D)"
                : "var(--ds-text-subtlest, #97A0AF)",
            fontWeight: 400,
          }}
        >
          {currentPoints != null ? currentPoints : "None"}
        </span>
      </div>
      {open && (
        <div
          style={{
            ...ATLASSIAN_DROPDOWN,
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: 160,
            overflow: "hidden",
          }}
        >
          {/* Clear option */}
          <div
            onClick={() => updateMutation.mutate(null)}
            style={{
              height: 36,
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 400,
              color:
                "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
              background:
                currentPoints == null
                  ? "var(--ds-background-information, #DEEBFF)"
                  : "transparent",
              borderBottom:
                "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))",
            }}
            onMouseEnter={(e) => {
              if (currentPoints != null)
                (e.currentTarget as HTMLElement).style.background =
                  "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))";
            }}
            onMouseLeave={(e) => {
              if (currentPoints != null)
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
            }}
          >
            <span style={{ flex: 1 }}>None</span>
            {currentPoints == null && <CheckmarkIcon />}
          </div>
          {FIBONACCI_POINTS.map((p) => (
            <div
              key={p}
              onClick={() => updateMutation.mutate(p)}
              style={{
                height: 36,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 400,
                color:
                  "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
                background:
                  p === currentPoints
                    ? "var(--ds-background-information, #DEEBFF)"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                if (p !== currentPoints)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))";
              }}
              onMouseLeave={(e) => {
                if (p !== currentPoints)
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
              }}
            >
              <span style={{ flex: 1 }}>{p}</span>
              {p === currentPoints && <CheckmarkSVG />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── EditableSprintReleases — Jira-parity multi-select dropdown ── */

/**
 * Jira parity (2026-04-20, Drawer Phase 5 Atlaskit sweep — §P0-9):
 *
 * Replaced the bespoke multi-select dropdown with `@atlaskit/select` (multi,
 * grouped). Jira's sprint/release picker renders Unreleased and Released as
 * separate groups with uppercase labels; Atlaskit's `options` prop accepts
 * `{ label, options }` shapes for this natively, so we get the exact chrome
 * for free. Optimistic-off: writes via mutation then refetches through
 * `onUpdate`. Chips in the control are the built-in MultiValue with the
 * subtle appearance, which matches Jira's small blue token chips.
 */
type SprintReleaseOption = { value: string; label: string; id?: string };

export function EditableSprintReleases({
  issueId,
  currentSprintRelease,
  projectKey,
  onUpdate,
}: {
  issueId: string;
  currentSprintRelease: any | null;
  projectKey: string | null | undefined;
  onUpdate: () => void;
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const navigate = useNavigate();
  // Parse current sprint/release names (legacy JSON shape: [{ name }, ...] or string[]).
  const sprintReleaseNames: string[] = useMemo(() => {
    if (!currentSprintRelease) return [];
    if (Array.isArray(currentSprintRelease)) {
      return currentSprintRelease
        .map((v: any) => v?.name || v)
        .filter(Boolean) as string[];
    }
    return [];
  }, [currentSprintRelease]);

  // Fetch available versions from ph_versions
  const { data: versionsData } = useQuery({
    queryKey: ["ph-sprint-releases", projectKey],
    queryFn: async () => {
      if (!projectKey) return [];
      const { data, error } = await supabase
        .from("ph_versions" as any)
        .select("jira_id, name, released, archived, release_date")
        .eq("project_key", projectKey)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as {
        jira_id: string;
        name: string;
        released: boolean;
        archived: boolean;
        release_date: string | null;
      }[];
    },
    enabled: !!projectKey,
    staleTime: 60_000,
  });

  const versions = versionsData ?? [];

  const groupedOptions = useMemo(() => {
    const unreleased = versions
      .filter((v) => !v.released && !v.archived)
      .map((v) => ({ value: v.name, label: v.name, id: v.jira_id }));
    const released = versions
      .filter((v) => v.released && !v.archived)
      .map((v) => ({ value: v.name, label: v.name, id: v.jira_id }));
    const groups: { label: string; options: SprintReleaseOption[] }[] = [];
    if (unreleased.length)
      groups.push({ label: "Unreleased", options: unreleased });
    if (released.length) groups.push({ label: "Released", options: released });
    return groups;
  }, [versions]);

  const selected: SprintReleaseOption[] = sprintReleaseNames.map((n) => ({
    value: n,
    label: n,
    id: versions.find((v) => v.name === n)?.jira_id,
  }));

  const updateMutation = useMutation({
    mutationFn: async (names: string[]) => {
      // Preserve full Jira shape: look up each name in ph_versions, fall back to
      // existing JSONB entry so we never lose id/releaseDate written by Jira sync.
      const jsonValue = names.map((n) => {
        const ver = versions.find((v) => v.name === n);
        if (ver)
          return {
            id: ver.jira_id,
            name: ver.name,
            releaseDate: ver.release_date,
            released: ver.released,
            archived: ver.archived,
          };
        const existing = Array.isArray(currentSprintRelease)
          ? (currentSprintRelease as any[]).find((cv) => cv?.name === n)
          : null;
        return existing ?? { name: n };
      });
      const { error } = await supabase
        .from("ph_issues")
        .update({ sprint_release: jsonValue } as any)
        .eq("id", issueId);
      if (error) throw error;
    },
    onSuccess: () => onUpdate(),
  });

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        position: "relative",
        border: menuIsOpen
          ? "2px solid var(--ds-border-focused, #388BFF)"
          : "2px solid transparent",
        borderRadius: 4,
      }}
      onMouseDownCapture={(e) => {
        const labelEl = (e.target as HTMLElement).closest(
          ".cv-sprintreleases-select__multi-value__label",
        );
        if (!labelEl) return;
        e.stopPropagation();
        const ver = versions.find((v) => v.name === labelEl.textContent);
        if (ver?.jira_id) navigate(`/release-hub/${ver.jira_id}`);
      }}
    >
      <Select<SprintReleaseOption, true>
        inputId={`sprint-releases-${issueId}`}
        isMulti
        isClearable
        closeMenuOnSelect={false}
        hideSelectedOptions
        menuPlacement="auto"
        menuShouldFlip
        appearance="subtle"
        spacing="compact"
        classNamePrefix="cv-sprintreleases-select"
        placeholder="Select version"
        options={groupedOptions}
        value={selected}
        onChange={(v) => {
          const next = (v ?? []).map((o) => o.value);
          updateMutation.mutate(next);
        }}
        noOptionsMessage={() => "No versions found for this project"}
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => setMenuIsOpen(true)}
        onMenuClose={() => setMenuIsOpen(false)}
        components={{
          IndicatorSeparator: () => null,
          ClearIndicator: (props) => (
            <div
              {...props.innerProps}
              style={{
                display: "flex",
                alignItems: "center",
                height: 24,
                padding: "0 4px",
                cursor: "pointer",
              }}
            >
              <CrossCircleIcon
                label="Clear all"
                size="small"
                primaryColor="var(--ds-text-subtle, #5E6C84)"
              />
            </div>
          ),
          DropdownIndicator: (props) => (
            <div
              {...props.innerProps}
              style={{
                display: "flex",
                alignItems: "center",
                height: 24,
                padding: "0 4px",
                cursor: "pointer",
              }}
            >
              <ChevronDownIcon
                label=""
                size="small"
                primaryColor="var(--ds-text-subtle, #5E6C84)"
              />
            </div>
          ),
          Option: ({
            innerRef,
            innerProps,
            isSelected,
            isFocused,
            children,
          }) => (
            <div
              ref={innerRef}
              {...innerProps}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                fontSize: 12,
                lineHeight: "20px",
                cursor: "pointer",
                borderLeft:
                  isSelected || isFocused
                    ? "3px solid var(--ds-border-focused, #388BFF)"
                    : "3px solid transparent",
                background: isSelected
                  ? "var(--ds-background-information, #DEEBFF)"
                  : isFocused
                    ? "var(--ds-surface-sunken, #F4F5F7)"
                    : "transparent",
              }}
            >
              {children}
            </div>
          ),
        }}
        styles={{
          control: (base) => ({
            ...base,
            minHeight: 32,
            alignItems: "flex-start",
          }),
          valueContainer: (base) => ({
            ...base,
            alignItems: "center",
            padding: "0 4px",
          }),
          input: (base) => ({
            ...base,
            caretColor: menuIsOpen ? "auto" : "transparent",
          }),
          indicatorsContainer: (base) => ({
            ...base,
            display: menuIsOpen ? "flex" : "none",
            alignItems: "flex-start",
            paddingTop: 4,
          }),
          menu: (base) => ({
            ...base,
            // minWidth: 300,
            right: 0,
            left: "auto",
          }),
          menuPortal: (base) => ({
            ...base,
            zIndex: 9999,
          }),
          groupHeading: (base) => ({
            ...base,
            fontSize: 11,
          }),
          // jira-compare 2026-05-20: Live DOM probe of digital-transformation.atlassian.net
          // confirms Sprint/Iteration chip = transparent bg + 0.556px solid rgb(183,185,190) border
          // + borderRadius 4px + padding 0px 4px + 14px/400 text.
          // Uses @atlaskit/tag "appearance=default" pattern — not a lozenge fill.
          multiValue: (base) => ({
            ...base,
            background: "transparent",
            border: "0.556px solid var(--ds-border-neutral, rgb(183,185,190))",
            borderRadius: 4,
            margin: "0 4px 0 0",
            padding: "1px 4px",
            alignItems: "center",
          }),
          multiValueLabel: (base) => ({
            ...base,
            fontSize: 14,
            fontWeight: 400,
            color: "var(--ds-text, #292A2E)",
            padding: 0,
            cursor: "pointer",
            ":hover": { textDecoration: "underline" },
          }),
          multiValueRemove: (base) => ({
            ...base,
            display: menuIsOpen ? "flex" : "none",
            color: "var(--ds-text-subtle, #505258)",
            marginLeft: 4,
            ":hover": {
              backgroundColor:
                "var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.08))",
              color: "var(--ds-text-subtle, #505258)",
            },
          }),
        }}
      />
    </div>
  );
}

/* ── ParentFieldPicker — Jira-parity rebuild ── */

/** Canonical epic icon — lightning bolt on purple rounded square (Jira parity) */
const EpicIconInline = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
    <rect
      fill="var(--ds-background-discovery-bold, #6554C0)"
      width="16"
      height="16"
      rx="2"
    />
    <path
      fill="var(--ds-surface, #FFF)"
      d="M8.39 2L4.5 9h3.11v5L11.5 7H8.39V2z"
    />
  </svg>
);

export function ParentFieldPicker({
  storyKey,
  parentKey,
  projectKey,
  onParentChange,
  triggerOpen,
}: {
  storyKey: string;
  parentKey: string | null;
  projectKey: string;
  onParentChange: (newParentKey: string | null) => void;
  triggerOpen?: number; // increment to open externally
}) {
  const [open, setOpen] = useState(false);

  // Allow external trigger (e.g. from breadcrumb "Add parent")
  useEffect(() => {
    if (triggerOpen && triggerOpen > 0) setOpen(true);
  }, [triggerOpen]);
  const [search, setSearch] = useState("");
  const [showDone, setShowDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: currentParent } = useQuery({
    queryKey: ["parentIssue", parentKey],
    queryFn: async () => {
      if (!parentKey) return null;
      const { data, error } = await supabase
        .from("ph_issues")
        .select("id, issue_key, summary, issue_type, status, status_category")
        .eq("issue_key", parentKey)
        .is("deleted_at", null)
        .single();
      if (error) return null;
      return data as ParentIssue;
    },
    enabled: !!parentKey,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["parentSearch", projectKey, search, showDone],
    queryFn: async () => {
      let query = supabase
        .from("ph_issues")
        .select("id, issue_key, summary, issue_type, status, status_category")
        .eq("project_key", projectKey)
        .eq("issue_type", "Epic")
        .is("deleted_at", null)
        .neq("issue_key", storyKey)
        .order("jira_updated_at", { ascending: false })
        .limit(20);
      if (!showDone) {
        query = query.neq("status_category", "done");
      }
      if (search.trim()) {
        query = query.or(
          `issue_key.ilike.${search}%,summary.ilike.%${search}%`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ParentIssue[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);
  const handleSelect = (key: string | null) => {
    onParentChange(key);
    setOpen(false);
    setSearch("");
  };

  const [hovered, setHovered] = useState(false);

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
      {/* Trigger — Jira click-to-edit style (no border when idle) */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 32,
          padding: "4px 8px",
          border: "none",
          borderRadius: 3,
          cursor: "pointer",
          background: "transparent",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))";
          setHovered(true);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          setHovered(false);
        }}
      >
        {parentKey && currentParent ? (
          <>
            <EpicIconInline />
            <span
              style={{
                flex: 1,
                fontSize: 14,
                color:
                  "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentParent.issue_key} {currentParent.summary}
            </span>
            {/* Clear button — hover only */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "none",
                background:
                  "var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))",
                cursor: "pointer",
                color: "var(--ds-text-subtle, #42526E)",
                flexShrink: 0,
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "var(--ds-background-neutral-bold, #C1C7D0)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))")
              }
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))"
              strokeWidth="2"
              style={{
                flexShrink: 0,
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.15s",
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        ) : (
          <>
            <span
              style={{
                flex: 1,
                fontSize: 14,
                color:
                  "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
              }}
            >
              None
            </span>
          </>
        )}
      </div>

      {/* Dropdown — Jira parity with two-line rows, color dots, "Show done" checkbox */}
      {open &&
        (() => {
          return (
            <div
              style={{
                ...ATLASSIAN_DROPDOWN,
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                width: Math.max(containerRef.current?.offsetWidth ?? 420, 420),
                maxHeight: 440,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Search input */}
              <div style={{ padding: "8px 8px 4px" }}>
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search epics..."
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setOpen(false);
                      setSearch("");
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 40,
                    padding: "0 12px",
                    border: "2px solid var(--ds-border-focused, #4C9AFF)",
                    borderRadius: 3,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    color:
                      "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
                  }}
                />
              </div>

              {/* Show done checkbox */}
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--ds-surface-sunken, #F4F5F7)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    color:
                      "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showDone}
                    onChange={(e) => setShowDone(e.target.checked)}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor:
                        "var(--ds-background-brand-bold, var(--cp-primary-60, #0052CC))",
                      cursor: "pointer",
                    }}
                  />
                  Show done work items
                </label>
              </div>

              {/* Results — Jira parity: epic icon + key on line 1, summary on line 2, NO color dots */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {searchResults.map((result) => {
                  const isActive = result.issue_key === parentKey;
                  return (
                    <div
                      key={result.id}
                      onClick={() => handleSelect(result.issue_key)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom:
                          "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))",
                        background: isActive
                          ? "var(--ds-background-information, #DEEBFF)"
                          : "transparent",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            isActive
                              ? "var(--ds-background-information, #DEEBFF)"
                              : "transparent";
                      }}
                    >
                      {/* Line 1: icon + key */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <EpicIconInline />
                        <span
                          style={{
                            fontFamily: "var(--cp-font-mono)",
                            fontWeight: 600,
                            color:
                              "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
                            fontSize: 12,
                          }}
                        >
                          {result.issue_key}
                        </span>
                      </div>
                      {/* Line 2: summary */}
                      <div
                        style={{
                          fontSize: 14,
                          color: "var(--ds-text, #172B4D)",
                          paddingLeft: 24,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {result.summary}
                      </div>
                    </div>
                  );
                })}
                {searchResults.length === 0 && search && (
                  <div
                    style={{
                      padding: 16,
                      fontSize: 13,
                      color:
                        "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
                      textAlign: "center",
                    }}
                  >
                    No epics found for "{search}"
                  </div>
                )}
                {searchResults.length === 0 && !search && (
                  <div
                    style={{
                      padding: 16,
                      fontSize: 13,
                      color:
                        "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
                      textAlign: "center",
                    }}
                  >
                    No epics available
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

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
import { UnassignedAvatar, ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from "@/components/ads";
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
    .cv-priority-select__control:hover { background: var(--ds-background-neutral-subtle-hovered, var(--cp-bg-sunken)) !important; }
    .cv-assignee-select__value-container, .cv-reporter-select__value-container { display: flex !important; }
    .cv-assignee-select__input-container, .cv-reporter-select__input-container { order: 99 !important; }
  `;
  document.head.appendChild(s);
}

/** Atlassian-spec dropdown container styles */
const ATLASSIAN_DROPDOWN: React.CSSProperties = {
  background:
    "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))",
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
    primaryColor="var(--ds-icon-selected, var(--cp-primary-60))"
  />
);

/** Jira-native priority SVG icons — exact parity */
const PRIORITY_SVG: Record<string, React.ReactNode> = {
  Highest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        d="M3 8l5-5 5 5"
        fill="none"
        stroke="var(--ds-icon-danger)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12l5-5 5 5"
        fill="none"
        stroke="var(--ds-icon-danger)"
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
        stroke="var(--ds-icon-danger)"
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
        stroke="var(--ds-icon-warning)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 8h10"
        fill="none"
        stroke="var(--ds-icon-warning)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 11.5h10"
        fill="none"
        stroke="var(--ds-icon-warning)"
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
        stroke="var(--ds-link)"
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
        stroke="var(--ds-link)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 8l5 5 5-5"
        fill="none"
        stroke="var(--ds-link)"
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
  /* 2026-06-21: when there's no real user (empty userId or the "Unassigned"
     sentinel), render the canonical gray-silhouette glyph instead of fake
     initials. Matches Jira: gray-filled circle, no border, white-gray person
     icon — same chrome the JiraTable assignee cell uses. */
  if (!userId || userId === "__unassigned__" || userId === "__none__" || name === "Unassigned" || name === "None") {
    return <UnassignedAvatar size={size} />;
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
            "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))",
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
  onChange,
  allowReassign,
}: {
  issueId: string;
  issueKey?: string;
  projectId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  onUpdate: () => void;
  /** Custom write callback. When provided, called INSTEAD of the default ph_issues mutation.
   *  Receives (userId, displayName). Enables non-ph_issues data sources (tasks, business_requests)
   *  to reuse this canonical picker — see CLAUDE.md "Adopt canonical components" rule (2026-06-01). */
  onChange?: (userId: string | null, displayName: string | null) => Promise<void> | void;
  /** Override the "read-only once set" rule. Defaults to false (read-only when
   *  currentAssigneeId is non-null). Subtasks table opts in (2026-06-23) so
   *  rows can be re-assigned inline without first clearing. */
  allowReassign?: boolean;
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  /* 2026-06-21: scope members to the project. Pulls project_members for
     the issue's project + joins profiles for names/jira_account_id. Mirrors
     WorkCardAssigneePicker so the left rail and the right panel offer the
     same shortlist. */
  const { data: members = [] } = useQuery({
    queryKey: ["assignee-project-members", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: pm, error } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", projectId);
      if (error) throw error;
      if (!pm?.length) return [] as ProjectMember[];
      const ids = pm.map((r) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, jira_account_id")
        .in("id", ids)
        .eq("approval_status", "APPROVED");
      const map = new Map((profs ?? []).map((p) => [p.id, p as any]));
      return pm
        .map((row) => {
          const p = map.get(row.user_id);
          const full_name = p?.full_name ?? p?.email ?? "Unknown";
          return {
            user_id: row.user_id,
            full_name,
            avatar_url: resolveAvatarUrl(full_name) ?? null,
            role: row.role ?? null,
            jira_account_id: p?.jira_account_id ?? null,
          } as ProjectMember;
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const displayName = userId
        ? (members.find((m) => m.user_id === userId)?.full_name ?? null)
        : null;
      // If a custom onChange is provided, the call site owns the write (e.g. tasks.assignee_id).
      // Otherwise fall back to the canonical ph_issues mutation.
      if (onChange) {
        await onChange(userId, displayName);
        return;
      }
      const updateData = {
        assignee_account_id: userId,
        assignee_display_name: displayName,
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

  /* 2026-06-21 Phase 3 migration: bespoke Atlaskit-Select swapped for the
     canonical <ProfilePicker />. Vikram rule — assignee is read-only once
     set on a work item. Reporter is NOT affected (see EditableReporter
     below). */
  const pickerMembers: ProfilePickerMember[] = useMemo(
    () => members.map((m) => ({
      userId: m.user_id,
      name: m.full_name,
      avatarUrl: m.avatar_url ?? null,
    })),
    [members],
  );

  const pickerValue: ProfilePickerSelection = selected.userId
    ? { userId: selected.userId, name: selected.label, avatarUrl: selected.avatarUrl }
    : null;

  /* menuIsOpen is kept for layout parity with surrounding fields that still
     rely on the focused outline; ProfilePicker owns its own open state. */
  void menuIsOpen;
  void setMenuIsOpen;

  return (
    <div style={{ flex: 1, minWidth: 0, borderRadius: 4 }}>
      <ProfilePicker
        value={pickerValue}
        onChange={(next) => {
          const nextUserId = next?.userId ?? null;
          if (nextUserId === (currentAssigneeId ?? null)) return;
          updateMutation.mutate(nextUserId);
        }}
        members={pickerMembers}
        fieldLabel="Assignee"
        disabled={!allowReassign && !!currentAssigneeId}
        size={24}
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
  onChange,
}: {
  issueId: string;
  projectId: string;
  currentReporterId: string | null;
  currentReporterName: string | null;
  onUpdate: () => void;
  /** Custom write callback. When provided, called INSTEAD of the default ph_issues mutation.
   *  Receives (userId, displayName). Enables non-ph_issues data sources to reuse this picker. */
  onChange?: (userId: string | null, displayName: string | null) => Promise<void> | void;
}) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  /* 2026-06-21: scoped to project_members (same shortlist as the assignee
     picker and the AllWork rail). Cross-project users are not surfaced. */
  const { data: members = [] } = useQuery({
    queryKey: ["reporter-project-members", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: pm, error } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", projectId);
      if (error) throw error;
      if (!pm?.length) return [] as ProjectMember[];
      const ids = pm.map((r) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, jira_account_id")
        .in("id", ids)
        .eq("approval_status", "APPROVED");
      const map = new Map((profs ?? []).map((p) => [p.id, p as any]));
      return pm
        .map((row) => {
          const p = map.get(row.user_id);
          const full_name = p?.full_name ?? p?.email ?? "Unknown";
          return {
            user_id: row.user_id,
            full_name,
            avatar_url: resolveAvatarUrl(full_name) ?? null,
            role: row.role ?? null,
            jira_account_id: p?.jira_account_id ?? null,
          } as ProjectMember;
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const displayName = userId
        ? (members.find((m) => m.user_id === userId)?.full_name ?? null)
        : null;
      // Custom onChange overrides the ph_issues mutation entirely.
      if (onChange) {
        await onChange(userId, displayName);
        return;
      }
      const updateData = {
        reporter_account_id: userId,
        reporter_display_name: displayName,
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
        label: "Unassigned",
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
        label: "Unassigned",
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

  /* 2026-06-21 Phase 3 migration: swap bespoke Atlaskit-Select for the
     canonical <ProfilePicker />. Reporter is NOT locked once set — Vikram
     directive: only assignee carries the lock. */
  const pickerMembers: ProfilePickerMember[] = useMemo(
    () => members.map((m) => ({
      userId: m.user_id,
      name: m.full_name,
      avatarUrl: m.avatar_url ?? null,
    })),
    [members],
  );

  const pickerValue: ProfilePickerSelection = selected.userId
    ? { userId: selected.userId, name: selected.label, avatarUrl: selected.avatarUrl }
    : null;

  void menuIsOpen;
  void setInputValue;
  void inputId;

  return (
    <div style={{ flex: 1, minWidth: 0, borderRadius: 4 }}>
      <ProfilePicker
        value={pickerValue}
        onChange={(next) => {
          const nextUserId = next?.userId ?? null;
          if (nextUserId === (currentReporterId ?? null)) return;
          updateMutation.mutate(nextUserId);
        }}
        members={pickerMembers}
        fieldLabel="Reporter"
        /* Reporter is NOT auto-locked. Field stays editable. */
        size={24}
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
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      <CanonicalPriorityIcon level={value} size={16} label="" />
      <span style={{ fontSize: 'var(--ds-font-size-400)', color: "var(--ds-text)" }}>
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
  hideClear,
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
  /** Hide the inline (×) clear-priority button. Subtasks table opts in
   *  (2026-06-23 Vikram) — Jira parity removes the clear affordance from
   *  table inline-edit triggers and relies on the picker for changes. */
  hideClear?: boolean;
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
    <div ref={triggerRef} data-priority-editing={showPicker ? "true" : undefined}>
      {showPicker ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            border: "1px solid var(--ds-border-focused)",
            borderRadius: 4,
            padding: "0px 6px",
            background: "var(--ds-background-input)",
            minWidth: 180,
            position: "relative",
            zIndex: 5,
          }}
        >
          <span
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 'var(--ds-font-size-400)',
              color: hasValue
                ? "var(--ds-text)"
                : "var(--ds-text-subtlest)",
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
          {hasValue && !hideClear && (
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
            padding: "0px 6px",
            borderRadius: 4,
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          {hasValue ? (
            <PriorityChip value={currentPriority} />
          ) : (
            <span
              style={{ fontSize: 'var(--ds-font-size-400)', color: "var(--ds-text-subtle)" }}
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
              background: "var(--ds-surface)",
              border: "1px solid var(--ds-border)",
              borderRadius: 6,
              boxShadow: "0 8px 16px var(--ds-shadow-raised, rgba(9,30,66,0.15))",
              zIndex: 1000,
              padding: "4px 0",
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
                    padding: "4px 12px",
                    cursor: "pointer",
                    background: isSelected
                      ? "var(--ds-background-information)"
                      : "transparent",
                    borderLeft: isSelected
                      ? "3px solid var(--ds-border-focused)"
                      : "3px solid transparent",
                    transition: "background 80ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--ds-surface-sunken)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      isSelected
                        ? "var(--ds-background-information)"
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
  "var(--ds-background-accent-blue-bold)",
  "var(--ds-background-accent-teal-bold)",
  "var(--ds-background-accent-green-bold)",
  "var(--ds-background-accent-yellow-bold)",
  "var(--ds-background-accent-red-bold)",
  "var(--ds-background-accent-purple-bold)",
  "var(--ds-background-accent-orange-bold)",
  "var(--ds-background-accent-green-bolder)",
  "var(--ds-background-accent-yellow-bolder)",
  "var(--ds-background-accent-purple-bolder)",
  "var(--ds-background-accent-teal-bolder)",
  "var(--ds-background-accent-red-bolder)",
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
  onChange,
}: {
  issueId: string;
  issueKey?: string;
  currentLabels: string[];
  onUpdate: () => void;
  /** Custom write callback. When provided, called INSTEAD of the default ph_issues mutation. */
  onChange?: (labels: string[]) => Promise<void> | void;
}) {
  const updateMutation = useMutation({
    mutationFn: async (labels: string[]) => {
      // Custom onChange overrides the ph_issues mutation entirely.
      if (onChange) {
        await onChange(labels);
        return;
      }
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
    <div style={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      alignItems: 'flex-start',
    }}>
      <CreatableSelect<LabelOption, true>
        inputId={`labels-${issueKey ?? issueId}`}
        isMulti
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuPosition="fixed"
        appearance="subtle"
        spacing="compact"
        classNamePrefix="cv-labels-select"
        closeMenuOnSelect={false}
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
          container: (base) => ({
            ...base,
            flex: '1 1 auto',
            minWidth: '100px',
          }),
          control: (base) => ({
            ...base,
            minHeight: 'auto',
          }),
          valueContainer: (base) => ({
            ...base,
            flexWrap: 'wrap',
          }),
          menuPortal: (base) => ({
            ...base,
            zIndex: 9999,
          }),
          menu: (base) => ({
            ...base,
            fontSize: 'var(--ds-font-size-200)',
          }),
          option: (base) => ({
            ...base,
            fontSize: 'var(--ds-font-size-200)',
            lineHeight: 'var(--ds-space-250, 20px)',
            padding: 'var(--ds-space-050, 4px) var(--ds-space-150, 12px)',
          }),
          input: (base) => ({
            ...base,
            fontSize: 'var(--ds-font-size-200)',
          }),
          singleValue: (base) => ({
            ...base,
            fontSize: 'var(--ds-font-size-200)',
          }),
          placeholder: (base) => ({
            ...base,
            fontSize: 'var(--ds-font-size-200)',
          }),
          noOptionsMessage: (base) => ({
            ...base,
            fontSize: 'var(--ds-font-size-200)',
          }),
          multiValue: (base, state) => ({
            ...base,
            border: `1px solid ${getLabelColor((state.data as LabelOption).value)}`,
            background: 'var(--ds-surface)',
            borderRadius: 3,
            padding: '0px 6px',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            maxWidth: '100%',
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: 'var(--ds-text)',
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }),
          multiValueRemove: (base) => ({
            ...base,
            marginLeft: '4px',
            minWidth: '16px',
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
          gap: 4,
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 4,
          transition: "background .12s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background =
            "var(--ds-surface-sunken, var(--cp-bg-sunken))")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span
          style={{
            fontSize: 'var(--ds-font-size-400)',
            color:
              currentPoints != null
                ? "var(--ds-text)"
                : "var(--ds-text-subtlest)",
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
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 400,
              color:
                "var(--ds-text-subtlest, var(--cp-text-secondary))",
              background:
                currentPoints == null
                  ? "var(--ds-background-information)"
                  : "transparent",
              borderBottom:
                "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken))",
            }}
            onMouseEnter={(e) => {
              if (currentPoints != null)
                (e.currentTarget as HTMLElement).style.background =
                  "var(--ds-surface-sunken, var(--cp-bg-sunken))";
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
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 400,
                color:
                  "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))",
                background:
                  p === currentPoints
                    ? "var(--ds-background-information)"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                if (p !== currentPoints)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--ds-surface-sunken, var(--cp-bg-sunken))";
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
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
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
                primaryColor="var(--ds-text-subtle)"
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
                primaryColor="var(--ds-text-subtle)"
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
                padding: "4px 12px",
                fontSize: 'var(--ds-font-size-200)',
                lineHeight: "20px",
                cursor: "pointer",
                borderLeft:
                  isSelected || isFocused
                    ? "3px solid var(--ds-border-focused)"
                    : "3px solid transparent",
                background: isSelected
                  ? "var(--ds-background-information)"
                  : isFocused
                    ? "var(--ds-surface-sunken)"
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
            flexWrap: "wrap",
          }),
          input: (base) => ({
            ...base,
            caretColor: menuIsOpen ? "auto" : "transparent",
            fontSize: 'var(--ds-font-size-400)',
          }),
          indicatorsContainer: (base) => ({
            ...base,
            display: menuIsOpen ? "flex" : "none",
            alignItems: "center",
            alignSelf: "center",
          }),
          menu: (base) => ({
            ...base,
            // minWidth: 300,
            right: 0,
            left: "auto",
            fontSize: 'var(--ds-font-size-400)',
          }),
          option: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
          singleValue: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
          menuPortal: (base) => ({
            ...base,
            zIndex: 9999,
          }),
          groupHeading: (base) => ({
            ...base,
            fontSize: 'var(--ds-font-size-100)',
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
            padding: "0px 4px",
            alignItems: "center",
          }),
          multiValueLabel: (base) => ({
            ...base,
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 400,
            color: "var(--ds-text)",
            padding: 0,
            cursor: "pointer",
            ":hover": { textDecoration: "underline" },
          }),
          multiValueRemove: (base) => ({
            ...base,
            display: menuIsOpen ? "flex" : "none",
            color: "var(--ds-text-subtle)",
            marginLeft: 4,
            ":hover": {
              backgroundColor:
                "var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.08))",
              color: "var(--ds-text-subtle)",
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
      fill="var(--ds-background-discovery-bold)"
      width="16"
      height="16"
      rx="2"
    />
    <path
      fill="var(--ds-surface)"
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
            "var(--ds-surface-sunken, var(--cp-bg-sunken))";
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
                fontSize: 'var(--ds-font-size-400)',
                color:
                  "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))",
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
                  "var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))",
                cursor: "pointer",
                color: "var(--ds-text-subtle)",
                flexShrink: 0,
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "var(--ds-background-neutral-bold)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))")
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
              stroke="var(--ds-text-subtlest, var(--cp-text-secondary))"
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
                fontSize: 'var(--ds-font-size-400)',
                color:
                  "var(--ds-text-subtlest, var(--cp-text-secondary))",
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
                    border: "1px solid var(--ds-border-focused)",
                    borderRadius: 3,
                    fontSize: 'var(--ds-font-size-400)',
                    fontFamily: "inherit",
                    outline: "none",
                    color:
                      "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))",
                  }}
                />
              </div>

              {/* Show done checkbox */}
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--ds-surface-sunken)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 'var(--ds-font-size-400)',
                    color:
                      "var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))",
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
                        "var(--ds-background-brand-bold, var(--cp-primary-60))",
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
                          "1px solid var(--ds-surface-sunken, var(--cp-bg-sunken))",
                        background: isActive
                          ? "var(--ds-background-information)"
                          : "transparent",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--ds-surface-sunken, var(--cp-bg-sunken))";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            isActive
                              ? "var(--ds-background-information)"
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
                              "var(--ds-text-subtlest, var(--cp-text-secondary))",
                            fontSize: 'var(--ds-font-size-200)',
                          }}
                        >
                          {result.issue_key}
                        </span>
                      </div>
                      {/* Line 2: summary */}
                      <div
                        style={{
                          fontSize: 'var(--ds-font-size-400)',
                          color: "var(--ds-text)",
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
                      fontSize: 'var(--ds-font-size-300)',
                      color:
                        "var(--ds-text-subtlest, var(--cp-text-secondary))",
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
                      fontSize: 'var(--ds-font-size-300)',
                      color:
                        "var(--ds-text-subtlest, var(--cp-text-secondary))",
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

/**
 * ReleaseSidePanel — right rail on /release-hub/releases-management/:releaseId.
 *
 * Bordered card containing:
 *   - Status dropdown (Unreleased / Released / Archived).
 *       * released   → menu: Archive
 *       * unreleased → menu: Release, Archive
 *       * archived   → menu: Release, Unreleased
 *     "Release" opens ReleaseConfirmationModal; "Archive" opens ReleaseArchiveDialog
 *     (mirrors the flow on /release-hub/releases-management).
 *   - Start date · Release date row (inline DatePicker, hover grey, click to edit).
 *   - Project · Contributors row (Project = ProductSelect; Contributors read-only avatars).
 *   - Description (click to open textarea with ✓ / ✗ buttons; ✓ disabled when empty).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CheckIcon from '@atlaskit/icon/glyph/check';
import EditorCloseIcon from '@atlaskit/icon/glyph/editor/close';
import { DatePicker } from '@atlaskit/datetime-picker';
import { supabase } from '@/integrations/supabase/client';
import { catalystFlag } from '@/lib/catalystFlag';
import { ReleaseConfirmationModal } from '@/components/releases/ReleaseConfirmationModal';
import { ReleaseArchiveDialog } from '@/components/releases/ReleaseArchiveDialog';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { QuarterSelect } from '@/components/shared/QuarterSelect';
import { useApprovedProfiles, useApprovedProfilesByJiraId } from '@/hooks/useApprovedProfiles';
// 2026-06-26: kept from incoming branch — used by user-picker render
// at line 817 to derive a deterministic avatar URL from display name.
import { resolveAvatarUrl } from '@/lib/avatars';
import type { Release, ReleaseStatus } from '@/types/phase3-releases';
import { type EntityConfig, RELEASE_CONFIG } from '@/lib/entity-hub/config';

const BORDER = 'var(--ds-border)';
const BLUE = 'var(--ds-border-selected)';
const BLUE_BG = 'var(--ds-background-selected)';
const BLUE_TEXT = 'var(--ds-text-selected)';
const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const SUBTLEST = 'var(--ds-text-subtlest)';
const LINK = 'var(--ds-link)';
const HOVER_BG = 'var(--ds-background-neutral-subtle-hovered)';

import { sprintStatusToReleaseBucket, isSprintStatus, SPRINT_STATUS_LABEL, SPRINT_STATUS_TRANSITIONS, type SprintStatus } from '@/lib/sprints/sprintStatus';
import { DefinitionOfDoneCard } from '@/components/sprints/DefinitionOfDoneCard';

type DBStatus = 'planning' | 'in_progress' | 'released' | 'archived';
const fromDBStatus = (s: string | null | undefined): ReleaseStatus => {
  if (s === 'released') return 'released';
  if (s === 'archived') return 'archived';
  return 'unreleased';
};
const statusLabel = (s: ReleaseStatus) =>
  s === 'released' ? 'Released' : s === 'archived' ? 'Archived' : 'Unreleased';

interface Props {
  releaseId: string;
  releaseName: string;
  status: string | null | undefined;
  startDate: string | null | undefined;     // ISO yyyy-mm-dd
  releaseDate: string | null | undefined;   // ISO yyyy-mm-dd
  projectId: string;
  projectKey: string | null;
  description: string | null | undefined;
  /** Milestone-only — drives the Quarter row rendered for kind === 'milestone'. */
  quarter?: string | null;
  /** 2026-06-26: entity-hub config. Defaults to RELEASE_CONFIG (existing
   *  release-hub behaviour). Sprint surface passes SPRINT_CONFIG so writes
   *  hit ph_jira_sprints and queries scope correctly. */
  config?: EntityConfig;
}

export function ReleaseSidePanel(props: Props) {
  const { releaseId, releaseName, projectId, projectKey, config = RELEASE_CONFIG } = props;
  const queryClient = useQueryClient();
  // S0.3 (D-005): sprint statuses are planning/active/awaiting_approval/
  // completed/canceled/archived — bucket-map them into the shared 3-value
  // pill/menu logic; the visible label comes from SPRINT_STATUS_LABEL.
  const uiStatus = config.kind === 'sprint'
    ? sprintStatusToReleaseBucket(props.status)
    : fromDBStatus(props.status);
  const table = config.table;

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix, 'one', releaseId] });
    queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
  };

  // Contributors: derive from assignees of items linked to this release.
  // SEPARATE queryKey from WorkItemsSection — earlier the two shared a key
  // but their queryFns selected different columns, so this minimal fetch
  // would overwrite the full-row cache on re-mount and wipe key/summary.
  const { data: items = [] } = useQuery({
    queryKey: ['ph_release_contributors', releaseId, releaseName],
    queryFn: async () => {
      const target = (releaseName || '').trim();
      if (!target) return [];
      // Mirror WorkItemsSection: .contains() first, fallback to fetch+filter.
      // This guarantees identical row set vs the visible work items table.
      const select = 'assignee_account_id, assignee_display_name, sprint_release';
      // S0.2b/S0.3: sprint membership is the sprint_id FK — same read path
      // as WorkItemsSection so contributors match the visible item set.
      if (config.kind === 'sprint') {
        const { data, error } = await supabase
          .from('ph_issues')
          .select(select)
          .eq('sprint_id', releaseId)
          .limit(2000);
        if (error) throw new Error(error.message);
        return data ?? [];
      }
      const containsResult = await supabase
        .from('ph_issues')
        .select(select)
        .contains('sprint_release', JSON.stringify([{ name: target }]) as any)
        .limit(2000);
      if ((containsResult.data?.length ?? 0) > 0) {
        return containsResult.data ?? [];
      }
      const fb = await supabase
        .from('ph_issues')
        .select(select)
        .not('sprint_release', 'is', null)
        .limit(5000);
      if (!fb.data) return [];
      return fb.data.filter((row: any) => {
        const arr = row.sprint_release;
        return Array.isArray(arr) && arr.some((el: any) => el && el.name === target);
      });
    },
    enabled: !!releaseName,
    staleTime: 30_000,
  });

  const contributors = useMemo(() => {
    const seen = new Set<string>();
    const out: { accountId: string | null; name: string | null }[] = [];
    items.forEach((it: any) => {
      const accountId = (it.assignee_account_id || '').trim();
      const name = (it.assignee_display_name || '').trim();
      if (!accountId && !name) return;
      const key = accountId || `name:${name.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ accountId: accountId || null, name: name || null });
    });
    return out;
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          padding: 16,
          background: 'var(--ds-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <StatusDropdown
          releaseId={releaseId}
          releaseName={releaseName}
          projectId={projectId}
          projectKey={projectKey}
          uiStatus={uiStatus}
          rawStatus={props.status}
          startDate={props.startDate}
          releaseDate={props.releaseDate}
          description={props.description}
          onChanged={refetch}
          config={config}
        />

        <div style={{ display: 'flex', gap: 16 }}>
          <DateField
            label="Start date"
            value={props.startDate}
            onSave={async (v) => {
              const { error } = await (supabase as any)
                .from(table)
                .update({ start_date: v || null })
                .eq('id', releaseId);
              if (error) throw new Error(error.message);
              refetch();
              catalystFlag.success('Start date updated.');
            }}
          />
          <DateField
            label={config.kind === 'milestone' ? 'Target date' : 'Release date'}
            value={props.releaseDate}
            onSave={async (v) => {
              // ph_releases / ph_jira_sprints keep release_date + target_date
              // in sync. product_milestones only has target_date.
              const updatePayload: Record<string, string | null> = {
                [config.columnMap.releaseDateColumn]: v || null,
              };
              if (config.columnMap.releaseDateColumn === 'release_date') {
                updatePayload.target_date = v || null;
              }
              const { error } = await (supabase as any)
                .from(table)
                .update(updatePayload)
                .eq('id', releaseId);
              if (error) throw new Error(error.message);
              refetch();
              catalystFlag.success(`${config.kind === 'milestone' ? 'Target' : 'Release'} date updated.`);
            }}
          />
        </div>

        {/* Quarter — milestone-only row, sits between dates and description
            (mirrors the order in the milestone create modal). */}
        {config.kind === 'milestone' && (
          <QuarterField
            value={props.quarter ?? null}
            onSave={async (next) => {
              const { error } = await (supabase as any)
                .from(table)
                .update({ quarter: next || null })
                .eq('id', releaseId);
              if (error) throw new Error(error.message);
              refetch();
              catalystFlag.success('Quarter updated.');
            }}
          />
        )}

        {/* ProjectField + Contributors only render for release/sprint.
            milestones don't currently support cross-product moves and have no
            canonical contributor source (BR assignees ≠ milestone contributors). */}
        {config.kind !== 'milestone' && (
          <div style={{ display: 'flex', gap: 16 }}>
            <ProjectField
              projectId={projectId}
              onChange={async (nextId) => {
                if (!nextId || nextId === projectId) return;
                const { error } = await (supabase as any)
                  .from(table)
                  .update({ [config.columnMap.fkProjectColumn]: nextId })
                  .eq('id', releaseId);
                if (error) {
                  catalystFlag.error(error.message);
                  return;
                }
                refetch();
                catalystFlag.success('Project updated.');
              }}
            />
            <ContributorsField contributors={contributors} />
          </div>
        )}

        <DescriptionField
          value={props.description ?? ''}
          onSave={async (next) => {
            const { error } = await (supabase as any)
              .from(table)
              .update({ description: next || null })
              .eq('id', releaseId);
            if (error) throw new Error(error.message);
            refetch();
            catalystFlag.success('Description updated.');
          }}
        />
      </div>

      {/* S2.1b: Definition of Done — sprint-kind only, gated behind real
          per-type status catalogs (see DefinitionOfDoneCard header comment). */}
      {config.kind === 'sprint' && <DefinitionOfDoneCard sprintId={releaseId} />}

      {/* ApproversCard is config-aware (ph_release_approvers vs
          ph_sprint_approvers, FK column, profile embed alias). entityStatus
          only matters for sprints (S2.2/2.3 approve/reject gating). */}
      <ApproversCard releaseId={releaseId} config={config} entityStatus={props.status} />
    </div>
  );
}

// ─── Approvers card ────────────────────────────────────────────────────────

type ApproverStatus = 'pending' | 'approved' | 'rejected';
interface Approver {
  rowId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: ApproverStatus;
  description: string;
}

const STATUS_BORDER: Record<ApproverStatus, string> = {
  pending: 'var(--ds-border)',
  approved: 'var(--ds-border-success)',
  rejected: 'var(--ds-border-danger)',
};

interface ApproverRow {
  id: string;
  release_id?: string;
  sprint_id?: string;
  user_id: string;
  status: ApproverStatus;
  description: string | null;
  profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

function ApproversCard({
  releaseId,
  config = RELEASE_CONFIG,
  entityStatus,
}: {
  releaseId: string;
  config?: EntityConfig;
  /** Raw ph_jira_sprints.status — only meaningful for config.kind === 'sprint'. */
  entityStatus?: string | null;
}) {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // S2.2b/2.3: who's looking at this — approve/reject is a first-person
  // action, never something you click on someone else's behalf.
  const { data: currentUserId } = useQuery({
    queryKey: ['approvers-current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: Infinity,
  });

  const { table: approverTable, fkColumn, profileFkAlias } = config.approvers;
  const queryKey = [`${config.queryKeyPrefix}-approvers`, releaseId];

  const { data: rows = [] } = useQuery<ApproverRow[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(approverTable)
        .select(`id, ${fkColumn}, user_id, status, description, profile:${profileFkAlias}(id, full_name, avatar_url)`)
        .eq(fkColumn, releaseId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ApproverRow[];
    },
    enabled: !!releaseId,
  });

  const approvers: Approver[] = useMemo(() => rows.map((r) => ({
    rowId: r.id,
    userId: r.user_id,
    name: r.profile?.full_name || 'Unknown',
    avatarUrl: r.profile?.avatar_url ?? null,
    status: r.status,
    description: r.description ?? '',
  })), [rows]);

  const rowByUserId = useMemo(() => {
    const m = new Map<string, ApproverRow>();
    rows.forEach((r) => m.set(r.user_id, r));
    return m;
  }, [rows]);

  const addApprover = useMutation({
    mutationFn: async (userId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from(approverTable)
        .insert({
          [fkColumn]: releaseId,
          user_id: userId,
          status: 'pending',
          added_by: auth.user?.id ?? null,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystFlag.success('Approver added.');
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to add approver'),
  });

  const removeApprover = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await (supabase as any)
        .from(approverTable)
        .delete()
        .eq('id', rowId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystFlag.success('Approver removed.');
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to remove approver'),
  });

  const updateDescription = useMutation({
    mutationFn: async ({ rowId, description }: { rowId: string; description: string }) => {
      const { error } = await (supabase as any)
        .from(approverTable)
        .update({ description })
        .eq('id', rowId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystFlag.success('Description updated.');
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to update description'),
  });

  // S2.2b/2.3: approve/reject — decided_at stamps immediately; the DB
  // trigger (fn_sprint_check_approval) evaluates policy and, on rejection,
  // reopens the sprint to active. Sprint-only (config.approvers.table is
  // ph_sprint_approvers only when config.kind === 'sprint').
  const decideApproval = useMutation({
    mutationFn: async ({ rowId, decision }: { rowId: string; decision: 'approved' | 'rejected' }) => {
      const { error } = await (supabase as any)
        .from(approverTable)
        .update({ status: decision, decided_at: new Date().toISOString() })
        .eq('id', rowId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { decision }) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix, 'one', releaseId] });
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      catalystFlag.success(decision === 'approved' ? 'Approved.' : 'Rejected — sprint reopened to active.');
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to record decision'),
  });

  useEffect(() => {
    if (!pickerOpen || !plusRef.current) return;
    const update = () => {
      const r = plusRef.current!.getBoundingClientRect();
      const w = 280;
      const spaceRight = window.innerWidth - r.left;
      const openLeft = spaceRight < w + 16;
      const rawLeft = openLeft ? r.right - w : r.left;
      const left = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8));
      setPickerPos({ top: r.bottom + 6, left, width: w });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (plusRef.current?.contains(t)) return;
      if (pickerRef.current?.contains(t)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setPickerOpen(false); }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [pickerOpen]);

  const handleSelectUser = (u: { id: string; full_name: string | null; avatar_url: string | null }) => {
    if (rowByUserId.has(u.id)) return;
    addApprover.mutate(u.id);
    setPickerOpen(false);
  };

  const handleRemove = (userId: string) => {
    const row = rowByUserId.get(userId);
    if (!row) return;
    removeApprover.mutate(row.id);
    if (expandedId === userId) setExpandedId(null);
  };

  const handleDescriptionSave = (userId: string, next: string) => {
    const row = rowByUserId.get(userId);
    if (!row) return;
    updateDescription.mutate({ rowId: row.id, description: next });
  };

  const selectedIds = new Set(approvers.map((a) => a.userId));

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: 16,
        background: 'var(--ds-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: TEXT }}>Approvers</span>
        <button
          ref={plusRef}
          type="button"
          aria-label="Add approver"
          onClick={() => setPickerOpen((v) => !v)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 24,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 3,
            color: SUBTLE,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = HOVER_BG; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {approvers.length === 0 ? (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: SUBTLE }}>No approvers have been added</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {approvers.map((a) => {
            const canDecide =
              config.kind === 'sprint' &&
              entityStatus === 'awaiting_approval' &&
              a.status === 'pending' &&
              !!currentUserId &&
              a.userId === currentUserId;
            return (
              <ApproverRow
                key={a.userId}
                approver={a}
                expanded={expandedId === a.userId}
                onToggle={() => setExpandedId((prev) => prev === a.userId ? null : a.userId)}
                onRemove={() => handleRemove(a.userId)}
                onDescriptionSave={(next) => handleDescriptionSave(a.userId, next)}
                canDecide={canDecide}
                onDecide={(decision) => decideApproval.mutate({ rowId: a.rowId, decision })}
              />
            );
          })}
        </div>
      )}

      {pickerOpen && pickerPos && createPortal(
        <UserPickerDropdown
          ref={pickerRef}
          pos={pickerPos}
          selectedIds={selectedIds}
          onSelect={handleSelectUser}
        />,
        document.body,
      )}
    </div>
  );
}

// ─── Approver row (collapsed pill + expand panel) ─────────────────────────

function ApproverRow({
  approver, expanded, onToggle, onRemove, onDescriptionSave, canDecide, onDecide,
}: {
  approver: Approver;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onDescriptionSave: (next: string) => void;
  canDecide?: boolean;
  onDecide?: (decision: 'approved' | 'rejected') => void;
}) {
  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const profile = useMemo(
    () => approvedProfiles.find((p) => p.id === approver.userId),
    [approvedProfiles, approver.userId],
  );
  const [hover, setHover] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          margin: '0 -8px',
          borderRadius: 3,
          background: hover || expanded ? HOVER_BG : 'transparent',
        }}
      >
        <CatalystAvatar size="small" name={profile?.name || approver.name} src={profile?.avatarUrl || approver.avatarUrl || undefined} />
        <span style={{ flex: 1, fontSize: 'var(--ds-font-size-400)', color: LINK, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {approver.name}
        </span>
        {canDecide && (
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <button
              type="button"
              aria-label="Approve"
              onClick={() => onDecide?.('approved')}
              style={{
                all: 'unset', cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 3,
                color: 'var(--ds-icon-success)', border: `1px solid var(--ds-border-success)`,
              }}
            >
              <CheckIcon label="Approve" size="small" />
            </button>
            <button
              type="button"
              aria-label="Reject"
              onClick={() => onDecide?.('rejected')}
              style={{
                all: 'unset', cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 3,
                color: 'var(--ds-icon-danger)', border: `1px solid var(--ds-border-danger)`,
              }}
            >
              <EditorCloseIcon label="Reject" size="small" />
            </button>
          </span>
        )}
        <StatusPill status={approver.status} />
        <button
          type="button"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={onToggle}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 20,
            height: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: LINK,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 120ms ease',
          }}
        >
          <ChevronDownIcon label="" size="small" />
        </button>
      </div>

      {expanded && (
        <ApproverExpandPanel
          description={approver.description}
          onSave={onDescriptionSave}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ApproverStatus }) {
  const label = status === 'pending' ? 'PENDING' : status === 'approved' ? 'APPROVED' : 'REJECTED';
  return (
    <span
      style={{
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 700,
        color: TEXT,
        padding: '0px 6px',
        border: `1px solid ${STATUS_BORDER[status]}`,
        borderRadius: 3,
        letterSpacing: 0.3,
        background: 'var(--ds-surface)',
      }}
    >
      {label}
    </span>
  );
}

// ─── Approver expand panel (description + remove) ─────────────────────────

function ApproverExpandPanel({
  description, onSave, onRemove,
}: {
  description: string;
  onSave: (next: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [hover, setHover] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(description);
      setTimeout(() => taRef.current?.focus(), 0);
    }
  }, [editing, description]);

  const canSave = draft.trim().length > 0 && draft !== description;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: TEXT }}>Description</span>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <textarea
              ref={taRef}
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 8,
                border: `2px solid ${BLUE}`,
                borderRadius: 3,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: 'var(--ds-font-size-400)',
                color: TEXT,
              }}
            />
            <div style={{ display: 'inline-flex', gap: 4 }}>
              <button
                type="button"
                aria-label="Save"
                disabled={!canSave}
                onClick={() => { onSave(draft.trim()); setEditing(false); }}
                style={{
                  all: 'unset',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  width: 28,
                  height: 28,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 3,
                  background: 'var(--ds-surface)',
                  color: canSave ? TEXT : SUBTLEST,
                  opacity: canSave ? 1 : 0.5,
                }}
              >
                <CheckIcon label="" size="small" />
              </button>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => { setDraft(description); setEditing(false); }}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  width: 28,
                  height: 28,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 3,
                  background: 'var(--ds-surface)',
                  color: TEXT,
                }}
              >
                <EditorCloseIcon label="" size="small" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '4px 6px',
              margin: '-4px -6px',
              borderRadius: 3,
              fontSize: 'var(--ds-font-size-400)',
              fontStyle: description ? 'normal' : 'italic',
              color: description ? TEXT : SUBTLEST,
              background: hover ? HOVER_BG : 'transparent',
              whiteSpace: 'pre-wrap',
              minHeight: 22,
            }}
          >
            {description || 'No description added'}
          </button>
        )}
      </div>

      <div style={{ height: 1, background: BORDER, margin: '12px 0 8px' }} />

      {/* 2026-06-26: full-width clickable row. Text left-aligned, hover bg
          spans entire row so any click on the row removes the approver. */}
      <button
        type="button"
        onClick={onRemove}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: 'calc(100% + 12px)',
          boxSizing: 'border-box',
          padding: '4px 6px',
          margin: '0 -6px',
          borderRadius: 3,
          fontSize: 'var(--ds-font-size-400)',
          color: TEXT,
          textAlign: 'left',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = HOVER_BG; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        Remove approver
      </button>
    </div>
  );
}

// ─── User picker dropdown (portal — search + list) ────────────────────────

const UserPickerDropdown = React.forwardRef<HTMLDivElement, {
  pos: { top: number; left: number; width: number };
  selectedIds: Set<string>;
  onSelect: (u: { id: string; full_name: string | null; avatar_url: string | null }) => void;
}>(function UserPickerDropdown({ pos, selectedIds, onSelect }, ref) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const users = useMemo(
    () =>
      approvedProfiles.map((p) => ({
        id: p.id,
        full_name: p.name,
        avatar_url: p.avatarUrl ?? null,
      })),
    [approvedProfiles],
  );

  const filtered = useMemo(() => {
    const available = users.filter((u) => !selectedIds.has(u.id));
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((u) => (u.full_name || '').toLowerCase().includes(q));
  }, [users, query, selectedIds]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 10010,
        background: 'var(--ds-surface-overlay)',
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-overlay)',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        maxHeight: 360,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          border: `2px solid ${focused ? BLUE : BORDER}`,
          borderRadius: 3,
          background: 'var(--ds-surface)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SUBTLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 'var(--ds-font-size-400)',
            color: TEXT,
          }}
        />
      </div>

      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: SUBTLEST }}>No users</div>
        ) : (
          filtered.map((u) => {
            const isSelected = selectedIds.has(u.id);
            return (
              <button
                key={u.id}
                type="button"
                disabled={isSelected}
                onClick={() => onSelect(u)}
                style={{
                  all: 'unset',
                  cursor: isSelected ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 10px',
                  borderRadius: 3,
                  opacity: isSelected ? 0.5 : 1,
                  background: isSelected ? BLUE_BG : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = HOVER_BG; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <CatalystAvatar size="small" name={u.full_name || undefined} src={resolveAvatarUrl(u.full_name) ?? u.avatar_url ?? undefined} />
                <span style={{ fontSize: 'var(--ds-font-size-400)', color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.full_name || 'Unknown'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

// ─── Status dropdown ────────────────────────────────────────────────────────

function StatusDropdown({
  releaseId, releaseName, projectId, projectKey, uiStatus, rawStatus, startDate, releaseDate, description, onChanged,
  config = RELEASE_CONFIG,
}: {
  releaseId: string;
  releaseName: string;
  projectId: string;
  projectKey: string | null;
  uiStatus: ReleaseStatus;
  /** S0.3: raw DB status — sprint kind shows the real vocabulary label
   *  (Active / Completed / …) while uiStatus keeps driving menu logic. */
  rawStatus?: string | null;
  startDate: string | null | undefined;
  releaseDate: string | null | undefined;
  description: string | null | undefined;
  onChanged: () => void;
  config?: EntityConfig;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const w = Math.max(r.width, 220);
      const spaceRight = window.innerWidth - r.left;
      const openLeft = spaceRight < w + 16;
      const rawLeft = openLeft ? r.right - w : r.left;
      const left = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8));
      setPos({ top: r.bottom + 4, left, width: w });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const setStatusDirect = async (next: DBStatus) => {
    // product_milestones has no `actual_date` column — skip the reset on
    // milestone status changes; only release/sprint own that field.
    const payload: Record<string, unknown> = { status: next };
    if (next !== 'released' && config.kind !== 'milestone') {
      payload.actual_date = null;
    }
    const { error } = await (supabase as any)
      .from(config.table)
      .update(payload)
      .eq('id', releaseId);
    if (error) {
      catalystFlag.error(error.message);
      return;
    }
    onChanged();
    catalystFlag.success(`Status updated to ${next === 'planning' ? 'Unreleased' : next.replace('_', ' ')}.`);
  };

  // S2.2c: sprint's own native vocabulary — separate from setStatusDirect
  // above, which writes the release-shaped planning/in_progress/released/
  // archived set. Never called for awaiting_approval/completed (D-004 —
  // those are reached only via the DoD trigger / approval decision).
  const setSprintStatusDirect = async (next: SprintStatus) => {
    const { error } = await (supabase as any)
      .from(config.table)
      .update({ status: next })
      .eq('id', releaseId);
    if (error) {
      catalystFlag.error(error.message);
      return;
    }
    onChanged();
    catalystFlag.success(`Sprint status updated to ${SPRINT_STATUS_LABEL[next]}.`);
  };

  // Build menu items per current status. Release/milestone use the
  // confirmation modals — they're config-aware (write to config.table).
  // Sprint uses its own native vocabulary (S2.2c) — NOT the release bucket.
  const SPRINT_TRANSITION_LABEL: Record<SprintStatus, string> = {
    planning: 'Reopen to planning',
    active: 'Start sprint',
    awaiting_approval: 'Request approval', // never manually offered — see filter below
    completed: 'Complete sprint',          // never manually offered — approval gate only (D-004)
    canceled: 'Cancel sprint',
    archived: 'Archive',
  };
  const menuItems: Array<{ key: string; label: string; onSelect: () => void }> = [];
  if (config.kind === 'sprint' && isSprintStatus(rawStatus)) {
    SPRINT_STATUS_TRANSITIONS[rawStatus]
      .filter((next) => next !== 'awaiting_approval' && next !== 'completed') // D-004: only the DoD trigger / approval decision may reach these
      .forEach((next) => {
        if (next === 'archived') {
          menuItems.push({ key: next, label: SPRINT_TRANSITION_LABEL[next], onSelect: () => { setOpen(false); setShowArchiveModal(true); } });
        } else {
          menuItems.push({ key: next, label: SPRINT_TRANSITION_LABEL[next], onSelect: () => { setOpen(false); setSprintStatusDirect(next); } });
        }
      });
  } else if (uiStatus === 'released') {
    menuItems.push({ key: 'archive', label: 'Archive', onSelect: () => { setOpen(false); setShowArchiveModal(true); } });
  } else if (uiStatus === 'unreleased') {
    menuItems.push({ key: 'release', label: 'Release', onSelect: () => { setOpen(false); setShowReleaseModal(true); } });
    menuItems.push({ key: 'archive', label: 'Archive', onSelect: () => { setOpen(false); setShowArchiveModal(true); } });
  } else {
    menuItems.push({ key: 'release', label: 'Release', onSelect: () => { setOpen(false); setShowReleaseModal(true); } });
    menuItems.push({ key: 'unreleased', label: 'Unreleased', onSelect: () => { setOpen(false); setStatusDirect('planning'); } });
  }

  const releaseShape: Release = {
    id: releaseId,
    project_id: projectId,
    name: releaseName,
    description: description ?? undefined,
    start_date: startDate ?? undefined,
    release_date: releaseDate ?? undefined,
    status: uiStatus,
    sequence: 0,
    created_at: '',
    updated_at: '',
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 12px',
          border: `1px solid ${open ? BLUE : BORDER}`,
          borderRadius: 3,
          background: 'var(--ds-surface)',
          color: open ? BLUE_TEXT : TEXT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 500,
          boxShadow: open ? `0 0 0 1px ${BLUE_BG}` : 'none',
        }}
      >
        <span style={{ flex: 1, textAlign: 'center' }}>
          {config.kind === 'sprint' && isSprintStatus(rawStatus)
            ? SPRINT_STATUS_LABEL[rawStatus]
            : statusLabel(uiStatus)}
        </span>
        <ChevronDownIcon label="" size="small" />
      </button>

      {open && pos && createPortal(
        <div
          ref={popupRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 10010,
            background: 'var(--ds-surface-overlay)',
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            boxShadow: 'var(--ds-shadow-overlay)',
            padding: '4px 0',
          }}
        >
          {menuItems.map((m, i) => (
            <button
              key={m.key}
              type="button"
              role="menuitem"
              onClick={m.onSelect}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 14px',
                fontSize: 'var(--ds-font-size-400)',
                color: TEXT,
                borderLeft: i === 0 ? `2px solid ${BLUE}` : '2px solid transparent',
                background: i === 0 ? BLUE_BG : 'transparent',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = BLUE_BG; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i === 0 ? BLUE_BG : 'transparent'; }}
            >
              {m.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {showReleaseModal && projectKey && (
        <ReleaseConfirmationModal
          isOpen={showReleaseModal}
          release={releaseShape}
          projectKey={projectKey}
          onClose={() => setShowReleaseModal(false)}
          onSuccess={() => { setShowReleaseModal(false); onChanged(); }}
          config={config}
        />
      )}
      {showArchiveModal && projectKey && (
        <ReleaseArchiveDialog
          isOpen={showArchiveModal}
          release={releaseShape}
          projectKey={projectKey}
          onClose={() => setShowArchiveModal(false)}
          onSuccess={() => { setShowArchiveModal(false); onChanged(); }}
          config={config}
        />
      )}
    </>
  );
}

// ─── Quarter field — canonical QuarterSelect with click-to-edit pattern ────

function QuarterField({
  value, onSave,
}: { value: string | null; onSave: (v: string | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: TEXT }}>Quarter</span>
      {editing ? (
        <QuarterSelect
          value={value}
          onChange={async (next) => {
            try {
              await onSave(next);
            } catch (e: any) {
              catalystFlag.error(e?.message || 'Failed to save');
            }
            setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '0px 6px',
            margin: '-2px -6px',
            borderRadius: 3,
            fontSize: 'var(--ds-font-size-400)',
            color: value ? TEXT : SUBTLEST,
            background: hover ? HOVER_BG : 'transparent',
            alignSelf: 'flex-start',
          }}
        >
          {value || '—'}
        </button>
      )}
    </div>
  );
}

// ─── Date field (label + inline date picker on hover/click) ─────────────────

function DateField({
  label, value, onSave,
}: { label: string; value: string | null | undefined; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [hover, setHover] = useState(false);
  const display = value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: TEXT }}>{label}</span>
      {editing ? (
        <DatePicker
          defaultValue={value || undefined}
          autoFocus
          onChange={async (next: string) => {
            try {
              await onSave(next);
            } catch (e: any) {
              catalystFlag.error(e?.message || 'Failed to save');
            }
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '0px 6px',
            margin: '-2px -6px',
            borderRadius: 3,
            fontSize: 'var(--ds-font-size-400)',
            color: value ? TEXT : SUBTLEST,
            background: hover ? HOVER_BG : 'transparent',
            alignSelf: 'flex-start',
          }}
        >
          {display}
        </button>
      )}
    </div>
  );
}

// ─── Project picker (custom portal dropdown — opens immediately on click) ────

function ProjectField({
  projectId, onChange,
}: { projectId: string; onChange: (nextId: string | null) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['ph-projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; key: string; name: string }>;
    },
    staleTime: 5 * 60_000,
  });

  const current = projects.find((p) => p.id === projectId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q));
  }, [projects, query]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const w = Math.max(r.width, 240);
      const spaceRight = window.innerWidth - r.left;
      const openLeft = spaceRight < w + 16;
      const rawLeft = openLeft ? r.right - w : r.left;
      const left = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8));
      setPos({ top: r.bottom + 4, left, width: w });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: TEXT }}>Project</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-expanded={open}
        style={{
          all: 'unset',
          cursor: 'pointer',
          padding: '0px 6px',
          margin: '-2px -6px',
          borderRadius: 3,
          fontSize: 'var(--ds-font-size-400)',
          color: current ? TEXT : SUBTLEST,
          background: hover || open ? HOVER_BG : 'transparent',
          alignSelf: 'flex-start',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {current ? current.name : 'Select project'}
      </button>

      {open && pos && createPortal(
        <div
          ref={popupRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 10010,
            background: 'var(--ds-surface-overlay)',
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            boxShadow: 'var(--ds-shadow-overlay)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 320,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: `1px solid ${BORDER}` }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search projects"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 30,
                padding: '0 8px',
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                outline: 'none',
                fontSize: 'var(--ds-font-size-300)',
                color: TEXT,
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', padding: '4px 0' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: SUBTLEST }}>No matches</div>
            )}
            {filtered.map((p) => {
              const isSelected = p.id === projectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange(p.id); setOpen(false); setQuery(''); }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '4px 12px',
                    background: isSelected ? BLUE_BG : 'transparent',
                    color: isSelected ? BLUE_TEXT : TEXT,
                    fontSize: 'var(--ds-font-size-300)',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = HOVER_BG; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  <span style={{ color: SUBTLEST, fontSize: 'var(--ds-font-size-100)', fontWeight: 600 }}>{p.key}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Contributors (read-only avatar stack) ──────────────────────────────────

function ContributorsField({
  contributors,
}: { contributors: { accountId: string | null; name: string | null }[] }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: TEXT }}>Contributors</span>
      {contributors.length === 0 ? (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: SUBTLEST }}>—</span>
      ) : (
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          {contributors.slice(0, 3).map((c, i) => (
            <span
              key={`${c.accountId || c.name || i}`}
              style={{
                marginLeft: i === 0 ? 0 : -6,
                border: '2px solid var(--ds-surface)',
                borderRadius: '50%',
                display: 'inline-flex',
              }}
              title={c.name || ''}
            >
              <ContribAvatar accountId={c.accountId} name={c.name} />
            </span>
          ))}
          {contributors.length > 3 && (
            <span
              style={{
                marginLeft: 4,
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 600,
                color: TEXT,
                background: 'var(--ds-background-neutral)',
                padding: '0px 8px',
                borderRadius: 3,
                minWidth: 18,
                textAlign: 'center',
                lineHeight: '18px',
                display: 'inline-block',
              }}
            >
              +{contributors.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ContribAvatar({ accountId, name }: { accountId: string | null; name: string | null }) {
  const byJiraId = useApprovedProfilesByJiraId();
  const profile = accountId ? byJiraId.get(accountId) : undefined;
  return (
    <CatalystAvatar
      size="small"
      name={profile?.name || name || undefined}
      src={profile?.avatarUrl || undefined}
    />
  );
}

// ─── Description with edit toggle ───────────────────────────────────────────

function DescriptionField({
  value, onSave,
}: { value: string; onSave: (next: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [hover, setHover] = useState(false);
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) { setDraft(value); setTimeout(() => taRef.current?.focus(), 0); } }, [editing, value]);

  const canSave = draft.trim().length > 0 && draft !== value && !saving;

  const commit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (e: any) {
      catalystFlag.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: TEXT }}>Description</span>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 8,
              border: `2px solid ${BLUE}`,
              borderRadius: 3,
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: 'var(--ds-font-size-400)',
              color: TEXT,
            }}
          />
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <button
              type="button"
              aria-label="Save"
              disabled={!canSave}
              onClick={commit}
              style={{
                all: 'unset',
                cursor: canSave ? 'pointer' : 'not-allowed',
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                background: 'var(--ds-surface)',
                color: canSave ? TEXT : SUBTLEST,
                opacity: canSave ? 1 : 0.5,
              }}
            >
              <CheckIcon label="" size="small" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => { setDraft(value); setEditing(false); }}
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                background: 'var(--ds-surface)',
                color: TEXT,
              }}
            >
              <EditorCloseIcon label="" size="small" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '4px 6px',
            margin: '-4px -6px',
            borderRadius: 3,
            fontSize: 'var(--ds-font-size-400)',
            color: value ? TEXT : SUBTLEST,
            background: hover ? HOVER_BG : 'transparent',
            whiteSpace: 'pre-wrap',
            minHeight: 22,
          }}
        >
          {value || 'No description added yet.'}
        </button>
      )}
    </div>
  );
}

// @ts-nocheck
/**
 * ReleaseHealthUWV — dedicated full-screen overlay for the Release Health
 * gadget's "View all N releases" footer link.
 *
 * Renders a 2-level expandable tree:
 *   • Level 1 (44px): release row (name · status · progress · count · end date)
 *   • Level 2 (36px): lazy-loaded items in that release (icon · key · summary · status · assignee)
 *
 * Click an issue key → openDetail() opens the canonical StoryDetailModal V15.
 * Close [X] → calls onClose() (UWV unmounts; dashboard remains).
 *
 * GUARDRAILS (per spec):
 *   - z-index 1000, position fixed, dashboard stays mounted
 *   - StatusLozenge: grey/blue/green only
 *   - Hex literals only (no HSL)
 *   - Canonical SVG WorkItemIcon (no Lucide for item types)
 *   - perPage=50 (rows surfaced before scroll)
 *   - UPPERCASE column headers
 *   - JetBrains Mono for percentages
 */
import { useMemo, useState } from 'react';
import { X, ChevronRight, ChevronDown, Settings } from 'lucide-react';
import Spinner from '@atlaskit/spinner';
import { StatusLozenge, EmptyState, ProgressBar, Avatar } from '@/components/ads';
import WorkItemIcon, { type WorkItemIconType } from '@/components/shared/WorkItemIcon';
import { useDashboardReleaseHealth } from '@/hooks/useDashboardWidgets';
import { useReleaseItems } from './useReleaseItems';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

interface Props {
  projectId: string;
  projectKey: string;
  onClose: () => void;
}

const FONT_STACK =
  '"Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MONO_STACK = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function statusCategoryFor(status?: string | null): 'default' | 'inProgress' | 'success' {
  const s = (status ?? '').toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'released') return 'success';
  if (s === 'in_progress' || s === 'in progress' || s === 'active') return 'inProgress';
  return 'default';
}

function statusLabelFor(status?: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'released') return 'DONE';
  if (s === 'in_progress' || s === 'in progress' || s === 'active') return 'IN PROGRESS';
  return 'TO DO';
}

function itemStatusCategoryFor(cat?: string | null): 'default' | 'inProgress' | 'success' {
  const c = (cat ?? '').toLowerCase();
  if (c === 'done') return 'success';
  if (c === 'in progress' || c === 'in_progress' || c === 'inprogress') return 'inProgress';
  return 'default';
}

function iconTypeFor(issueType?: string | null): WorkItemIconType {
  const t = (issueType ?? '').toLowerCase();
  if (t.includes('epic')) return 'epic';
  if (t.includes('bug') || t.includes('defect')) return 'bug';
  if (t.includes('incident')) return 'production_incident';
  if (t.includes('sub')) return 'subtask';
  if (t.includes('feature')) return 'feature';
  if (t.includes('change')) return 'change_request';
  if (t.includes('story')) return 'story';
  if (t.includes('task')) return 'task';
  return 'story';
}

// ─── Level 2 row: lazy-loaded items for one expanded release ───────────────
function ReleaseItemsRows({
  projectKey,
  releaseName,
  expanded,
  onItemClick,
}: {
  projectKey: string;
  releaseName: string;
  expanded: boolean;
  onItemClick: (key: string, type: string) => void;
}) {
  const { data, isLoading } = useReleaseItems(projectKey, releaseName, expanded);

  if (!expanded) return null;

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 0',
          background: '#FAFBFC',
        }}
      >
        <Spinner size="small" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: '8px 48px',
          fontSize: 12,
          color: '#8590A2',
          fontStyle: 'italic',
          background: '#FAFBFC',
        }}
      >
        No items in this release.
      </div>
    );
  }

  return (
    <>
      {data.map((it) => (
        <div
          key={it.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 24px 110px 1fr 120px 32px',
            alignItems: 'center',
            height: 36,
            maxHeight: 36,
            padding: '0 16px',
            background: '#FAFBFC',
            borderBottom: '1px solid #F1F2F4',
            fontSize: 13,
            color: '#172B4D',
          }}
        >
          <div /> {/* indent column */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <WorkItemIcon type={iconTypeFor(it.issueType)} size={16} />
          </div>
          <button
            type="button"
            onClick={() => onItemClick(it.key, it.issueType)}
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              fontFamily: MONO_STACK,
              fontSize: 12,
              fontWeight: 600,
              color: '#0052CC',
              textAlign: 'left',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {it.key}
          </button>
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingRight: 12,
            }}
          >
            {it.summary}
          </div>
          <div>
            <StatusLozenge status={itemStatusCategoryFor(it.statusCategory)}>
              {(it.status || '—').toUpperCase()}
            </StatusLozenge>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {it.assigneeName ? (
              <Avatar
                name={it.assigneeName}
                src={it.assigneeAvatar ?? undefined}
                size="small"
              />
            ) : (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#DFE1E6',
                }}
              />
            )}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Level 1 row: release ──────────────────────────────────────────────────
function ReleaseRow({
  rel,
  expanded,
  onToggle,
  projectKey,
  onItemClick,
}: {
  rel: any;
  expanded: boolean;
  onToggle: () => void;
  projectKey: string;
  onItemClick: (key: string, type: string) => void;
}) {
  const pct = rel.completionPct ?? 0;
  const isDone = pct >= 100;
  const fillColor = isDone ? '#006644' : '#0052CC';

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 110px 220px 110px 130px',
          alignItems: 'center',
          height: 44,
          padding: '0 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #DFE1E6',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <button
          type="button"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#42526E',
          }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div
          style={{
            fontSize: 13,
            fontWeight: 650,
            color: '#172B4D',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: 12,
          }}
        >
          {rel.name}
        </div>
        <div>
          <StatusLozenge status={statusCategoryFor(rel.status)}>
            {statusLabelFor(rel.status)}
          </StatusLozenge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: '#DFE1E6',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, pct))}%`,
                height: '100%',
                background: fillColor,
                transition: 'width 200ms ease',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: MONO_STACK,
              fontSize: 11,
              color: '#42526E',
              minWidth: 36,
              textAlign: 'right',
            }}
          >
            {pct}%
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#42526E' }}>
          {rel.done} / {rel.total}
        </div>
        <div
          style={{
            fontSize: 12,
            color: rel.atRisk ? '#974F0C' : '#42526E',
            textAlign: 'right',
          }}
        >
          {fmtDate(rel.targetDate)}
        </div>
      </div>
      <ReleaseItemsRows
        projectKey={projectKey}
        releaseName={rel.name}
        expanded={expanded}
        onItemClick={onItemClick}
      />
    </>
  );
}

// ─── Main overlay ──────────────────────────────────────────────────────────
export function ReleaseHealthUWV({ projectId, projectKey, onClose }: Props) {
  const { data: releases, isLoading } = useDashboardReleaseHealth(projectId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const openDetail = useGlobalSearchStore((s) => s.openDetail);

  const totalItems = useMemo(
    () => (releases ?? []).reduce((s, r) => s + (r.total ?? 0), 0),
    [releases],
  );
  const releaseCount = releases?.length ?? 0;

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleItemClick = (key: string, type: string) => {
    openDetail({ id: key, projectKey, itemType: type });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Release Health"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT_STACK,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #DFE1E6',
          background: '#FFFFFF',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--cp-font-heading)' + FONT_STACK,
              fontSize: 16,
              fontWeight: 650,
              color: '#172B4D',
              lineHeight: 1.25,
            }}
          >
            Release Health
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#8590A2',
              marginTop: 2,
            }}
          >
            {releaseCount} {releaseCount === 1 ? 'release' : 'releases'} ·{' '}
            {totalItems} total {totalItems === 1 ? 'item' : 'items'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            aria-label="Settings"
            style={{
              background: 'transparent',
              border: 0,
              padding: 6,
              cursor: 'pointer',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              color: '#42526E',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F5F7')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              padding: 6,
              cursor: 'pointer',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              color: '#42526E',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F5F7')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Column headers — UPPERCASE only */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 110px 220px 110px 130px',
          alignItems: 'center',
          height: 36,
          padding: '0 16px',
          background: '#F4F5F7',
          borderBottom: '1px solid #DFE1E6',
          fontSize: 11,
          fontWeight: 700,
          color: '#5E6C84',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        <div />
        <div>Release</div>
        <div>Status</div>
        <div>Progress</div>
        <div>Items</div>
        <div style={{ textAlign: 'right' }}>End date</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 64,
            }}
          >
            <Spinner size="large" />
          </div>
        ) : releaseCount === 0 ? (
          <div style={{ padding: 64 }}>
            <EmptyState
              header="No active releases"
              description="Create a release to track delivery progress here."
            />
          </div>
        ) : (
          (releases ?? []).slice(0, 50).map((rel: any) => (
            <ReleaseRow
              key={rel.id}
              rel={rel}
              expanded={expandedIds.has(rel.id)}
              onToggle={() => toggle(rel.id)}
              projectKey={projectKey}
              onItemClick={handleItemClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ReleaseHealthUWV;

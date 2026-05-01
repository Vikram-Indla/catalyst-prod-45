/**
 * ReleaseCard — Shows real Jira fix version data with project groupings and assignee avatars
 */
import { useState } from 'react';
import { ArrowRight, AlertTriangle, FolderGit2 } from 'lucide-react';
import type { JiraRelease } from '@/hooks/workhub/useJiraReleases';
import { StackedProgressBar } from '../shared/StackedProgressBar';

interface ReleaseCardProps {
  release: JiraRelease;
  onClick: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Derive a status from the data */
function deriveStatus(r: JiraRelease): { label: string; bg: string; fg: string; dot: string } {
  if (r.totalItems > 0 && r.doneItems === r.totalItems) return { label: 'Completed', bg: '#d1fae5', fg: '#047857', dot: 'var(--ds-text-success, #16a34a)' };
  if (r.blockedItems > 0) return { label: 'At Risk', bg: '#fee2e2', fg: 'var(--ds-text-danger, #991b1b)', dot: 'var(--ds-text-danger, #ef4444)' };
  if (r.inProgressItems > 0 || r.inReviewItems > 0) return { label: 'Active', bg: '#dbeafe', fg: 'var(--ds-background-brand-bold-hovered, #1d4ed8)', dot: 'var(--ds-text-brand, #2563eb)' };
  return { label: 'Planned', bg: 'var(--ds-surface-sunken, #f1f5f9)', fg: 'var(--ds-text-subtle, #475569)', dot: 'var(--ds-text-subtlest, #94a3b8)' };
}

// Assign colors to project keys
const PROJECT_COLORS = ['var(--ds-text-brand, #2563eb)', '#7c3aed', '#0d9488', 'var(--ds-text-warning, #d97706)', 'var(--ds-text-danger, #ef4444)', '#0891b2', 'var(--ds-text-success, #16a34a)', '#6366f1', '#ea580c', 'var(--ds-text-subtle, #475569)'];
function getProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

export function ReleaseCard({ release, onClick }: ReleaseCardProps) {
  const isOverdue = release.releaseDate && new Date(release.releaseDate) < new Date()
    && release.doneItems < release.totalItems;

  const status = deriveStatus(release);

  const segments = [
    { label: 'Done', value: release.doneItems, color: 'var(--sem-success)' },
    { label: 'In Progress', value: release.inProgressItems, color: 'var(--cp-blue)' },
    { label: 'In Review', value: release.inReviewItems, color: '#7c3aed' },
    { label: 'Blocked', value: release.blockedItems, color: 'var(--sem-danger)' },
    { label: 'To Do', value: release.todoItems, color: 'var(--fg-4)' },
  ];

  const MAX_AVATARS = 6;
  const visibleAssignees = release.assignees.slice(0, MAX_AVATARS);
  const extraCount = release.assignees.length - MAX_AVATARS;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--cp-float)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--wh-radius-xl, 12px)',
        padding: '20px 20px 20px 24px',
        boxShadow: 'var(--wh-shadow-sm)',
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 16,
      }}
      className="wh-release-card"
    >
      {/* Color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 4, background: status.dot,
        borderRadius: '12px 0 0 12px',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--cp-font-heading)',
            fontSize: 18, fontWeight: 700,
            color: 'var(--fg-1)',
          }}>
            {release.versionName}
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 9999,
          fontSize: 12, fontWeight: 600,
          background: status.bg, color: status.fg,
          flexShrink: 0,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.dot }} />
          {status.label}
        </span>
      </div>

      {/* Date + Overdue */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {release.releaseDate && (
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>
            Due: {formatDate(release.releaseDate)}
          </span>
        )}
        {isOverdue && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 600, color: 'var(--sem-danger)',
          }}>
            <AlertTriangle size={14} />
            Overdue
          </span>
        )}
      </div>

      {/* Progress bar */}
      <StackedProgressBar
        segments={segments}
        total={release.totalItems}
        height={8}
        showLegend={true}
        showPercent={true}
        percentValue={release.completionPercent}
      />

      {/* Projects */}
      {release.projects.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <FolderGit2 size={13} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
          {release.projects.map((proj, i) => (
            <span key={proj} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 4,
              fontSize: 11, fontWeight: 600,
              background: `${getProjectColor(i)}10`,
              color: getProjectColor(i),
              border: `1px solid ${getProjectColor(i)}30`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: getProjectColor(i) }} />
              {proj}
            </span>
          ))}
        </div>
      )}

      {/* Assignee Avatars + Stats */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Avatar stack */}
          {release.assignees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {visibleAssignees.map((a, i) => (
                <AvatarChip key={a.accountId} assignee={a} index={i} />
              ))}
              {extraCount > 0 && (
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--divider)', color: 'var(--fg-2)',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: -6, border: '2px solid white',
                  zIndex: 1,
                }}>
                  +{extraCount}
                </span>
              )}
            </div>
          )}
          <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>
            {release.totalItems} items · {release.assignees.length} assignees · {release.projects.length} projects
          </span>
        </div>

        <span
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 13, fontWeight: 500, color: 'var(--cp-blue)',
            cursor: 'pointer',
          }}
          className="wh-view-detail"
        >
          View Detail <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
}

function AvatarChip({ assignee, index }: { assignee: { displayName: string; avatarUrl: string | null; roleName?: string | null }; index: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = assignee.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#6366f1', '#0d9488', 'var(--ds-text-warning, #d97706)', 'var(--ds-text-danger, #ef4444)', 'var(--ds-text-brand, #2563eb)', '#7c3aed', 'var(--ds-text-success, #16a34a)', '#0891b2'];
  const bg = colors[index % colors.length];
  const tooltip = assignee.roleName ? `${assignee.displayName} · ${assignee.roleName}` : assignee.displayName;

  return (
    <div
      title={tooltip}
      style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid white',
        marginLeft: index > 0 ? -6 : 0,
        zIndex: 10 - index,
        overflow: 'hidden', flexShrink: 0,
        position: 'relative',
      }}
    >
      {assignee.avatarUrl && !imgError ? (
        <img
          src={assignee.avatarUrl}
          alt={assignee.displayName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: bg, color: 'var(--bg-app)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700,
        }}>
          {initials}
        </div>
      )}
    </div>
  );
}

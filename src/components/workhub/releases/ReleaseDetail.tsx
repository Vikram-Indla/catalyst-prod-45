/**
 * ReleaseDetail — Full release detail driven by real Jira fix_versions
 * Route: /workhub/releases/:id (where :id = fix version name, URL-encoded)
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Rocket, TrendingUp, FileStack, Users,
  FolderGit2, AlertTriangle, Loader2,
} from 'lucide-react';
import { useJiraRelease } from '@/hooks/workhub/useJiraReleases';
import { useWorkItems } from '@/hooks/workhub/useWorkItems';
import { StackedProgressBar } from '../shared/StackedProgressBar';
import { WorkItemsTable } from '../workitems/WorkItemsTable';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ReleaseDetail() {
  const { id } = useParams<{ id: string }>();
  const versionName = decodeURIComponent(id || '');
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useJiraRelease(versionName);

  // Work items filtered by fix version name
  const { data: workItemsData, isLoading: loadingItems, error: itemsError, refetch: retryItems } = useWorkItems(
    versionName ? { fix_version_names: [versionName] } : undefined,
    { page: 0, pageSize: 200 },
  );

  const [selectedIds] = useState<Set<string>>(new Set());

  if (loadingRelease) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--wh-text-secondary)' }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ marginLeft: 8, fontSize: 14 }}>Loading release...</span>
      </div>
    );
  }

  if (!release) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontSize: 14 }}>Release not found: {versionName}</p>
        <button onClick={() => navigate('/workhub/releases')} style={{
          marginTop: 12, padding: '8px 16px', borderRadius: 6,
          border: '1px solid var(--wh-border)', background: 'var(--wh-surface)',
          fontSize: 13, cursor: 'pointer',
        }}>
          Back to Releases
        </button>
      </div>
    );
  }

  const isOverdue = release.releaseDate && new Date(release.releaseDate) < new Date()
    && release.doneItems < release.totalItems;

  const segments = [
    { label: 'Done', value: release.doneItems, color: '#16a34a' },
    { label: 'In Progress', value: release.inProgressItems, color: '#2563eb' },
    { label: 'In Review', value: release.inReviewItems, color: '#7c3aed' },
    { label: 'Blocked', value: release.blockedItems, color: '#ef4444' },
    { label: 'To Do', value: release.todoItems, color: '#94a3b8' },
  ];

  const items = workItemsData?.items ?? [];

  // Derive status
  let statusLabel = 'Planned';
  if (release.totalItems > 0 && release.doneItems === release.totalItems) statusLabel = 'Completed';
  else if (release.blockedItems > 0) statusLabel = 'At Risk';
  else if (release.inProgressItems > 0 || release.inReviewItems > 0) statusLabel = 'Active';

  const kpis = [
    { label: 'Completion', value: `${release.completionPercent}%`, icon: TrendingUp, color: release.completionPercent > 50 ? '#16a34a' : '#d97706' },
    { label: 'Items', value: String(release.totalItems), icon: FileStack, color: '#2563eb' },
    { label: 'Assignees', value: String(release.assignees.length), icon: Users, color: '#7c3aed' },
    { label: 'Projects', value: String(release.projects.length), icon: FolderGit2, color: '#0d9488' },
    { label: 'Blocked', value: String(release.blockedItems), icon: AlertTriangle, color: release.blockedItems > 0 ? '#ef4444' : '#94a3b8' },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <button onClick={() => navigate('/workhub/releases')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 500, color: 'var(--wh-primary, #2563eb)',
        marginBottom: 16, padding: 0,
      }}>
        <ArrowLeft size={16} /> Back to Releases
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#dbeafe',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Rocket size={20} color="#2563eb" />
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: 0,
            fontFamily: 'var(--wh-font-display, Sora, sans-serif)',
            color: 'var(--wh-text-primary, #0f172a)',
          }}>
            {release.versionName}
          </h1>
        </div>
      </div>

      {/* Status + Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginLeft: 52 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 9999,
          fontSize: 12, fontWeight: 600,
          background: statusLabel === 'Completed' ? '#d1fae5' : statusLabel === 'Active' ? '#dbeafe' : statusLabel === 'At Risk' ? '#fee2e2' : '#f1f5f9',
          color: statusLabel === 'Completed' ? '#047857' : statusLabel === 'Active' ? '#1d4ed8' : statusLabel === 'At Risk' ? '#991b1b' : '#475569',
        }}>
          {statusLabel}
        </span>
        {release.releaseDate && (
          <span style={{ fontSize: 13, color: 'var(--wh-text-secondary, #64748b)' }}>
            Due: {formatDate(release.releaseDate)}
          </span>
        )}
        {isOverdue && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
            <AlertTriangle size={14} /> Overdue
          </span>
        )}
      </div>

      {/* Projects */}
      {release.projects.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 52, marginBottom: 16, flexWrap: 'wrap' }}>
          <FolderGit2 size={14} style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }} />
          {release.projects.map((proj, i) => {
            const colors = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#ef4444', '#0891b2', '#16a34a', '#6366f1'];
            const c = colors[i % colors.length];
            return (
              <span key={proj} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 4,
                fontSize: 11, fontWeight: 600,
                background: `${c}10`, color: c, border: `1px solid ${c}30`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
                {proj}
              </span>
            );
          })}
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} style={{
              border: '1px solid var(--wh-border, #e2e8f0)', borderRadius: 'var(--wh-radius-lg, 8px)',
              padding: '12px 16px', background: 'var(--wh-surface, #fff)', minWidth: 100,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon size={14} color={kpi.color} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--wh-text-tertiary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {kpi.label}
                </span>
              </div>
              <span style={{
                fontSize: 20, fontWeight: 700, color: kpi.color,
                fontFamily: 'var(--wh-font-display, Sora, sans-serif)',
              }}>
                {kpi.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div style={{
        background: 'var(--wh-surface, #fff)', border: '1px solid var(--wh-border, #e2e8f0)',
        borderRadius: 'var(--wh-radius-lg, 8px)', padding: 20, marginBottom: 24,
      }}>
        <StackedProgressBar
          segments={segments}
          total={release.totalItems}
          height={12}
          showLegend={true}
          showPercent={true}
          percentValue={release.completionPercent}
        />
      </div>

      {/* Assignee Avatars */}
      {release.assignees.length > 0 && (
        <div style={{
          background: 'var(--wh-surface, #fff)', border: '1px solid var(--wh-border, #e2e8f0)',
          borderRadius: 'var(--wh-radius-lg, 8px)', padding: '16px 20px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wh-text-primary)', marginBottom: 10 }}>
            Team ({release.assignees.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {release.assignees.map(a => (
              <AssigneeChip key={a.accountId} assignee={a} />
            ))}
          </div>
        </div>
      )}

      {/* Work Items Table */}
      <div>
        <h2 style={{
          fontSize: 16, fontWeight: 600, color: 'var(--wh-text-primary, #0f172a)',
          marginBottom: 12,
        }}>
          Work Items ({workItemsData?.totalCount ?? 0})
        </h2>

        {items.length === 0 && !loadingItems ? (
          <div style={{
            background: 'var(--wh-surface, #fff)', border: '1px solid var(--wh-border, #e2e8f0)',
            borderRadius: 'var(--wh-radius-lg, 8px)', padding: '40px 20px',
            textAlign: 'center',
          }}>
            <FileStack size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 14, color: 'var(--wh-text-secondary)', margin: 0 }}>
              No work items in this fix version.
            </p>
          </div>
        ) : (
          <div style={{
            background: 'var(--wh-surface, #fff)', border: '1px solid var(--wh-border, #e2e8f0)',
            borderRadius: 'var(--wh-radius-lg, 8px)', overflow: 'hidden',
          }}>
            <WorkItemsTable
              items={items}
              isLoading={loadingItems}
              error={itemsError}
              selectedIds={selectedIds}
              onToggleSelect={() => {}}
              onSelectAll={() => {}}
              selectAllState="none"
              onOpenDrawer={() => {}}
              onRetry={() => retryItems()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AssigneeChip({ assignee }: { assignee: { displayName: string; avatarUrl: string | null; roleName?: string | null } }) {
  const [imgError, setImgError] = useState(false);
  const initials = assignee.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 4px', borderRadius: 9999,
      border: '1px solid var(--wh-border, #e2e8f0)',
      background: '#f8fafc',
    }}>
      {assignee.avatarUrl && !imgError ? (
        <img
          src={assignee.avatarUrl}
          alt={assignee.displayName}
          style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: '#6366f1', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700,
        }}>
          {initials}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--wh-text-primary, #0f172a)', lineHeight: 1.2 }}>
          {assignee.displayName}
        </span>
        {assignee.roleName && (
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--wh-text-tertiary, #94a3b8)', lineHeight: 1.2 }}>
            {assignee.roleName}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * ReleaseDetail — Full release detail page with KPIs, progress, work items
 * Route: /workhub/releases/:id
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Rocket, Pencil, Trash2, TrendingUp, FileStack, Users,
  FolderGit2, AlertTriangle, Loader2,
} from 'lucide-react';
import { useRelease, useReleaseProgressById, useDeleteRelease } from '@/hooks/workhub/useReleases';
import { useWorkItems } from '@/hooks/workhub/useWorkItems';
import { ReleaseStatusBadge } from '../shared/ReleaseStatusBadge';
import { StackedProgressBar, releaseProgressSegments } from '../shared/StackedProgressBar';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { ReleaseModal } from './ReleaseModal';
import { WorkItemsTable } from '../workitems/WorkItemsTable';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateRange(start?: string, target?: string): string {
  if (!target) return '';
  if (!start) return `Due: ${formatDate(target)}`;
  return `${formatDate(start)} → ${formatDate(target)}`;
}

export function ReleaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id!);
  const { data: progress, isLoading: loadingProgress } = useReleaseProgressById(id!);
  const deleteMut = useDeleteRelease();

  // Work items filtered by release name (fix_version_names)
  const releaseName = release?.name;
  const { data: workItemsData, isLoading: loadingItems, error: itemsError, refetch: retryItems } = useWorkItems(
    releaseName ? { fix_version_names: [releaseName] } : undefined,
    { page: 0, pageSize: 200 },
  );

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedIds] = useState<Set<string>>(new Set());

  const isLoading = loadingRelease || loadingProgress;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--wh-text-secondary)' }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ marginLeft: 8, fontSize: 14 }}>Loading release...</span>
      </div>
    );
  }

  if (!release || !progress) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontSize: 14 }}>Release not found</p>
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

  const isOverdue = release.status !== 'Completed'
    && release.status !== 'Cancelled'
    && release.target_date
    && new Date(release.target_date) < new Date();

  const segments = releaseProgressSegments(progress);
  const items = workItemsData?.items ?? [];

  const kpis = [
    { label: 'Completion', value: `${progress.completion_percent}%`, icon: TrendingUp, color: progress.completion_percent > 50 ? '#16a34a' : '#d97706' },
    { label: 'Items', value: String(progress.total_items), icon: FileStack, color: '#2563eb' },
    { label: 'Assignees', value: String(progress.unique_assignees), icon: Users, color: '#7c3aed' },
    { label: 'Projects', value: String(progress.project_count), icon: FolderGit2, color: '#0d9488' },
    { label: 'Blocked', value: String(progress.blocked_items), icon: AlertTriangle, color: progress.blocked_items > 0 ? '#ef4444' : '#94a3b8' },
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
            {release.name} — {release.title}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowEdit(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 34, padding: '0 14px', borderRadius: 6,
            border: '1px solid var(--wh-border, #e2e8f0)', background: 'var(--wh-surface, #fff)',
            fontSize: 13, fontWeight: 500, color: 'var(--wh-text-primary)', cursor: 'pointer',
          }}>
            <Pencil size={14} /> Edit
          </button>
          <button onClick={() => setShowDelete(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 34, padding: '0 14px', borderRadius: 6,
            border: '1px solid #fecaca', background: 'var(--wh-surface, #fff)',
            fontSize: 13, fontWeight: 500, color: '#ef4444', cursor: 'pointer',
          }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Status + Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginLeft: 52 }}>
        <ReleaseStatusBadge status={release.status} />
        <span style={{ fontSize: 13, color: 'var(--wh-text-secondary, #64748b)' }}>
          {formatDateRange(release.start_date, release.target_date)}
        </span>
        {isOverdue && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
            <AlertTriangle size={14} /> Overdue
          </span>
        )}
      </div>

      {/* Description */}
      {release.description ? (
        <p style={{ fontSize: 14, color: 'var(--wh-text-secondary)', lineHeight: 1.6, marginBottom: 24, marginLeft: 52 }}>
          {release.description}
        </p>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--wh-text-tertiary)', fontStyle: 'italic', marginBottom: 24, marginLeft: 52 }}>
          No description
        </p>
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
          total={progress.total_items}
          height={12}
          showLegend={true}
          showPercent={true}
          percentValue={progress.completion_percent}
        />
      </div>

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
              No work items assigned to this release.
            </p>
            <p style={{ fontSize: 13, color: 'var(--wh-text-tertiary)', marginTop: 4 }}>
              Assign items from the Work Items page.
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

      {/* Edit Modal */}
      <ReleaseModal isOpen={showEdit} onClose={() => setShowEdit(false)} release={release} />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          deleteMut.mutate(id!, {
            onSuccess: () => navigate('/workhub/releases'),
          });
        }}
        title="Delete Release?"
        message="This will unlink all work items from this release and permanently delete it. This cannot be undone."
        confirmLabel="Delete Release"
        variant="danger"
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

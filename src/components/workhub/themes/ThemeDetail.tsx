/**
 * ThemeDetail — Full detail page for a theme
 * Route: /workhub/themes/:id
 */
import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Layers, Plus, Loader2 } from 'lucide-react';
import { useThemeProgressById, useDeleteTheme } from '@/hooks/workhub/useThemes';
import { useWorkItems } from '@/hooks/workhub/useWorkItems';
import { WorkItemsTable } from '../workitems/WorkItemsTable';
import { ProgressRing } from '../shared/ProgressRing';
import { ThemeStatusBadge } from '../shared/ThemeStatusBadge';
import { ThemeModal } from './ThemeModal';
import { ThemeItemLinker } from './ThemeItemLinker';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import toast from 'react-hot-toast';

function formatDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ThemeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: theme, isLoading, error } = useThemeProgressById(id || '');
  const deleteMut = useDeleteTheme();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkerOpen, setLinkerOpen] = useState(false);
  const linkBtnRef = useRef<HTMLButtonElement>(null);

  // Work items for this theme
  const { data: workData, isLoading: itemsLoading, error: itemsError, refetch: itemsRefetch } = useWorkItems(
    { theme_ids: [id || ''] },
    { page: 0, pageSize: 500 }
  );
  const items = workData?.items ?? [];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-3)' }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ marginLeft: 8, fontSize: 14 }}>Loading theme...</span>
      </div>
    );
  }

  if (error || !theme) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--sem-danger)', fontSize: 14, marginBottom: 12 }}>Theme not found</p>
        <button onClick={() => navigate('/projecthub/themes')} style={{
          padding: '8px 16px', borderRadius: 8, border: '1px solid var(--divider)',
          background: 'var(--cp-float)', fontSize: 13, cursor: 'pointer',
        }}>
          Back to Themes
        </button>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(theme.id);
      toast.success('Theme deleted');
      navigate('/projecthub/themes');
    } catch (e: any) {
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  const startStr = formatDate(theme.start_date);
  const endStr = formatDate(theme.end_date);
  const dateRange = startStr && endStr ? `${startStr} — ${endStr}` : startStr || endStr || 'No dates set';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--ds-font-family-body)' }}>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/projecthub/themes')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, color: 'var(--cp-blue)',
          marginBottom: 16, padding: 0,
        }}
      >
        <ArrowLeft size={15} />
        Back to Themes
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: theme.color, flexShrink: 0 }} />
          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: 0,
            fontFamily: 'var(--ds-font-family-heading)',
            color: 'var(--fg-1)',
          }}>
            {theme.name}
          </h1>
          <ThemeStatusBadge status={theme.status} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--divider)',
            background: 'var(--cp-float)', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--fg-2)',
          }}>
            <Pencil size={13} /> Edit
          </button>
          <button onClick={() => setDeleteOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 8, border: '1px solid #fecaca',
            background: 'var(--cp-float)', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--sem-danger)',
          }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Date + Description */}
      <p style={{ fontSize: 13, color: 'var(--fg-4)', margin: '4px 0 8px', paddingLeft: 22 }}>
        {dateRange}
      </p>
      <p style={{
        fontSize: 14, color: theme.description ? 'var(--fg-3)' : 'var(--fg-4)',
        fontStyle: theme.description ? 'normal' : 'italic',
        margin: '0 0 24px', paddingLeft: 22,
      }}>
        {theme.description || 'No description'}
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Progress */}
        <div style={{
          background: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 12,
          padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <ProgressRing percent={theme.completion_percent} size={60} strokeWidth={5} color={theme.color} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Completion</span>
        </div>

        {/* Total items */}
        <div style={{
          background: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 12,
          padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <Layers size={24} color="var(--cp-blue)" />
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-1)' }}>{theme.total_items}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Items</span>
        </div>

        {/* Epics */}
        <div style={{
          background: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 12,
          padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--cp-blue)' }} />
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-1)' }}>{theme.epic_count}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Epics</span>
        </div>

        {/* Stories */}
        <div style={{
          background: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 12,
          padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--sem-success)' }} />
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-1)' }}>{theme.story_count}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Stories</span>
        </div>
      </div>

      {/* Work Items Section */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{
          fontSize: 16, fontWeight: 700, margin: 0,
          color: 'var(--fg-1)',
        }}>
          Work Items ({theme.total_items})
        </h2>
        <div style={{ position: 'relative' }}>
          <button
            ref={linkBtnRef}
            onClick={() => setLinkerOpen(o => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--divider)',
              background: 'var(--cp-float)', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--cp-blue)',
            }}
          >
            <Plus size={14} /> Link Items
          </button>
          <ThemeItemLinker
            themeId={theme.id}
            themeName={theme.name}
            isOpen={linkerOpen}
            onClose={() => setLinkerOpen(false)}
            anchorRef={linkBtnRef}
          />
        </div>
      </div>

      <WorkItemsTable
        items={items}
        isLoading={itemsLoading}
        error={itemsError as Error | null}
        selectedIds={selectedIds}
        onToggleSelect={(key) => {
          setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
        }}
        onSelectAll={() => {
          if (selectedIds.size === items.length) setSelectedIds(new Set());
          else setSelectedIds(new Set(items.map(i => i.issue_key)));
        }}
        selectAllState={selectedIds.size === 0 ? 'none' : selectedIds.size === items.length ? 'all' : 'some'}
        onOpenDrawer={() => {}}
        onRetry={() => itemsRefetch()}
      />

      {/* Modals */}
      <ThemeModal isOpen={editOpen} onClose={() => setEditOpen(false)} theme={theme as any} />
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Theme"
        message={`Are you sure you want to delete "${theme.name}"? This will unlink all associated work items. This action cannot be undone.`}
        confirmLabel="Delete Theme"
        variant="danger"
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

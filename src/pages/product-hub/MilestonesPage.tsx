import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import TextField from '@atlaskit/textfield';
import AkFilterIcon from '@atlaskit/icon/core/filter';
import AkEyeOpenIcon from '@atlaskit/icon/core/eye-open';
import AkEyeOpenStrikethroughIcon from '@atlaskit/icon/core/eye-open-strikethrough';
import AkExpandVerticalIcon from '@atlaskit/icon/core/expand-vertical';
import AkCollapseVerticalIcon from '@atlaskit/icon/core/collapse-vertical';
import { ToolbarMenuButton } from '@/components/shared/JiraTable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { catalystFlag } from '@/lib/catalystFlag';
import { supabase } from '@/integrations/supabase/client';
import { productMilestoneService } from '@/services/product-milestone.service';
import type { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';
import type { ProductMilestoneWithProgress } from '@/types/product-milestone';
import { ReleasesTable } from '@/components/releases/ReleasesTable';
import { MilestoneCreateModal } from '@/components/product-hub/MilestoneCreateModal';
import { ReasonCaptureModal } from '@/components/catalyst-detail-views/shared/workflow/ReasonCaptureModal';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { CatalystListPageLayout } from '@/components/shared/CatalystListPage';
import {
  StatusFilter,
  GroupFilter,
  type StatusValue,
  type GroupValue,
} from '@/components/releases/ReleaseFilters';

type CellMilestone = Release;

function toReleaseStatus(s: string | null | undefined): ReleaseStatus {
  if (s === 'completed' || s === 'delivered') return 'released';
  if (s === 'cancelled') return 'archived';
  return 'unreleased';
}

function toRelease(m: ProductMilestoneWithProgress, idx: number): CellMilestone {
  return {
    id: m.id,
    project_id: m.productId,
    name: m.title,
    description: m.description ?? undefined,
    start_date: m.startDate ?? undefined,
    release_date: m.targetDate ?? undefined,
    status: toReleaseStatus(m.status),
    sequence: idx,
    archived_at: m.archivedAt ?? undefined,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}

function useProductId(productCode: string) {
  return useQuery({
    queryKey: ['product-by-code', productCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('code', productCode)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useMilestones(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-milestones', productId],
    queryFn: () => productMilestoneService.listMilestonesByProduct(productId!),
    enabled: !!productId,
  });
}

export function MilestonesPage() {
  const { key: productCode = '' } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading: productLoading } = useProductId(productCode);
  const { data: rawMilestones = [], isLoading: milestonesLoading, error } =
    useMilestones(product?.id);

  const isLoading = productLoading || milestonesLoading;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusValue[]>([]);
  const [groupBy, setGroupBy] = useState<GroupValue>('none');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null);
  // F3: reason capture for workflow-gated milestone completion.
  const [reasonRetry, setReasonRetry] = useState<{
    id: string;
    ctx: { entityType: string; from: string | null; to: string };
  } | null>(null);

  const completeMilestone = useCallback(
    async (id: string, reason?: { code: string | null; text: string | null }) => {
      try {
        await productMilestoneService.updateMilestone(id, {
          status: 'completed',
          ...(reason ? { reasonCode: reason.code, reasonText: reason.text } : {}),
        });
        queryClient.invalidateQueries({ queryKey: ['product-milestones', product?.id] });
        catalystFlag.success('Milestone marked completed.');
      } catch (e: any) {
        if (e?.code === 'WF_REASON_REQUIRED') {
          setReasonRetry({ id, ctx: e.ctx ?? { entityType: 'Milestone', from: null, to: 'completed' } });
          return;
        }
        catalystFlag.error(e?.message ?? 'Failed to complete milestone.');
      }
    },
    [product?.id, queryClient]
  );

  const milestones: CellMilestone[] = useMemo(
    () => rawMilestones.map((m, i) => toRelease(m as ProductMilestoneWithProgress, i)),
    [rawMilestones]
  );

  const filtered = useMemo(() => {
    let result = milestones;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (statusFilter.length > 0) {
      result = result.filter((m) => statusFilter.includes(m.status as StatusValue));
    }
    return result;
  }, [milestones, search, statusFilter]);

  const grouped = useMemo(() => {
    if (!groupBy || groupBy === 'none') return null;
    const map = new Map<string, CellMilestone[]>();
    for (const m of filtered) {
      const key = groupBy === 'status' ? m.status : (m.start_date?.slice(0, 7) ?? 'No date');
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([id, rows]) => ({ id, label: id, rows }));
  }, [filtered, groupBy]);

  const groupIdsKey = useMemo(() => (grouped ?? []).map((g) => g.id).join('|'), [grouped]);
  useEffect(() => {
    const ids = (grouped ?? []).map((g) => g.id);
    setCollapsedGroups(new Set(ids.slice(1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdsKey]);

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toolbarIconButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: 'none',
    background: 'transparent',
    borderRadius: 3,
    color: 'var(--ds-text-subtle)',
    cursor: 'pointer',
  };

  const ALL_STATUSES: StatusValue[] = ['released', 'unreleased', 'archived'];
  const isStatusVisible = (s: StatusValue) =>
    statusFilter.length === 0 || statusFilter.includes(s);
  const toggleStatusVisibility = (s: StatusValue) => {
    const current = statusFilter.length === 0 ? ALL_STATUSES : statusFilter;
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    setStatusFilter(next.length === ALL_STATUSES.length ? [] : next);
  };

  const toolbarViewOptionsButton = (
    <ToolbarMenuButton
      icon={<AkFilterIcon label="" size="small" />}
      ariaLabel="View options"
      tooltipContent="View options"
      buttonStyle={toolbarIconButtonStyle}
      groups={[
        {
          items: [
            { id: 'toggle-released',   icon: isStatusVisible('released')   ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />, label: isStatusVisible('released')   ? 'Hide completed'   : 'Show completed',   onClick: () => toggleStatusVisibility('released') },
            { id: 'toggle-unreleased', icon: isStatusVisible('unreleased') ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />, label: isStatusVisible('unreleased') ? 'Hide active'      : 'Show active',      onClick: () => toggleStatusVisibility('unreleased') },
            { id: 'toggle-archived',   icon: isStatusVisible('archived')   ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />, label: isStatusVisible('archived')   ? 'Hide cancelled'   : 'Show cancelled',   onClick: () => toggleStatusVisibility('archived') },
          ],
        },
        {
          items: [
            { id: 'expand-all',   icon: <AkExpandVerticalIcon label="" size="small" />,   label: 'Expand all groups',   onClick: () => setCollapsedGroups(new Set()) },
            { id: 'collapse-all', icon: <AkCollapseVerticalIcon label="" size="small" />, label: 'Collapse all groups', onClick: () => setCollapsedGroups(grouped ? new Set(grouped.map((g) => g.id)) : new Set()) },
          ],
        },
        {
          items: [
            { id: 'density-compact',     label: density === 'compact'     ? '✓ Compact'     : 'Compact',     onClick: () => setDensity('compact') },
            { id: 'density-comfortable', label: density === 'comfortable' ? '✓ Comfortable' : 'Comfortable', onClick: () => setDensity('comfortable') },
          ],
        },
      ]}
    />
  );

  if (isLoading) return <div style={{ padding: '24px' }}>Loading milestones…</div>;
  if (error)     return <div style={{ padding: '24px' }}>Error loading milestones</div>;

  const toolbarCustomActions = (
    <>
      <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      <GroupFilter value={groupBy} onChange={setGroupBy} />
      {toolbarViewOptionsButton}
    </>
  );

  return (
    <CatalystListPageLayout
      chromeBand={
        <ProjectPageHeader
          hubType="product"
          projectKey={productCode}
          title="Milestones"
        />
      }
      search={search}
      searchPlaceholder="Search milestones"
      onSearchChange={(v) => setSearch(v)}
      toolbarActions={toolbarCustomActions}
      tabBarActions={
        <Button appearance="primary" onClick={() => { setEditingMilestone(null); setIsCreateModalOpen(true); }}>
          Create milestone
        </Button>
      }
    >

      {filtered.length > 0 ? (
        <ReleasesTable
          rows={grouped ? undefined : filtered}
          groups={grouped ?? undefined}
          calculateProgress={() => null}
          onOpenDetail={(id) => navigate(`/product-hub/${productCode}/milestones/${id}`)}
          onRelease={(r) => completeMilestone(r.id)}
          onArchive={async (r) => {
            try {
              await productMilestoneService.archiveMilestone(r.id);
              queryClient.invalidateQueries({ queryKey: ['product-milestones', product?.id] });
              catalystFlag.success('Milestone archived.');
            } catch (e: any) {
              catalystFlag.error(e?.message ?? 'Failed to archive milestone.');
            }
          }}
          onMerge={() => {}}
          onEdit={(r) => {
            const src = rawMilestones.find((m) => (m as any).id === r.id);
            if (src) { setEditingMilestone(src); setIsCreateModalOpen(true); }
          }}
          onDelete={async (r) => {
            try {
              await productMilestoneService.deleteMilestone(r.id);
              queryClient.invalidateQueries({ queryKey: ['product-milestones', product?.id] });
              catalystFlag.success('Milestone deleted.');
            } catch (e: any) {
              catalystFlag.error(e?.message ?? 'Failed to delete milestone.');
            }
          }}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          density={density}
          entityLabel="Milestone"
          hideSprintsColumn
        />
      ) : (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ds-text-subtlest)' }}>
          {milestones.length === 0
            ? 'No milestones yet. Create your first milestone to start tracking delivery targets.'
            : 'No milestones match this filter.'}
        </div>
      )}

      <MilestoneCreateModal
        isOpen={isCreateModalOpen}
        productId={product?.id ?? ''}
        editingMilestone={editingMilestone}
        onClose={() => { setIsCreateModalOpen(false); setEditingMilestone(null); }}
        onSuccess={(m: any) => {
          queryClient.invalidateQueries({ queryKey: ['product-milestones', product?.id] });
          catalystFlag.success(
            editingMilestone
              ? `Milestone "${m.title}" updated.`
              : `Milestone "${m.title}" created.`
          );
        }}
      />

      {/* F3: workflow-gated completion — collect the reason and retry. */}
      {reasonRetry && (
        <ReasonCaptureModal
          entityType={reasonRetry.ctx.entityType}
          fromStatus={reasonRetry.ctx.from}
          toStatus={reasonRetry.ctx.to}
          onSubmit={(reason) => {
            const { id } = reasonRetry;
            setReasonRetry(null);
            completeMilestone(id, reason);
          }}
          onCancel={() => setReasonRetry(null)}
        />
      )}
    </CatalystListPageLayout>
  );
}

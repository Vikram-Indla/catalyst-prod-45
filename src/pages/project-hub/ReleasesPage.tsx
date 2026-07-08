import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import AkFilterIcon from '@atlaskit/icon/core/filter';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { CatalystListPageLayout } from '@/components/shared/CatalystListPage';
import AkEyeOpenIcon from '@atlaskit/icon/core/eye-open';
import AkEyeOpenStrikethroughIcon from '@atlaskit/icon/core/eye-open-strikethrough';
import AkExpandVerticalIcon from '@atlaskit/icon/core/expand-vertical';
import AkCollapseVerticalIcon from '@atlaskit/icon/core/collapse-vertical';
import { ToolbarMenuButton } from '@/components/shared/JiraTable';
import { EmptyState } from '@/components/ads/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { catalystFlag } from '@/lib/catalystFlag';
import { supabase } from '@/integrations/supabase/client';
import { useWHReleases, useReleaseProgress } from '@/hooks/workhub/useReleases';
import { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';
import { ReleasesTable } from '@/components/releases/ReleasesTable';
import { ReleaseCreateModal } from '@/components/releases/ReleaseCreateModal';
import { ShareFeedbackModal } from '@/components/releases/ShareFeedbackModal';
import FeedbackIcon from '@atlaskit/icon/core/feedback';
import { ReleaseArchiveDialog } from '@/components/releases/ReleaseArchiveDialog';
import { ReleaseMergeDialog } from '@/components/releases/ReleaseMergeDialog';
import { ReleaseConfirmationModal } from '@/components/releases/ReleaseConfirmationModal';
import { ReleaseDeleteDialog } from '@/components/releases/ReleaseDeleteDialog';
import {
  StatusFilter,
  ProductFilter,
  GroupFilter,
  type StatusValue,
  type GroupValue,
  type ProductOption,
} from '@/components/releases/ReleaseFilters';

// DB status (planning|in_progress|released|archived) -> cell status (unreleased|released|archived)
function toCellStatus(s: string | null | undefined): ReleaseStatus {
  if (s === 'released') return 'released';
  if (s === 'archived') return 'archived';
  return 'unreleased';
}

type CellRelease = Release & { jira_version_id?: string };

interface ProgressRow {
  version_id: string;
  total: number;
  done: number;
  in_progress: number;
  todo: number;
  done_percent: number;
  in_progress_percent: number;
}

export function ReleasesPage() {
  const { key } = useParams<{ key?: string }>();
  const projectKey = key || 'BAU'; // release-hub context defaults to BAU
  const { pathname } = useLocation();
  const isGlobalReleaseHub = pathname.startsWith('/release-hub');

  const { data: rawReleases, isLoading, error } = useWHReleases();
  const { data: releaseProgressRows } = useReleaseProgress();

  // Live progress per Jira version (computed from ph_issues.sprint_release JSONB)
  const { data: progressRows } = useQuery({
    queryKey: ['release-jira-progress', projectKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_release_jira_progress')
        .select('*')
        .eq('project_key', projectKey);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ProgressRow[];
    },
    staleTime: 30_000,
  });

  // project_id for the Create modal (needed even when no releases exist yet)
  const { data: projectRow } = useQuery({
    queryKey: ['ph-project-id', projectKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string } | null;
    },
    staleTime: 5 * 60_000,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusValue[]>([]);
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupValue>('none');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Products only — releases belong to products, not projects (projects use sprints).
  // Intersect ph_projects (FK source for releases.project_id) with products.code.
  const { data: productsRaw } = useQuery({
    queryKey: ['products-for-release-filter'],
    queryFn: async () => {
      const [{ data: projects, error: pErr }, { data: prods, error: prErr }] = await Promise.all([
        supabase.from('ph_projects').select('id, key, name').order('name'),
        (supabase as any).from('products').select('code').eq('is_active', true),
      ]);
      if (pErr) throw new Error(pErr.message);
      if (prErr) throw new Error(prErr.message);
      const productCodes = new Set((prods ?? []).map((p: any) => p.code));
      return (projects ?? []).filter((p: any) => productCodes.has(p.key)) as Array<{
        id: string; key: string; name: string;
      }>;
    },
    staleTime: 5 * 60_000,
  });

  const productOptions: ProductOption[] = useMemo(
    () => (productsRaw ?? []).map((p) => ({ id: p.id, name: p.name, tag: p.key })),
    [productsRaw],
  );

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<CellRelease | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archivingRelease, setArchivingRelease] = useState<CellRelease | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmingRelease, setConfirmingRelease] = useState<CellRelease | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRelease, setDeletingRelease] = useState<CellRelease | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [mergingRelease, setMergingRelease] = useState<CellRelease | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);

  const progressByVersion = useMemo(() => {
    const m = new Map<string, ProgressRow>();
    (progressRows ?? []).forEach((p) => m.set(p.version_id, p));
    return m;
  }, [progressRows]);

  // Build a lookup of sprint_names per release id (from the progress view)
  const sprintNamesById = useMemo(() => {
    const m = new Map<string, string[]>();
    (releaseProgressRows ?? []).forEach((p: any) => {
      if (Array.isArray(p.sprint_names) && p.sprint_names.length > 0) {
        m.set(p.id, p.sprint_names);
      }
    });
    return m;
  }, [releaseProgressRows]);

  // Adapt DB rows -> the shape the cells/modals expect, newest release first
  const releases = useMemo<CellRelease[]>(() => {
    return (rawReleases ?? [])
      .map((r: any) => ({
        id: r.id,
        slug: r.slug,
        project_id: r.project_id,
        name: r.name,
        description: r.description ?? undefined,
        start_date: r.start_date ?? undefined,
        release_date: r.release_date ?? undefined,
        status: toCellStatus(r.status),
        sequence: r.sort_order ?? 0,
        created_at: r.created_at,
        updated_at: r.updated_at,
        jira_version_id: r.jira_version_id ?? undefined,
        sprint_names: sprintNamesById.get(r.id) ?? [],
      }))
      .sort((a: any, b: any) => {
        const da = a.release_date ? new Date(a.release_date).getTime() : 0;
        const db = b.release_date ? new Date(b.release_date).getTime() : 0;
        return db - da;
      });
  }, [rawReleases, sprintNamesById]);

  const productProjectIds = useMemo(
    () => new Set((productsRaw ?? []).map((p) => p.id)),
    [productsRaw],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return releases.filter((r) => {
      const isProductRelease = productProjectIds.has(r.project_id);
      const matchesSearch = r.name.toLowerCase().includes(q);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(r.status);
      const matchesProduct = productFilter.length === 0 || productFilter.includes(r.project_id);
      return isProductRelease && matchesSearch && matchesStatus && matchesProduct;
    });
  }, [releases, productProjectIds, search, statusFilter, productFilter]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return null;
    const productNameById = new Map(productOptions.map((p) => [p.id, p.name]));
    const buckets = new Map<string, CellRelease[]>();
    const keyFor = (r: CellRelease): string => {
      switch (groupBy) {
        case 'status':
          return r.status;
        case 'product':
          return productNameById.get(r.project_id) ?? '— No product —';
        case 'release_date':
          return r.release_date ? new Date(r.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '— No release date —';
        case 'start_date':
          return r.start_date ? new Date(r.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '— No start date —';
        default:
          return '';
      }
    };
    filtered.forEach((r) => {
      const k = keyFor(r);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(r);
    });
    return Array.from(buckets.entries()).map(([label, rows]) => ({
      id: label,
      label,
      rows,
    }));
  }, [filtered, groupBy, productOptions]);

  // Primary source: vw_ph_release_progress (keyed by release.id).
  // Fallback: vw_release_jira_progress (keyed by jira_version_id) for legacy rows.
  const progressByReleaseId = useMemo(() => {
    const m = new Map<string, any>();
    (releaseProgressRows ?? []).forEach((p: any) => m.set(p.id, p));
    return m;
  }, [releaseProgressRows]);



  // Robust pick — view field names vary (done_items vs done vs done_count etc.)
  const pickNum = (obj: any, ...keys: string[]): number => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
    }
    return 0;
  };

  const calculateProgress = (release: CellRelease): ReleaseProgress | null => {
    const byRel = progressByReleaseId.get(release.id);
    const byVer = release.jira_version_id ? progressByVersion.get(release.jira_version_id) : undefined;
    // Prefer whichever source has non-zero total. vw_ph_release_progress
    // returns zero-count rows for releases not yet linked to ph_issues —
    // fall through to the legacy jira_version_id view in that case.
    const relTotal = (byRel?.total_items ?? 0);
    const verTotal = (byVer?.total ?? 0);
    const src = relTotal > 0 ? byRel : verTotal > 0 ? byVer : (byRel ?? byVer);

    if (src) {
      const done = pickNum(src, 'done_items', 'done', 'done_count');
      const inProgress =
        pickNum(src, 'in_progress_items', 'in_progress', 'in_progress_count') +
        pickNum(src, 'in_review_items', 'in_review') +
        pickNum(src, 'blocked_items', 'blocked');
      const total = pickNum(src, 'total_items', 'total', 'total_count') || (done + inProgress);
      const toDo = pickNum(src, 'todo_items', 'todo', 'to_do_items', 'todo_count')
        || Math.max(0, total - done - inProgress);

      if (total > 0) {
        return {
          done,
          inProgress,
          toDo,
          total,
          donePercent: (done / total) * 100,
          inProgressPercent: (inProgress / total) * 100,
        };
      }
    }
    return null;
  };

  const navigate = useNavigate();
  const handleOpenDetail = (releaseId: string) => {
    const rel = releases.find((r: any) => r.id === releaseId || r.slug === releaseId);
    navigate(`/release-hub/releases-management/${(rel as any)?.slug ?? releaseId}`);
  };

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
            {
              id: 'toggle-released',
              icon: isStatusVisible('released') ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />,
              label: isStatusVisible('released') ? 'Hide released' : 'Show released',
              onClick: () => toggleStatusVisibility('released'),
            },
            {
              id: 'toggle-unreleased',
              icon: isStatusVisible('unreleased') ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />,
              label: isStatusVisible('unreleased') ? 'Hide unreleased' : 'Show unreleased',
              onClick: () => toggleStatusVisibility('unreleased'),
            },
            {
              id: 'toggle-archived',
              icon: isStatusVisible('archived') ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />,
              label: isStatusVisible('archived') ? 'Hide archived' : 'Show archived',
              onClick: () => toggleStatusVisibility('archived'),
            },
          ],
        },
        {
          items: [
            {
              id: 'expand-all',
              icon: <AkExpandVerticalIcon label="" size="small" />,
              label: 'Expand all groups',
              onClick: () => setCollapsedGroups(new Set()),
            },
            {
              id: 'collapse-all',
              icon: <AkCollapseVerticalIcon label="" size="small" />,
              label: 'Collapse all groups',
              onClick: () =>
                setCollapsedGroups(grouped ? new Set(grouped.map((g) => g.id)) : new Set()),
            },
          ],
        },
        {
          items: [
            {
              id: 'density-compact',
              label: density === 'compact' ? '✓ Compact' : 'Compact',
              onClick: () => setDensity('compact'),
            },
            {
              id: 'density-comfortable',
              label: density === 'comfortable' ? '✓ Comfortable' : 'Comfortable',
              onClick: () => setDensity('comfortable'),
            },
          ],
        },
      ]}
    />
  );

  const projectId = projectRow?.id || releases[0]?.project_id || '';

  if (isLoading) return <div style={{ padding: '24px' }}>Loading releases…</div>;
  if (error) return <div style={{ padding: '24px' }}>Error loading releases</div>;

  const releaseCount = releases.filter((r) => productProjectIds.has(r.project_id)).length;

  const toolbarCustomActions = (
    <>
      <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      <ProductFilter
        options={productOptions}
        value={productFilter}
        onChange={setProductFilter}
      />
      <GroupFilter value={groupBy} onChange={setGroupBy} />
      {toolbarViewOptionsButton}
    </>
  );

  return (
    <CatalystListPageLayout
      chromeBand={
        isGlobalReleaseHub ? (
          <ProjectPageHeader hubType="release" />
        ) : (
          <ProjectPageHeader hubType="project" projectKey={projectKey} />
        )
      }
      search={search}
      searchPlaceholder="Search releases"
      onSearchChange={(v) => setSearch(v)}
      toolbarActions={toolbarCustomActions}
      tabBarActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            appearance="subtle"
            iconBefore={(iconProps) => <FeedbackIcon {...iconProps} label="" />}
            onClick={() => setIsFeedbackModalOpen(true)}
          >
            Give feedback
          </Button>
          <Button appearance="primary" onClick={() => setIsCreateModalOpen(true)}>
            Create release
          </Button>
        </div>
      }
      footer={`This space has ${releaseCount} release${releaseCount === 1 ? '' : 's'}`}
    >
      {filtered.length > 0 ? (
        <ReleasesTable
          rows={grouped ? undefined : filtered}
          groups={grouped ?? undefined}
          calculateProgress={calculateProgress}
          onOpenDetail={handleOpenDetail}
          onRelease={(r) => { setConfirmingRelease(r); setIsConfirmModalOpen(true); }}
          onArchive={(r) => { setArchivingRelease(r); setIsArchiveDialogOpen(true); }}
          onMerge={(r) => { setMergingRelease(r); setIsMergeDialogOpen(true); }}
          onEdit={(r) => { setEditingRelease(r); setIsCreateModalOpen(true); }}
          onDelete={(r) => { setDeletingRelease(r); setIsDeleteDialogOpen(true); }}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          density={density}
        />
      ) : (
        <EmptyState
          header="No releases here yet"
          description="Track what ships and when — plan scope, sign-offs, and readiness in one place."
          primaryAction={
            <Button appearance="primary" onClick={() => setIsCreateModalOpen(true)}>
              Create release
            </Button>
          }
        />
      )}

      <ReleaseCreateModal
        isOpen={isCreateModalOpen}
        projectKey={projectKey}
        projectId={projectId}
        editingRelease={editingRelease as any}
        onClose={() => { setIsCreateModalOpen(false); setEditingRelease(null); }}
        onSuccess={(release: any) =>
          catalystFlag.success(
            editingRelease
              ? `Release "${release.name}" has been updated.`
              : `Release "${release.name}" has been created.`,
          )
        }
      />

      {archivingRelease && (
        <ReleaseArchiveDialog
          isOpen={isArchiveDialogOpen}
          release={archivingRelease as any}
          projectKey={projectKey}
          onClose={() => { setIsArchiveDialogOpen(false); setArchivingRelease(null); }}
          onSuccess={() => catalystFlag.success(`Release "${archivingRelease.name}" has been archived.`)}
        />
      )}

      {confirmingRelease && (
        <ReleaseConfirmationModal
          isOpen={isConfirmModalOpen}
          release={confirmingRelease as any}
          projectKey={projectKey}
          onClose={() => { setIsConfirmModalOpen(false); setConfirmingRelease(null); }}
          onSuccess={(release: any) => catalystFlag.success(`Release "${release.name}" published.`)}
        />
      )}

      {deletingRelease && (
        <ReleaseDeleteDialog
          isOpen={isDeleteDialogOpen}
          release={deletingRelease as any}
          projectKey={projectKey}
          onClose={() => { setIsDeleteDialogOpen(false); setDeletingRelease(null); }}
          onSuccess={() => catalystFlag.success(`Release "${deletingRelease.name}" has been deleted.`)}
        />
      )}

      <ShareFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      {mergingRelease && (
        <ReleaseMergeDialog
          isOpen={isMergeDialogOpen}
          release={mergingRelease as any}
          projectKey={projectKey}
          onClose={() => { setIsMergeDialogOpen(false); setMergingRelease(null); }}
        />
      )}

      {mergingRelease && (
        <ReleaseMergeDialog
          isOpen={isMergeDialogOpen}
          release={mergingRelease as any}
          projectKey={projectKey}
          onClose={() => { setIsMergeDialogOpen(false); setMergingRelease(null); }}
          onSuccess={() => setSuccessFlag(`Release "${mergingRelease.name}" has been merged.`)}
        />
      )}
    </CatalystListPageLayout>
  );
}

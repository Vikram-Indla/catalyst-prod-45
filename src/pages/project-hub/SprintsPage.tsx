/**
 * SprintsPage — /project-hub/:key/sprints.
 *
 * 2026-06-26: Phase 1 (MVP) — list + create flow. Mounts the canonical
 * `ReleasesTable` directly with a Project (not Product) scope picker and
 * a sprint-aware create modal. Per CLAUDE.md "ADOPT CANONICAL — DO NOT
 * REIMPLEMENT" the table renders the exact UI as /release-hub/releases-
 * management; only labels + data source differ via EntityConfig.
 *
 * Phase 2 (next): Edit / Archive / Merge / Release / Delete modals; detail
 * page + work navigator (config-driven refactor of ReleaseDetailPage +
 * ReleaseWorkNavigatorPage). Action buttons wired to a "coming next" flag
 * until then.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import AkFilterIcon from '@atlaskit/icon/core/filter';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { CatalystListPageLayout } from '@/components/shared/CatalystListPage';
import AkEyeOpenIcon from '@atlaskit/icon/core/eye-open';
import AkEyeOpenStrikethroughIcon from '@atlaskit/icon/core/eye-open-strikethrough';
import AkExpandVerticalIcon from '@atlaskit/icon/core/expand-vertical';
import AkCollapseVerticalIcon from '@atlaskit/icon/core/collapse-vertical';
import { ToolbarMenuButton } from '@/components/shared/JiraTable';
import { useQuery } from '@tanstack/react-query';
import { catalystFlag } from '@/lib/catalystFlag';
import { supabase } from '@/integrations/supabase/client';
import { useEntities, useEntityProgress } from '@/hooks/workhub/useEntities';
import { SPRINT_CONFIG } from '@/lib/entity-hub/config';
import type { ReleaseStatus } from '@/types/phase3-releases';
import { SprintsTable } from '@/components/sprints/SprintsTable';
import type { SprintRow, SprintProgress } from '@/components/sprints/cells';
import { SprintCreateModal } from '@/components/sprints/SprintCreateModal';
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

// S1.1a: rows carry the RAW native status vocabulary (SprintsTable renders
// honest pills). The bucket map survives only for the legacy 3-value
// StatusFilter / view-option toggles until S1.1b rebuilds the toolbar.
import { sprintStatusToReleaseBucket, SPRINT_STATUS_LABEL, isSprintStatus } from '@/lib/sprints/sprintStatus';

function toCellStatus(s: string | null | undefined): ReleaseStatus {
  return sprintStatusToReleaseBucket(s);
}

type CellSprint = SprintRow;

export function SprintsPage() {
  const { key } = useParams<{ key?: string }>();
  const projectKey = key || 'BAU';
  const navigate = useNavigate();

  const { data: rawSprints, isLoading, error } = useEntities(SPRINT_CONFIG);
  const { data: sprintProgressRows } = useEntityProgress(SPRINT_CONFIG);

  // project_id for the Create modal
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
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupValue>('none');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Project picker: PROJECTS ONLY — explicitly excludes products (sprint
  // belongs to a project, never a product). Filter = ph_projects MINUS
  // any row whose key matches an active products.code, MINUS the
  // hardcoded admin keys (TH-DEFAULT, MDT) per useProjectHub.ts:37.
  const { data: projectsRaw } = useQuery({
    queryKey: ['ph-projects-only-for-sprint-filter'],
    queryFn: async () => {
      const [{ data: projects, error: pErr }, { data: prods, error: prErr }] = await Promise.all([
        supabase.from('ph_projects').select('id, key, name').order('name'),
        (supabase as any).from('products').select('code').eq('is_active', true),
      ]);
      if (pErr) throw new Error(pErr.message);
      if (prErr) throw new Error(prErr.message);
      const excludedKeys = new Set<string>([
        'TH-DEFAULT',
        'MDT',
        ...((prods ?? []).map((p: any) => p.code) as string[]),
      ]);
      return (projects ?? []).filter((p: any) => !excludedKeys.has(p.key)) as Array<{
        id: string; key: string; name: string;
      }>;
    },
    staleTime: 5 * 60_000,
  });

  const projectOptions: ProductOption[] = useMemo(
    () => (projectsRaw ?? []).map((p) => ({ id: p.id, name: p.name, tag: p.key })),
    [projectsRaw],
  );

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<CellSprint | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archivingSprint, setArchivingSprint] = useState<CellSprint | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [mergingSprint, setMergingSprint] = useState<CellSprint | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmingSprint, setConfirmingSprint] = useState<CellSprint | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSprint, setDeletingSprint] = useState<CellSprint | null>(null);

  const sprints = useMemo<CellSprint[]>(() => {
    return (rawSprints ?? [])
      .map((r: any): SprintRow => ({
        id: r.id,
        slug: r.slug ?? null,
        project_id: r.project_id,
        name: r.name,
        description: r.description ?? null,
        start_date: r.start_date ?? null,
        end_date: r.end_date ?? null,
        release_date: r.release_date ?? null,
        status: r.status ?? null,
        length_weeks: r.length_weeks ?? null,
        created_by: r.created_by ?? null,
      }))
      .sort((a, b) => {
        const ea = a.end_date ?? a.release_date;
        const eb = b.end_date ?? b.release_date;
        const da = ea ? new Date(ea).getTime() : 0;
        const db = eb ? new Date(eb).getTime() : 0;
        return db - da;
      });
  }, [rawSprints]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sprints.filter((r) => {
      const matchesSearch = (r.name ?? '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(toCellStatus(r.status));
      const matchesProject = projectFilter.length === 0 || projectFilter.includes(r.project_id);
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [sprints, search, statusFilter, projectFilter]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return null;
    const projectNameById = new Map(projectOptions.map((p) => [p.id, p.name]));
    const buckets = new Map<string, CellSprint[]>();
    const keyFor = (r: CellSprint): string => {
      switch (groupBy) {
        case 'status':       return isSprintStatus(r.status) ? SPRINT_STATUS_LABEL[r.status] : '— No status —';
        case 'product':      return projectNameById.get(r.project_id) ?? '— No project —';
        case 'release_date': return r.release_date ? new Date(r.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '— No release date —';
        case 'start_date':   return r.start_date  ? new Date(r.start_date ).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '— No start date —';
        default:             return '';
      }
    };
    filtered.forEach((r) => {
      const k = keyFor(r);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(r);
    });
    return Array.from(buckets.entries()).map(([label, rows]) => ({ id: label, label, rows }));
  }, [filtered, groupBy, projectOptions]);

  const progressBySprintId = useMemo(() => {
    const m = new Map<string, any>();
    (sprintProgressRows ?? []).forEach((p: any) => m.set(p.id, p));
    return m;
  }, [sprintProgressRows]);

  const pickNum = (obj: any, ...keys: string[]): number => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
    }
    return 0;
  };

  const calculateProgress = (sprint: CellSprint): SprintProgress | null => {
    const src = progressBySprintId.get(sprint.id);
    if (!src) return null;
    const done = pickNum(src, 'done_items', 'done');
    const inProgress =
      pickNum(src, 'in_progress_items', 'in_progress') +
      pickNum(src, 'in_review_items', 'in_review') +
      pickNum(src, 'blocked_items', 'blocked');
    const total = pickNum(src, 'total_items', 'total') || (done + inProgress);
    const toDo = pickNum(src, 'todo_items', 'todo')
      || Math.max(0, total - done - inProgress);
    if (total === 0) return null;
    return {
      done,
      inProgress,
      toDo,
      total,
      donePercent: (done / total) * 100,
      inProgressPercent: (inProgress / total) * 100,
    };
  };

  const handleOpenDetail = (row: CellSprint) => {
    // Slug contract: slug is guaranteed on ph_jira_sprints (S0.1a trigger).
    navigate(SPRINT_CONFIG.buildDetailHref(row.slug ?? row.id, { projectKey }));
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
            { id: 'toggle-released',   icon: isStatusVisible('released')   ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />, label: isStatusVisible('released')   ? 'Hide released'   : 'Show released',   onClick: () => toggleStatusVisibility('released') },
            { id: 'toggle-unreleased', icon: isStatusVisible('unreleased') ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />, label: isStatusVisible('unreleased') ? 'Hide unreleased' : 'Show unreleased', onClick: () => toggleStatusVisibility('unreleased') },
            { id: 'toggle-archived',   icon: isStatusVisible('archived')   ? <AkEyeOpenStrikethroughIcon label="" size="small" /> : <AkEyeOpenIcon label="" size="small" />, label: isStatusVisible('archived')   ? 'Hide archived'   : 'Show archived',   onClick: () => toggleStatusVisibility('archived') },
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

  const projectId = projectRow?.id || sprints[0]?.project_id || '';

  if (isLoading) return <div style={{ padding: '24px' }}>Loading sprints…</div>;
  if (error)     return <div style={{ padding: '24px' }}>Error loading sprints</div>;

  const toolbarCustomActions = (
    <>
      <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      <ProductFilter
        options={projectOptions}
        value={projectFilter}
        onChange={setProjectFilter}
        label="Project"
        placeholder="Search projects"
      />
      <GroupFilter value={groupBy} onChange={setGroupBy} />
      {toolbarViewOptionsButton}
    </>
  );

  return (
    <CatalystListPageLayout
      chromeBand={
        <ProjectPageHeader hubType="project" projectKey={projectKey} />
      }
      search={search}
      searchPlaceholder="Search sprints"
      onSearchChange={(v) => setSearch(v)}
      toolbarActions={toolbarCustomActions}
      tabBarActions={
        <Button appearance="primary" onClick={() => setIsCreateModalOpen(true)}>
          Create sprint
        </Button>
      }
      footer={`This space has ${sprints.length} sprint${sprints.length === 1 ? '' : 's'}`}
    >
      {filtered.length > 0 ? (
        <SprintsTable
          rows={grouped ? undefined : filtered}
          groups={grouped ?? undefined}
          getProgress={calculateProgress}
          onOpenDetail={handleOpenDetail}
          actions={{
            onComplete: (r) => { setConfirmingSprint(r); setIsConfirmModalOpen(true); },
            onArchive:  (r) => { setArchivingSprint(r); setIsArchiveDialogOpen(true); },
            onMerge:    (r) => { setMergingSprint(r); setIsMergeDialogOpen(true); },
            onEdit:     (r) => { setEditingSprint(r); setIsCreateModalOpen(true); },
            onDelete:   (r) => { setDeletingSprint(r); setIsDeleteDialogOpen(true); },
          }}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          density={density}
          isLoading={isLoading}
        />
      ) : (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ds-text-subtlest)' }}>
          No sprints match this filter.
        </div>
      )}

      <SprintCreateModal
        isOpen={isCreateModalOpen}
        projectKey={projectKey}
        projectId={projectId}
        projectOptions={projectOptions}
        editingSprint={editingSprint}
        onClose={() => { setIsCreateModalOpen(false); setEditingSprint(null); }}
        onSuccess={(sprint: any) =>
          catalystFlag.success(
            editingSprint
              ? `Sprint "${sprint.name}" has been updated.`
              : `Sprint "${sprint.name}" has been created.`,
          )
        }
      />

      {archivingSprint && (
        <ReleaseArchiveDialog
          isOpen={isArchiveDialogOpen}
          release={archivingSprint as any}
          projectKey={projectKey}
          onClose={() => { setIsArchiveDialogOpen(false); setArchivingSprint(null); }}
          onSuccess={() => catalystFlag.success(`Sprint "${archivingSprint.name}" has been archived.`)}
          config={SPRINT_CONFIG}
        />
      )}

      {confirmingSprint && (
        <ReleaseConfirmationModal
          isOpen={isConfirmModalOpen}
          release={confirmingSprint as any}
          projectKey={projectKey}
          onClose={() => { setIsConfirmModalOpen(false); setConfirmingSprint(null); }}
          onSuccess={(sprint: any) => catalystFlag.success(`Sprint "${sprint.name}" completed.`)}
          config={SPRINT_CONFIG}
        />
      )}

      {deletingSprint && (
        <ReleaseDeleteDialog
          isOpen={isDeleteDialogOpen}
          release={deletingSprint as any}
          projectKey={projectKey}
          onClose={() => { setIsDeleteDialogOpen(false); setDeletingSprint(null); }}
          onSuccess={() => catalystFlag.success(`Sprint "${deletingSprint.name}" has been deleted.`)}
          config={SPRINT_CONFIG}
        />
      )}

      {mergingSprint && (
        <ReleaseMergeDialog
          isOpen={isMergeDialogOpen}
          release={mergingSprint as any}
          projectKey={projectKey}
          onClose={() => { setIsMergeDialogOpen(false); setMergingSprint(null); }}
          onSuccess={() => catalystFlag.success(`Sprint "${mergingSprint.name}" has been merged.`)}
          config={SPRINT_CONFIG}
        />
      )}
    </CatalystListPageLayout>
  );
}

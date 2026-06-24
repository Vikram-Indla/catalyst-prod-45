import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import TextField from '@atlaskit/textfield';
import Flag from '@atlaskit/flag';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWHReleases } from '@/hooks/workhub/useReleases';
import { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';
import { JiraTable } from '@/components/shared/JiraTable';
import { ReleaseCreateModal } from '@/components/releases/ReleaseCreateModal';
import { ReleaseEditModal } from '@/components/releases/ReleaseEditModal';
import { ReleaseArchiveDialog } from '@/components/releases/ReleaseArchiveDialog';
import { ReleaseConfirmationModal } from '@/components/releases/ReleaseConfirmationModal';
import { ReleaseDeleteDialog } from '@/components/releases/ReleaseDeleteDialog';
import {
  makeReleaseNameCell,
  makeStatusCell,
  makeProgressCell,
  makeStartDateCell,
  makeReleaseDateCell,
  makeDescriptionCell,
  makeActionsCell,
} from '@/components/releases/cells';
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

  const { data: rawReleases, isLoading, error } = useWHReleases();

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
  const [statusFilter, setStatusFilter] = useState<StatusValue[]>(['unreleased']);
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupValue>('none');
  const [successFlag, setSuccessFlag] = useState<string | null>(null);

  // Products = ph_projects (releases live under projects in this schema)
  const { data: productsRaw } = useQuery({
    queryKey: ['ph-projects-for-release-filter'],
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

  const productOptions: ProductOption[] = useMemo(
    () => (productsRaw ?? []).map((p) => ({ id: p.id, name: p.name, tag: p.key })),
    [productsRaw],
  );

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<CellRelease | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archivingRelease, setArchivingRelease] = useState<CellRelease | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmingRelease, setConfirmingRelease] = useState<CellRelease | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRelease, setDeletingRelease] = useState<CellRelease | null>(null);

  const progressByVersion = useMemo(() => {
    const m = new Map<string, ProgressRow>();
    (progressRows ?? []).forEach((p) => m.set(p.version_id, p));
    return m;
  }, [progressRows]);

  // Adapt DB rows -> the shape the cells/modals expect, newest release first
  const releases = useMemo<CellRelease[]>(() => {
    return (rawReleases ?? [])
      .map((r: any) => ({
        id: r.id,
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
      }))
      .sort((a, b) => {
        const da = a.release_date ? new Date(a.release_date).getTime() : 0;
        const db = b.release_date ? new Date(b.release_date).getTime() : 0;
        return db - da;
      });
  }, [rawReleases]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return releases.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(q);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(r.status);
      const matchesProduct = productFilter.length === 0 || productFilter.includes(r.project_id);
      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [releases, search, statusFilter, productFilter]);

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

  const calculateProgress = (release: CellRelease): ReleaseProgress | null => {
    const p = release.jira_version_id ? progressByVersion.get(release.jira_version_id) : undefined;
    if (!p || !p.total) return null;
    return {
      done: p.done,
      inProgress: p.in_progress,
      toDo: p.todo,
      total: p.total,
      donePercent: p.done_percent,
      inProgressPercent: p.in_progress_percent,
    };
  };

  const handleOpenDetail = (releaseId: string) => {
    // Detail route TBD — no-op until /release-hub/releases/:id lands
    console.log('Open release detail:', releaseId);
  };

  const columns = [
    makeReleaseNameCell((r) => r.name, handleOpenDetail),
    makeStatusCell(),
    makeProgressCell(calculateProgress),
    makeStartDateCell(),
    makeReleaseDateCell(),
    makeDescriptionCell(),
    makeActionsCell(
      (r) => { setEditingRelease(r); setIsEditModalOpen(true); },
      (r) => { setArchivingRelease(r); setIsArchiveDialogOpen(true); },
      (r) => { setConfirmingRelease(r); setIsConfirmModalOpen(true); },
      (r) => { setDeletingRelease(r); setIsDeleteDialogOpen(true); },
    ),
  ];

  const projectId = projectRow?.id || releases[0]?.project_id || '';

  if (isLoading) return <div style={{ padding: '24px' }}>Loading releases…</div>;
  if (error) return <div style={{ padding: '24px' }}>Error loading releases</div>;

  return (
    <div style={{ padding: '24px' }}>
      {successFlag && (
        <Flag
          appearance="success"
          icon={<span />}
          onDismissed={() => setSuccessFlag(null)}
          title={successFlag}
          description=""
          id="release-success"
        />
      )}

      {/* Header: title + release count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--ds-font-size-400, 24px)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--ds-text, #292A2E)',
          }}
        >
          Releases
        </h1>
        <span style={{ fontSize: '14px', color: 'var(--ds-text-subtle, #505258)' }}>
          This space has {releases.length} releases
        </span>
      </div>

      {/* Toolbar: search + filters + give feedback + create */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ width: '240px' }}>
          <TextField
            placeholder="Search releases"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            isCompact
          />
        </div>
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        <ProductFilter
          options={productOptions}
          value={productFilter}
          onChange={setProductFilter}
        />
        <GroupFilter value={groupBy} onChange={setGroupBy} />
        <div style={{ flex: 1 }} />
        <Button appearance="subtle">
          Give feedback
        </Button>
        <Button appearance="primary" onClick={() => setIsCreateModalOpen(true)}>
          Create release
        </Button>
      </div>

      {/* Flat releases table (matches Jira; no collapsible sections) */}
      {filtered.length > 0 ? (
        grouped ? (
          <JiraTable groups={grouped} columns={columns} getRowId={(r) => r.id} />
        ) : (
          <JiraTable data={filtered} columns={columns} getRowId={(r) => r.id} />
        )
      ) : (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--ds-text-subtlest, #6B778C)',
          }}
        >
          No releases match this filter.
        </div>
      )}

      <ReleaseCreateModal
        isOpen={isCreateModalOpen}
        projectKey={projectKey}
        projectId={projectId}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(release: any) => setSuccessFlag(`Release "${release.name}" has been created.`)}
      />

      {editingRelease && (
        <ReleaseEditModal
          isOpen={isEditModalOpen}
          projectKey={projectKey}
          release={editingRelease as any}
          onClose={() => { setIsEditModalOpen(false); setEditingRelease(null); }}
          onSuccess={(release: any) => setSuccessFlag(`Release "${release.name}" has been updated.`)}
        />
      )}

      {archivingRelease && (
        <ReleaseArchiveDialog
          isOpen={isArchiveDialogOpen}
          release={archivingRelease as any}
          projectKey={projectKey}
          onClose={() => { setIsArchiveDialogOpen(false); setArchivingRelease(null); }}
          onSuccess={() => setSuccessFlag(`Release "${archivingRelease.name}" has been archived.`)}
        />
      )}

      {confirmingRelease && (
        <ReleaseConfirmationModal
          isOpen={isConfirmModalOpen}
          release={confirmingRelease as any}
          projectKey={projectKey}
          onClose={() => { setIsConfirmModalOpen(false); setConfirmingRelease(null); }}
          onSuccess={(release: any) => setSuccessFlag(`Release "${release.name}" published.`)}
        />
      )}

      {deletingRelease && (
        <ReleaseDeleteDialog
          isOpen={isDeleteDialogOpen}
          release={deletingRelease as any}
          projectKey={projectKey}
          onClose={() => { setIsDeleteDialogOpen(false); setDeletingRelease(null); }}
          onSuccess={() => setSuccessFlag(`Release "${deletingRelease.name}" has been deleted.`)}
        />
      )}
    </div>
  );
}

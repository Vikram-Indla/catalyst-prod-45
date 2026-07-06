/**
 * WikiHomePage — the FOLIO DOCUMENT HUB (CAT-DOCEX-DB-COEDIT-20260705-001,
 * design-critique F1/F2 2026-07-06). Canonical-only toolbar: @atlaskit/tabs,
 * ads Textfield search, ads Select filters — no native selects, no
 * hand-rolled tabs. Full-page-width JiraTable with Folio-icon keys and a
 * Parent column (linked story/epic/BR via kb_document_links).
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import { Search } from '@/lib/atlaskit-icons';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, Lozenge, Select, Textfield, type SelectOption } from '@/components/ads';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/hooks/useAuth';
import { useWikiWorkspaces, useCreateWikiPage } from '@/hooks/useWiki';
import { importDocumentFile } from '@/components/wiki-hub/editor/importDoc';
import { catalystToast } from '@/lib/catalystToast';
import { HUB_ICON_REGISTRY } from '@/components/icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const db = supabase as unknown as { from: (t: string) => any };

interface DocRow {
  id: string;
  space_id: string;
  title: string;
  slug: string;
  icon: string | null;
  doc_key: string | null;
  created_by: string | null;
  published_at: string | null;
  updated_at: string;
  /** First linked work item (story/epic/BR) — key + REAL issue type. */
  parent_key: string | null;
  parent_type: string | null;
}

function relativeTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function WikiHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: workspaces } = useWikiWorkspaces();
  const createPage = useCreateWikiPage();

  const [tab, setTab] = useState(0); // 0 = All Docs, 1 = My Docs
  const [search, setSearch] = useState('');
  const [wsFilter, setWsFilter] = useState<SelectOption | null>(null);
  const [statusFilter, setStatusFilter] = useState<SelectOption | null>(null);
  const [sortKey, setSortKey] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docex', 'all-docs'],
    // Global staleTime is 15 min + persisted — the hub must reflect renames
    // and new docs immediately (same trap as the slug-reuse phantom writes).
    staleTime: 0,
    queryFn: async (): Promise<DocRow[]> => {
      const { data, error } = await db
        .from('kb_documents')
        .select('id, space_id, title, slug, icon, doc_key, created_by, published_at, updated_at')
        .eq('is_template', false)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as DocRow[];
      if (rows.length === 0) return rows;

      // Parent traceability: first linked work item per doc → display key.
      const { data: links } = await db
        .from('kb_document_links')
        .select('document_id, entity_type, entity_id')
        .in('document_id', rows.map((r) => r.id));
      const linkList = (links ?? []) as Array<{ document_id: string; entity_type: string; entity_id: string }>;
      const issueIds = linkList.filter((l) => l.entity_type !== 'business_request').map((l) => l.entity_id);
      const brIds = linkList.filter((l) => l.entity_type === 'business_request').map((l) => l.entity_id);
      const [issues, brs] = await Promise.all([
        issueIds.length
          ? db.from('ph_issues').select('id, issue_key, issue_type').in('id', issueIds)
          : Promise.resolve({ data: [] }),
        brIds.length
          ? db.from('business_requests').select('id, request_key').in('id', brIds)
          : Promise.resolve({ data: [] }),
      ]);
      const byEntity = new Map<string, { key: string; type: string }>();
      for (const i of (issues.data ?? []) as Array<{ id: string; issue_key: string; issue_type: string | null }>)
        byEntity.set(String(i.id), { key: i.issue_key, type: i.issue_type ?? '' });
      for (const b of (brs.data ?? []) as Array<{ id: string; request_key: string }>)
        byEntity.set(String(b.id), { key: b.request_key, type: 'Business Request' });
      const parentByDoc = new Map<string, { key: string; type: string }>();
      for (const l of linkList) {
        const hit = byEntity.get(String(l.entity_id));
        if (hit && !parentByDoc.has(l.document_id)) parentByDoc.set(l.document_id, hit);
      }
      return rows.map((r) => ({
        ...r,
        parent_key: parentByDoc.get(r.id)?.key ?? null,
        parent_type: parentByDoc.get(r.id)?.type ?? null,
      }));
    },
  });

  const wsById = useMemo(() => new Map((workspaces ?? []).map((w) => [w.id, w])), [workspaces]);
  const wsOptions: SelectOption[] = useMemo(
    () => (workspaces ?? []).map((w) => ({ label: w.name, value: w.id })),
    [workspaces],
  );
  const statusOptions: SelectOption[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
  ];

  const rows = useMemo(() => {
    let list = docs ?? [];
    if (tab === 1 && user?.id) list = list.filter((d) => d.created_by === user.id);
    if (wsFilter) list = list.filter((d) => d.space_id === wsFilter.value);
    if (statusFilter) {
      list = list.filter((d) => (statusFilter.value === 'published' ? !!d.published_at : !d.published_at));
    }
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        (d) =>
          (d.title || '').toLowerCase().includes(q) ||
          (d.doc_key || '').toLowerCase().includes(q) ||
          (d.parent_key || '').toLowerCase().includes(q),
      );
    const dir = sortOrder === 'ASC' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '') * dir;
      if (sortKey === 'doc_key')
        return ((parseInt(a.doc_key?.slice(4) ?? '0', 10) || 0) - (parseInt(b.doc_key?.slice(4) ?? '0', 10) || 0)) * dir;
      if (sortKey === 'parent_key') return (a.parent_key ?? '').localeCompare(b.parent_key ?? '') * dir;
      if (sortKey === 'workspace')
        return (wsById.get(a.space_id)?.name ?? '').localeCompare(wsById.get(b.space_id)?.name ?? '') * dir;
      return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
    });
  }, [docs, tab, user?.id, wsFilter, statusFilter, search, sortKey, sortOrder, wsById]);

  const openDoc = (d: DocRow) => {
    const ws = wsById.get(d.space_id);
    if (ws) navigate(Routes.folio.page(ws.slug, d.slug));
  };

  const createIn = (spaceId: string) => {
    const ws = wsById.get(spaceId);
    if (!ws) return;
    createPage.mutate(
      { spaceId, title: 'Untitled' },
      { onSuccess: (created) => navigate(Routes.folio.page(ws.slug, created.slug)) },
    );
  };

  // Import Word/PDF → converted (and translated) Folio page (V5).
  const importInputRef = useRef<HTMLInputElement>(null);
  const importTargetWs = useRef<string | null>(null);
  const [importing, setImporting] = useState(false);
  const onImportFile = async (files: FileList | null) => {
    const file = files?.[0];
    const ws = importTargetWs.current ? wsById.get(importTargetWs.current) : null;
    if (importInputRef.current) importInputRef.current.value = '';
    if (!file || !ws) return;
    setImporting(true);
    try {
      const imported = await importDocumentFile(file);
      createPage.mutate(
        { spaceId: ws.id, title: imported.title, content: imported.blocks as never },
        {
          onSuccess: (created) => {
            catalystToast.success(
              imported.sourceLang !== 'en' ? `Imported and translated (${imported.sourceLang} → en)` : 'Imported',
            );
            navigate(Routes.folio.page(ws.slug, created.slug));
          },
          onSettled: () => setImporting(false),
        },
      );
    } catch (e) {
      setImporting(false);
      catalystToast.error(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const columns: Column<DocRow>[] = useMemo(
    () => [
      {
        id: 'title',
        label: 'Doc name',
        flex: true,
        sortable: true,
        alwaysVisible: true,
        cell: ({ row }) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span aria-hidden>{row.icon || '📄'}</span>
            <span
              dir="auto"
              style={{
                color: 'var(--ds-text)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.title || 'Untitled'}
            </span>
          </span>
        ),
      },
      {
        id: 'doc_key',
        label: 'Key',
        width: 9,
        sortable: true,
        cell: ({ row }) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <img src={HUB_ICON_REGISTRY.docex} alt="" width={14} height={14} style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtle)' }}>
              {row.doc_key ?? '—'}
            </span>
          </span>
        ),
      },
      {
        id: 'parent_key',
        label: 'Parent',
        width: 10,
        sortable: true,
        cell: ({ row }) =>
          row.parent_key ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {row.parent_type ? <JiraIssueTypeIcon type={row.parent_type} size={16} /> : null}
              <span style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>
                {row.parent_key}
              </span>
            </span>
          ) : (
            <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
          ),
      },
      {
        id: 'workspace',
        label: 'Workspace',
        width: 14,
        sortable: true,
        cell: ({ row }) => (
          <span style={{ color: 'var(--ds-text-subtle)' }}>{wsById.get(row.space_id)?.name ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 9,
        cell: ({ row }) => (
          <Lozenge appearance={row.published_at ? 'success' : 'default'}>
            {row.published_at ? 'Published' : 'Draft'}
          </Lozenge>
        ),
      },
      {
        id: 'updated_at',
        label: 'Updated',
        width: 9,
        sortable: true,
        cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{relativeTime(row.updated_at)}</span>,
      },
    ],
    [wsById],
  );

  return (
    <div style={{ width: '100%', padding: '16px 32px 96px' }}>
      {/* Canonical breadcrumb + H2 header (ProjectPageHeader, 2026-06-14
          directive) — "Folio / Document Hub", same as "IR Platform / Dashboard". */}
      <ProjectPageHeader hubType="folio" paddingX={0} title="Document Hub" />

      {/* Toolbar — Atlaskit tabs · inline search · canonical Select filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Tabs id="folio-hub-scope" selected={tab} onChange={setTab}>
          <TabList>
            <Tab>All Docs</Tab>
            <Tab>My Docs</Tab>
          </TabList>
        </Tabs>
        <div style={{ width: 260 }}>
          <Textfield
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs, DOC-n, or work-item key"
            aria-label="Search docs"
            spacing="compact"
            elemBeforeInput={
              <Search style={{ width: 14, height: 14, color: 'var(--ds-icon-subtle)', marginInlineStart: 8 }} />
            }
          />
        </div>
        <div style={{ width: 180 }}>
          <Select
            options={wsOptions}
            value={wsFilter}
            onChange={setWsFilter}
            placeholder="Workspace"
            isClearable
            aria-label="Filter by workspace"
          />
        </div>
        <div style={{ width: 150 }}>
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
            isClearable
            isSearchable={false}
            aria-label="Filter by status"
          />
        </div>
        <div style={{ flex: 1 }} />
        <input
          ref={importInputRef}
          type="file"
          accept=".pdf,.docx,.doc,application/pdf"
          hidden
          onChange={(e) => onImportFile(e.target.files)}
        />
        <DropdownMenu
          aria-label="Import a document"
          placement="bottom-end"
          shouldRenderToParent={false}
          trigger={() => (
            <button
              type="button"
              disabled={importing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                border: '1px solid var(--ds-border)',
                borderRadius: 6,
                background: 'var(--ds-surface)',
                color: 'var(--ds-text)',
                font: 'var(--ds-font-body)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {importing ? 'Importing…' : 'Import ▾'}
            </button>
          )}
          groups={[
            {
              key: 'import-ws',
              title: 'Import PDF or Word into',
              items: (workspaces ?? []).map((w) => ({
                key: w.id,
                label: w.name,
                onClick: () => {
                  importTargetWs.current = w.id;
                  importInputRef.current?.click();
                },
              })),
            },
          ]}
        />
        <DropdownMenu
          aria-label="Create a document"
          placement="bottom-end"
          shouldRenderToParent={false}
          trigger={() => (
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                border: 'none',
                borderRadius: 6,
                background: 'var(--ds-background-brand-bold)',
                color: 'var(--ds-text-inverse)',
                font: 'var(--ds-font-body)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              New ▾
            </button>
          )}
          groups={[
            {
              key: 'ws',
              title: 'Create in workspace',
              items: (workspaces ?? []).map((w) => ({
                key: w.id,
                label: w.name,
                onClick: () => createIn(w.id),
              })),
            },
          ]}
        />
      </div>

      {/* Document list — canonical JiraTable, full page width */}
      {isLoading ? (
        <Skeleton style={{ height: 320, borderRadius: 8 }} />
      ) : (
        <JiraTable<DocRow>
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          density="comfortable"
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
          onRowClick={openDoc}
          showRowCount
          totalRowCount={rows.length}
          emptyView={
            <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)', padding: 32, margin: 0 }}>
              {search || wsFilter || statusFilter
                ? 'No documents match these filters.'
                : 'No documents yet — create the first one with New.'}
            </p>
          }
        />
      )}
    </div>
  );
}

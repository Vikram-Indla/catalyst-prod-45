/**
 * WikiHomePage — the Docex DOCUMENT HUB (CAT-DOCEX-DB-COEDIT-20260705-001
 * V1, Vikram 2026-07-06). The landing is a document manager, not a
 * workspace card grid: All/My tabs, search, workspace + status filters,
 * sort, and the canonical JiraTable listing every page the user can see.
 * Workspace navigation lives in the hub sidebar.
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from '@/lib/atlaskit-icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, Lozenge } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/hooks/useAuth';
import { useWikiWorkspaces, useCreateWikiPage } from '@/hooks/useWiki';
import { importDocumentFile } from '@/components/wiki-hub/editor/importDoc';
import { catalystToast } from '@/lib/catalystToast';

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

  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [wsFilter, setWsFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'draft' | 'published'>('');
  const [sortKey, setSortKey] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docex', 'all-docs'],
    queryFn: async (): Promise<DocRow[]> => {
      const { data, error } = await db
        .from('kb_documents')
        .select('id, space_id, title, slug, icon, doc_key, created_by, published_at, updated_at')
        .eq('is_template', false)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const wsById = useMemo(() => new Map((workspaces ?? []).map((w) => [w.id, w])), [workspaces]);

  const rows = useMemo(() => {
    let list = docs ?? [];
    if (tab === 'mine' && user?.id) list = list.filter((d) => d.created_by === user.id);
    if (wsFilter) list = list.filter((d) => d.space_id === wsFilter);
    if (statusFilter) {
      list = list.filter((d) => (statusFilter === 'published' ? !!d.published_at : !d.published_at));
    }
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        (d) => (d.title || '').toLowerCase().includes(q) || (d.doc_key || '').toLowerCase().includes(q),
      );
    const dir = sortOrder === 'ASC' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '') * dir;
      if (sortKey === 'workspace')
        return (wsById.get(a.space_id)?.name ?? '').localeCompare(wsById.get(b.space_id)?.name ?? '') * dir;
      return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
    });
  }, [docs, tab, user?.id, wsFilter, statusFilter, search, sortKey, sortOrder, wsById]);

  const openDoc = (d: DocRow) => {
    const ws = wsById.get(d.space_id);
    if (ws) navigate(Routes.docex.page(ws.slug, d.slug));
  };

  const createIn = (spaceId: string) => {
    const ws = wsById.get(spaceId);
    if (!ws) return;
    createPage.mutate(
      { spaceId, title: 'Untitled' },
      { onSuccess: (created) => navigate(Routes.docex.page(ws.slug, created.slug)) },
    );
  };

  // V5 — Import Word/PDF → converted (and translated) Docex page.
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
              imported.sourceLang !== 'en'
                ? `Imported and translated (${imported.sourceLang} → en)`
                : 'Imported',
            );
            navigate(Routes.docex.page(ws.slug, created.slug));
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
        cell: ({ row }) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span aria-hidden>{row.icon || '📄'}</span>
            <span
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
        width: 8,
        cell: ({ row }) => (
          <span style={{ fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtle)' }}>
            {row.doc_key ?? '—'}
          </span>
        ),
      },
      {
        id: 'workspace',
        label: 'Workspace',
        width: 18,
        sortable: true,
        cell: ({ row }) => (
          <span style={{ color: 'var(--ds-text-subtle)' }}>{wsById.get(row.space_id)?.name ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 12,
        cell: ({ row }) => (
          <Lozenge appearance={row.published_at ? 'success' : 'default'}>
            {row.published_at ? 'Published' : 'Draft'}
          </Lozenge>
        ),
      },
      {
        id: 'updated_at',
        label: 'Updated',
        width: 12,
        sortable: true,
        cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{relativeTime(row.updated_at)}</span>,
      },
    ],
    [wsById],
  );

  const tabBtn = (key: 'all' | 'mine', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      style={{
        border: 'none',
        background: tab === key ? 'var(--ds-background-selected)' : 'transparent',
        color: tab === key ? 'var(--ds-text-selected)' : 'var(--ds-text-subtle)',
        font: 'var(--ds-font-body)',
        fontWeight: tab === key ? 600 : 400,
        padding: '6px 12px',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  const selectStyle = {
    font: 'var(--ds-font-body-small)',
    background: 'var(--ds-surface)',
    color: 'var(--ds-text)',
    border: '1px solid var(--ds-border)',
    borderRadius: 6,
    height: 32,
    padding: '0 8px',
  } as const;

  return (
    <div style={{ maxWidth: 1180, margin: 0, padding: '24px 40px 96px' }}>
      <style>{`
        .docex-hub-search { position: relative; width: 260px; }
        .docex-hub-search svg { position: absolute; inset-inline-start: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--ds-icon-subtle); pointer-events: none; }
        .docex-hub-search input { padding-inline-start: 32px; height: 32px; }
      `}</style>

      {/* Hub header — Notion Document Hub shape */}
      <div style={{ marginBottom: 16 }}>
        {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:) */}
        <h1 style={{ font: 'var(--ds-font-heading-xlarge)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ds-text)', margin: 0 }}>
          📄 Document Hub
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>
          Create and collaborate on documents in one place.
        </p>
      </div>

      {/* Toolbar: tabs · search · filters · sort · New */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div role="tablist" aria-label="Document scope" style={{ display: 'flex', gap: 2 }}>
          {tabBtn('all', 'All Docs')}
          {tabBtn('mine', 'My Docs')}
        </div>
        <div className="docex-hub-search">
          <Search />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search docs" aria-label="Search docs" />
        </div>
        <select value={wsFilter} onChange={(e) => setWsFilter(e.target.value)} aria-label="Filter by workspace" style={selectStyle}>
          <option value="">All workspaces</option>
          {(workspaces ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | 'draft' | 'published')}
          aria-label="Filter by status"
          style={selectStyle}
        >
          <option value="">Any status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
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

      {/* Document list — canonical JiraTable */}
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

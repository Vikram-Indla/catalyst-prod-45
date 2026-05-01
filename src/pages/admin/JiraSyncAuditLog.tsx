import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';

/* ── StatusLozenge (immutable spec) ─────────────────────── */
function Lozenge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    success: { bg: '#E3FCEF', text: '#006644' },
    completed: { bg: '#E3FCEF', text: '#006644' },
    error: { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
    failed: { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
    skipped: { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
    abandoned: { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
    processing: { bg: '#DEEBFF', text: '#0747A6' },
    pending: { bg: '#DEEBFF', text: '#0747A6' },
    approved: { bg: '#DEEBFF', text: '#0747A6' },
  };
  const c = map[status] || map.skipped;
  return (
    <span
      className="inline-block whitespace-nowrap"
      style={{
        height: 20, lineHeight: '20px', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        borderRadius: 4, padding: '0 8px', background: c.bg, color: c.text,
      }}
    >
      {status}
    </span>
  );
}

/* ── Shared table helpers ───────────────────────────────── */
const thClass = 'text-left text-[10px] font-semibold uppercase text-[var(--ds-text-subtlest, #64748B)] dark:text-gray-400';
const thStyle = { padding: '10px 12px', height: 50, maxHeight: 50 } as const;
const tdClass = 'text-[var(--ds-text-subtle, #334155)] dark:text-white';
const tdStyle = { padding: '8px 12px', fontSize: 12, height: 50, maxHeight: 50 } as const;
const PAGE_SIZE = 20;

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <tbody>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} style={{ height: 50, maxHeight: 50 }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={tdStyle}><Skeleton className="h-4 w-full" /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function ErrorRow({ cols }: { cols: number }) {
  return (
    <tbody>
      <tr>
        <td colSpan={cols} className="text-center py-8">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400" style={{ fontSize: 13 }}>Failed to load data</span>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

function PaginationBar({ page, setPage, count }: { page: number; setPage: (p: number) => void; count: number }) {
  const start = page * PAGE_SIZE + 1;
  const end = page * PAGE_SIZE + count;
  return (
    <div className="flex items-center justify-between px-4 py-2 text-[var(--ds-text-subtlest, #64748B)] dark:text-gray-400" style={{ fontSize: 12 }}>
      <span>Showing {start}–{end}</span>
      <div className="flex gap-2">
        {page > 0 && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(page - 1)}>
            Prev
          </Button>
        )}
        {count === PAGE_SIZE && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(page + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

function TruncatedCell({ text, max = 40 }: { text: string | null; max?: number }) {
  if (!text) return <span className={tdClass}>—</span>;
  const truncated = text.length > max ? text.substring(0, max) + '…' : text;
  if (text.length <= max) return <span className={tdClass}>{text}</span>;
  return (
    <Tooltip position="top" content={text}>
      <span className={`${tdClass} cursor-help`}>{truncated}</span>
    </Tooltip>
  );
}

/* ══════════════════════════════════════════════════════════
   EXPORTED TAB COMPONENTS — used by JiraIntegrationConfig
   ══════════════════════════════════════════════════════════ */

export function SyncEventsTab() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyFilter, setKeyFilter] = useState('');

  const { data: syncLogs, isLoading, isError } = useQuery({
    queryKey: ['audit-sync-logs', page],
    queryFn: async () => {
      const { data } = await (supabase.from('jira_sync_logs') as any)
        .select('id, event_type, jira_key, status, items_created, items_updated, items_deleted, items_failed, sync_duration_ms, error_message, created_at')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      return (data ?? []) as any[];
    },
  });

  const filteredLogs = useMemo(() => (syncLogs ?? []).filter((l: any) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (keyFilter && !(l.jira_key || '').toLowerCase().includes(keyFilter.toLowerCase())) return false;
    return true;
  }), [syncLogs, statusFilter, keyFilter]);

  return (
      <div className="bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] border border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)] rounded-md overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter by Jira Key"
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value)}
            className="h-9 w-48 text-xs"
          />
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)]">
              {['Time', 'Event Type', 'Jira Key', 'Status', 'Items', 'Duration', 'Error'].map((h) => (
                <th key={h} className={thClass} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          {isLoading ? <SkeletonRows cols={7} /> : isError ? <ErrorRow cols={7} /> : (
            <tbody>
              {filteredLogs.map((log: any) => {
                const items = (log.items_created ?? 0) + (log.items_updated ?? 0) + (log.items_deleted ?? 0);
                return (
                  <tr key={log.id} className="border-b border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)]" style={{ height: 50, maxHeight: 50 }}>
                    <td className={tdClass} style={tdStyle}>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</td>
                    <td className={tdClass} style={tdStyle}>{log.event_type}</td>
                    <td className={tdClass} style={tdStyle}>{log.jira_key || '—'}</td>
                    <td style={tdStyle}><Lozenge status={log.status} /></td>
                    <td className={tdClass} style={tdStyle}>{items}</td>
                    <td className={tdClass} style={tdStyle}>{log.sync_duration_ms != null ? `${log.sync_duration_ms}ms` : '—'}</td>
                    <td style={tdStyle}><TruncatedCell text={log.error_message} /></td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
        {syncLogs && <PaginationBar page={page} setPage={setPage} count={syncLogs.length} />}
      </div>
  );
}

export function WriteBackQueueTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  const { data: queueItems, isLoading, isError } = useQuery({
    queryKey: ['audit-queue', page],
    queryFn: async () => {
      const { data } = await (supabase.from('jira_write_back_queue') as any)
        .select('id, ph_work_item_id, operation, status, retry_count, last_error, created_at, ph_work_items(title)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      return (data ?? []) as any[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('jira_write_back_queue') as any)
        .update({ status: 'approved' })
        .eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-queue'] });
      queryClient.invalidateQueries({ queryKey: ['jira-pending-count'] });
    },
  });

  return (
      <div className="bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] border border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)] rounded-md overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)]">
              {['Work Item', 'Operation', 'Status', 'Retries', 'Last Error', 'Queued', 'Action'].map((h) => (
                <th key={h} className={thClass} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          {isLoading ? <SkeletonRows cols={7} /> : isError ? <ErrorRow cols={7} /> : (
            <tbody>
              {(queueItems ?? []).map((q: any) => (
                <tr key={q.id} className="border-b border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)]" style={{ height: 50, maxHeight: 50 }}>
                  <td className={tdClass} style={tdStyle}>{q.ph_work_items?.title || q.ph_work_item_id}</td>
                  <td style={tdStyle}>
                    <span className="inline-block bg-[var(--ds-surface-sunken, #F1F5F9)] text-[var(--ds-text-subtle, #334155)] dark:bg-[var(--ds-surface-raised, #1A1A1A)] dark:text-gray-300" style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>
                      {q.operation}
                    </span>
                  </td>
                  <td style={tdStyle}><Lozenge status={q.status} /></td>
                  <td className={tdClass} style={tdStyle}>{q.retry_count ?? 0}</td>
                  <td style={tdStyle}><TruncatedCell text={q.last_error} /></td>
                  <td className={tdClass} style={tdStyle}>{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</td>
                  <td style={tdStyle}>
                    {q.status === 'pending' && (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-6 text-xs"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(q.id)}
                      >
                        Approve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {queueItems && <PaginationBar page={page} setPage={setPage} count={queueItems.length} />}
      </div>
  );
}

export function DeletedItemsTab() {
  const [page, setPage] = useState(0);

  const { data: deletedItems, isLoading, isError } = useQuery({
    queryKey: ['audit-deleted', page],
    queryFn: async () => {
      const { data } = await (supabase.from('jira_deleted_items') as any)
        .select('id, jira_key, catalyst_item_key, deleted_at, item_snapshot')
        .order('deleted_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      return (data ?? []) as any[];
    },
  });

  return (
      <div className="bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] border border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)] rounded-md overflow-hidden">
        {!isLoading && !isError && (!deletedItems || deletedItems.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Trash2 size={32} className="text-gray-300 dark:text-gray-600" />
            <span style={{ fontSize: 13 }} className="text-[var(--ds-text-subtlest, #94A3B8)] dark:text-gray-400">No deleted items archived</span>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)]">
                  {['Jira Key', 'Catalyst Key', 'Deleted', 'Snapshot Preview'].map((h) => (
                    <th key={h} className={thClass} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              {isLoading ? <SkeletonRows cols={4} /> : isError ? <ErrorRow cols={4} /> : (
                <tbody>
                  {(deletedItems ?? []).map((d: any) => {
                    const snap = d.item_snapshot ? JSON.stringify(d.item_snapshot) : '';
                    const preview = snap.length > 80 ? snap.substring(0, 80) + '…' : snap;
                    return (
                      <tr key={d.id} className="border-b border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-surface-raised, #1A1A1A)]" style={{ height: 50, maxHeight: 50 }}>
                        <td className={tdClass} style={tdStyle}>{d.jira_key || '—'}</td>
                        <td className={tdClass} style={tdStyle}>{d.catalyst_item_key || '—'}</td>
                        <td className={tdClass} style={tdStyle}>{formatDistanceToNow(new Date(d.deleted_at), { addSuffix: true })}</td>
                        <td style={tdStyle}>
                          {snap ? (
                            <Tooltip position="top" content={snap.substring(0, 300)}>
                              <span className={`${tdClass} cursor-help`} style={{ fontSize: 11 }}>{preview}</span>
                            </Tooltip>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
            {deletedItems && <PaginationBar page={page} setPage={setPage} count={deletedItems.length} />}
          </>
        )}
      </div>
  );
}

/* ── Main Component (standalone page — kept as default export) ── */
export default function JiraSyncAuditLog() {
  return (
    <div className="p-6 space-y-6 dark:bg-[var(--ds-surface, #0A0A0A)] min-h-screen">
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 20, fontWeight: 700 }} className="text-[var(--ds-text, #0F172A)] dark:text-white">
            Jira Sync Audit Log
          </h1>
          <p style={{ fontSize: 13 }} className="text-[var(--ds-text-subtlest, #64748B)] dark:text-gray-400 mt-1">
            Monitor bi-directional sync activity
          </p>
        </div>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Sync Events</TabsTrigger>
          <TabsTrigger value="queue">Write-back Queue</TabsTrigger>
          <TabsTrigger value="deleted">Deleted Items</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="mt-4"><SyncEventsTab /></TabsContent>
        <TabsContent value="queue" className="mt-4"><WriteBackQueueTab /></TabsContent>
        <TabsContent value="deleted" className="mt-4"><DeletedItemsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

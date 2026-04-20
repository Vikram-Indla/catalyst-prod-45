/**
 * JiraActivitySyncPage — Admin monitoring for bidirectional Jira ↔ Catalyst sync activity.
 * Shows last 30 days of sync events: inbound (Jira→Catalyst) and outbound (Catalyst→Jira).
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Search, Filter, Clock, CheckCircle2, XCircle, SkipForward, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Input } from '@/components/ui/input';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Tooltip } from '@/components/ads';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/* ── Types ──────────────────────────────────────────────── */
interface SyncActivity {
  id: string;
  direction: 'inbound' | 'outbound';
  work_item_key: string;
  work_item_type: string | null;
  work_item_title: string | null;
  change_type: string;
  change_summary: string | null;
  changed_fields: Record<string, { from?: string; to?: string }> | null;
  catalyst_changed_at: string | null;
  sync_started_at: string | null;
  sync_completed_at: string | null;
  sync_status: 'pending' | 'syncing' | 'success' | 'failed' | 'skipped';
  sync_source: 'realtime' | 'scheduled' | null;
  attempt_count: number;
  error_message: string | null;
  conflict_detected: boolean;
  conflict_resolution: string | null;
  project_key: string | null;
  actor_name: string | null;
  created_at: string;
}

type DirectionFilter = 'all' | 'inbound' | 'outbound';
type StatusFilter = 'all' | 'pending' | 'syncing' | 'success' | 'failed' | 'skipped';

/* ── Sync status config ─────────────────────────────────── */
const SYNC_STATUS_CFG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending:  { icon: Clock,        color: '#D97706', bg: 'rgba(217,119,6,0.1)',  label: 'PENDING' },
  syncing:  { icon: Loader2,      color: '#2563EB', bg: 'rgba(37,99,235,0.1)',  label: 'SYNCING' },
  success:  { icon: CheckCircle2, color: '#059669', bg: 'rgba(5,150,105,0.1)',  label: 'SUCCESS' },
  failed:   { icon: XCircle,      color: '#DC2626', bg: 'rgba(220,38,38,0.1)',  label: 'FAILED' },
  skipped:  { icon: SkipForward,  color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: 'SKIPPED' },
};

/* ── Direction badge ─────────────────────────────────────── */
function DirectionBadge({ dir }: { dir: 'inbound' | 'outbound' }) {
  const isIn = dir === 'inbound';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.03em',
      background: isIn ? 'rgba(37,99,235,0.08)' : 'rgba(217,119,6,0.08)',
      color: isIn ? '#2563EB' : '#D97706',
    }}>
      {isIn ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
      {isIn ? 'IN' : 'OUT'}
    </span>
  );
}

/* ── Sync status pill ────────────────────────────────────── */
function SyncStatusPill({ status }: { status: string }) {
  const cfg = SYNC_STATUS_CFG[status] || SYNC_STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      <Icon size={12} className={status === 'syncing' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

/* ── Change type badge ───────────────────────────────────── */
function ChangeTypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, ' ').toUpperCase();
  return (
    <span style={{
      display: 'inline-block', padding: '2px 6px', borderRadius: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: 'var(--cp-hover, #F1F5F9)', color: 'var(--cp-t2, #475569)',
      border: '1px solid var(--cp-bd, #E2E8F0)',
    }}>
      {label}
    </span>
  );
}

/* ── Changed fields detail ───────────────────────────────── */
function ChangedFieldsDetail({ fields }: { fields: Record<string, { from?: string; to?: string }> | null }) {
  const [open, setOpen] = useState(false);

  if (!fields || Object.keys(fields).length === 0) return null;

  const entries = Object.entries(fields);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: 'var(--cp-blue, #2563EB)', cursor: 'pointer',
          background: 'none', border: 'none', padding: 0, fontWeight: 500,
        }}>
          {entries.length} field{entries.length > 1 ? 's' : ''} changed
          <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {entries.map(([field, val]) => (
            <div key={field} style={{ fontSize: 11, color: 'var(--cp-t2, #475569)', display: 'flex', gap: 4, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: 'var(--cp-t1, #0F172A)', minWidth: 60 }}>{field}:</span>
              <span style={{ textDecoration: 'line-through', color: 'var(--cp-t3, #94A3B8)' }}>{val.from || '—'}</span>
              <span style={{ color: 'var(--cp-t3, #94A3B8)' }}>→</span>
              <span style={{ fontWeight: 500 }}>{val.to || '—'}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── Summary stats bar ───────────────────────────────────── */
function SummaryStats({ items }: { items: SyncActivity[] }) {
  const stats = useMemo(() => {
    const s = { total: items.length, inbound: 0, outbound: 0, success: 0, failed: 0, pending: 0, skipped: 0, conflicts: 0 };
    items.forEach(i => {
      if (i.direction === 'inbound') s.inbound++; else s.outbound++;
      if (i.sync_status === 'success') s.success++;
      else if (i.sync_status === 'failed') s.failed++;
      else if (i.sync_status === 'pending') s.pending++;
      else if (i.sync_status === 'skipped') s.skipped++;
      if (i.conflict_detected) s.conflicts++;
    });
    return s;
  }, [items]);

  const pills: { label: string; value: number; color: string; bg: string }[] = [
    { label: 'Total', value: stats.total, color: 'var(--cp-t1, #0F172A)', bg: 'var(--cp-hover, #F1F5F9)' },
    { label: 'Inbound', value: stats.inbound, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { label: 'Outbound', value: stats.outbound, color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'Success', value: stats.success, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
    { label: 'Failed', value: stats.failed, color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
    { label: 'Pending', value: stats.pending, color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'Skipped', value: stats.skipped, color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
  ];

  if (stats.conflicts > 0) {
    pills.push({ label: 'Conflicts', value: stats.conflicts, color: '#DC2626', bg: 'rgba(220,38,38,0.08)' });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {pills.map(p => (
        <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 24, height: 22, padding: '0 8px', borderRadius: 4,
            background: p.bg, color: p.color, fontSize: 12, fontWeight: 700,
          }}>
            {p.value}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-t3, #94A3B8)' }}>{p.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Filter pills ────────────────────────────────────────── */
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        border: `1px solid ${active ? '#2563EB' : 'var(--cp-bd, #E2E8F0)'}`,
        background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
        color: active ? '#2563EB' : 'var(--cp-t2, #475569)',
        cursor: 'pointer', transition: 'all 150ms',
      }}
    >
      {label}
    </button>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function JiraActivitySyncPage() {
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<DirectionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: rawItems = [], isLoading, refetch } = useQuery({
    queryKey: ['jira-sync-activity'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('jira_sync_activity')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as SyncActivity[];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let items = rawItems;
    if (dirFilter !== 'all') items = items.filter(i => i.direction === dirFilter);
    if (statusFilter !== 'all') items = items.filter(i => i.sync_status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.work_item_key.toLowerCase().includes(q) ||
        (i.work_item_title || '').toLowerCase().includes(q) ||
        (i.change_type || '').toLowerCase().includes(q) ||
        (i.project_key || '').toLowerCase().includes(q) ||
        (i.actor_name || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [rawItems, dirFilter, statusFilter, search]);

  /* ── Table column defs ──── */
  const columns = [
    { key: 'direction', label: 'DIR', width: 70 },
    { key: 'type', label: 'TYPE', width: 36 },
    { key: 'key', label: 'KEY', width: 110 },
    { key: 'summary', label: 'SUMMARY', width: 'auto' as const },
    { key: 'change', label: 'CHANGE', width: 140 },
    { key: 'changed_at', label: 'CHANGED IN CATALYST', width: 150 },
    { key: 'synced_at', label: 'SYNCED TO JIRA', width: 150 },
    { key: 'sync_status', label: 'SYNC STATUS', width: 110 },
    { key: 'details', label: 'DETAILS', width: 160 },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cp-bg, #FFFFFF)' }}>
      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        height: 52, minHeight: 52, display: 'flex', alignItems: 'center',
        padding: '0 24px', borderBottom: '1px solid var(--cp-bd, #E2E8F0)',
        gap: 16,
      }}>
        <h1 style={{
          fontSize: 20, fontWeight: 700, fontFamily: 'Sora, sans-serif',
          color: 'var(--cp-t1, #0F172A)', margin: 0, whiteSpace: 'nowrap',
        }}>
          Jira Activity Sync
        </h1>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => refetch()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            border: '1px solid var(--cp-bd, #E2E8F0)',
            background: 'var(--cp-bg, #FFFFFF)', color: 'var(--cp-t1, #0F172A)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* ── Toolbar ────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px',
        borderBottom: '1px solid var(--cp-bd, #E2E8F0)', flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cp-t3, #94A3B8)' }} />
          <Input
            placeholder="Search key, title, project…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 32, fontSize: 13 }}
          />
        </div>

        {/* Direction filters */}
        <div style={{ display: 'flex', gap: 4 }}>
          <FilterPill label="All" active={dirFilter === 'all'} onClick={() => setDirFilter('all')} />
          <FilterPill label="↓ Inbound" active={dirFilter === 'inbound'} onClick={() => setDirFilter('inbound')} />
          <FilterPill label="↑ Outbound" active={dirFilter === 'outbound'} onClick={() => setDirFilter('outbound')} />
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--cp-bd, #E2E8F0)' }} />

        {/* Status filters */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'success', 'failed', 'pending', 'skipped'] as StatusFilter[]).map(s => (
            <FilterPill key={s} label={s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
      </div>

      {/* ── Summary bar ─────────────────────────────── */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--cp-bd, #E2E8F0)' }}>
        <SummaryStats items={rawItems} />
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--cp-t3, #94A3B8)' }} />
            <span style={{ fontSize: 13, color: 'var(--cp-t3, #94A3B8)' }}>Loading sync activity…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
            <RefreshCw size={36} style={{ color: 'var(--cp-t4, #CBD5E1)' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cp-t2, #475569)' }}>No sync activity yet</span>
            <span style={{ fontSize: 13, color: 'var(--cp-t3, #94A3B8)', maxWidth: 360, textAlign: 'center' }}>
              Sync events between Catalyst and Jira will appear here. Activity is retained for 30 days.
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cp-bd, #E2E8F0)' }}>
                  {columns.map(col => (
                    <th key={col.key} style={{
                      padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                      color: 'var(--cp-t3, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: 'var(--cp-hover, #F8FAFC)',
                      width: typeof col.width === 'number' ? col.width : undefined,
                      whiteSpace: 'nowrap',
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '0.75px solid var(--cp-bd, #E2E8F0)',
                      height: 40, transition: 'background 150ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-hover, rgba(0,0,0,0.02))')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Direction */}
                    <td style={{ padding: '6px 12px' }}>
                      <DirectionBadge dir={item.direction} />
                    </td>

                    {/* Type icon */}
                    <td style={{ padding: '6px 12px' }}>
                      {item.work_item_type ? (
                        <JiraIssueTypeIcon type={item.work_item_type} size={16} />
                      ) : (
                        <span style={{ color: 'var(--cp-t4, #CBD5E1)' }}>—</span>
                      )}
                    </td>

                    {/* Key */}
                    <td style={{ padding: '6px 12px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--cp-blue, #2563EB)',
                      }}>
                        {item.work_item_key}
                      </span>
                    </td>

                    {/* Summary */}
                    <td style={{ padding: '6px 12px', maxWidth: 300 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 500, color: 'var(--cp-t1, #0F172A)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {item.work_item_title || '—'}
                        </span>
                        {item.change_summary && (
                          <span style={{ fontSize: 11, color: 'var(--cp-t3, #94A3B8)' }}>
                            {item.change_summary}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Change type */}
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ChangeTypeBadge type={item.change_type} />
                        {item.conflict_detected && (
                          <Tooltip
                            position="top"
                            content={`Conflict detected${item.conflict_resolution ? `: ${item.conflict_resolution}` : ''}`}
                          >
                            <AlertTriangle size={14} style={{ color: '#DC2626' }} />
                          </Tooltip>
                        )}
                      </div>
                    </td>

                    {/* Changed in Catalyst */}
                    <td style={{ padding: '6px 12px' }}>
                      {item.catalyst_changed_at ? (
                        <Tooltip
                          position="top"
                          content={format(new Date(item.catalyst_changed_at), 'dd MMM yyyy, HH:mm:ss')}
                        >
                          <span style={{ fontSize: 12, color: 'var(--cp-t2, #475569)' }}>
                            {formatDistanceToNowStrict(new Date(item.catalyst_changed_at), { addSuffix: true })}
                          </span>
                        </Tooltip>
                      ) : (
                        <span style={{ color: 'var(--cp-t4, #CBD5E1)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Synced to Jira */}
                    <td style={{ padding: '6px 12px' }}>
                      {item.sync_completed_at ? (
                        <Tooltip
                          position="top"
                          content={format(new Date(item.sync_completed_at), 'dd MMM yyyy, HH:mm:ss')}
                        >
                          <span style={{ fontSize: 12, color: 'var(--cp-t2, #475569)' }}>
                            {formatDistanceToNowStrict(new Date(item.sync_completed_at), { addSuffix: true })}
                          </span>
                        </Tooltip>
                      ) : (
                        <span style={{ color: 'var(--cp-t4, #CBD5E1)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Sync status */}
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <SyncStatusPill status={item.sync_status} />
                        {item.attempt_count > 1 && (
                          <span style={{ fontSize: 10, color: 'var(--cp-t3, #94A3B8)', fontWeight: 600 }}>
                            ×{item.attempt_count}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Details */}
                    <td style={{ padding: '6px 12px' }}>
                      {item.error_message ? (
                        <Tooltip position="top" content={item.error_message}>
                          <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 500, cursor: 'help' }}>
                            Error: {item.error_message.substring(0, 30)}…
                          </span>
                        </Tooltip>
                      ) : (
                        <ChangedFieldsDetail fields={item.changed_fields as any} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <div style={{
        padding: '8px 24px', borderTop: '1px solid var(--cp-bd, #E2E8F0)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 12, color: 'var(--cp-t3, #94A3B8)',
      }}>
        <span>
          Showing <strong style={{ color: 'var(--cp-t1, #0F172A)', fontWeight: 600 }}>{filtered.length}</strong> of{' '}
          <strong style={{ color: 'var(--cp-t1, #0F172A)', fontWeight: 600 }}>{rawItems.length}</strong> events (last 30 days)
        </span>
        <span>Auto-purge: records older than 30 days are deleted automatically</span>
      </div>
    </div>
  );
}

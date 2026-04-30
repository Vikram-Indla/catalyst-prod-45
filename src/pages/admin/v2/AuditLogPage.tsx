/**
 * AuditLogPage — read-only feed of admin v2 mutations.
 *
 * Reads `admin_action_audit` ordered by created_at DESC, limit 100. Every
 * write that lands in /admin/v2 routes through `useAdminMutation`, which
 * inserts an audit row best-effort. This page is the only window into that
 * trail until a richer compliance surface ships.
 *
 * Lozenge appearance map:
 *   create   → success    update  → inprogress
 *   delete   → removed    archive → moved
 *   toggle   → new        restore → success
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { typedQuery } from '@/integrations/supabase/client';
import {
  EmptyState,
  Heading,
  Lozenge,
  SectionMessage,
  Spinner,
  type LozengeAppearance,
} from '@/components/ads';

interface AuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string;
  row_id: string | null;
  before_state: unknown | null;
  after_state: unknown | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const APPEARANCE_BY_ACTION: Record<string, LozengeAppearance> = {
  create: 'success',
  update: 'inprogress',
  delete: 'removed',
  archive: 'moved',
  toggle: 'new',
  restore: 'success',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function shortenRowId(rowId: string | null): string {
  if (!rowId) return '—';
  if (rowId.length <= 8) return rowId;
  return `${rowId.slice(0, 8)}…`;
}

function shortenActor(actorId: string | null): string {
  if (!actorId) return 'system';
  return actorId.slice(0, 8);
}

export default function AuditLogPage() {
  const { data, isLoading, error } = useQuery<AuditRow[]>({
    queryKey: ['admin', 'audit'],
    queryFn: async () => {
      const { data, error } = await typedQuery('admin_action_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div
      data-testid="admin-v2/audit/page"
      style={{
        padding: 'var(--ds-space-400, 24px)',
        maxWidth: 1120,
      }}
    >
      <div style={{ marginBottom: 'var(--ds-space-200, 12px)' }}>
        <Heading as="h1" size="large">
          Action log
        </Heading>
      </div>

      <p
        style={{
          margin: '0 0 var(--ds-space-300, 16px)',
          color: 'var(--ds-text-subtle, #44546F)',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        Most recent 100 admin v2 mutations. Every create, update, delete,
        toggle, archive, and restore performed inside <code>/admin/v2</code>
        is recorded here.
      </p>

      {error && (
        <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
          <SectionMessage appearance="error" title="Could not load audit log">
            <p style={{ margin: 0 }}>{(error as Error).message}</p>
          </SectionMessage>
        </div>
      )}

      {isLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--ds-space-600, 48px)',
          }}
        >
          <Spinner size="medium" />
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <EmptyState
          header="No admin actions yet"
          description="Once an admin makes a change inside /admin/v2, it will show up here."
        />
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div
          style={{
            border: '1px solid var(--ds-border, #DCDFE4)',
            borderRadius: 'var(--ds-border-radius-100, 4px)',
            overflow: 'hidden',
            background: 'var(--ds-surface, #FFFFFF)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
                  borderBottom: '1px solid var(--ds-border, #DCDFE4)',
                }}
              >
                <th style={thStyle}>When</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Table</th>
                <th style={thStyle}>Row</th>
                <th style={thStyle}>Actor</th>
                <th style={thStyle}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const appearance =
                  APPEARANCE_BY_ACTION[row.action] ?? 'default';
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid var(--ds-border, #DCDFE4)',
                    }}
                  >
                    <td style={tdStyle}>{formatDate(row.created_at)}</td>
                    <td style={tdStyle}>
                      <Lozenge appearance={appearance}>{row.action}</Lozenge>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code, ui-monospace, SF Mono, Menlo, Consolas)' }}>
                      {row.table_name}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code, ui-monospace, SF Mono, Menlo, Consolas)' }}>
                      {shortenRowId(row.row_id)}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code, ui-monospace, SF Mono, Menlo, Consolas)' }}>
                      {shortenActor(row.actor_id)}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--ds-text-subtle, #44546F)' }}>
                      {row.reason ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--ds-space-150, 10px) var(--ds-space-200, 12px)',
  fontWeight: 600,
  color: 'var(--ds-text-subtle, #44546F)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--ds-space-150, 10px) var(--ds-space-200, 12px)',
  verticalAlign: 'top',
  color: 'var(--ds-text, #172B4D)',
};

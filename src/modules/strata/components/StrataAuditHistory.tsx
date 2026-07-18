/**
 * PB-DEF-008 · reachable entity audit / lineage for Portfolio & Benefits records.
 * Reads the EXISTING append-only strata_audit_events store via the RLS-safe strata_entity_audit
 * RPC — no parallel audit system. Renders one append-only timeline: action, actor, timestamp,
 * before/after (when captured) and rationale/note. Mounted directly on the record so history is
 * navigable from the record itself.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ads';
import { valueApi } from '../domain';
import { useProfileNames } from '../hooks/useStrata';
import { StrataPanel, T } from './shared';
import { labelize } from './format';

const fmtWhen = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const jsonPreview = (v: unknown): string | null => {
  if (v == null) return null;
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  } catch {
    return null;
  }
};

export function StrataAuditHistory({
  entityTable, entityId, title = 'Governance history',
}: {
  entityTable: string;
  entityId: string;
  title?: string;
}) {
  const q = useQuery({
    queryKey: ['strata', 'entity-audit', entityTable, entityId],
    queryFn: () => valueApi.entityAudit(entityTable, entityId),
    staleTime: 15_000,
  });
  const names = useProfileNames();
  const rows = q.data ?? [];
  const actorName = (id: string | null): string =>
    id ? (names.data?.get(id)?.name ?? `${id.slice(0, 8)}…`) : 'System';

  return (
    <StrataPanel title={title} count={rows.length} noPadding>
      <div data-testid="strata-entity-audit">
        {q.isLoading ? (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
        ) : rows.length === 0 ? (
          <p style={{ color: T.subtlest, margin: 0, padding: '12px 16px', fontSize: 'var(--ds-font-size-100)' }}>No recorded history yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((r) => {
              const before = jsonPreview(r.before);
              const after = jsonPreview(r.after);
              return (
                <div key={r.id} style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ color: T.text, fontWeight: 600, fontSize: 'var(--ds-font-size-100)' }}>{labelize(r.action.replace(/^RPC:/, ''))}</span>
                    <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-075)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtWhen(r.created_at)}</span>
                  </div>
                  <div style={{ color: T.subtle, fontSize: 'var(--ds-font-size-100)' }}>
                    {actorName(r.actor_id)}{r.note ? ` · ${r.note}` : ''}
                  </div>
                  {before || after ? (
                    <div style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-075)', fontFamily: 'var(--ds-font-family-monospace, monospace)' }}>
                      {before ? <div>before: {before}</div> : null}
                      {after ? <div>after: {after}</div> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StrataPanel>
  );
}

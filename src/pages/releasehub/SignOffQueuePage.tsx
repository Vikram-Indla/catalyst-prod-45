/**
 * Release Operations — Sign-off Queue (route /release-hub/sign-off-queue)
 *
 * Phase 7: visual approval-dependency map (release → change → gate) + a table
 * fallback, filters, search, approve/reject, request sign-off, and emergency-
 * override approvals. All actions write the shared rh_*_signoffs /
 * rh_emergency_overrides rows so Change Detail, Board, Timeline and For You stay
 * consistent. ADS tokens, no drawers.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TextArea from '@atlaskit/textarea';
import { Search, Plus } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { useSignoffGraph, useSignoffAction, useDecideOverride, type Gate } from '@/hooks/useSignoffGraph';
import { SignoffDependencyGraph } from '@/components/releasehub/signoff/SignoffDependencyGraph';
import { RequestSignoffModal } from '@/components/releasehub/signoff/RequestSignoffModal';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { Lozenge } from '@/components/ads/Lozenge';
import { ChangeStatusLozenge, RiskLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import { ErrorState } from '@/components/releasehub/EmptyState';
import { useReleaseOpsPermissions } from '@/hooks/useReleaseOpsPermissions';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { AtlaskitPageShell } from '@/components/ads';

const T = {
  surface: 'var(--ds-surface)', card: 'var(--ds-surface-raised)', sunken: 'var(--ds-surface-sunken)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)', warning: 'var(--ds-text-warning)', success: 'var(--ds-text-success)', mono: 'var(--ds-font-family-code, monospace)',
};
const titleCase = (v: string | null) => (!v ? '—' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));

interface FlatRow extends Gate { entityLabel: string; entityKey: string; risk: string | null; env: string | null; slug: string | null; changeId: string | null; releaseLabel: string | null }
const FILTERS = ['pending', 'overdue', 'rejected', 'approved', 'release', 'change', 'emergency', 'mine'] as const;
type Filter = typeof FILTERS[number];
const FILTER_LABEL: Record<Filter, string> = { pending: 'Pending', overdue: 'Overdue', rejected: 'Rejected', approved: 'Approved', release: 'Release-level', change: 'Change-level', emergency: 'Emergency', mine: 'Assigned to me' };

function usePendingOverrides() {
  return useQuery({
    queryKey: ['release-hub', 'pending-overrides'],
    staleTime: 15_000,
    queryFn: async () => { const { data } = await supabase.from('rh_emergency_overrides' as any).select('*').eq('status', 'requested'); return (((data as any) ?? []) as any[]); },
  });
}

export default function SignOffQueuePage() {
  const { data: graph, isLoading, error, refetch } = useSignoffGraph();
  const { data: pendingOverrides = [] } = usePendingOverrides();
  const { canManage } = useReleaseOpsPermissions();
  const action = useSignoffAction();
  const decideOverride = useDecideOverride();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'visual' | 'table'>('visual');
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [search, setSearch] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [ovrComment, setOvrComment] = useState<Record<string, string>>({});
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const flat: FlatRow[] = useMemo(() => {
    if (!graph) return [];
    const rows: FlatRow[] = [];
    graph.releases.forEach((r) => {
      r.gates.forEach((g) => rows.push({ ...g, entityLabel: r.name, entityKey: r.name, risk: null, env: r.targetEnv, slug: r.slug, changeId: null, releaseLabel: null }));
      r.changes.forEach((c) => c.gates.forEach((g) => rows.push({
        ...g, entityLabel: `${c.chgNumber} · ${c.title}`, entityKey: c.chgNumber, risk: c.risk, env: c.targetEnv, slug: c.slug, changeId: c.id,
        releaseLabel: c.releaseName ? (c.releaseVersion ? `${c.releaseName} (${c.releaseVersion})` : c.releaseName) : null,
      })));
    });
    graph.orphanChanges.forEach((c) => c.gates.forEach((g) => rows.push({
      ...g, entityLabel: `${c.chgNumber} · ${c.title}`, entityKey: c.chgNumber, risk: c.risk, env: c.targetEnv, slug: c.slug, changeId: c.id,
      releaseLabel: null,
    })));
    return rows;
  }, [graph]);

  const filtered = useMemo(() => flat.filter((g) => {
    if (search && !`${g.entityLabel} ${g.role ?? ''} ${g.approverName ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    for (const f of filters) {
      if (f === 'pending' && g.status !== 'pending') return false;
      if (f === 'overdue' && !g.overdue) return false;
      if (f === 'rejected' && g.status !== 'rejected') return false;
      if (f === 'approved' && !(g.status === 'approved' || g.status === 'auto_approved')) return false;
      if (f === 'release' && g.scope !== 'release') return false;
      if (f === 'change' && g.scope !== 'change') return false;
      if (f === 'emergency' && !g.overrideId) return false;
      if (f === 'mine' && g.assignedTo !== userId) return false;
    }
    return true;
  }), [flat, filters, search, userId]);

  const toggle = (f: Filter) => setFilters((prev) => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n; });

  const doAction = (g: Gate, a: 'approve' | 'reject', comment?: string) =>
    action.mutate({ gate: g, action: a, comment }, { onSuccess: () => catalystToast.success(a === 'approve' ? 'Approved' : 'Rejected'), onError: (e: any) => catalystToast.error(e?.message ?? 'Failed') });

  if (error) return <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></div>;

  return (
    <AtlaskitPageShell flush chromeBand={<ProjectPageHeader projectKey="RELEASES" hubType="release" />} testId="release-ops-sign-off-queue">
      <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', flexWrap: 'wrap' }}>
        <div role="heading" aria-level={1} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, margin: 0 }}>Sign-off queue</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['visual', 'table'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ height: 30, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: mode === m ? 'var(--ds-background-selected)' : 'transparent', color: mode === m ? 'var(--ds-text-selected)' : T.text, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
          ))}
        </div>
        <button onClick={() => setRequestOpen(true)} disabled={!canManage} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: 'none', cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.5, background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600 }}><Plus size={14} style={{ color: 'var(--ds-text-inverse)' }} /> Request sign-off</button>
      </div>

      {/* filters + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => toggle(f)} style={{ height: 28, padding: '0 10px', borderRadius: 14, border: `1px solid ${filters.has(f) ? 'var(--ds-border-focused)' : T.border}`, background: filters.has(f) ? 'var(--ds-background-selected)' : 'transparent', color: filters.has(f) ? 'var(--ds-text-selected)' : T.subtle, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600 }}>{FILTER_LABEL[f]}</button>
        ))}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '48%', transform: 'translateY(-50%)', color: T.subtlest }} />
          <input type="text" placeholder="Search sign-offs…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ height: 32, width: 220, padding: '0 8px 0 32px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', outline: 'none' }} />
        </div>
      </div>

      {/* pending emergency overrides */}
      {pendingOverrides.length > 0 && (
        <div style={{ background: 'var(--ds-background-warning)', border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: T.warning, marginBottom: 8 }}>⚡ Emergency override requests ({pendingOverrides.length})</div>
          {pendingOverrides.map((o: any) => (
            <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text }}>Bypass {o.bypassed_gate ?? 'gate'} ({o.scope}) — {o.reason}</div>
              {canManage && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <TextArea value={ovrComment[o.id] ?? ''} onChange={(e) => setOvrComment((p) => ({ ...p, [o.id]: (e.target as HTMLTextAreaElement).value }))} placeholder="Decision comment (required)" minimumRows={1} />
                  <button onClick={() => { const c = ovrComment[o.id]; if (!c?.trim()) return catalystToast.error('Comment required'); decideOverride.mutate({ overrideId: o.id, action: 'approve', comment: c, changeId: o.change_id ?? undefined }, { onSuccess: () => catalystToast.success('Override approved'), onError: (e: any) => catalystToast.error(e?.message) }); }} style={aBtn(T.warning)}>Approve</button>
                  <button onClick={() => { const c = ovrComment[o.id]; if (!c?.trim()) return catalystToast.error('Comment required'); decideOverride.mutate({ overrideId: o.id, action: 'reject', comment: c }, { onSuccess: () => catalystToast.success('Override rejected'), onError: (e: any) => catalystToast.error(e?.message) }); }} style={aBtn(T.danger)}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, color: T.subtlest }}>Loading…</div>
      ) : mode === 'visual' ? (
        <SignoffDependencyGraph canManage={canManage} />
      ) : filtered.length === 0 ? (
        <div style={{ background: T.sunken, borderRadius: 8, padding: 24, textAlign: 'center', fontFamily: RH.fontBody, color: T.subtle }}>No sign-offs match your filters.</div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {/* Column header — scope pill/entity/release/role/risk/approver/status previously had
              no labels, reading as unlabeled data. Widths mirror the row cells below for alignment. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: T.sunken, borderBottom: `1px solid ${T.border}` }}>
            <span style={{ width: 64, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest }}>Scope</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest }}>Change / release</span>
            <span style={{ width: 170, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest }}>Linked release</span>
            <span style={{ width: 140, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest }}>Role</span>
            <span style={{ width: 70, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest }}>Risk</span>
            <span style={{ width: 180, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest }}>Approver</span>
            <span style={{ width: 100, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest }}>Status</span>
            <span style={{ width: 160, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.subtlest }}>Actions</span>
          </div>
          {filtered.map((g) => {
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ width: 64, flexShrink: 0 }}><Lozenge appearance="default">{g.scope}</Lozenge></span>
                <button onClick={() => navigate(`/release-hub/${g.changeId ? `changes/${g.slug ?? g.changeId}` : g.slug ?? ''}`)} style={{ flex: 1, minWidth: 0, textAlign: 'left', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: T.text, background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.entityLabel}</button>
                <span style={{ width: 170, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: g.releaseLabel ? T.subtle : T.subtlest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.releaseLabel ?? '—'}</span>
                <span style={{ width: 140, flexShrink: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{titleCase(g.role ?? g.stage)}</span>
                <span style={{ width: 70, flexShrink: 0 }}>{g.risk ? <RiskLozenge risk={g.risk} /> : <span style={{ color: T.subtlest }}>—</span>}</span>
                <span style={{ width: 180, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {g.approverName ? (
                    <>
                      <CatalystAvatar name={g.approverName} size="medium" />
                      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.approverName}</span>
                    </>
                  ) : <Lozenge appearance="moved">Unassigned</Lozenge>}
                </span>
                <span style={{ width: 100, flexShrink: 0 }}>{g.overdue && g.status === 'pending' ? <Lozenge appearance="removed">Overdue</Lozenge> : <ChangeStatusLozenge status={g.status} />}</span>
                <span style={{ width: 160, flexShrink: 0 }}>
                  {canManage && (g.status === 'pending' || g.overdue) && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => doAction(g, 'approve')} style={aBtn(T.success)}>Approve</button>
                      <button onClick={() => { const c = window.prompt('Rejection reason (required):') || ''; if (c.trim()) doAction(g, 'reject', c); else catalystToast.error('Reason required'); }} style={aBtn(T.danger)}>Reject</button>
                    </div>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {requestOpen && <RequestSignoffModal onClose={() => setRequestOpen(false)} />}
      </div>
    </AtlaskitPageShell>
  );
}

const aBtn = (tone: string): React.CSSProperties => ({ height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${tone}`, background: 'transparent', color: tone, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600 });

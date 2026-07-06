/**
 * SignoffDependencyGraph — Phase 7 §4. Interactive approval map: release →
 * change → gate, expandable inline (no drawer). Node states colored; overdue
 * urgent; rejected severe; emergency override shown as a distinct bypass path.
 * Gate nodes carry inline approve/reject actions. ADS tokens only.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown } from '@/lib/atlaskit-icons';
import TextArea from '@atlaskit/textarea';
import { useSignoffGraph, useSignoffAction, type Gate, type ChangeNode, type ReleaseNode, type OverrideRow } from '@/hooks/useSignoffGraph';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-raised)', sunken: 'var(--ds-surface-sunken)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)', warning: 'var(--ds-text-warning)', success: 'var(--ds-text-success)', info: 'var(--ds-text-information)', mono: 'var(--ds-font-family-code, monospace)',
};
const titleCase = (v: string | null) => (!v ? '—' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));

function stateTone(g: { status: string; overdue: boolean }): { fg: string; bg: string; label: string } {
  if (g.status === 'rejected') return { fg: T.danger, bg: 'var(--ds-background-danger)', label: 'Rejected' };
  if (g.status === 'overridden' || g.status === 'bypassed') return { fg: T.warning, bg: 'var(--ds-background-warning)', label: 'Overridden' };
  if (g.overdue) return { fg: T.danger, bg: 'var(--ds-background-danger)', label: 'Overdue' };
  if (g.status === 'pending') return { fg: T.warning, bg: 'var(--ds-background-warning)', label: 'Pending' };
  if (g.status === 'approved' || g.status === 'auto_approved') return { fg: T.success, bg: 'var(--ds-background-success)', label: 'Approved' };
  if (g.status === 'skipped') return { fg: T.subtle, bg: T.sunken, label: 'Skipped' };
  return { fg: T.subtle, bg: T.sunken, label: titleCase(g.status) };
}
function rollup(gates: Gate[]): { fg: string; label: string } {
  if (gates.some((g) => g.status === 'rejected')) return { fg: T.danger, label: 'Rejected' };
  if (gates.some((g) => g.overdue)) return { fg: T.danger, label: 'Overdue' };
  if (gates.some((g) => g.status === 'pending')) return { fg: T.warning, label: 'Pending' };
  if (gates.length && gates.every((g) => g.status === 'approved' || g.status === 'auto_approved' || g.status === 'skipped')) return { fg: T.success, label: 'Approved' };
  return { fg: T.subtle, label: 'No gates' };
}

function GateNode({ gate, canManage }: { gate: Gate; canManage: boolean }) {
  const tone = stateTone(gate);
  const action = useSignoffAction();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const act = (a: 'approve' | 'reject', c?: string) =>
    action.mutate({ gate, action: a, comment: c }, { onSuccess: () => { catalystToast.success(a === 'approve' ? 'Approved' : 'Rejected'); setRejecting(false); setComment(''); }, onError: (e: any) => catalystToast.error(e?.message ?? 'Action failed') });
  const actionable = canManage && (gate.status === 'pending' || gate.overdue);
  return (
    <div style={{ borderLeft: `2px solid ${tone.fg}`, background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{titleCase(gate.role ?? gate.stage)}</span>
        {gate.approverName ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CatalystAvatar name={gate.approverName} size="xsmall" /><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{gate.approverName}</span></span> : <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.warning }}>Unassigned approver</span>}
        <span style={{ marginLeft: 'auto', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: tone.fg, background: tone.bg, padding: '1px 8px', borderRadius: 3 }}>{tone.label}</span>
      </div>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtlest }}>
        {gate.dueDate ? `Due ${new Date(gate.dueDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'No due date'}
        {gate.blocking ? ' · blocks progression' : ''}
        {gate.overrideId ? ' · via override' : ''}
      </div>
      {gate.comment && gate.status === 'rejected' && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.danger }}>Reason: {gate.comment}</div>}
      {actionable && !rejecting && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => act('approve')} style={btn(T.success)}>Approve</button>
          <button onClick={() => setRejecting(true)} style={btn(T.danger)}>Reject</button>
        </div>
      )}
      {actionable && rejecting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <TextArea value={comment} onChange={(e) => setComment((e.target as HTMLTextAreaElement).value)} placeholder="Rejection reason (required)" minimumRows={1} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { if (comment.trim()) act('reject', comment); else catalystToast.error('Reason required'); }} style={btn(T.danger)}>Confirm reject</button>
            <button onClick={() => { setRejecting(false); setComment(''); }} style={btn(T.subtle)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OverrideBadge({ o }: { o: OverrideRow }) {
  const approved = o.status === 'approved';
  return (
    <div style={{ borderLeft: `2px dashed ${approved ? T.warning : T.subtle}`, background: 'var(--ds-background-warning)', borderRadius: 6, padding: '6px 10px' }}>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: T.warning }}>⚡ Emergency override — {titleCase(o.status)}</div>
      <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>Bypasses {o.bypassedGate ?? 'gate'} · {o.reason ?? ''}{o.requestedByName ? ` · requested by ${o.requestedByName}` : ''}{o.approvedByName ? ` · approved by ${o.approvedByName}` : ''}</div>
    </div>
  );
}

function ChangeSubtree({ c, canManage }: { c: ChangeNode; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const roll = rollup(c.gates);
  return (
    <div style={{ marginLeft: 20, borderLeft: `1px solid ${T.border}`, paddingLeft: 12, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse' : 'Expand'} style={iconBtn}>{open ? <ChevronDown size={14} style={{ color: T.subtlest }} /> : <ChevronRight size={14} style={{ color: T.subtlest }} />}</button>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: roll.fg, flex: 'none' }} />
        <button onClick={() => navigate(`/release-hub/changes/${c.slug ?? c.id}`)} style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{c.chgNumber}</button>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{c.title}</span>
        {c.isEmergency && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: T.warning }}>⚡</span>}
        <span style={{ marginLeft: 'auto', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: roll.fg }}>{c.gates.length} gate{c.gates.length === 1 ? '' : 's'} · {roll.label}</span>
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, marginLeft: 22 }}>
          {c.gates.length === 0 ? <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>No approvers required for this change.</div> : c.gates.map((g) => <GateNode key={g.id} gate={g} canManage={canManage} />)}
          {c.override && <OverrideBadge o={c.override} />}
        </div>
      )}
    </div>
  );
}

function ReleaseSubtree({ r, canManage }: { r: ReleaseNode; canManage: boolean }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const allGates = [...r.gates, ...r.changes.flatMap((c) => c.gates)];
  const roll = rollup(allGates);
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${roll.fg}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse' : 'Expand'} style={iconBtn}>{open ? <ChevronDown size={16} style={{ color: T.subtlest }} /> : <ChevronRight size={16} style={{ color: T.subtlest }} />}</button>
        <button onClick={() => navigate(`/release-hub/${r.slug ?? r.id}`)} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{r.name}</button>
        {r.targetEnv && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{r.targetEnv}</span>}
        <span style={{ marginLeft: 'auto', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: roll.fg }}>{roll.label}</span>
      </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          {r.gates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 22 }}>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: T.subtlest }}>Release-level gates</div>
              {r.gates.map((g) => <GateNode key={g.id} gate={g} canManage={canManage} />)}
              {r.override && <OverrideBadge o={r.override} />}
            </div>
          )}
          {r.changes.length > 0 && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: T.subtlest, marginLeft: 22, marginTop: 8 }}>Change-level gates</div>}
          {r.changes.map((c) => <ChangeSubtree key={c.id} c={c} canManage={canManage} />)}
          {r.gates.length === 0 && r.changes.length === 0 && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, marginLeft: 22 }}>No sign-offs on this release or its changes.</div>}
        </div>
      )}
    </div>
  );
}

export function SignoffDependencyGraph({ canManage }: { canManage: boolean }) {
  const { data, isLoading } = useSignoffGraph();
  if (isLoading || !data) return <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, color: T.subtlest }}>Loading approval map…</div>;
  const empty = data.releases.length === 0 && data.orphanChanges.length === 0;
  if (empty) {
    return <div style={{ background: T.sunken, borderRadius: 8, padding: 24 }}>
      <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, margin: 0 }}>No sign-offs yet</p>
      <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, margin: '4px 0 0' }}>Sign-offs are created when a release or change manager requests approval. Request one from a Release or Change, and it appears here as an approval dependency map.</p>
    </div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.releases.map((r) => <ReleaseSubtree key={r.id} r={r} canManage={canManage} />)}
      {data.orphanChanges.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>Changes not linked to a release</div>
          {data.orphanChanges.map((c) => <ChangeSubtree key={c.id} c={c} canManage={canManage} />)}
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = { display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 };
const btn = (tone: string): React.CSSProperties => ({ height: 26, padding: '0 10px', borderRadius: 6, border: `1px solid ${tone}`, background: 'transparent', color: tone, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600 });

export default SignoffDependencyGraph;

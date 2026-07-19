/**
 * STRATA — Corporate Strategy Framework governance (CAT-STRATA-GOVFRAMEWORK-20260719-001).
 * Route: /strata/admin/frameworks[/:frameworkSlug].
 *
 * The authoritative surface for the governed framework: ONE effective version defines corporate
 * perspective membership, order and weight totalling exactly 100%. Separate from Perspective
 * definitions (which no longer own framework weight/position) and from Scorecard Models.
 *
 * Sections: Current framework (effective members + integrity) · Proposed changes (open drafts with
 * diff vs current + approval workflow) · History (superseded/retired/rejected, read-only).
 * All validation mirrors the server validator; the DB is the enforcement authority. Every weight
 * total / member decision is proven server-side — the UI only explains the rules.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Button, EmptyState, Lozenge, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Select, Spinner, Textfield,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDown, ArrowUp, Layers, Plus, Trash2 } from '@/lib/atlaskit-icons';
import { frameworkApi } from '@/modules/strata/domain';
import {
  useEffectiveFrameworkVersion, useFrameworkApproverCandidates, useFrameworkDependencyImpact,
  useFrameworkMembers, useFrameworkValidation, useFrameworkVersions, usePerspectives,
  useStrategyFrameworks,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { fmtDate } from '@/modules/strata/components/format';
import type {
  FrameworkStatus, StrataFrameworkMember, StrataFrameworkMemberDraft, StrataFrameworkVersion,
  StrataPerspective,
} from '@/modules/strata/types';
import {
  canSaveMembers, diffFrameworkMembers, diffIsEmpty, frameworkRemaining, frameworkTotal,
  hasDuplicateOrder, moveMember, reindexMembers, totalIsValid,
} from '@/modules/strata/lib/frameworkAuthoring';

const meta: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtle };
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

const OPEN_STATES: FrameworkStatus[] = ['draft', 'changes_requested', 'pending_approval'];
const HISTORY_STATES: FrameworkStatus[] = ['superseded', 'retired', 'rejected'];

function useCurrentUserId(): string | null {
  const { data } = useQuery({
    queryKey: ['auth', 'uid'],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 5 * 60_000,
  });
  return data ?? null;
}

// ── Member authoring editor (add / remove / reorder / reweight, live total) ───
function MemberEditor({
  version, initial, perspectives, onClose, onSaved, onError,
}: {
  version: StrataFrameworkVersion;
  initial: StrataFrameworkMember[];
  perspectives: StrataPerspective[];
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string | null) => void;
}) {
  const [rows, setRows] = useState<StrataFrameworkMemberDraft[]>(
    initial.map((m) => ({ perspective_id: m.perspective_id, weight: Number(m.weight), order_index: m.order_index })),
  );
  const [saving, setSaving] = useState(false);
  const nameById = useMemo(() => new Map(perspectives.map((p) => [p.id, p.name])), [perspectives]);

  const total = frameworkTotal(rows);
  const remaining = frameworkRemaining(total);
  const dupOrder = hasDuplicateOrder(rows);
  const totalOk = totalIsValid(total);
  const canSave = canSaveMembers(rows) && !saving;

  const addable: SelectOption[] = perspectives
    .filter((p) => p.status === 'approved' && !rows.some((r) => r.perspective_id === p.id))
    .map((p) => ({ value: p.id, label: p.name }));

  const setWeight = (id: string, v: string) =>
    setRows((rs) => rs.map((r) => (r.perspective_id === id ? { ...r, weight: v === '' ? NaN : Number(v) } : r)));
  const remove = (id: string) => setRows((rs) => reindexMembers(rs.filter((r) => r.perspective_id !== id)));
  const add = (id: string) => setRows((rs) => reindexMembers([...rs, { perspective_id: id, weight: 0, order_index: rs.length }]));
  const move = (id: string, dir: -1 | 1) => setRows((rs) => moveMember(rs, id, dir));

  const save = async () => {
    setSaving(true); onError(null);
    try {
      await frameworkApi.replaceMembers(version.id, rows.map((r) => ({ ...r, weight: r.weight })), version.updated_at);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} width="large">
      <ModalHeader><ModalTitle>Edit framework members — v{version.version}</ModalTitle></ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <Lozenge appearance={totalOk ? 'success' : 'removed'}>{`Total ${Math.round(total * 1000) / 1000}%`}</Lozenge>
          <span style={meta}>{totalOk ? 'Ready — totals 100%' : `${remaining > 0 ? `${remaining}% remaining` : `${-remaining}% over`}`}</span>
          {dupOrder ? <Lozenge appearance="removed">Duplicate position</Lozenge> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r, i) => (
            <div key={r.perspective_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...meta, width: 24, ...num }}>{i + 1}</span>
              <span style={{ ...bodyStyle, flex: 1 }}>{nameById.get(r.perspective_id) ?? '—'}</span>
              <div style={{ width: 96 }}>
                <Textfield
                  type="number" value={Number.isFinite(r.weight) ? String(r.weight) : ''}
                  onChange={(e) => setWeight(r.perspective_id, (e.target as HTMLInputElement).value)}
                  elemAfterInput={<span style={{ padding: '0 8px', color: T.subtlest }}>%</span>}
                  aria-label={`Weight for ${nameById.get(r.perspective_id) ?? 'perspective'}`}
                />
              </div>
              <Button appearance="subtle" iconBefore={<ArrowUp size="small" label="Move up" />} onClick={() => move(r.perspective_id, -1)} isDisabled={i === 0} />
              <Button appearance="subtle" iconBefore={<ArrowDown size="small" label="Move down" />} onClick={() => move(r.perspective_id, 1)} isDisabled={i === rows.length - 1} />
              <Button appearance="subtle" iconBefore={<Trash2 size="small" label="Remove" />} onClick={() => remove(r.perspective_id)} />
            </div>
          ))}
          {rows.length === 0 ? <span style={meta}>No perspectives yet — add at least one.</span> : null}
        </div>
        {addable.length > 0 ? (
          <div style={{ marginTop: 12, maxWidth: 320 }}>
            <Select
              placeholder="Add approved perspective…"
              options={addable}
              value={null}
              onChange={(opt) => { if (opt) add((opt as SelectOption).value); }}
            />
          </div>
        ) : <span style={{ ...meta, display: 'block', marginTop: 12 }}>All approved perspectives are already included.</span>}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" onClick={save} isDisabled={!canSave} isLoading={saving}>Save members</Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Approval / submit action modals ──────────────────────────────────────────
function SubmitModal({ version, onClose, onDone, onError }: {
  version: StrataFrameworkVersion; onClose: () => void; onDone: () => void; onError: (m: string | null) => void;
}) {
  const candidates = useFrameworkApproverCandidates(version.id);
  const [approver, setApprover] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const opts: SelectOption[] = (candidates.data ?? []).map((c) => ({ value: c.user_id, label: `${c.user_id.slice(0, 8)}… (${c.roles.join(', ')})` }));
  const submit = async () => {
    if (!approver) return;
    setBusy(true); onError(null);
    try { await frameworkApi.submit(version.id, approver, note || undefined, version.updated_at); onDone(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Submit failed'); }
    finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader><ModalTitle>Submit v{version.version} for approval</ModalTitle></ModalHeader>
      <ModalBody>
        <SectionMessage appearance="information" title="Maker–checker">
          The approver must be a different person from the version author and submitter. The server
          re-checks eligibility and re-runs the integrity validator before this version can activate.
        </SectionMessage>
        <div style={{ marginTop: 12 }}>
          <span style={meta}>Assigned approver</span>
          <Select placeholder="Select an eligible approver…" options={opts} value={opts.find((o) => o.value === approver) ?? null}
            onChange={(o) => setApprover(o ? (o as SelectOption).value : null)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={meta}>Note (optional)</span>
          <Textfield value={note} onChange={(e) => setNote((e.target as HTMLInputElement).value)} />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" onClick={submit} isDisabled={!approver || busy} isLoading={busy}>Submit</Button>
      </ModalFooter>
    </Modal>
  );
}

function CommentModal({ title, label, required, confirmLabel, appearance, onClose, onConfirm }: {
  title: string; label: string; required: boolean; confirmLabel: string;
  appearance: 'primary' | 'warning' | 'danger'; onClose: () => void; onConfirm: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await onConfirm(text); } finally { setBusy(false); } };
  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
      <ModalBody>
        <span style={meta}>{label}</span>
        <Textfield value={text} onChange={(e) => setText((e.target as HTMLInputElement).value)} />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance={appearance} onClick={go} isDisabled={busy || (required && !text.trim())} isLoading={busy}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Version card (proposed + history) ─────────────────────────────────────────
function VersionCard({ version, current, perspectives, userId, onError, refresh }: {
  version: StrataFrameworkVersion;
  current: StrataFrameworkMember[];
  perspectives: StrataPerspective[];
  userId: string | null;
  onError: (m: string | null) => void;
  refresh: () => void;
}) {
  const members = useFrameworkMembers(version.id);
  const validation = useFrameworkValidation(version.id);
  const impact = useFrameworkDependencyImpact(version.id);
  const nameById = useMemo(() => new Map(perspectives.map((p) => [p.id, p.name])), [perspectives]);
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<null | 'submit' | 'withdraw' | 'approve' | 'changes' | 'reject'>(null);

  const diff = useMemo(() => diffFrameworkMembers(current, members.data ?? []), [current, members.data]);
  const isOpen = OPEN_STATES.includes(version.status);
  const editable = version.status === 'draft' || version.status === 'changes_requested';
  const pending = version.status === 'pending_approval';
  const canDecide = pending && version.assigned_approver_id === userId
    && version.created_by !== userId && version.submitted_by !== userId;
  const isAuthor = version.created_by === userId;

  const act = async (fn: () => Promise<unknown>) => { onError(null); try { await fn(); refresh(); } catch (e) { onError(e instanceof Error ? e.message : 'Action failed'); } };

  const blockers = validation.data?.blockers ?? [];

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, background: T.raised, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ ...bodyStyle, fontWeight: 600 }}>Version {version.version}</span>
        <StatusLozenge status={version.status} />
        {version.provenance === 'legacy_unverified' ? <Lozenge appearance="moved">Legacy / unverified provenance</Lozenge> : null}
        <span style={{ ...meta, marginLeft: 'auto' }}>{version.change_reason ?? ''}</span>
      </div>

      {/* Diff vs current effective */}
      {isOpen ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {diff.added.map((id) => <span key={`a${id}`} style={meta}>+ Added <b style={bodyStyle}>{nameById.get(id) ?? '—'}</b></span>)}
          {diff.removed.map((id) => <span key={`r${id}`} style={meta}>− Removed <b style={bodyStyle}>{nameById.get(id) ?? '—'}</b></span>)}
          {diff.reweighted.map((c) => <span key={`w${c.id}`} style={meta}>{nameById.get(c.id) ?? '—'}: {c.from}% → <b style={bodyStyle}>{c.to}%</b></span>)}
          {diff.reordered.map((c) => <span key={`o${c.id}`} style={meta}>{nameById.get(c.id) ?? '—'}: position {c.from + 1} → {c.to + 1}</span>)}
          {diffIsEmpty(diff) ? <span style={meta}>No changes vs the current effective version yet.</span> : null}
        </div>
      ) : null}

      {/* Integrity + impact */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Lozenge appearance={validation.data?.valid ? 'success' : 'removed'}>
          {validation.data ? `Total ${validation.data.total_weight}%` : '—'}
        </Lozenge>
        {impact.data ? <span style={meta}>{impact.data.strategy_elements_using_member_perspectives} strategy element(s) use these perspectives</span> : null}
      </div>
      {blockers.length > 0 && isOpen ? (
        <SectionMessage appearance="warning" title={`${blockers.length} issue(s) block submission`}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{blockers.map((b, i) => <li key={i} style={meta}>{b}</li>)}</ul>
        </SectionMessage>
      ) : null}

      {pending ? (
        <SectionMessage appearance={canDecide ? 'information' : 'discovery'} title={canDecide ? 'Awaiting your decision' : 'Waiting for the assigned approver'}>
          {canDecide
            ? 'You are the assigned approver. Approving re-runs the integrity validator inside the transaction.'
            : isAuthor
              ? 'You submitted this version — maker–checker means you cannot approve it yourself.'
              : 'This version is with its assigned approver.'}
        </SectionMessage>
      ) : null}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {editable ? <Button appearance="default" onClick={() => setEditing(true)}>Edit members</Button> : null}
        {editable ? <Button appearance="primary" onClick={() => setModal('submit')} isDisabled={blockers.length > 0}>Submit for approval</Button> : null}
        {pending && (version.submitted_by === userId) ? <Button appearance="subtle" onClick={() => setModal('withdraw')}>Withdraw</Button> : null}
        {canDecide ? <Button appearance="primary" onClick={() => setModal('approve')}>Approve & activate</Button> : null}
        {canDecide ? <Button appearance="warning" onClick={() => setModal('changes')}>Request changes</Button> : null}
        {canDecide ? <Button appearance="danger" onClick={() => setModal('reject')}>Reject</Button> : null}
      </div>

      {editing && members.data ? (
        <MemberEditor version={version} initial={members.data} perspectives={perspectives}
          onClose={() => setEditing(false)} onError={onError}
          onSaved={() => { setEditing(false); refresh(); }} />
      ) : null}
      {modal === 'submit' ? <SubmitModal version={version} onClose={() => setModal(null)} onError={onError} onDone={() => { setModal(null); refresh(); }} /> : null}
      {modal === 'withdraw' ? <CommentModal title={`Withdraw v${version.version}`} label="Reason (optional)" required={false} confirmLabel="Withdraw" appearance="warning"
        onClose={() => setModal(null)} onConfirm={async (t) => { await act(() => frameworkApi.withdraw(version.id, t || undefined)); setModal(null); }} /> : null}
      {modal === 'approve' ? <CommentModal title={`Approve v${version.version}`} label="Note (optional)" required={false} confirmLabel="Approve & activate" appearance="primary"
        onClose={() => setModal(null)} onConfirm={async (t) => { await act(() => frameworkApi.approve(version.id, t || undefined, version.updated_at)); setModal(null); }} /> : null}
      {modal === 'changes' ? <CommentModal title={`Request changes on v${version.version}`} label="Comment (required)" required confirmLabel="Request changes" appearance="warning"
        onClose={() => setModal(null)} onConfirm={async (t) => { await act(() => frameworkApi.requestChanges(version.id, t)); setModal(null); }} /> : null}
      {modal === 'reject' ? <CommentModal title={`Reject v${version.version}`} label="Reason (required)" required confirmLabel="Reject" appearance="danger"
        onClose={() => setModal(null)} onConfirm={async (t) => { await act(() => frameworkApi.reject(version.id, t)); setModal(null); }} /> : null}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StrataFrameworkPage() {
  const { frameworkSlug } = useParams();
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  const frameworks = useStrategyFrameworks();
  const perspectives = usePerspectives();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const framework = useMemo(() => {
    const list = frameworks.data ?? [];
    if (frameworkSlug) return list.find((f) => f.slug === frameworkSlug) ?? null;
    return list.find((f) => f.framework_key === 'corporate') ?? list[0] ?? null;
  }, [frameworks.data, frameworkSlug]);

  const versions = useFrameworkVersions(framework?.id);
  const effective = useEffectiveFrameworkVersion(framework?.id);
  const effectiveMembers = useFrameworkMembers(effective.data?.id);
  const effVal = useFrameworkValidation(effective.data?.id);

  const refresh = () => qc.invalidateQueries({ queryKey: ['strata'] });
  const nameById = useMemo(() => new Map((perspectives.data ?? []).map((p) => [p.id, p.name])), [perspectives.data]);

  const memberColumns: Column<StrataFrameworkMember>[] = [
    { id: 'order', label: '#', width: 8, cell: ({ row }) => <span style={num}>{row.order_index + 1}</span> },
    { id: 'perspective', label: 'Perspective', flex: true, cell: ({ row }) => <span style={bodyStyle}>{nameById.get(row.perspective_id) ?? '—'}</span> },
    { id: 'weight', label: 'Weight', width: 20, align: 'end', cell: ({ row }) => <span style={num}>{Number(row.weight)}%</span> },
  ];

  const open = (versions.data ?? []).filter((v) => OPEN_STATES.includes(v.status));
  const history = (versions.data ?? []).filter((v) => HISTORY_STATES.includes(v.status));

  if (frameworks.isLoading) return <StrataPageShell title="Strategy framework"><Spinner /></StrataPageShell>;

  return (
    <StrataPageShell
      title="Strategy framework"
      docTitle="Strategy framework"
      trail={[{ text: 'Configuration' }, { text: 'Strategy framework' }]}
    >
      {error ? <div style={{ marginBottom: 12 }}><SectionMessage appearance="error" title="Action failed">{error}</SectionMessage></div> : null}

      {!framework ? (
        <StrataPanel title="Strategy framework" icon={<Layers size="small" label="" />}>
          <div style={{ padding: 16 }}>
            <EmptyState header="No framework yet" description="Create the corporate strategy framework to govern perspective membership and weights." />
            <Button appearance="primary" iconBefore={<Plus size="small" label="" />} isLoading={creating}
              onClick={async () => {
                setCreating(true); setError(null);
                try { await frameworkApi.create('Corporate Strategy Framework', 'The enterprise strategy framework.', 'corporate'); refresh(); }
                catch (e) { setError(e instanceof Error ? e.message : 'Create failed'); }
                finally { setCreating(false); }
              }}>Create framework</Button>
          </div>
        </StrataPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Current framework */}
          <StrataPanel
            title="Current framework" icon={<Layers size="small" label="" />}
            count={effectiveMembers.data?.length ?? null}
            actions={
              effective.data && open.length === 0 ? (
                <Button appearance="primary" onClick={async () => {
                  setError(null);
                  try { await frameworkApi.createDraftVersion(framework.id, 'Revision'); refresh(); }
                  catch (e) { setError(e instanceof Error ? e.message : 'Could not start a revision'); }
                }}>Propose changes</Button>
              ) : null
            }
          >
            <div style={{ padding: 16 }}>
              {effective.data ? (
                <>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ ...bodyStyle, fontWeight: 600 }}>{framework.name}</span>
                    <StatusLozenge status={effective.data.status} />
                    <span style={meta}>v{effective.data.version}</span>
                    <Lozenge appearance={effVal.data?.valid ? 'success' : 'removed'}>{effVal.data ? `Total ${effVal.data.total_weight}%` : '—'}</Lozenge>
                    {effective.data.provenance === 'legacy_unverified' ? <Lozenge appearance="moved">Legacy / unverified provenance</Lozenge> : null}
                    <span style={{ ...meta, marginLeft: 'auto' }}>Effective {fmtDate(effective.data.effective_from)}</span>
                  </div>
                  <JiraTable<StrataFrameworkMember>
                    columns={memberColumns}
                    data={effectiveMembers.data ?? []}
                    getRowId={(r) => r.id}
                  />
                </>
              ) : (
                <EmptyState header="No effective version" description="This framework has no approved effective version yet." />
              )}
            </div>
          </StrataPanel>

          {/* Proposed changes */}
          <StrataPanel title="Proposed changes" count={open.length}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {open.length === 0 ? <span style={meta}>No proposed changes in flight.</span> : null}
              {open.map((v) => (
                <VersionCard key={v.id} version={v} current={effectiveMembers.data ?? []}
                  perspectives={perspectives.data ?? []} userId={userId} onError={setError} refresh={refresh} />
              ))}
            </div>
          </StrataPanel>

          {/* History */}
          <StrataPanel title="History" count={history.length}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.length === 0 ? <span style={meta}>No superseded, retired or rejected versions.</span> : null}
              {history.map((v) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={bodyStyle}>Version {v.version}</span>
                  <StatusLozenge status={v.status} />
                  <span style={{ ...meta, marginLeft: 'auto' }}>{v.effective_to ? `Ended ${fmtDate(v.effective_to)}` : (v.change_reason ?? '')}</span>
                </div>
              ))}
            </div>
          </StrataPanel>
        </div>
      )}
    </StrataPageShell>
  );
}

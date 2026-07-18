/**
 * RD-DEF-001 · Review workspace — the governed review definition beyond the scheduling modal.
 *
 * One reachable surface for: chair + accountable owner, participants with explicit roles,
 * ordered agenda authoring (add / reorder / delete), and governed evidence references
 * (read-only links to existing masters via strata_review_links — never a copy, never
 * free text). Every write goes through the server (RPC or RLS+trigger); every refusal
 * renders verbatim. The workspace is only mounted for non-terminal reviews — terminal
 * reviews are frozen history (RD-DEF-005) and the server refuses their writes anyway.
 *
 * Legacy `origin='migrated'` reviews keep their D-6 truth: absent facts stay absent —
 * this surface never back-fills a chair, participant or agenda that was not recorded.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button, Heading, Lozenge, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Select, Spinner, Textfield,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { executionApi, governanceApi, kpiApi, valueApi } from '@/modules/strata/domain';
import { useInvalidateStrata, useProfileNames } from '@/modules/strata/hooks/useStrata';
import { labelize } from '@/modules/strata/components/format';
import type { StrataReview, StrataReviewParticipant } from '@/modules/strata/types';

const caption: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' };
const body: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' };

const PARTICIPANT_ROLES: Array<StrataReviewParticipant['role']> = ['chair', 'attendee', 'presenter', 'observer'];

/** Evidence-link types this picker can resolve to an existing governed master. */
const LINK_TYPES = [
  { value: 'kpi', label: 'KPI' },
  { value: 'okr', label: 'OKR' },
  { value: 'project_card', label: 'Project card' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'benefit', label: 'Benefit' },
  { value: 'snapshot', label: 'Locked snapshot' },
] as const;
type LinkType = (typeof LINK_TYPES)[number]['value'];

/** The agenda's canonical shape: an ORDERED jsonb array of `{ title }` items. */
function agendaItems(agenda: unknown): string[] {
  if (!Array.isArray(agenda)) return [];
  return agenda
    .map((it) => (typeof it === 'string' ? it : it && typeof it === 'object' && 'title' in it ? String((it as { title: unknown }).title ?? '') : ''))
    .filter((s) => s.trim() !== '');
}

export function ReviewWorkspaceModal({ review, onClose }: { review: StrataReview; onClose: () => void }) {
  const invalidate = useInvalidateStrata();
  const profilesQ = useProfileNames();

  const participantsQ = useQuery({
    queryKey: ['strata', 'review-participants', review.id],
    queryFn: () => governanceApi.reviewParticipants(review.id),
  });
  const linksQ = useQuery({
    queryKey: ['strata', 'review-links', review.id],
    queryFn: () => valueApi.reviewLinksOf(review.id),
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Roles
  const [chairId, setChairId] = useState<string | null>(review.chair_id);
  const [accountableId, setAccountableId] = useState<string | null>(review.accountable_owner_id);

  // Participants authoring
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<StrataReviewParticipant['role']>('attendee');

  // Agenda authoring — local order, persisted explicitly (exact persistence proven on reload).
  const [agenda, setAgenda] = useState<string[]>(() => agendaItems(review.agenda));
  const [newItem, setNewItem] = useState('');
  const [agendaDirty, setAgendaDirty] = useState(false);

  // Evidence links authoring
  const [linkType, setLinkType] = useState<LinkType>('kpi');
  const [linkTarget, setLinkTarget] = useState<string | null>(null);

  const targetsQ = useQuery({
    queryKey: ['strata', 'review-link-targets', linkType],
    queryFn: async (): Promise<Array<{ id: string; label: string }>> => {
      switch (linkType) {
        case 'kpi': return (await kpiApi.list()).map((k) => ({ id: k.id, label: k.name }));
        case 'okr': return (await kpiApi.okrs()).map((o) => ({ id: o.id, label: o.name }));
        case 'project_card': return (await executionApi.projectCards()).map((p) => ({ id: p.id, label: p.name }));
        case 'portfolio': return (await valueApi.portfolios()).map((p) => ({ id: p.id, label: p.name }));
        case 'benefit': return (await valueApi.benefits()).map((b) => ({ id: b.id, label: b.name }));
        case 'snapshot': return (await governanceApi.snapshots()).map((s) => ({ id: s.id, label: `${s.snapshot_key} · ${s.name}` }));
        default: return [];
      }
    },
  });

  const userOptions: SelectOption<string>[] = useMemo(() => {
    const out: SelectOption<string>[] = [];
    profilesQ.data?.forEach((p, id) => { if (p.name) out.push({ value: id, label: p.name }); });
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [profilesQ.data]);

  const personName = (id: string | null): string | null =>
    id ? profilesQ.data?.get(id)?.name ?? null : null;

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try {
      await fn();
      invalidate();
      await Promise.all([participantsQ.refetch(), linksQ.refetch()]);
    } catch (e) {
      // Verbatim: the server names the exact refusal (readiness gap, SoD, terminal state).
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const saveRoles = () => act(() => governanceApi.updateReview(review.id, {
    chairId: chairId ?? null,
    accountableOwnerId: accountableId ?? null,
    note: 'workspace: chair/accountable owner updated',
  }));

  const saveAgenda = () => act(async () => {
    await governanceApi.updateReview(review.id, {
      agenda: agenda.map((title) => ({ title })),
      note: 'workspace: agenda updated',
    });
    setAgendaDirty(false);
  });

  const move = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= agenda.length) return;
    const next = agenda.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setAgenda(next); setAgendaDirty(true);
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="large">
      <ModalHeader>
        <ModalTitle>Review workspace · {review.review_key} · {review.name}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ ...caption, margin: '0 0 var(--ds-space-200)' }}>
          A review is ready to convene when it has a locked snapshot, a chair, an accountable owner,
          at least one participant and an agenda. The server enforces this — nothing here can bypass it.
        </p>
        {error ? (
          <div style={{ marginBottom: 'var(--ds-space-200)' }} role="alert">
            <SectionMessage appearance="error" title="Rejected by the database">
              <p style={{ whiteSpace: 'pre-wrap' }} data-testid="strata-review-workspace-error">{error}</p>
            </SectionMessage>
          </div>
        ) : null}

        {/* ── Chair + accountable owner ─────────────────────────────────────── */}
        <Heading level={3} size="small">Accountability</Heading>
        <div style={{ display: 'flex', gap: 'var(--ds-space-150)', flexWrap: 'wrap', margin: 'var(--ds-space-100) 0 var(--ds-space-300)', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 220 }}>
            <span style={caption}>Chair</span>
            <Select
              options={userOptions}
              value={chairId ? { value: chairId, label: personName(chairId) ?? chairId } : null}
              onChange={(o) => setChairId(o?.value ?? null)}
              isClearable
              isSearchable
              usePortal
              aria-label="Chair"
            />
          </div>
          <div style={{ minWidth: 220 }}>
            <span style={caption}>Accountable owner</span>
            <Select
              options={userOptions}
              value={accountableId ? { value: accountableId, label: personName(accountableId) ?? accountableId } : null}
              onChange={(o) => setAccountableId(o?.value ?? null)}
              isClearable
              isSearchable
              usePortal
              aria-label="Accountable owner"
            />
          </div>
          <Button spacing="compact" appearance="primary" isDisabled={busy} onClick={() => void saveRoles()} testId="strata-workspace-save-roles">
            Save accountability
          </Button>
        </div>

        {/* ── Participants with explicit roles ──────────────────────────────── */}
        <Heading level={3} size="small">Participants</Heading>
        <div style={{ margin: 'var(--ds-space-100) 0 var(--ds-space-300)' }}>
          {participantsQ.isLoading ? <Spinner size="small" /> : (participantsQ.data ?? []).length === 0 ? (
            <p style={{ ...caption, margin: 0 }} data-testid="strata-workspace-no-participants">
              No participants recorded.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} data-testid="strata-workspace-participants">
              {(participantsQ.data ?? []).map((p) => (
                <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)', padding: 'var(--ds-space-075) 0', borderBottom: '1px solid var(--ds-border)' }}>
                  <span style={{ ...body, flex: 1, minWidth: 0 }}>{personName(p.user_id) ?? p.user_id}</span>
                  <Lozenge appearance={p.role === 'chair' ? 'inprogress' : 'default'}>{labelize(p.role)}</Lozenge>
                  <Button spacing="compact" appearance="subtle" isDisabled={busy}
                    onClick={() => void act(() => governanceApi.removeReviewParticipant(p.id))}
                    testId={`strata-workspace-remove-participant-${p.id}`}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 'var(--ds-space-100)', flexWrap: 'wrap', marginTop: 'var(--ds-space-150)', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 220 }}>
              <span style={caption}>Person</span>
              <Select
                options={userOptions}
                value={newUserId ? { value: newUserId, label: personName(newUserId) ?? newUserId } : null}
                onChange={(o) => setNewUserId(o?.value ?? null)}
                isSearchable
                usePortal
                aria-label="Add participant"
              />
            </div>
            <div style={{ minWidth: 140 }}>
              <span style={caption}>Role</span>
              <Select
                options={PARTICIPANT_ROLES.map((r) => ({ value: r, label: labelize(r) }))}
                value={{ value: newRole, label: labelize(newRole) }}
                onChange={(o) => setNewRole((o?.value as StrataReviewParticipant['role']) ?? 'attendee')}
                usePortal
                aria-label="Participant role"
              />
            </div>
            <Button spacing="compact" isDisabled={busy || !newUserId}
              onClick={() => { if (newUserId) void act(() => governanceApi.addReviewParticipant(review.id, newUserId, newRole)).then(() => setNewUserId(null)); }}
              testId="strata-workspace-add-participant">
              Add participant
            </Button>
          </div>
        </div>

        {/* ── Ordered agenda ────────────────────────────────────────────────── */}
        <Heading level={3} size="small">Agenda</Heading>
        <div style={{ margin: 'var(--ds-space-100) 0 var(--ds-space-300)' }}>
          {agenda.length === 0 ? (
            <p style={{ ...caption, margin: 0 }} data-testid="strata-workspace-no-agenda">Agenda is empty.</p>
          ) : (
            <ol style={{ margin: 0, paddingLeft: 'var(--ds-space-250)' }} data-testid="strata-workspace-agenda">
              {agenda.map((item, i) => (
                <li key={`${i}-${item}`} style={{ padding: 'var(--ds-space-050) 0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)' }}>
                    <span style={{ ...body, flex: 1, minWidth: 0 }}>{item}</span>
                    <Button spacing="compact" appearance="subtle" isDisabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move "${item}" up`}>↑</Button>
                    <Button spacing="compact" appearance="subtle" isDisabled={busy || i === agenda.length - 1} onClick={() => move(i, 1)} aria-label={`Move "${item}" down`}>↓</Button>
                    <Button spacing="compact" appearance="subtle" isDisabled={busy}
                      onClick={() => { setAgenda(agenda.filter((_, j) => j !== i)); setAgendaDirty(true); }}
                      aria-label={`Delete "${item}"`}>
                      Delete
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div style={{ display: 'flex', gap: 'var(--ds-space-100)', marginTop: 'var(--ds-space-150)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 260, flex: '1 1 260px' }}>
              <Textfield
                value={newItem}
                onChange={(e) => setNewItem((e.target as HTMLInputElement).value)}
                placeholder="New agenda item"
                aria-label="New agenda item"
                testId="strata-workspace-agenda-input"
              />
            </div>
            <Button spacing="compact" isDisabled={busy || newItem.trim() === ''}
              onClick={() => { setAgenda([...agenda, newItem.trim()]); setNewItem(''); setAgendaDirty(true); }}
              testId="strata-workspace-agenda-add">
              Add item
            </Button>
            <Button spacing="compact" appearance="primary" isDisabled={busy || !agendaDirty}
              onClick={() => void saveAgenda()} testId="strata-workspace-agenda-save">
              Save agenda
            </Button>
            {agendaDirty ? <span style={caption}>Unsaved agenda changes</span> : null}
          </div>
        </div>

        {/* ── Governed evidence references ──────────────────────────────────── */}
        <Heading level={3} size="small">Evidence references</Heading>
        <p style={{ ...caption, margin: 'var(--ds-space-050) 0 var(--ds-space-100)' }}>
          Read-only links to existing governed records — the review references them, it never copies
          or changes them.
        </p>
        <div style={{ marginBottom: 'var(--ds-space-100)' }}>
          {linksQ.isLoading ? <Spinner size="small" /> : (linksQ.data ?? []).length === 0 ? (
            <p style={{ ...caption, margin: 0 }} data-testid="strata-workspace-no-links">No evidence references.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} data-testid="strata-workspace-links">
              {(linksQ.data ?? []).map((l) => (
                <li key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)', padding: 'var(--ds-space-075) 0', borderBottom: '1px solid var(--ds-border)' }}>
                  <Lozenge appearance="default">{labelize(l.target_type)}</Lozenge>
                  <span style={{ ...body, flex: 1, minWidth: 0 }}>{l.target_name ?? l.target_id}</span>
                  <Button spacing="compact" appearance="subtle" isDisabled={busy}
                    onClick={() => void act(() => valueApi.unlinkReview(review.id, l.target_type, l.target_id))}
                    testId={`strata-workspace-unlink-${l.id}`}>
                    Unlink
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--ds-space-100)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 160 }}>
            <span style={caption}>Type</span>
            <Select
              options={LINK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={{ value: linkType, label: LINK_TYPES.find((t) => t.value === linkType)?.label ?? linkType }}
              onChange={(o) => { setLinkType((o?.value as LinkType) ?? 'kpi'); setLinkTarget(null); }}
              usePortal
              aria-label="Evidence type"
            />
          </div>
          <div style={{ minWidth: 260 }}>
            <span style={caption}>Record</span>
            <Select
              options={(targetsQ.data ?? []).map((t) => ({ value: t.id, label: t.label }))}
              value={linkTarget ? { value: linkTarget, label: (targetsQ.data ?? []).find((t) => t.id === linkTarget)?.label ?? linkTarget } : null}
              onChange={(o) => setLinkTarget(o?.value ?? null)}
              isSearchable
              usePortal
              aria-label="Evidence record"
            />
          </div>
          <Button spacing="compact" isDisabled={busy || !linkTarget}
            onClick={() => { if (linkTarget) void act(() => valueApi.linkReview(review.id, linkType, linkTarget)).then(() => setLinkTarget(null)); }}
            testId="strata-workspace-link-add">
            Link evidence
          </Button>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy} testId="strata-workspace-close">Close</Button>
      </ModalFooter>
    </Modal>
  );
}

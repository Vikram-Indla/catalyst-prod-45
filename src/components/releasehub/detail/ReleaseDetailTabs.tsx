/**
 * Release detail tab contents + Notify list (Phase 5b).
 * ScopeTab / ChangesTab / SignoffsTab read their data via the release-hub
 * hooks; NotifyList reads + edits rh_notify_subscribers. ADS tokens only.
 */
import React, { useMemo, useState } from 'react';
import Select from '@atlaskit/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  useReleaseScope,
  useReleaseChanges,
  useReleaseSignoffs,
  useNotifySubscribers,
  useAddNotifySubscriber,
  useRemoveNotifySubscriber,
  useReadinessChecks,
  useReleaseNotes,
  useReleaseProductionEvents,
  useReleaseAudit,
  useGenerateReleaseNotes,
  useSaveReleaseNotes,
  useReleaseWorkItems,
  useReleaseLinkWorkItem,
  useReleaseLinkBr,
} from '@/hooks/useReleaseHub';
import Button from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { catalystToast } from '@/lib/catalystToast';
import { JiraTable, makeKeyCell, makeStatusCell, makeAssigneeCell, makePriorityCell, type Column } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import TextArea from '@atlaskit/textarea';
import { Sparkles } from '@/lib/atlaskit-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { Avatar } from '@/components/ads/Avatar';
import { X, Plus } from '@/lib/atlaskit-icons';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-raised)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-link)',
  mono: 'var(--ds-font-family-code, monospace)',
};

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>{text}</div>;
}
function Loading() {
  return <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>Loading…</div>;
}
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}`,
};

export function ChangesTab({ releaseId }: { releaseId: string }) {
  const { data: changes = [], isLoading } = useReleaseChanges(releaseId);
  if (isLoading) return <Loading />;
  if (changes.length === 0) return <Empty text="No changes linked to this release yet." />;
  return (
    <div style={{ padding: '8px 0' }}>
      {changes.map((c) => (
        <div key={c.id} style={rowStyle}>
          <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.link, whiteSpace: 'nowrap' }}>{c.chgNumber}</span>
          <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
          <StatusLozenge status={c.status} />
        </div>
      ))}
    </div>
  );
}

export function SignoffsTab({ releaseId }: { releaseId: string }) {
  const { data: signoffs = [], isLoading } = useReleaseSignoffs(releaseId);
  if (isLoading) return <Loading />;
  if (signoffs.length === 0) return <Empty text="No sign-offs requested for this release yet." />;
  return (
    <div style={{ padding: '8px 0' }}>
      {signoffs.map((s) => (
        <div key={s.id} style={rowStyle}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, background: T.sunken, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>{s.role ?? '—'}</span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={s.approverName ?? 'Unassigned'} size="small" />
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text }}>{s.approverName ?? 'Unassigned'}</span>
            {s.chgNumber && <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{s.chgNumber}</span>}
          </div>
          <StatusLozenge status={s.status} />
        </div>
      ))}
    </div>
  );
}

function ScopeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, margin: '0 0 8px' }}>{title}</h3>
      {children}
    </div>
  );
}

// ── Link Work Item Modal ───────────────────────────────────────────────────────
function LinkWorkItemModal({ releaseId, onClose }: { releaseId: string; onClose: () => void }) {
  const [query, setQuery] = React.useState('');
  const [options, setOptions] = React.useState<{ label: string; value: string; issueType: string | null }[]>([]);
  const [selected, setSelected] = React.useState<{ label: string; value: string } | null>(null);
  const [searching, setSearching] = React.useState(false);
  const link = useReleaseLinkWorkItem(releaseId);

  const search = async (q: string) => {
    if (!q.trim()) { setOptions([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('ph_issues')
      .select('issue_key, summary, issue_type')
      .or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`)
      .limit(20);
    setOptions((data ?? []).map((r: any) => ({
      value: r.issue_key,
      label: `${r.issue_key} — ${r.summary ?? ''}`,
      issueType: r.issue_type ?? null,
    })));
    setSearching(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await link.mutateAsync(selected.value);
      catalystToast.success(`Linked ${selected.value}`);
      onClose();
    } catch (e: any) {
      catalystToast.error(e?.message ?? 'Failed to link work item');
    }
  };

  return (
    <ModalDialog onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Link work item</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ marginBottom: 8 }}>
          <Textfield
            placeholder="Search by key or summary…"
            value={query}
            onChange={(e) => { setQuery((e.target as HTMLInputElement).value); search((e.target as HTMLInputElement).value); }}
            autoFocus
          />
        </div>
        <Select
          options={options}
          value={selected}
          onChange={(opt) => setSelected(opt as any)}
          isLoading={searching}
          placeholder="Select a work item"
          formatOptionLabel={(opt: any) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {opt.issueType ? <JiraIssueTypeIcon type={opt.issueType} size={14} /> : null}
              <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', color: T.link, whiteSpace: 'nowrap' }}>{opt.value}</span>
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label.split(' — ')[1]}</span>
            </span>
          )}
          menuPortalTarget={document.body}
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" isDisabled={!selected || link.isPending} isLoading={link.isPending} onClick={handleSave}>
          Link
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ── Link BR Modal ──────────────────────────────────────────────────────────────
function LinkBrModal({ releaseId, alreadyLinked, onClose }: { releaseId: string; alreadyLinked: string[]; onClose: () => void }) {
  const [options, setOptions] = React.useState<{ label: string; value: string }[]>([]);
  const [selected, setSelected] = React.useState<{ label: string; value: string } | null>(null);
  const link = useReleaseLinkBr(releaseId);

  React.useEffect(() => {
    supabase.from('business_requests').select('id, title, request_key').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => {
        setOptions(
          (data ?? [])
            .filter((b: any) => !alreadyLinked.includes(b.id))
            .map((b: any) => ({ value: b.id, label: b.title ?? b.request_key ?? b.id }))
        );
      });
  }, [alreadyLinked]);

  const handleSave = async () => {
    if (!selected) return;
    try {
      await link.mutateAsync(selected.value);
      catalystToast.success(`Linked business request`);
      onClose();
    } catch (e: any) {
      catalystToast.error(e?.message ?? 'Failed to link BR');
    }
  };

  return (
    <ModalDialog onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Link business request</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Select
          options={options}
          value={selected}
          onChange={(opt) => setSelected(opt as any)}
          placeholder="Select a business request"
          formatOptionLabel={(opt: any) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <JiraIssueTypeIcon type="Business Request" size={14} />
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: T.text }}>{opt.label}</span>
            </span>
          )}
          menuPortalTarget={document.body}
          autoFocus
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" isDisabled={!selected || link.isPending} isLoading={link.isPending} onClick={handleSave}>
          Link
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

const SCOPE_WI_COLUMNS: Column<any>[] = [
  {
    id: 'key',
    label: 'Key',
    width: 10,
    alwaysVisible: true,
    defaultVisible: true,
    accessor: (r) => r.workItemKey ?? '',
    cell: makeKeyCell(
      (r) => r.workItemKey,
      undefined,
      undefined,
      (r) => r.issueType ? <JiraIssueTypeIcon type={r.issueType} size={14} /> : undefined,
    ),
  },
  {
    id: 'summary',
    label: 'Summary',
    flex: true,
    defaultVisible: true,
    accessor: (r) => r.summary ?? '',
    cell: ({ row }) => (
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.summary ?? '—'}
      </span>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    width: 12,
    defaultVisible: true,
    accessor: (r) => r.status ?? '',
    cell: makeStatusCell((r) => r.status, () => 'default' as any),
  },
  {
    id: 'assignee',
    label: 'Assignee',
    width: 10,
    defaultVisible: true,
    accessor: (r) => r.assigneeName ?? '',
    cell: makeAssigneeCell((r) => r.assigneeName ? { name: r.assigneeName, avatarUrl: r.assigneeAvatar } : null),
  },
  {
    id: 'priority',
    label: 'Priority',
    width: 8,
    defaultVisible: true,
    accessor: (r) => r.priority ?? '',
    cell: makePriorityCell((r) => r.priority),
  },
];

export function ScopeTab({ releaseId }: { releaseId: string }) {
  const { data: scope, isLoading: scopeLoading } = useReleaseScope(releaseId);
  const { data: workItems = [], isLoading: wiLoading } = useReleaseWorkItems(releaseId);
  const [showLinkWI, setShowLinkWI] = React.useState(false);
  const [showLinkBR, setShowLinkBR] = React.useState(false);
  if (scopeLoading) return <Loading />;
  const { brs = [], sprints = [] } = scope ?? {};
  const linkedBrIds = brs.map((b) => b.businessRequestId);

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Business requests */}
      <ScopeSection title="Business requests">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {brs.length === 0
            ? <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>No linked business requests</span>
            : brs.map((b) => (
              <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 16, background: T.sunken, border: `1px solid ${T.border}`, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text }}>
                <JiraIssueTypeIcon type="Business Request" size={14} />
                {b.title ?? b.businessRequestId}
              </span>
            ))}
        </div>
        <Button appearance="default" spacing="compact" onClick={() => setShowLinkBR(true)}>
          + Link BR
        </Button>
      </ScopeSection>

      {/* Sprints */}
      <ScopeSection title="Sprints">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {sprints.length === 0
            ? <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>No sprints linked</span>
            : sprints.map((s) => (
              <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 16, background: T.sunken, border: `1px solid ${T.border}`, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text }}>
                {s.code ? <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link }}>{s.code}</span> : null}
                {s.name ?? '—'}
              </span>
            ))}
        </div>
      </ScopeSection>

      {/* Work items */}
      <ScopeSection title="Work items">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button appearance="default" spacing="compact" onClick={() => setShowLinkWI(true)}>
            + Link work item
          </Button>
          <Button appearance="default" spacing="compact" onClick={() => setShowLinkBR(true)}>
            + Link BR
          </Button>
        </div>
        {wiLoading
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}><Spinner size="small" /><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>Loading work items…</span></div>
          : workItems.length === 0
            ? <Empty text="No work items in scope." />
            : <JiraTable columns={SCOPE_WI_COLUMNS} rows={workItems} getRowKey={(r) => r.id} density="compact" />
        }
      </ScopeSection>

      {showLinkWI && <LinkWorkItemModal releaseId={releaseId} onClose={() => setShowLinkWI(false)} />}
      {showLinkBR && <LinkBrModal releaseId={releaseId} alreadyLinked={linkedBrIds} onClose={() => setShowLinkBR(false)} />}
    </div>
  );
}

export function NotifyList({ itemType, itemId }: { itemType: 'release' | 'change'; itemId: string }) {
  const { data: subscribers = [] } = useNotifySubscribers(itemType, itemId);
  const add = useAddNotifySubscriber();
  const remove = useRemoveNotifySubscriber();
  const [adding, setAdding] = useState(false);

  const { data: approvedProfiles = [] } = useApprovedProfiles();

  const subscribedIds = useMemo(() => new Set(subscribers.map((s) => s.userId)), [subscribers]);
  const options = useMemo(
    () => approvedProfiles.filter((p) => !subscribedIds.has(p.id)).map((p) => ({ label: p.name, value: p.id })),
    [approvedProfiles, subscribedIds],
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>Notify</span>
      {subscribers.map((s) => (
        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.sunken, borderRadius: 12, padding: '0 8px 0 0' }}>
          <Avatar name={s.name ?? 'Unknown'} src={s.avatarUrl ?? undefined} size="xsmall" />
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text }}>{s.name ?? 'Unknown'}</span>
          <button
            onClick={() => remove.mutate({ id: s.id, itemType, itemId })}
            aria-label={`Remove ${s.name ?? 'subscriber'}`}
            style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: T.subtlest }}
          >
            <X size={12} style={{ color: T.subtlest }} />
          </button>
        </span>
      ))}
      {adding ? (
        <div style={{ width: 200 }}>
          <Select
            inputId="notify-add"
            options={options}
            autoFocus
            spacing="compact"
            menuPosition="fixed"
            placeholder="Add user…"
            onChange={(v: any) => { if (v) { add.mutate({ itemType, itemId, userId: v.value }); } setAdding(false); }}
            onBlur={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: T.link, background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 12, padding: '4px 8px', cursor: 'pointer' }}
        >
          <Plus size={12} style={{ color: T.link }} /> Add
        </button>
      )}
    </div>
  );
}

function ReadinessPill({ status }: { status: string }) {
  const map: Record<string, { label: string; fg: string; bg: string }> = {
    pass: { label: 'Pass', fg: 'var(--ds-text-success)', bg: 'var(--ds-background-success)' },
    fail: { label: 'Fail', fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
    pending: { label: 'Pending', fg: 'var(--ds-text-subtle)', bg: 'var(--ds-surface-sunken)' },
    na: { label: 'N/A', fg: 'var(--ds-text-subtlest)', bg: 'var(--ds-surface-sunken)' },
  };
  const m = map[status] ?? { label: status, fg: T.subtle, bg: T.sunken };
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap', minWidth: 56, textAlign: 'center' }}>{m.label}</span>;
}

export function ReadinessTab({ releaseId }: { releaseId: string }) {
  const { data: checks = [], isLoading } = useReadinessChecks(releaseId);
  if (isLoading) return <Loading />;
  if (checks.length === 0) return <Empty text="No readiness checks defined for this release yet." />;
  return (
    <div style={{ padding: '8px 0' }}>
      {checks.map((c) => (
        <div key={c.id} style={rowStyle}>
          <ReadinessPill status={c.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, margin: 0 }}>{c.label ?? c.checkKey}</p>
            {c.detail && <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '4px 0 0' }}>{c.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReleaseNotesTab({ releaseId }: { releaseId: string }) {
  const { data: note, isLoading } = useReleaseNotes(releaseId);
  const generate = useGenerateReleaseNotes();
  const save = useSaveReleaseNotes();
  const [draft, setDraft] = useState<string | null>(null);
  const [aiFlag, setAiFlag] = useState(false);

  if (isLoading) return <Loading />;
  const editing = draft !== null;

  const handleGenerate = () => generate.mutate(releaseId, {
    onSuccess: (md) => { setDraft(md); setAiFlag(true); },
    onError: () => catalystToast.error('Could not generate draft'),
  });
  const handleSave = () => save.mutate({ releaseId, contentMd: draft ?? '', aiGenerated: aiFlag }, {
    onSuccess: () => { catalystToast.success('Release notes saved'); setDraft(null); },
    onError: () => catalystToast.error('Could not save'),
  });

  const aiBtn = (label: string) => (
    <button onClick={handleGenerate} disabled={generate.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid var(--ds-border-discovery)`, background: 'var(--ds-background-discovery)', color: 'var(--ds-text-discovery)', cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 500, opacity: generate.isPending ? 0.6 : 1 }}>
      <Sparkles size={14} style={{ color: 'var(--ds-text-discovery)' }} /> {generate.isPending ? 'Generating…' : label}
    </button>
  );

  if (editing) {
    return (
      <div style={{ padding: '16px 0', width: '100%' }}>
        <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '0 0 8px' }}>AI-assisted draft from linked changes + work items — edit before saving.</p>
        <TextArea value={draft ?? ''} onChange={(e) => setDraft((e.target as HTMLTextAreaElement).value)} minimumRows={12} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={handleSave} disabled={save.isPending} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: 'none', background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}>{save.isPending ? 'Saving…' : 'Save'}</button>
          <button onClick={() => setDraft(null)} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.subtle, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {aiBtn(note?.contentMd ? 'Regenerate draft' : 'Generate draft')}
        {note?.contentMd && (
          <button onClick={() => { setDraft(note.contentMd ?? ''); setAiFlag(note.generatedByAi); }} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.subtle, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 500 }}>Edit</button>
        )}
      </div>
      {!note || !note.contentMd ? (
        <Empty text="No release notes yet. Generate an AI-assisted draft from the linked changes and work items." />
      ) : (
        <>
          {note.generatedByAi && (
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-discovery)', background: 'var(--ds-background-discovery)', padding: '0 8px', borderRadius: 3 }}>AI drafted</span>
          )}
          <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, margin: '8px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{note.contentMd}</p>
        </>
      )}
    </div>
  );
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null;
  const norm = result.toLowerCase();
  const map: Record<string, { fg: string; bg: string }> = {
    success: { fg: 'var(--ds-text-success)', bg: 'var(--ds-background-success)' },
    partial: { fg: 'var(--ds-text-warning)', bg: 'var(--ds-background-warning)' },
    failed: { fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
    rolled_back: { fg: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
  };
  const m = map[norm] ?? { fg: T.subtle, bg: T.sunken };
  return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: m.fg, background: m.bg, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>{result.replace(/_/g, ' ')}</span>;
}

export function ProductionEventsTab({ releaseId }: { releaseId: string }) {
  const { data: events = [], isLoading } = useReleaseProductionEvents(releaseId);
  if (isLoading) return <Loading />;
  if (events.length === 0) return <Empty text="No production events for this release yet." />;
  return (
    <div style={{ padding: '8px 0' }}>
      {events.map((e) => (
        <div key={e.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, margin: 0 }}>{e.title}</p>
            <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '4px 0 0' }}>{e.deployedAt ? format(new Date(e.deployedAt), 'MMM d, yyyy HH:mm') : '—'}</p>
          </div>
          <ResultBadge result={e.result} />
        </div>
      ))}
    </div>
  );
}

export function AuditTab({ releaseId }: { releaseId: string }) {
  const { data: entries = [], isLoading } = useReleaseAudit(releaseId);
  if (isLoading) return <Loading />;
  if (entries.length === 0) return <Empty text="No audit activity recorded yet." />;
  return (
    <div style={{ padding: '8px 0' }}>
      {entries.map((a) => (
        <div key={a.id} style={rowStyle}>
          <Avatar name={a.actorName || 'System'} size="small" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, margin: 0 }}>
              <span style={{ fontWeight: 600 }}>{a.actorName || 'System'}</span> {a.action}{a.detail ? ` — ${a.detail}` : ''}
            </p>
          </div>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, whiteSpace: 'nowrap' }}>
            {a.createdAt ? `${formatDistanceToNowStrict(new Date(a.createdAt))} ago` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

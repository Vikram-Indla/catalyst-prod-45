/**
 * Release detail tab contents + Notify list (Phase 5b).
 * ScopeTab / ChangesTab / SignoffsTab read their data via the release-hub
 * hooks; NotifyList reads + edits rh_notify_subscribers. ADS tokens only.
 */
import React, { useMemo, useState } from 'react';
import Select from '@atlaskit/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useReleaseScope,
  useReleaseChanges,
  useReleaseSignoffs,
  useNotifySubscribers,
  useAddNotifySubscriber,
  useRemoveNotifySubscriber,
} from '@/hooks/useReleaseHub';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { Avatar } from '@/components/ads/Avatar';
import { X, Plus } from '@/lib/atlaskit-icons';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  link: 'var(--ds-link, #0C66E4)',
  mono: 'var(--ds-font-family-code, monospace)',
};

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>{text}</div>;
}
function Loading() {
  return <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest }}>Loading…</div>;
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
          <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.link, whiteSpace: 'nowrap' }}>{c.chgNumber}</span>
          <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 14, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
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
          <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.subtle, background: T.sunken, padding: '0 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>{s.role ?? '—'}</span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={s.approverName ?? 'Unassigned'} size="small" />
            <span style={{ fontFamily: RH.fontBody, fontSize: 14, color: T.text }}>{s.approverName ?? 'Unassigned'}</span>
            {s.chgNumber && <span style={{ fontFamily: T.mono, fontSize: 12, color: T.subtlest }}>{s.chgNumber}</span>}
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
      <h3 style={{ fontFamily: RH.fontDisplay, fontSize: 14, fontWeight: 600, color: T.text, margin: '0 0 8px' }}>{title}</h3>
      {children}
    </div>
  );
}

export function ScopeTab({ releaseId }: { releaseId: string }) {
  const { data, isLoading } = useReleaseScope(releaseId);
  if (isLoading) return <Loading />;
  const scope = data ?? { brs: [], sprints: [], workItems: [] };
  return (
    <div style={{ padding: '8px 0' }}>
      <ScopeSection title="Business requests">
        {scope.brs.length === 0 ? <Empty text="No business requests linked." /> : scope.brs.map((b) => (
          <div key={b.id} style={rowStyle}><span style={{ fontFamily: RH.fontBody, fontSize: 14, color: T.text }}>{b.title ?? b.businessRequestId}</span></div>
        ))}
      </ScopeSection>
      <ScopeSection title="Sprints">
        {scope.sprints.length === 0 ? <Empty text="No sprints linked." /> : scope.sprints.map((s) => (
          <div key={s.id} style={rowStyle}>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.link }}>{s.code ?? '—'}</span>
            <span style={{ fontFamily: RH.fontBody, fontSize: 14, color: T.text }}>{s.name ?? ''}</span>
          </div>
        ))}
      </ScopeSection>
      <ScopeSection title="Work items">
        {scope.workItems.length === 0 ? <Empty text="No work items in scope. Linked sprints contribute their items automatically." /> : scope.workItems.map((w) => (
          <div key={w.id} style={rowStyle}>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.link }}>{w.workItemKey}</span>
            <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest }}>{w.inclusionSource}</span>
          </div>
        ))}
      </ScopeSection>
    </div>
  );
}

export function NotifyList({ itemType, itemId }: { itemType: 'release' | 'change'; itemId: string }) {
  const { data: subscribers = [] } = useNotifySubscribers(itemType, itemId);
  const add = useAddNotifySubscriber();
  const remove = useRemoveNotifySubscriber();
  const [adding, setAdding] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['release-hub', 'notify', 'users'],
    enabled: adding,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').not('full_name', 'is', null).order('full_name');
      return (data ?? []) as { id: string; full_name: string | null }[];
    },
  });

  const subscribedIds = useMemo(() => new Set(subscribers.map((s) => s.userId)), [subscribers]);
  const options = useMemo(
    () => users.filter((u) => !subscribedIds.has(u.id)).map((u) => ({ label: u.full_name ?? 'Unknown', value: u.id })),
    [users, subscribedIds],
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.subtlest }}>Notify</span>
      {subscribers.map((s) => (
        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.sunken, borderRadius: 12, padding: '2px 8px 2px 2px' }}>
          <Avatar name={s.name ?? 'Unknown'} src={s.avatarUrl ?? undefined} size="xsmall" />
          <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.text }}>{s.name ?? 'Unknown'}</span>
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
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: T.link, background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 12, padding: '2px 8px', cursor: 'pointer' }}
        >
          <Plus size={12} style={{ color: T.link }} /> Add
        </button>
      )}
    </div>
  );
}

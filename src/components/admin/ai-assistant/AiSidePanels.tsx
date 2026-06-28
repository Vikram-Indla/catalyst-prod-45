import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Textfield } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { T, AVATAR } from './tokens';
import { Icon, ICONS, catIcon } from './icons';
import { RiskLozenge, ResultLozenge, BulkTag } from './RiskLozenge';
import CatalystAvatar from '@/components/shared/CatalystAvatar';

type Console = ReturnType<typeof import('./useAiCommandConsole').useAiCommandConsole>;

export function AiCommandLibrary({ c }: { c: Console }) {
  const tabs: Console['railTab'][] = ['All', 'Single', 'Bulk'];
  return (
    <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)' }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${T.borderSubtle}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>Command library</span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: T.subtle, background: T.btnDefault, borderRadius: 10, padding: '0px 8px' }}>{c.libCount}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <Textfield value={c.search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => c.setSearch(e.target.value)} placeholder="Search commands…" aria-label="Search commands"
            elemBeforeInput={<span style={{ paddingLeft: 8, display: 'inline-flex', color: T.iconSubtle }}><Icon path={ICONS.search} size={14} w={2} /></span>} />
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => c.setRailTab(t)}
              style={{ flex: 1, height: 28, border: `1px solid ${c.railTab === t ? T.link : T.border}`, background: c.railTab === t ? T.selected : 'transparent', color: c.railTab === t ? T.link : T.subtle, borderRadius: 4, font: 'inherit', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ overflowY: 'auto', padding: '8px 10px 12px' }}>
        {c.railGroups.length === 0 && <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>No commands match "{c.search}".</div>}
        {c.railGroups.map(g => (
          <div key={g.cat} style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 6px' }}>
              <span style={{ color: T.iconSubtle, flex: '0 0 auto' }}><Icon path={catIcon(g.cat)} size={14} w={1.8} /></span>
              <span style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: T.subtlest }}>{g.cat}</span>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--ds-font-size-50)', color: T.disabled }}>{g.count}</span>
            </div>
            {g.items.map((it, i) => (
              <button key={i} onClick={it.onPick} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 6, padding: 8, cursor: 'pointer', font: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.selected)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: T.text }}>{it.title}</span>
                  {it.bulk && <BulkTag />}
                  <span style={{ marginLeft: 'auto' }}><RiskLozenge risk={it.risk} /></span>
                </div>
                <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtlest, marginTop: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.desc}</div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const AVATAR_COLORS = [AVATAR.purple, AVATAR.teal, AVATAR.blue, AVATAR.red, AVATAR.amber];

function avatarBg(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

type ActivityKind = 'role' | 'failed_login' | 'pending_invite';
interface ActivityRow {
  sortKey: string;
  name: string;
  action: string;
  time: string;
  kind: ActivityKind;
}

export function AiRecentActivity() {
  const [q, setQ] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ai-admin-recent-activity'],
    queryFn: async (): Promise<ActivityRow[]> => {
      const cutoff7d = new Date(Date.now() - 7 * 86400000).toISOString();
      const cutoff24h = new Date(Date.now() - 86400000).toISOString();

      const [{ data: roleAssignments }, { data: failedLogins }, { data: pendingInvites }] = await Promise.all([
        supabase
          .from('user_product_roles')
          .select('created_at, user_id, role_id')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('login_audit_log')
          .select('email, created_at')
          .eq('success', false)
          .gte('created_at', cutoff7d)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('user_invitations')
          .select('email, full_name, created_at')
          .is('accepted_at', null)
          .lt('created_at', cutoff24h)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const userIds = [...new Set((roleAssignments ?? []).map(r => r.user_id))];
      const roleIds = [...new Set((roleAssignments ?? []).map(r => r.role_id))];
      const [{ data: profiles }, { data: roles }] = userIds.length
        ? await Promise.all([
            supabase.from('profiles').select('id, full_name').in('id', userIds),
            supabase.from('product_roles').select('id, name').in('id', roleIds),
          ])
        : [{ data: [] }, { data: [] }];

      const pMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.full_name ?? '']));
      const rMap = Object.fromEntries((roles ?? []).map(r => [r.id, r.name ?? '']));

      const loginMap: Record<string, { count: number; latest: string }> = {};
      for (const l of (failedLogins ?? [])) {
        if (!loginMap[l.email]) loginMap[l.email] = { count: 0, latest: l.created_at };
        loginMap[l.email].count++;
        if (l.created_at > loginMap[l.email].latest) loginMap[l.email].latest = l.created_at;
      }

      const inviteMap: Record<string, string> = {};
      for (const i of (pendingInvites ?? [])) {
        if (!inviteMap[i.email] || i.created_at > inviteMap[i.email]) {
          inviteMap[i.email] = i.created_at;
        }
      }

      const items: ActivityRow[] = [
        ...(roleAssignments ?? []).map(row => ({
          sortKey: row.created_at,
          name: pMap[row.user_id] ?? 'Unknown user',
          action: `${rMap[row.role_id] ?? 'role'} assigned`,
          time: relTime(row.created_at),
          kind: 'role' as const,
        })),
        ...Object.entries(loginMap).map(([email, info]) => ({
          sortKey: info.latest,
          name: email,
          action: info.count > 1 ? `${info.count} failed login attempts` : 'Failed login attempt',
          time: relTime(info.latest),
          kind: 'failed_login' as const,
        })),
        ...Object.entries(inviteMap).map(([email, createdAt]) => ({
          sortKey: createdAt,
          name: email,
          action: 'Invite not accepted',
          time: relTime(createdAt),
          kind: 'pending_invite' as const,
        })),
      ];

      return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    },
    staleTime: 0,
    refetchInterval: 30000,
  });

  const needle = q.trim().toLowerCase();
  const filtered = needle ? rows.filter(a => a.name.toLowerCase().includes(needle)) : rows;

  return (
    <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 8px', borderBottom: `1px solid ${T.borderSubtle}` }}>
        <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text }}>Recent activity</span>
        {isLoading && <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>Loading…</span>}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>Last 7d</span>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.borderSubtle}` }}>
        <Textfield
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
          placeholder="Search by name…"
          aria-label="Filter activity"
          elemBeforeInput={<span style={{ paddingLeft: 8, display: 'inline-flex', color: T.iconSubtle }}><Icon path={ICONS.search} size={14} w={2} /></span>}
        />
      </div>
      <div style={{ padding: '4px 6px 8px', maxHeight: 460, overflowY: 'auto' }}>
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>
            {needle ? `No results for "${q}".` : 'No recent activity.'}
          </div>
        )}
        {filtered.map((a, i) => {
          const isFailedLogin = a.kind === 'failed_login';
          const isPendingInvite = a.kind === 'pending_invite';
          const result: 'Done' | 'Pending' | 'Stopped' = isFailedLogin
            ? 'Stopped'
            : isPendingInvite
            ? 'Pending'
            : 'Done';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 6 }}
              onMouseEnter={e => (e.currentTarget.style.background = T.surfaceSunken)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <CatalystAvatar name={a.name} size="small" />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <span style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', color: isFailedLogin ? T.textDanger : isPendingInvite ? T.textWarning : T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.action}</span>
                <span style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', color: T.disabled, marginTop: 0 }}>{a.time}</span>
              </span>
              <ResultLozenge result={result} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

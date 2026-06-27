import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Textfield } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { T, AVATAR } from './tokens';
import { Icon, ICONS, catIcon } from './icons';
import { RiskLozenge, ResultLozenge, BulkTag } from './RiskLozenge';

type Console = ReturnType<typeof import('./useAiCommandConsole').useAiCommandConsole>;

export function AiCommandLibrary({ c }: { c: Console }) {
  const tabs: Console['railTab'][] = ['All', 'Single', 'Bulk'];
  return (
    <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)' }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${T.borderSubtle}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Command library</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.subtle, background: T.btnDefault, borderRadius: 10, padding: '1px 8px' }}>{c.libCount}</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <Textfield value={c.search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => c.setSearch(e.target.value)} placeholder="Search commands…" aria-label="Search commands"
            elemBeforeInput={<span style={{ paddingLeft: 8, display: 'inline-flex', color: T.iconSubtle }}><Icon path={ICONS.search} size={14} w={2} /></span>} />
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => c.setRailTab(t)}
              style={{ flex: 1, height: 28, border: `1px solid ${c.railTab === t ? T.link : T.border}`, background: c.railTab === t ? T.selected : 'transparent', color: c.railTab === t ? T.link : T.subtle, borderRadius: 4, font: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ overflowY: 'auto', padding: '8px 10px 12px' }}>
        {c.railGroups.length === 0 && <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12, color: T.subtlest }}>No commands match "{c.search}".</div>}
        {c.railGroups.map(g => (
          <div key={g.cat} style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 4px 6px' }}>
              <span style={{ color: T.iconSubtle, flex: '0 0 auto' }}><Icon path={catIcon(g.cat)} size={14} w={1.8} /></span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: T.subtlest }}>{g.cat}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: T.disabled }}>{g.count}</span>
            </div>
            {g.items.map((it, i) => (
              <button key={i} onClick={it.onPick} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', borderRadius: 6, padding: 8, cursor: 'pointer', font: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.selected)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{it.title}</span>
                  {it.bulk && <BulkTag />}
                  <span style={{ marginLeft: 'auto' }}><RiskLozenge risk={it.risk} /></span>
                </div>
                <div style={{ fontSize: 12, color: T.subtlest, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.desc}</div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const AVATAR_COLORS = [AVATAR.purple, AVATAR.teal, AVATAR.blue, AVATAR.red, AVATAR.amber];

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}
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

export function AiRecentActivity() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ai-admin-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_product_roles')
        .select('created_at, user_id, role_id')
        .order('created_at', { ascending: false })
        .limit(8);
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(r => r.user_id))];
      const roleIds = [...new Set(data.map(r => r.role_id))];
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', userIds),
        supabase.from('product_roles').select('id, name').in('id', roleIds),
      ]);
      const pMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.full_name ?? '']));
      const rMap = Object.fromEntries((roles ?? []).map(r => [r.id, r.name ?? '']));
      return data.map(row => ({
        name: pMap[row.user_id] ?? 'Unknown user',
        action: `${rMap[row.role_id] ?? 'role'} assigned`,
        time: relTime(row.created_at),
      }));
    },
    staleTime: 0,
    refetchInterval: 30000,
  });

  return (
    <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: `1px solid ${T.borderSubtle}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Recent activity</span>
        {isLoading && <span style={{ fontSize: 11, color: T.subtlest }}>Loading…</span>}
        <a href="/admin/access" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: T.link, textDecoration: 'none', cursor: 'pointer' }}>View all</a>
      </div>
      <div style={{ padding: '4px 6px 8px' }}>
        {!isLoading && rows.length === 0 && (
          <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: T.subtlest }}>No role changes yet.</div>
        )}
        {rows.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surfaceSunken)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: avatarBg(a.name), color: T.inverse, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 10, flex: '0 0 auto' }}>
              {initials(a.name)}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ display: 'block', fontSize: 12, color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.action}</span>
              <span style={{ display: 'block', fontSize: 11, color: T.disabled, marginTop: 1 }}>{a.time}</span>
            </span>
            <ResultLozenge result="Done" />
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { Textfield } from '@/components/ads';
import { T, AVATAR } from './tokens';
import { Icon, ICONS, catIcon } from './icons';
import { RiskLozenge, ResultLozenge, BulkTag } from './RiskLozenge';
import type { ActivityItem } from './aiAdminConsole.types';

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

// Demo data — wire to admin_audit_log (latest N entries, user-centric) in a future PR.
const RECENT: ActivityItem[] = [
  { initials: 'VI', avatarBg: AVATAR.purple, name: 'Vikram Indla', action: 'Product Owner role added', meta: 'by A. Rao · just now', result: 'Done' },
  { initials: 'MK', avatarBg: AVATAR.teal, name: 'Maria Kapoor', action: 'Invited as Viewer', meta: 'by A. Rao · 11:38', result: 'Done' },
  { initials: 'TL', avatarBg: AVATAR.blue, name: 'Team Lead · role', action: 'Allowed to edit releases', meta: 'by D. Mehta · 11:02', result: 'Done' },
  { initials: 'JM', avatarBg: AVATAR.amber, name: 'Jon Mathers', action: 'Invitation sent', meta: 'by D. Mehta · 10:47', result: 'Pending' },
  { initials: 'SD', avatarBg: AVATAR.red, name: 'Senior Developer · role', action: 'Sprint permission change stopped', meta: 'by A. Rao · Yesterday', result: 'Stopped' },
];

export function AiRecentActivity() {
  return (
    <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadowRaised }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: `1px solid ${T.borderSubtle}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Recent activity</span>
        <a style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: T.link, textDecoration: 'none', cursor: 'pointer' }}>View all</a>
      </div>
      <div style={{ padding: '4px 6px 8px' }}>
        {RECENT.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surfaceSunken)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: a.avatarBg, color: T.inverse, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 10, flex: '0 0 auto' }}>{a.initials}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ display: 'block', fontSize: 12, color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.action}</span>
              <span style={{ display: 'block', fontSize: 11, color: T.disabled, marginTop: 1 }}>{a.meta}</span>
            </span>
            <ResultLozenge result={a.result} />
          </div>
        ))}
      </div>
    </div>
  );
}

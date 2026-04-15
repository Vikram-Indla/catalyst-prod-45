/**
 * KanbanToolbar — Search, filters, density, group by
 */
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Filter } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { KanbanAvatar } from './KanbanAvatar';
import type { GroupByMode } from './kanban-types';
import type { KanbanThemeTokens, KanbanDensity } from './kanban-tokens';

/* ═══ AVATAR STACK FILTER ═══ */

export function AvatarStackFilter({ allAssignees, selected, onChange, avatarsByName, tk }: {
  allAssignees: { name: string; count: number }[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  avatarsByName: Map<string, string>;
  tk: KanbanThemeTokens;
}) {
  const top = allAssignees.filter(a => a.name !== 'Unassigned').slice(0, 6);
  const overflow = allAssignees.filter(a => a.name !== 'Unassigned').length - 6;
  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      {top.map((a, i) => {
        const isSel = selected.has(a.name);
        const url = avatarsByName.get(a.name.toLowerCase());
        return (
          <button
            key={a.name}
            onClick={() => { const n = new Set(selected); if (isSel) n.delete(a.name); else n.add(a.name); onChange(n); }}
            title={a.name}
            style={{
              position: 'relative', marginLeft: i === 0 ? 0 : -6, zIndex: top.length - i,
              width: 28, height: 28, borderRadius: '50%',
              border: isSel ? `2px solid ${tk.selectedAccent}` : `2px solid ${tk.surfaceBg}`,
              background: tk.surfaceBg, cursor: 'pointer', padding: 0,
              transition: 'transform 80ms', transform: isSel ? 'scale(1.15)' : 'scale(1)',
              outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = '20'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = isSel ? 'scale(1.15)' : 'scale(1)'; e.currentTarget.style.zIndex = String(top.length - i); }}
          >
            <KanbanAvatar name={a.name} url={url} size={24} tk={tk} />
          </button>
        );
      })}
      {overflow > 0 && (
        <span style={{
          marginLeft: 2, fontSize: 10, fontWeight: 600, color: tk.textMuted,
          background: tk.badgeBg, borderRadius: 10, padding: '2px 6px',
          lineHeight: '16px', whiteSpace: 'nowrap',
        }}>+{overflow}</span>
      )}
    </div>
  );
}

/* ═══ REUSABLE DROPDOWN WRAPPER ═══ */

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return { open, setOpen, ref };
}

/* ═══ EPIC FILTER ═══ */

export function EpicFilterDropdown({ epics, selected, onChange, tk }: {
  epics: { key: string; summary: string | null; count: number }[];
  selected: string[];
  onChange: (v: string[]) => void;
  tk: KanbanThemeTokens;
}) {
  const { open, setOpen, ref } = useDropdown();
  const [q, setQ] = useState('');
  const filtered = epics.filter(e => e.key.toLowerCase().includes(q.toLowerCase()) || (e.summary && e.summary.toLowerCase().includes(q.toLowerCase())));
  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <FilterTrigger label="Epic" count={active ? selected.length : 0} active={active} onClick={() => setOpen(p => !p)} tk={tk} />
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, width: 340, background: tk.surfaceBg, border: `1px solid ${tk.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${tk.borderSubtle}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: tk.textDisabled }} />
              <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search epics" autoFocus
                style={{ width: '100%', height: 32, paddingLeft: 28, paddingRight: 8, border: `1px solid ${tk.inputBorder}`, borderRadius: 4, fontSize: 13, color: tk.textPrimary, background: tk.inputBg, outline: 'none' }} />
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map(e => {
              const isSel = selected.includes(e.key);
              return (
                <CheckRow key={e.key} checked={isSel} onClick={() => onChange(isSel ? selected.filter(k => k !== e.key) : [...selected, e.key])} tk={tk}>
                  <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: tk.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.summary || e.key}</div>
                    <div style={{ fontSize: 11, color: tk.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{e.key}</div>
                  </div>
                </CheckRow>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: 12, fontSize: 12, color: tk.textDisabled, textAlign: 'center' }}>No epics found</div>}
          </div>
          {active && <ClearAll onClick={() => onChange([])} tk={tk} />}
        </div>
      )}
    </div>
  );
}

/* ═══ TYPE FILTER ═══ */

export function TypeFilterDropdown({ types, selected, onChange, tk }: {
  types: { type: string; count: number }[];
  selected: string[];
  onChange: (v: string[]) => void;
  tk: KanbanThemeTokens;
}) {
  const { open, setOpen, ref } = useDropdown();
  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <FilterTrigger label="Type" count={active ? selected.length : 0} active={active} onClick={() => setOpen(p => !p)} tk={tk} />
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, width: 220, background: tk.surfaceBg, border: `1px solid ${tk.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {types.map(t => {
              const isSel = selected.includes(t.type);
              return (
                <CheckRow key={t.type} checked={isSel} onClick={() => onChange(isSel ? selected.filter(k => k !== t.type) : [...selected, t.type])} tk={tk}>
                  <JiraIssueTypeIcon type={t.type} size={14} />
                  <span style={{ flex: 1, fontSize: 13, color: tk.textPrimary }}>{t.type}</span>
                  <span style={{ fontSize: 11, color: tk.textMuted }}>{t.count}</span>
                </CheckRow>
              );
            })}
          </div>
          {active && <ClearAll onClick={() => onChange([])} tk={tk} />}
        </div>
      )}
    </div>
  );
}

/* ═══ PRIORITY FILTER ═══ */

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

export function PriorityFilterDropdown({ selected, onChange, tk }: {
  selected: string[];
  onChange: (v: string[]) => void;
  tk: KanbanThemeTokens;
}) {
  const { open, setOpen, ref } = useDropdown();
  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <FilterTrigger label="Priority" count={active ? selected.length : 0} active={active} onClick={() => setOpen(p => !p)} tk={tk} />
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, width: 200, background: tk.surfaceBg, border: `1px solid ${tk.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {PRIORITY_OPTIONS.map(p => {
              const isSel = selected.includes(p);
              return (
                <CheckRow key={p} checked={isSel} onClick={() => onChange(isSel ? selected.filter(k => k !== p) : [...selected, p])} tk={tk}>
                  <PriorityBars priority={normalisePriority(p)} />
                  <span style={{ flex: 1, fontSize: 13, color: tk.textPrimary }}>{p}</span>
                </CheckRow>
              );
            })}
          </div>
          {active && <ClearAll onClick={() => onChange([])} tk={tk} />}
        </div>
      )}
    </div>
  );
}

/* ═══ QUICK FILTERS ═══ */

const QUICK_FILTER_OPTIONS = [
  { key: 'recently-updated', label: 'Recently Updated' },
  { key: 'assigned-to-me', label: 'Assigned to me' },
  { key: 'flagged', label: 'Flagged' },
] as const;

export function QuickFilterDropdown({ selected, onChange, tk }: {
  selected: Set<string>;
  onChange: (v: Set<string>) => void;
  tk: KanbanThemeTokens;
}) {
  const { open, setOpen, ref } = useDropdown();
  const active = selected.size > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
        borderRadius: 3, border: active ? `2px solid ${tk.selectedAccent}` : `1px solid ${tk.border}`,
        background: tk.surfaceBg, color: active ? tk.selectedAccent : tk.textSecondary,
        fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
      }}>
        <Filter size={13} />
        Quick{active && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, borderRadius: 9, background: tk.selectedAccent, color: '#FFFFFF', fontSize: 10, fontWeight: 700 }}>{selected.size}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, width: 220, background: tk.surfaceBg, border: `1px solid ${tk.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          {QUICK_FILTER_OPTIONS.map(o => {
            const isSel = selected.has(o.key);
            return (
              <CheckRow key={o.key} checked={isSel} onClick={() => { const next = new Set(selected); if (isSel) next.delete(o.key); else next.add(o.key); onChange(next); }} tk={tk}>
                <span style={{ fontSize: 13, color: tk.textPrimary }}>{o.label}</span>
              </CheckRow>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ DENSITY TOGGLE ═══ */

export function DensityToggle({ value, onChange, tk }: {
  value: KanbanDensity;
  onChange: (d: KanbanDensity) => void;
  tk: KanbanThemeTokens;
}) {
  const opts: { key: KanbanDensity; label: string }[] = [
    { key: 'compact', label: 'Compact' },
    { key: 'dense', label: 'Dense' },
    { key: 'comfortable', label: 'Comfortable' },
  ];
  return (
    <div className="flex" style={{ borderRadius: 4, border: `1px solid ${tk.border}`, overflow: 'hidden' }}>
      {opts.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: '0 10px', height: 28, fontSize: 11, fontWeight: value === o.key ? 600 : 400,
          background: value === o.key ? tk.selectedAccent : tk.surfaceBg,
          color: value === o.key ? '#FFFFFF' : tk.textSecondary,
          border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

/* ═══ GROUP BY ═══ */

const GRP_OPTS: { key: GroupByMode; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'epic', label: 'Epic' },
  { key: 'priority', label: 'Priority' },
  { key: 'fixVersion', label: 'Fix Version' },
];

export function GroupByBtn({ value, onChange, tk }: {
  value: GroupByMode;
  onChange: (v: GroupByMode) => void;
  tk: KanbanThemeTokens;
}) {
  const { open, setOpen, ref } = useDropdown();
  const active = value !== 'none';
  const lbl = GRP_OPTS.find(o => o.key === value)?.label;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
        borderRadius: 3, border: active ? `2px solid ${tk.selectedAccent}` : `1px solid ${tk.border}`,
        background: tk.surfaceBg, color: active ? tk.selectedAccent : tk.textSecondary,
        fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
      }}>
        {active ? `Group: ${lbl}` : 'Group'} <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 100, width: 200, background: tk.surfaceBg, border: `1px solid ${tk.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          <div style={{ padding: '4px 8px 2px', fontSize: 10, fontWeight: 600, color: tk.textDisabled, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group by</div>
          {GRP_OPTS.map(o => {
            const sel = value === o.key;
            return (
              <button key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '6px 8px', border: 'none',
                  background: sel ? tk.dropHighlight : 'transparent',
                  cursor: 'pointer', fontSize: 12,
                  color: sel ? tk.selectedAccent : tk.textPrimary,
                  fontWeight: sel ? 600 : 400,
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = tk.surfaceHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = sel ? tk.dropHighlight : 'transparent'; }}
              >
                <div style={{ width: 14 }}>{sel && <Check size={12} color={tk.selectedAccent} />}</div>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ SHARED PRIMITIVES ═══ */

function FilterTrigger({ label, count, active, onClick, tk }: {
  label: string; count: number; active: boolean;
  onClick: () => void; tk: KanbanThemeTokens;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
      borderRadius: 3, border: active ? `2px solid ${tk.selectedAccent}` : `1px solid ${tk.border}`,
      background: tk.surfaceBg, color: active ? tk.selectedAccent : tk.textSecondary,
      fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
    }}>
      {label}
      {count > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 18, height: 18, borderRadius: 9,
          background: tk.selectedAccent, color: '#FFFFFF', fontSize: 10, fontWeight: 700,
        }}>{count}</span>
      )}
      <ChevronDown size={12} />
    </button>
  );
}

function CheckRow({ checked, onClick, tk, children }: {
  checked: boolean; onClick: () => void;
  tk: KanbanThemeTokens; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '8px 12px', border: 'none',
        background: checked ? tk.dropHighlight : 'transparent',
        cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={ev => { if (!checked) (ev.currentTarget as HTMLElement).style.background = tk.surfaceHover; }}
      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = checked ? tk.dropHighlight : 'transparent'; }}
    >
      <div style={{
        width: 16, height: 16,
        border: checked ? 'none' : `1.5px solid ${tk.textDisabled}`,
        borderRadius: 3,
        background: checked ? tk.selectedAccent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {checked && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
      </div>
      {children}
    </button>
  );
}

function ClearAll({ onClick, tk }: { onClick: () => void; tk: KanbanThemeTokens }) {
  return (
    <div style={{ padding: '6px 12px', borderTop: `1px solid ${tk.borderSubtle}` }}>
      <button onClick={onClick} style={{
        fontSize: 12, color: tk.selectedAccent,
        background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500,
      }}>Clear all</button>
    </div>
  );
}

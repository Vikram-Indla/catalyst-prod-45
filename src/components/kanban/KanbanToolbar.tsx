/**
 * KanbanToolbar — Search, filters, density, group by
 * Enterprise-grade, fully theme-aware via KanbanThemeTokens (ADS dark)
 */
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Filter, X } from 'lucide-react';
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
            className="focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{
              position: 'relative', marginLeft: i === 0 ? 0 : -6, zIndex: top.length - i,
              width: 30, height: 30, borderRadius: '50%',
              border: isSel ? `2px solid ${tk.selectedAccent}` : `2px solid ${tk.surfaceBg}`,
              background: tk.surfaceBg, cursor: 'pointer', padding: 0,
              transition: 'transform 80ms', transform: isSel ? 'scale(1.15)' : 'scale(1)',
              outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = '20'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = isSel ? 'scale(1.15)' : 'scale(1)'; e.currentTarget.style.zIndex = String(top.length - i); }}
          >
            <KanbanAvatar name={a.name} url={url} size={26} tk={tk} />
          </button>
        );
      })}
      {overflow > 0 && (
        <span style={{
          marginLeft: 4, fontSize: 11, fontWeight: 600, color: tk.textMuted,
          background: tk.badgeBg, borderRadius: 10, padding: '2px 8px',
          lineHeight: '18px', whiteSpace: 'nowrap',
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
        <DropdownPanel width={360} tk={tk}>
          <div style={{ padding: 10, borderBottom: `1px solid ${tk.border}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: tk.textMuted }} />
              <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search epics..." autoFocus
                style={{
                  width: '100%', height: 36, paddingLeft: 32, paddingRight: q ? 32 : 10,
                  border: `1.5px solid ${tk.inputBorder}`, borderRadius: 6,
                  fontSize: 13.5, color: tk.textPrimary, background: tk.inputBg, outline: 'none',
                  fontFamily: 'var(--cp-font-body)',
                  transition: 'border-color 120ms',
                }}
                onFocus={e => e.currentTarget.style.borderColor = tk.selectedAccent}
                onBlur={e => e.currentTarget.style.borderColor = tk.inputBorder}
              />
              {q && (
                <button onClick={() => setQ('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: tk.textMuted, display: 'flex',
                }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {filtered.map(e => {
              const isSel = selected.includes(e.key);
              return (
                <CheckRow key={e.key} checked={isSel} onClick={() => onChange(isSel ? selected.filter(k => k !== e.key) : [...selected, e.key])} tk={tk}>
                  <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: tk.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{e.summary || e.key}</div>
                    <div style={{ fontSize: 11, color: tk.textMuted, fontFamily: 'var(--cp-font-mono)' }}>{e.key}</div>
                  </div>
                </CheckRow>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: 16, fontSize: 13, color: tk.textMuted, textAlign: 'center' }}>No epics found</div>}
          </div>
          {active && <ClearAll onClick={() => onChange([])} tk={tk} />}
        </DropdownPanel>
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
        <DropdownPanel width={240} tk={tk}>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {types.map(t => {
              const isSel = selected.includes(t.type);
              return (
                <CheckRow key={t.type} checked={isSel} onClick={() => onChange(isSel ? selected.filter(k => k !== t.type) : [...selected, t.type])} tk={tk}>
                  <JiraIssueTypeIcon type={t.type} size={16} />
                  <span style={{ flex: 1, fontSize: 13.5, color: tk.textPrimary, fontWeight: 450 }}>{t.type}</span>
                  <span style={{ fontSize: 11, color: tk.textMuted, fontWeight: 600, fontFamily: 'var(--cp-font-mono)' }}>{t.count}</span>
                </CheckRow>
              );
            })}
          </div>
          {active && <ClearAll onClick={() => onChange([])} tk={tk} />}
        </DropdownPanel>
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
        <DropdownPanel width={220} tk={tk}>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {PRIORITY_OPTIONS.map(p => {
              const isSel = selected.includes(p);
              return (
                <CheckRow key={p} checked={isSel} onClick={() => onChange(isSel ? selected.filter(k => k !== p) : [...selected, p])} tk={tk}>
                  <PriorityBars priority={normalisePriority(p)} />
                  <span style={{ flex: 1, fontSize: 13.5, color: tk.textPrimary, fontWeight: 450 }}>{p}</span>
                </CheckRow>
              );
            })}
          </div>
          {active && <ClearAll onClick={() => onChange([])} tk={tk} />}
        </DropdownPanel>
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
      <button onClick={() => setOpen(p => !p)}
        className="focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
          borderRadius: 6, border: active ? `2px solid ${tk.selectedAccent}` : `1px solid ${tk.border}`,
          background: active ? tk.dropHighlight : tk.surfaceBg, color: active ? tk.selectedAccent : tk.textSecondary,
          fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
          transition: 'all 120ms ease', outline: 'none',
        }}>
        <Filter size={14} />
        Quick{active && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: 10, background: tk.selectedAccent, color: 'var(--ds-surface, #FFFFFF)', fontSize: 11, fontWeight: 700 }}>{selected.size}</span>}
      </button>
      {open && (
        <DropdownPanel width={240} tk={tk}>
          {QUICK_FILTER_OPTIONS.map(o => {
            const isSel = selected.has(o.key);
            return (
              <CheckRow key={o.key} checked={isSel} onClick={() => { const next = new Set(selected); if (isSel) next.delete(o.key); else next.add(o.key); onChange(next); }} tk={tk}>
                <span style={{ fontSize: 13.5, color: tk.textPrimary, fontWeight: 450 }}>{o.label}</span>
              </CheckRow>
            );
          })}
        </DropdownPanel>
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
    <div className="flex" style={{ borderRadius: 6, border: `1px solid ${tk.border}`, overflow: 'hidden' }}>
      {opts.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: '0 12px', height: 30, fontSize: 12, fontWeight: value === o.key ? 600 : 450,
          background: value === o.key ? tk.selectedAccent : tk.surfaceBg,
          color: value === o.key ? 'var(--ds-surface, #FFFFFF)' : tk.textSecondary,
          border: 'none', cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
          transition: 'all 100ms ease',
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
      <button onClick={() => setOpen(p => !p)}
        className="focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 14px',
          borderRadius: 6, border: active ? `2px solid ${tk.selectedAccent}` : `1px solid ${tk.border}`,
          background: active ? tk.dropHighlight : tk.surfaceBg, color: active ? tk.selectedAccent : tk.textSecondary,
          fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
          fontFamily: 'var(--cp-font-body)', transition: 'all 120ms ease', outline: 'none',
        }}>
        {active ? `Group: ${lbl}` : 'Group'} <ChevronDown size={13} />
      </button>
      {open && (
        <DropdownPanel width={220} align="right" tk={tk}>
          <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group by</div>
          {GRP_OPTS.map(o => {
            const sel = value === o.key;
            return (
              <button key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', border: 'none', borderRadius: 4,
                  background: sel ? tk.dropHighlight : 'transparent',
                  cursor: 'pointer', fontSize: 13.5,
                  color: sel ? tk.selectedAccent : tk.textPrimary,
                  fontWeight: sel ? 600 : 450,
                  fontFamily: 'var(--cp-font-body)',
                  transition: 'background 80ms ease',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = tk.surfaceHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = sel ? tk.dropHighlight : 'transparent'; }}
              >
                <div style={{ width: 16 }}>{sel && <Check size={13} color={tk.selectedAccent} strokeWidth={2.5} />}</div>
                {o.label}
              </button>
            );
          })}
        </DropdownPanel>
      )}
    </div>
  );
}

/* ═══ SHARED PRIMITIVES ═══ */

function DropdownPanel({ children, width, align, tk }: { children: React.ReactNode; width: number; align?: 'right'; tk: KanbanThemeTokens }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)',
      ...(align === 'right' ? { right: 0 } : { left: 0 }),
      zIndex: 100, width, background: tk.surfaceBg,
      border: `1px solid ${tk.border}`, borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.12)',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

function FilterTrigger({ label, count, active, onClick, tk }: {
  label: string; count: number; active: boolean;
  onClick: () => void; tk: KanbanThemeTokens;
}) {
  return (
    <button onClick={onClick}
      className="focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
        borderRadius: 6, border: active ? `2px solid ${tk.selectedAccent}` : `1px solid ${tk.border}`,
        background: active ? tk.dropHighlight : tk.surfaceBg, color: active ? tk.selectedAccent : tk.textSecondary,
        fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
        transition: 'all 120ms ease', outline: 'none',
      }}>
      {label}
      {count > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 20, height: 20, borderRadius: 10,
          background: tk.selectedAccent, color: 'var(--ds-surface, #FFFFFF)', fontSize: 11, fontWeight: 700,
        }}>{count}</span>
      )}
      <ChevronDown size={13} />
    </button>
  );
}

function CheckRow({ checked, onClick, children, tk }: {
  checked: boolean; onClick: () => void;
  children: React.ReactNode; tk: KanbanThemeTokens;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '9px 14px', border: 'none', borderRadius: 4,
        background: checked ? tk.dropHighlight : 'transparent',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={ev => { if (!checked) (ev.currentTarget as HTMLElement).style.background = tk.surfaceHover; }}
      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = checked ? tk.dropHighlight : 'transparent'; }}
    >
      <div style={{
        width: 18, height: 18,
        border: checked ? 'none' : `2px solid ${tk.borderSubtle}`,
        borderRadius: 4,
        background: checked ? tk.selectedAccent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 100ms ease',
      }}>
        {checked && <Check size={12} color="var(--ds-surface, #FFFFFF)" strokeWidth={3} />}
      </div>
      {children}
    </button>
  );
}

function ClearAll({ onClick, tk }: { onClick: () => void; tk: KanbanThemeTokens }) {
  return (
    <div style={{ padding: '8px 14px', borderTop: `1px solid ${tk.border}` }}>
      <button onClick={onClick} style={{
        fontSize: 13, color: tk.selectedAccent,
        background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
        fontFamily: 'var(--cp-font-body)',
      }}>Clear all</button>
    </div>
  );
}
// src/components/layout/HuddleTicketsModal.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHuddleStore } from '@/store/huddleStore';
import { useActiveHuddle } from '@/hooks/chat/useHuddleData';
import { useHuddleCommonTickets, type HuddleTicket } from '@/hooks/chat/useHuddleCommonTickets';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { EditableAssignee } from '@/components/EditableAssignee/EditableAssignee';

/**
 * HuddleTicketsModal — opens ~5s after a call connects, listing the tickets
 * shared by the two participants (their backlog ph_issues). Inline assignee +
 * status editing, click-through to detail. Draggable; collapse / close; reopen
 * from the call FAB.
 */

const POS_KEY = 'huddle-tickets-pos';
const STATUS_CHOICES = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];
type Pos = { top: number; left: number };

function loadPos(): Pos {
  try { const raw = localStorage.getItem(POS_KEY); if (raw) return JSON.parse(raw) as Pos; } catch { /* ignore */ }
  return { top: 140, left: 80 };
}

export function HuddleTicketsModal() {
  const active = useHuddleStore((s) => s.active);
  const mode = useHuddleStore((s) => s.ticketsWindow);
  const setMode = useHuddleStore((s) => s.setTicketsWindow);
  const autoOpened = useHuddleStore((s) => s.ticketsAutoOpened);
  const markAutoOpened = useHuddleStore((s) => s.markTicketsAutoOpened);

  const connected = active?.connectionState === 'connected';
  const { huddle } = useActiveHuddle(active?.conversationId ?? null);
  const participantIds = (huddle?.participants ?? []).map((p) => p.userId);
  const { tickets, loading, assigneeOptions, updateAssignee, updateStatus } =
    useHuddleCommonTickets(participantIds, !!active && mode !== 'closed');
  const openDetail = useGlobalSearchStore((s) => s.openDetail);

  const [pos, setPos] = useState<Pos>(loadPos);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // auto-open ~5s after the call connects (once)
  useEffect(() => {
    if (!active || !connected || autoOpened) return;
    const t = setTimeout(() => { markAutoOpened(); setMode('open'); }, 5000);
    return () => clearTimeout(t);
  }, [active, connected, autoOpened, markAutoOpened, setMode]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-huddle-btn]')) return;
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current; const el = wrapRef.current;
    if (!d || !el || e.buttons === 0) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    el.style.left = `${Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, d.ox + dx))}px`;
    el.style.top = `${Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 8, d.oy + dy))}px`;
  }, []);
  const endDrag = useCallback(() => {
    const d = dragRef.current; const el = wrapRef.current; dragRef.current = null;
    if (!d || !d.moved || !el) return;
    const r = el.getBoundingClientRect();
    const next = { top: Math.max(8, r.top), left: Math.max(8, r.left) };
    setPos(next);
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  if (!active || mode === 'closed') return null;

  const collapsed = mode === 'collapsed';
  const names = (huddle?.participants ?? []).map((p) => p.name || 'Someone');
  const titleText = names.length ? `Shared tickets · ${names.join(' & ')}` : 'Shared tickets';

  const titleBar = (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        flex: '0 0 auto', height: 38, display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 10px 0 12px', cursor: 'grab', touchAction: 'none',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderBottom: collapsed ? 'none' : '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: collapsed ? 12 : '12px 12px 0 0',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ds-icon-success, #22A06B)', flex: '0 0 auto' }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {titleText} {!collapsed && !loading ? `(${tickets.length})` : ''}
      </span>
      <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
        <button type="button" data-huddle-btn title={collapsed ? 'Expand' : 'Collapse'}
          onClick={() => setMode(collapsed ? 'open' : 'collapsed')} style={winBtn}>
          {collapsed ? <ExpandIcon /> : <MinIcon />}
        </button>
        <button type="button" data-huddle-btn title="Close" onClick={() => setMode('closed')} style={winBtn}><CloseIcon /></button>
      </span>
    </div>
  );

  return (
    <div
      ref={wrapRef}
      role="dialog"
      aria-label="Shared tickets"
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 66,
        width: 520, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 12,
        boxShadow: '0 12px 34px rgba(9,30,66,.28)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {titleBar}
      {!collapsed && (
        <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13 }}>Loading tickets…</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13 }}>No shared tickets.</div>
          ) : (
            tickets.map((t) => (
              <TicketRow key={t.issue_key} t={t} assigneeOptions={assigneeOptions}
                onAssignee={(name) => { void updateAssignee(t.issue_key, name); }}
                onStatus={(s) => { void updateStatus(t.issue_key, s); }}
                onOpen={() => openDetail({ id: t.issue_key, panelMode: true })} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TicketRow({ t, assigneeOptions, onAssignee, onStatus, onOpen }: {
  t: HuddleTicket;
  assigneeOptions: { name: string; avatarUrl?: string; userId?: string }[];
  onAssignee: (name: string | null) => void;
  onStatus: (status: string) => void;
  onOpen: () => void;
}) {
  const statusOpts = STATUS_CHOICES.includes(t.status ?? '') || !t.status ? STATUS_CHOICES : [t.status, ...STATUS_CHOICES];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
      <button type="button" onClick={onOpen} title="Open detail"
        style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
        <JiraIssueTypeIcon issueType={t.issue_type} size={16} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-link, #0C66E4)', flex: '0 0 auto' }}>{t.issue_key}</span>
        <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.summary}</span>
      </button>
      <select
        value={STATUS_CHOICES.includes(t.status ?? '') ? (t.status ?? '') : (t.status ? t.status : '')}
        onChange={(e) => onStatus(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        style={{ flex: '0 0 auto', fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-surface, #FFFFFF)', color: 'var(--ds-text, #172B4D)', cursor: 'pointer', maxWidth: 130 }}
      >
        {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <span onClick={(e) => e.stopPropagation()} style={{ flex: '0 0 auto' }}>
        <EditableAssignee currentAssignee={t.assignee_display_name} options={assigneeOptions} onSelect={onAssignee} />
      </span>
    </div>
  );
}

const winBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--ds-surface-sunken, #F7F8F9)', color: 'var(--ds-text, #172B4D)',
};
const MinIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>);
const ExpandIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>);
const CloseIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>);

/**
 * Product Roadmap — Slide-out detail drawer (420px, right side)
 * Polish: focus trap, Escape closes, 0.2s slide, milestone diamonds
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Paperclip, Copy, Link2, Star, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { RoadmapInitiative } from './types/roadmap.types';
import { TYPE_COLORS, STATUS_COLORS, PRIORITY_COLORS, INK, SURFACE, FONT, DETAIL_PANEL_WIDTH } from './constants/roadmap.constants';

interface RoadmapDetailPanelProps {
  item: RoadmapInitiative | null;
  isOpen: boolean;
  onClose: () => void;
}

const ACTIONS = [
  { icon: Pencil, label: 'Edit' },
  { icon: Paperclip, label: 'Attach' },
  { icon: Copy, label: 'Clone' },
  { icon: Link2, label: 'Link' },
  { icon: Star, label: 'Star' },
  { icon: Trash2, label: 'Delete' },
];

const TABS = ['Details', 'Score', 'Budget', 'Risks', 'Milestones', 'Links', 'Audit'];

export function RoadmapDetailPanel({ item, isOpen, onClose }: RoadmapDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('Details');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();

    const trapHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapHandler);
    return () => document.removeEventListener('keydown', trapHandler);
  }, [isOpen, item?.id]);

  useEffect(() => {
    if (isOpen) setActiveTab('Details');
  }, [item?.id, isOpen]);

  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
  };

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 200,
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease-out',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={item ? `Detail panel: ${item.titleEn}` : 'Detail panel'}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: DETAIL_PANEL_WIDTH, maxWidth: '90vw',
          backgroundColor: '#FFFFFF', borderLeft: `1px solid ${SURFACE.border}`,
          boxShadow: '-8px 0 30px rgba(0,0,0,0.08)', zIndex: 201,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.2s ease-out',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: FONT.body,
        }}
      >
        {item && (
          <>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${SURFACE.borderLight}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, fontFamily: FONT.mono, background: TYPE_COLORS[item.type]?.light, color: TYPE_COLORS[item.type]?.solid }}>
                      {item.initiativeKey}
                    </span>
                    <span className="truncate" style={{ fontSize: 16, fontWeight: 600, color: INK[1] }}>
                      {item.titleEn}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', fontSize: 12, fontWeight: 500, borderRadius: 12, background: STATUS_COLORS[item.status]?.bg, color: STATUS_COLORS[item.status]?.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[item.status]?.color }} />
                      {item.status}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', fontSize: 12, fontWeight: 500, borderRadius: 12, background: PRIORITY_COLORS[item.priority]?.bg, color: PRIORITY_COLORS[item.priority]?.color }}>
                      {item.priority}
                    </span>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  onClick={onClose}
                  className="flex items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', background: 'transparent', color: INK[4], transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.borderLight)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  aria-label="Close panel"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex gap-1 px-5 py-2" style={{ borderBottom: `1px solid ${SURFACE.borderLight}` }}>
              {ACTIONS.map(a => (
                <button
                  key={a.label}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
                  style={{ color: INK[3], background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.borderLight)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <a.icon size={14} />
                  {a.label}
                </button>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex px-5" style={{ borderBottom: `1px solid ${SURFACE.border}` }}>
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
                  style={{
                    padding: '10px 12px', fontSize: 13,
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? '#2563EB' : INK[3],
                    background: 'transparent', border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                    cursor: 'pointer', marginBottom: -1,
                    transition: 'color 0.15s ease',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 roadmap-scroll">
              {activeTab === 'Details' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Type" value={
                    <span className="flex items-center gap-1.5">
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[item.type]?.solid }} />
                      {TYPE_COLORS[item.type]?.label}
                    </span>
                  } />
                  <Field label="Owner" value={
                    <span className="flex items-center gap-2">
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: item.ownerColor, color: '#FFF', fontSize: 9, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{item.ownerInitials}</span>
                      {item.ownerName}
                    </span>
                  } />
                  <Field label="Start Date" value={<span className="flex items-center gap-1"><Calendar size={12} />{fmtDate(item.startDate)}</span>} />
                  <Field label="End Date" value={<span className="flex items-center gap-1"><Calendar size={12} />{fmtDate(item.endDate)}</span>} />
                  <Field label="Progress" value={
                    <div className="flex items-center gap-2">
                      <div style={{ width: 80, height: 6, background: SURFACE.borderLight, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${item.progress}%`, height: '100%', background: TYPE_COLORS[item.type]?.solid, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{item.progress}%</span>
                    </div>
                  } />
                  <Field label="Priority" value={item.priority} />

                  <div className="col-span-2" style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${SURFACE.borderLight}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: INK[4], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Arabic Title</div>
                    <div dir="rtl" style={{ fontSize: 14, color: INK[2], lineHeight: 1.6 }}>{item.titleAr}</div>
                  </div>

                  {item.milestones.length > 0 && (
                    <div className="col-span-2" style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${SURFACE.borderLight}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: INK[4], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Milestones</div>
                      {item.milestones.map(m => (
                        <div key={m.id} className="flex items-center gap-2 py-1">
                          <span style={{ width: 8, height: 8, borderRadius: 1, transform: 'rotate(45deg)', background: m.completed ? '#16A34A' : INK[4], border: '2px solid #FFFFFF', boxShadow: '0 0 0 1px ' + SURFACE.border }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: INK[2] }}>{m.title}</span>
                          <span style={{ fontSize: 11, color: INK[4], marginLeft: 'auto' }}>{fmtDate(m.targetDate)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab !== 'Details' && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                  <div style={{ fontSize: 14, color: INK[4], fontWeight: 500 }}>{activeTab} — Coming soon</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: INK[4], letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: INK[1] }}>{value}</div>
    </div>
  );
}

/**
 * Board Config Panel — 460px slide-in from right with 4 tabs
 * Cycle 3: ESC close, save prompt
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, GripVertical, Trash2 } from 'lucide-react';
import type { PHBoard } from '@/services/project-hub.service';
import type { CardFieldConfig } from '@/types/project-hub.types';
import { STATUS_CONFIG } from '@/types/project-hub.types';

interface Props {
  board: PHBoard | null;
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<PHBoard>) => void;
}

type Tab = 'columns' | 'cards' | 'filters' | 'general';

const CARD_FIELDS: { key: keyof CardFieldConfig; label: string; locked?: boolean }[] = [
  { key: 'type', label: 'Type Icon', locked: true },
  { key: 'key', label: 'Issue Key', locked: true },
  { key: 'title', label: 'Title', locked: true },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'due', label: 'Due Date' },
  { key: 'source', label: 'Source Tag' },
  { key: 'overdue', label: 'Overdue Warning' },
];

export function PHConfigPanel({ board, open, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('columns');
  const [cardFields, setCardFields] = useState<CardFieldConfig>(
    board?.card_fields ?? { type: true, key: true, title: true, priority: true, assignee: true, due: true, source: true, overdue: true }
  );
  const [boardName, setBoardName] = useState(board?.name ?? '');
  const [filterJql, setFilterJql] = useState('');
  const [dirty, setDirty] = useState(false);

  // Reset state when board changes
  useEffect(() => {
    if (board) {
      setCardFields(board.card_fields ?? { type: true, key: true, title: true, priority: true, assignee: true, due: true, source: true, overdue: true });
      setBoardName(board.name ?? '');
      setDirty(false);
    }
  }, [board?.id]);

  // ESC close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  }, [dirty]);

  useEffect(() => {
    if (open) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  const handleClose = () => {
    if (dirty) {
      // Auto-save on close
      onSave({ card_fields: cardFields, name: boardName || board?.name } as any);
    }
    onClose();
  };

  if (!board || !open) return null;

  const columns = board.columns ?? [];
  const tabs: { key: Tab; label: string }[] = [
    { key: 'columns', label: 'Columns' },
    { key: 'cards', label: 'Cards' },
    { key: 'filters', label: 'Filters' },
    { key: 'general', label: 'General' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(15,23,42,.4)', animation: 'phFadeIn 200ms ease' }}
        onClick={handleClose}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 460,
          background: '#fff',
          borderLeft: '1px solid #E2E8F0',
          boxShadow: '-8px 0 30px rgba(15,23,42,.1)',
          animation: 'phSlideInRight 200ms ease',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 flex-shrink-0" style={{ height: 52, borderBottom: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Board Configuration</span>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} color="#64748B" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: activeTab === t.key ? 600 : 500,
                color: activeTab === t.key ? '#2563EB' : '#64748B',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === t.key ? '#2563EB' : 'transparent'}`,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'color 120ms ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'columns' && (
            <div className="flex flex-col gap-2">
              {columns.map((col: any, i: number) => {
                const statuses = col.statuses ?? [];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 rounded-lg border"
                    style={{ borderColor: '#E2E8F0', background: '#FAFBFC' }}
                  >
                    <GripVertical size={14} color="#D1D5DB" className="cursor-grab flex-shrink-0" />
                    <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: col.color }} />
                    <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{col.name}</span>
                    <div className="flex gap-1 flex-wrap">
                      {statuses.map((s: string) => {
                        const cfg = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG];
                        return (
                          <span key={s} className="rounded-full" style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 6px',
                            background: cfg?.bg ?? '#F1F5F9', color: cfg?.color ?? '#64748B',
                          }}>
                            {cfg?.label ?? s}
                          </span>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                      WIP {col.wip_limit || '∞'}
                    </span>
                    <button
                      className="p-1 rounded transition-colors"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Trash2 size={12} color="#EF4444" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'cards' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Card Field Visibility
              </div>
              <div className="flex flex-col gap-1">
                {CARD_FIELDS.map(f => (
                  <label
                    key={f.key}
                    className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors"
                    style={{ fontSize: 13, color: '#334155' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={cardFields[f.key]}
                      disabled={f.locked}
                      onChange={() => {
                        if (!f.locked) {
                          setCardFields(prev => ({ ...prev, [f.key]: !prev[f.key] }));
                          setDirty(true);
                        }
                      }}
                      className="accent-blue-600"
                      style={{ width: 14, height: 14 }}
                    />
                    {f.label}
                    {f.locked && <span style={{ fontSize: 9, color: '#94A3B8', marginLeft: 'auto' }}>Required</span>}
                  </label>
                ))}
              </div>

              {/* Live Preview Card */}
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 20, marginBottom: 8 }}>
                Live Preview
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                <div className="rounded-lg bg-white border p-3" style={{ borderColor: '#E2E8F0', borderLeft: '3px solid #2563EB' }}>
                  <div className="flex items-center gap-1 mb-1">
                    {cardFields.type && <span className="rounded inline-flex items-center justify-center" style={{ width: 14, height: 14, background: '#2563EB', fontSize: 8, color: '#fff' }}>✓</span>}
                    {cardFields.key && <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#64748B' }}>PROJ-123</span>}
                    {cardFields.source && <span style={{ fontSize: 7, padding: '0 3px', borderRadius: 2, background: '#EFF6FF', color: '#2563EB', fontWeight: 700 }}>JIRA</span>}
                  </div>
                  {cardFields.overdue && <div style={{ fontSize: 9, color: '#D97706' }}>⚠ 3d overdue</div>}
                  {cardFields.title && <div style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', marginBottom: 4 }}>Sample issue title…</div>}
                  <div className="flex items-center justify-between">
                    {cardFields.priority && <span style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, background: '#FFFBEB', color: '#D97706' }}>high</span>}
                    <div className="flex items-center gap-1">
                      {cardFields.due && <span style={{ fontSize: 9, color: '#94A3B8' }}>Mar 15</span>}
                      {cardFields.assignee && <span className="rounded-full inline-flex items-center justify-center" style={{ width: 16, height: 16, background: '#E2E8F0', fontSize: 7 }}>👤</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'filters' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Quick Filters
              </div>
              {['My Items', 'Bugs Only', 'Unassigned', 'Overdue', 'On Hold'].map(f => (
                <label
                  key={f}
                  className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors"
                  style={{ fontSize: 13, color: '#334155' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <input type="checkbox" className="accent-blue-600" style={{ width: 14, height: 14 }} />
                  {f}
                </label>
              ))}
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 8 }}>
                JQL Filter
              </div>
              <textarea
                value={filterJql}
                onChange={e => setFilterJql(e.target.value)}
                placeholder="type = bug AND priority = urgent"
                className="w-full rounded-md p-3"
                style={{
                  border: '1px solid #E2E8F0',
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  resize: 'vertical',
                  minHeight: 80,
                  color: '#334155',
                }}
              />
            </div>
          )}

          {activeTab === 'general' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Board Name
              </div>
              <input
                value={boardName}
                onChange={e => { setBoardName(e.target.value); setDirty(true); }}
                className="w-full rounded-md px-3 py-2 mb-6"
                style={{ border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A' }}
              />
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-md transition-colors"
                  style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E2E8F0', background: '#fff', color: '#334155', cursor: 'pointer' }}
                >
                  Duplicate Board
                </button>
                <button
                  className="px-4 py-2 rounded-md transition-colors"
                  style={{ fontSize: 12, fontWeight: 500, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer' }}
                >
                  Delete Board
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 flex-shrink-0"
          style={{ height: 52, borderTop: '1px solid #E2E8F0' }}
        >
          <button
            onClick={() => { setDirty(false); onClose(); }}
            className="px-4 py-1.5 rounded-md transition-colors"
            style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', borderRadius: 6 }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({ card_fields: cardFields, name: boardName || board.name } as any);
              setDirty(false);
              onClose();
            }}
            className="px-4 py-1.5 rounded-md transition-colors"
            style={{ fontSize: 12, fontWeight: 600, border: 'none', background: '#2563EB', color: '#fff', cursor: 'pointer', borderRadius: 6 }}
          >
            Save
          </button>
        </div>
      </div>

      <style>{`
        @keyframes phSlideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes phFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

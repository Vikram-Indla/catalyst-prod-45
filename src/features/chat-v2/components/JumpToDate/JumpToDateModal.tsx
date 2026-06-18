import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeftDoubleIcon,
  ChevronLeftIcon,
  ChevronRightDoubleIcon,
  ChevronRightIcon,
  XIcon,
} from '../shared/Icon';
import { buildMonthGrid, isSameDay, MONTH_LABELS, WEEKDAY_LABELS } from '../Schedule/scheduleHelpers';

interface JumpToDateModalProps {
  onCancel: () => void;
  onPick: (iso: string) => void;
  earliestIso?: string;
  latestIso?: string;
}

export function JumpToDateModal({ onCancel, onPick, earliestIso, latestIso }: JumpToDateModalProps) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const earliest = earliestIso ? new Date(earliestIso) : null;
  const latest = latestIso ? new Date(latestIso) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const grid = buildMonthGrid(view.y, view.m);

  const inRange = (d: Date) => {
    if (earliest && d.getTime() < earliest.setHours(0, 0, 0, 0)) return false;
    if (latest && d.getTime() > latest.setHours(23, 59, 59, 999)) return false;
    return true;
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Jump to a specific date"
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
        zIndex: 'var(--cv2-modal-z, 1000)' as any,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: 360,
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          fontFamily: 'var(--cv2-font)',
          color: 'var(--cv2-text)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--cv2-text-strong)' }}>
            Jump to a specific date
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{
              width: 28, height: 28,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', color: 'var(--cv2-text-subtle)',
              border: 'none', borderRadius: 'var(--cv2-radius-sm)', cursor: 'pointer',
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 }}>
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <NavBtn label="Prev year" onClick={() => setView(v => ({ ...v, y: v.y - 1 }))}>
              <ChevronLeftDoubleIcon size={14} />
            </NavBtn>
            <NavBtn label="Prev month" onClick={() => {
              setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 });
            }}>
              <ChevronLeftIcon size={14} />
            </NavBtn>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cv2-text-strong)' }}>
            {MONTH_LABELS[view.m]} {view.y}
          </div>
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <NavBtn label="Next month" onClick={() => {
              setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 });
            }}>
              <ChevronRightIcon size={14} />
            </NavBtn>
            <NavBtn label="Next year" onClick={() => setView(v => ({ ...v, y: v.y + 1 }))}>
              <ChevronRightDoubleIcon size={14} />
            </NavBtn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 4 }}>
          {WEEKDAY_LABELS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--cv2-text-muted)', fontWeight: 600, padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0,
          }}
        >
          {grid.map((cell, idx) => {
            if (!cell.date) {
              return <div key={idx} style={{ aspectRatio: '1 / 1' }} />;
            }
            const col = idx % 7;
            const row = Math.floor(idx / 7);
            const leftNeighborEmpty = col === 0 ? true : !grid[idx - 1]?.date;
            const upNeighborEmpty = row === 0 ? true : !grid[idx - 7]?.date;
            const cellBorder: React.CSSProperties = {
              aspectRatio: '1 / 1',
              position: 'relative',
              borderRight: '1px solid var(--cv2-border)',
              borderBottom: '1px solid var(--cv2-border)',
              borderTop: upNeighborEmpty ? '1px solid var(--cv2-border)' : 'none',
              borderLeft: leftNeighborEmpty ? '1px solid var(--cv2-border)' : 'none',
            };
            const isToday = isSameDay(cell.date, today);
            const allowed = inRange(cell.date);
            return (
              <div key={idx} style={cellBorder}>
                <button
                  type="button"
                  disabled={!allowed}
                  onClick={() => onPick(cell.date!.toISOString())}
                  style={{
                    position: 'absolute',
                    inset: 3,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    color: !allowed ? 'var(--cv2-text-muted)' : 'var(--cv2-text)',
                    border: isToday ? '2px solid var(--cv2-accent)' : '2px solid transparent',
                    borderRadius: '50%',
                    fontSize: 13,
                    fontWeight: isToday ? 700 : 400,
                    cursor: allowed ? 'pointer' : 'not-allowed',
                    transition: 'background var(--cv2-transition-fast)',
                  }}
                  onMouseEnter={e => { if (allowed && !isToday) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {cell.date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 28, height: 28,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', color: 'var(--cv2-text-subtle)',
        border: 'none', borderRadius: 'var(--cv2-radius-sm)', cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

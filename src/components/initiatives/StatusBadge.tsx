import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InitiativeStatus, STATUS_DISPLAY } from '@/types/initiative';

interface StatusBadgeProps {
  status: InitiativeStatus;
  size?: 'sm' | 'md';
  editable?: boolean;
  onChange?: (status: InitiativeStatus) => void;
}

const ALL_STATUSES = Object.keys(STATUS_DISPLAY) as InitiativeStatus[];

export function StatusBadge({ status, size = 'sm', editable = false, onChange }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const s = STATUS_DISPLAY[status];

  useEffect(() => {
    if (!open) return;
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });

    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const heightClass = size === 'md' ? 'h-7 text-[13px]' : 'h-6 text-[12px]';

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => editable && setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 rounded-full border font-medium whitespace-nowrap transition-[filter] duration-100 ${heightClass} ${editable ? 'cursor-pointer hover:brightness-[0.96]' : 'cursor-default'}`}
        style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
        {s.label}
      </button>

      {open && createPortal(
        <div
          className="fixed z-[99999] min-w-[180px] rounded-lg border border-border bg-white shadow-lg py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {ALL_STATUSES.map(st => {
            const d = STATUS_DISPLAY[st];
            return (
              <button
                key={st}
                type="button"
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors"
                onClick={() => { onChange?.(st); setOpen(false); }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.dot }} />
                {d.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

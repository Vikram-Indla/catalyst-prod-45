/**
 * StatusBadge — Request status (editable dropdown)
 * GUARDRAIL: Uses StatusLozenge from @/components/ui/StatusLozenge for rendering.
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RequestStatus, STATUS_DISPLAY } from '@/types/request';
import { StatusLozenge } from '@/components/ui/StatusLozenge';

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md';
  editable?: boolean;
  onChange?: (status: RequestStatus) => void;
}

const ALL_STATUSES = Object.keys(STATUS_DISPLAY) as RequestStatus[];

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

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => editable && setOpen(!open)}
        className={editable ? 'cursor-pointer' : 'cursor-default'}
        style={{ background: 'none', border: 'none', padding: 0 }}
      >
        <StatusLozenge status={s.label} />
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
                <StatusLozenge status={d.label} />
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

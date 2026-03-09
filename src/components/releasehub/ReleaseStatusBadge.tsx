import React, { useState, useRef, useEffect } from 'react';
import { RELEASE_STATUS_LABELS } from '@/constants/releasehub.design';
import type { ReleaseStatus } from '@/types/releasehub';
import { ChevronDown } from 'lucide-react';

const RELEASE_STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  todo: {
    bg: 'var(--cp-lozenge-grey-bg)',
    text: 'var(--cp-lozenge-grey-text)',
    border: 'var(--cp-border-default)',
  },
  in_progress: {
    bg: 'var(--cp-lozenge-blue-bg)',
    text: 'var(--cp-lozenge-blue-text)',
    border: 'var(--cp-border-default)',
  },
  done: {
    bg: 'var(--cp-lozenge-green-bg)',
    text: 'var(--cp-lozenge-green-text)',
    border: 'var(--cp-border-default)',
  },
  archived: {
    bg: 'var(--cp-lozenge-grey-bg)',
    text: 'var(--cp-lozenge-grey-text)',
    border: 'var(--cp-border-subtle)',
  },
};

interface Props {
  status: ReleaseStatus;
  onChange?: (status: ReleaseStatus) => void;
}

export function ReleaseStatusBadge({ status, onChange }: Props) {
  const label = RELEASE_STATUS_LABELS[status] || status;
  const config = RELEASE_STATUS_CONFIG[status] || RELEASE_STATUS_CONFIG.todo;

  if (!onChange) {
    return (
      <span
        className="inline-flex items-center h-5 px-2 rounded-[3px] text-[11px] font-semibold uppercase tracking-[0.04em]"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        {label}
      </span>
    );
  }

  return <ReleaseStatusPicker status={status} onChange={onChange} />;
}

function ReleaseStatusPicker({ status, onChange }: { status: ReleaseStatus; onChange: (s: ReleaseStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options: ReleaseStatus[] = ['todo', 'in_progress', 'done', 'archived'];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const config = RELEASE_STATUS_CONFIG[status] || RELEASE_STATUS_CONFIG.todo;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 h-5 px-2 rounded-[3px] text-[11px] font-semibold uppercase tracking-[0.04em] cursor-pointer"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        {RELEASE_STATUS_LABELS[status]} <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-40 rounded-md py-1 z-50"
          style={{ backgroundColor: 'var(--cp-bg-elevated)', border: '1px solid var(--cp-border-default)', boxShadow: 'var(--cp-shadow-overlay)' }}
        >
          {options.map(opt => {
            const optConfig = RELEASE_STATUS_CONFIG[opt] || RELEASE_STATUS_CONFIG.todo;
            return (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 h-9 text-left text-[13px] font-medium ${status === opt ? 'font-bold' : ''}`}
                style={{
                  fontFamily: 'var(--cp-font-body)',
                  color: 'var(--cp-text-primary)',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--cp-interact-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: optConfig.bg }} />
                {RELEASE_STATUS_LABELS[opt]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

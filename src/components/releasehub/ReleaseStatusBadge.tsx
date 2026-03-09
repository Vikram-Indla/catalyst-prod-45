import React, { useState, useRef, useEffect } from 'react';
import { RELEASE_STATUS_LABELS, RELEASE_STATUS_STYLES } from '@/constants/releasehub.design';
import type { ReleaseStatus } from '@/types/releasehub';
import { ChevronDown } from 'lucide-react';

interface Props {
  status: ReleaseStatus;
  onChange?: (status: ReleaseStatus) => void;
}

export function ReleaseStatusBadge({ status, onChange }: Props) {
  const label = RELEASE_STATUS_LABELS[status] || status;
  const styles = RELEASE_STATUS_STYLES[status] || '';

  if (!onChange) {
    return (
      <span className={`inline-flex items-center h-5 px-2 rounded text-[11px] font-extrabold uppercase tracking-[0.04em] ${styles}`}>
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

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(!open)} className={`inline-flex items-center gap-1 h-5 px-2 rounded text-[11px] font-extrabold uppercase tracking-[0.04em] cursor-pointer ${RELEASE_STATUS_STYLES[status]}`}>
        {RELEASE_STATUS_LABELS[status]} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-[#E2E8F0] z-50 py-1">
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 h-9 text-left text-[13px] font-medium hover:bg-[#F4F7FA] ${status === opt ? 'font-bold' : ''}`}
              style={{ fontFamily: '"Inter", sans-serif' }}>
              <span className={`inline-block w-2 h-2 rounded-full ${RELEASE_STATUS_STYLES[opt].split(' ')[0]}`} />
              {RELEASE_STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

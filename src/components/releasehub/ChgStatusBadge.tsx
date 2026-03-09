import React, { useState, useRef, useEffect } from 'react';
import { CHG_STATUS_LABELS, CHG_STATUS_STYLES } from '@/constants/releasehub.design';
import type { ChangeStatus } from '@/types/releasehub';
import { ChevronDown } from 'lucide-react';

interface Props {
  status: ChangeStatus;
  onChange?: (status: ChangeStatus) => void;
}

export function ChgStatusBadge({ status, onChange }: Props) {
  const label = CHG_STATUS_LABELS[status] || status;
  const styles = CHG_STATUS_STYLES[status] || 'bg-[#6B7280] text-white';

  if (!onChange) {
    return (
      <span className={`inline-flex items-center h-5 px-2 rounded text-[11px] font-extrabold uppercase tracking-[0.04em] whitespace-nowrap ${styles}`}>
        {label}
      </span>
    );
  }

  return <ChgStatusPicker status={status} onChange={onChange} />;
}

function ChgStatusPicker({ status, onChange }: { status: ChangeStatus; onChange: (s: ChangeStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options: ChangeStatus[] = ['new', 'in_qa', 'in_uat', 'in_beta', 'in_production'];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(!open)} className={`inline-flex items-center gap-1 h-5 px-2 rounded text-[11px] font-extrabold uppercase tracking-[0.04em] cursor-pointer ${CHG_STATUS_STYLES[status]}`}>
        {CHG_STATUS_LABELS[status]} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-[#E2E8F0] z-50 py-1">
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 h-9 text-left text-[13px] font-medium hover:bg-[#F4F7FA] ${status === opt ? 'font-bold' : ''}`}
              style={{ fontFamily: '"Inter", sans-serif' }}>
              <span className={`inline-block w-2 h-2 rounded-full ${CHG_STATUS_STYLES[opt].split(' ')[0]}`} />
              {CHG_STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

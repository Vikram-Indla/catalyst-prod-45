import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, count, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 w-full text-left py-1.5 group"
      >
        <ChevronRight
          size={14}
          className="transition-transform duration-150 text-[#94A3B8]"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
        <span className="text-[14px] font-semibold" style={{ color: '#0F172A' }}>
          {title}
        </span>
        {count != null && count > 0 && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1"
            style={{ background: '#F1F5F9', color: '#64748B' }}
          >
            {count}
          </span>
        )}
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

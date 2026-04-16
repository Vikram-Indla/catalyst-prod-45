/**
 * RisksAccordion — Collapsible wrapper for RisksViewTab
 */
import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { RisksViewTab } from '../drawer-tabs/RisksViewTab';

interface RisksAccordionProps {
  requestId: string;
}

export function RisksAccordion({ requestId }: RisksAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div data-section="risks" style={{ borderTop: '1px solid #EBECF0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 600, color: '#172B4D', userSelect: 'none',
        }}
      >
        {open ? <ChevronDown size={16} color="#42526E" /> : <ChevronRight size={16} color="#42526E" />}
        Risks
      </button>
      {open && (
        <div style={{ paddingBottom: 16 }}>
          <RisksViewTab requestId={requestId} />
        </div>
      )}
    </div>
  );
}

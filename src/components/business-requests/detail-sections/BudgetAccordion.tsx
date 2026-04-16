/**
 * BudgetAccordion — Collapsible wrapper for BudgetViewTab
 */
import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { BudgetViewTab } from '../drawer-tabs/BudgetViewTab';
import { BusinessRequest } from '@/types/business-request';

interface BudgetAccordionProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function BudgetAccordion({ data, onChange }: BudgetAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div data-section="budget" style={{ borderTop: '1px solid #EBECF0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 600, color: '#172B4D', userSelect: 'none',
        }}
      >
        {open ? <ChevronDown size={16} color="#42526E" /> : <ChevronRight size={16} color="#42526E" />}
        Budget & Funding
      </button>
      {open && (
        <div style={{ paddingBottom: 16 }}>
          <BudgetViewTab data={data} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

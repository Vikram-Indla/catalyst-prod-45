/**
 * ScoringAccordion — Collapsible wrapper for BusinessScoreViewTab + EAReviewTab
 */
import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { BusinessScoreViewTab } from '../drawer-tabs/BusinessScoreViewTab';
import { EAReviewTab } from '../drawer-tabs/EAReviewTab';
import { BusinessRequest } from '@/types/business-request';

interface ScoringAccordionProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  requestId?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ScoringAccordion({ data, onChange, requestId, onDirtyChange }: ScoringAccordionProps) {
  const [scoringOpen, setScoringOpen] = useState(false);
  const [eaOpen, setEaOpen] = useState(false);

  return (
    <>
      {/* Scoring & Review */}
      <div data-section="scoring" style={{ borderTop: '1px solid #EBECF0' }}>
        <button
          onClick={() => setScoringOpen(!scoringOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: '#172B4D', userSelect: 'none',
          }}
        >
          {scoringOpen ? <ChevronDown size={16} color="#42526E" /> : <ChevronRight size={16} color="#42526E" />}
          Scoring & Review
        </button>
        {scoringOpen && (
          <div style={{ paddingBottom: 16 }}>
            <BusinessScoreViewTab
              data={data}
              onChange={onChange}
              requestId={requestId}
              onDirtyChange={onDirtyChange}
            />
          </div>
        )}
      </div>

      {/* EA Review */}
      <div data-section="ea-review" style={{ borderTop: '1px solid #EBECF0' }}>
        <button
          onClick={() => setEaOpen(!eaOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: '#172B4D', userSelect: 'none',
          }}
        >
          {eaOpen ? <ChevronDown size={16} color="#42526E" /> : <ChevronRight size={16} color="#42526E" />}
          EA Review
        </button>
        {eaOpen && (
          <div style={{ paddingBottom: 16 }}>
            <EAReviewTab data={data} onChange={onChange} />
          </div>
        )}
      </div>
    </>
  );
}

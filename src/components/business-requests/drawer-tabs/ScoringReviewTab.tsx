/**
 * ScoringReviewTab - Consolidated tab combining Business Score and EA Review
 * Uses collapsible sections for organization
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Calculator, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessScoreViewTab } from './BusinessScoreViewTab';
import { EAReviewTab } from './EAReviewTab';
import { BusinessRequest } from '@/types/business-request';

interface ScoringReviewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  requestId?: string;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  status?: 'pending' | 'complete' | 'na';
}

function CollapsibleSection({ title, icon, defaultOpen = true, children, status }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const statusColors = {
    pending: 'bg-amber-500',
    complete: 'bg-green-500',
    na: 'bg-gray-400'
  };
  
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--divider)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        style={{ backgroundColor: 'var(--surface-2)' }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          {status && (
            <span className={cn(
              "ml-2 w-2 h-2 rounded-full",
              statusColors[status]
            )} />
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="border-t" style={{ borderColor: 'var(--divider)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function ScoringReviewTab({ data, onChange, onDirtyChange, requestId }: ScoringReviewTabProps) {
  // Determine status based on data
  const businessScoreStatus = data.business_score ? 'complete' : 'pending';
  const eaReviewStatus = data.ea_review_required === false ? 'na' : (data.ea_review_decision ? 'complete' : 'pending');
  
  return (
    <div className="p-5 space-y-4">
      {/* Business Score Section */}
      <CollapsibleSection
        title="Business Score"
        icon={<Calculator className="w-4 h-4 text-[hsl(var(--secondary-bronze))]" />}
        defaultOpen={true}
        status={businessScoreStatus}
      >
        <BusinessScoreViewTab 
          data={data} 
          onChange={onChange} 
          requestId={requestId}
          onDirtyChange={onDirtyChange}
        />
      </CollapsibleSection>

      {/* EA Review Section */}
      <CollapsibleSection
        title="EA Review"
        icon={<ClipboardCheck className="w-4 h-4 text-[hsl(var(--secondary-olive))]" />}
        defaultOpen={false}
        status={eaReviewStatus}
      >
        <EAReviewTab data={data} onChange={onChange} />
      </CollapsibleSection>
    </div>
  );
}

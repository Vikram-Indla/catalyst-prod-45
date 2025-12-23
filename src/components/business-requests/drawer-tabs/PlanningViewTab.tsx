/**
 * PlanningViewTab - Consolidated tab combining Budget, Milestones, and Risks
 * Uses collapsible sections for organization
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign, Flag, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BudgetViewTab } from './BudgetViewTab';
import { MilestonesViewTab } from './MilestonesViewTab';
import { RisksViewTab } from './RisksViewTab';
import { BusinessRequest } from '@/types/business-request';

interface PlanningViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  requestId: string;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string | number;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children, badge }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
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
          {badge !== undefined && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
              {badge}
            </span>
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

export function PlanningViewTab({ data, onChange, requestId }: PlanningViewTabProps) {
  return (
    <div className="p-5 space-y-4">
      {/* Budget Section */}
      <CollapsibleSection
        title="Budget"
        icon={<DollarSign className="w-4 h-4 text-[hsl(var(--secondary-olive))]" />}
        defaultOpen={true}
      >
        <BudgetViewTab data={data} onChange={onChange} />
      </CollapsibleSection>

      {/* Milestones Section */}
      <CollapsibleSection
        title="Milestones"
        icon={<Flag className="w-4 h-4 text-[hsl(var(--secondary-bronze))]" />}
        defaultOpen={false}
      >
        <MilestonesViewTab requestId={requestId} />
      </CollapsibleSection>

      {/* Risks Section */}
      <CollapsibleSection
        title="Risks"
        icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        defaultOpen={false}
      >
        <RisksViewTab requestId={requestId} />
      </CollapsibleSection>
    </div>
  );
}

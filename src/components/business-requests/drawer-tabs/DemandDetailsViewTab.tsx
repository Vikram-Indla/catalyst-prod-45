/**
 * DemandDetailsViewTab - Catalyst Design System
 * Executive-grade form cards with olive accents
 */

import { useState, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, ChevronDown, ChevronRight, Scale } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '../RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { BusinessRequest } from '@/types/business-request';
import { PlannedQuarterSelect, DeliveryPlatformSelect } from '@/components/ui/lookup-select';
import { getTierDisplayInfo, PriorityTier } from '@/hooks/usePrioritizationConfig';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onNavigateToTab?: (tabKey: string) => void;
}

// Catalyst Form Card Component
function FormCard({ 
  title, 
  children, 
  collapsible = false,
  defaultExpanded = true 
}: { 
  title: string; 
  children: ReactNode; 
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section 
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--surface-bg, hsl(var(--background)))',
        border: '1px solid var(--border-default, hsl(var(--border)))',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <header 
        className={cn(
          "px-4 py-3 flex items-center justify-between",
          collapsible && "cursor-pointer hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
        )}
        style={{
          background: 'linear-gradient(180deg, var(--surface-bg, hsl(var(--background))) 0%, var(--surface-subtle, hsl(var(--muted)/0.3)) 100%)',
          borderBottom: expanded ? '1px solid var(--border-subtle, hsl(var(--border)/0.5))' : 'none',
        }}
        onClick={collapsible ? () => setExpanded(!expanded) : undefined}
      >
        <h2 
          className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground"
        >
          {title}
        </h2>
        {collapsible && (
          <button 
            className="p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
            style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </header>
      {expanded && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </section>
  );
}

// Catalyst Field Component
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label 
        className="text-[12px] font-medium"
        style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}
      >
        {label}
        {required && <span style={{ color: '#B85C5C' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export function DemandDetailsViewTab({ data, onChange, onNavigateToTab }: DemandDetailsViewTabProps) {
  const [targetDateLocked, setTargetDateLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);
  const currentUser = 'Current User';

  const handleLockToggle = () => {
    if (targetDateLocked) {
      if (lockedByUser && lockedByUser !== currentUser) {
        toast.error(`Cannot unlock. This date was locked by ${lockedByUser}`);
        return;
      }
      setTargetDateLocked(false);
      setLockedByUser(null);
      toast.info('Target Completion Date unlocked');
    } else {
      if (!data.impl_start_date) {
        toast.error('Cannot lock: Kickoff Date must be populated first');
        return;
      }
      if (!data.end_date) {
        toast.error('Cannot lock: Target Completion Date must be populated first');
        return;
      }
      setTargetDateLocked(true);
      setLockedByUser(currentUser);
      toast.success(`Target Completion Date locked by ${currentUser}`);
    }
  };

  // Input styles matching Catalyst
  const inputStyle = {
    background: 'var(--input-bg, hsl(var(--background)))',
    borderColor: 'var(--input-border, hsl(var(--border)))',
    color: 'var(--text-primary, hsl(var(--foreground)))',
  };

  return (
    <div className="space-y-4">


      {/* ═══════════════════════════════════════════════════════════
          DETAILS CARD
          ═══════════════════════════════════════════════════════════ */}
      <FormCard title="Details">
        <Field label="Summary" required>
          <Input
            value={data.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Enter demand summary"
            className="h-9 text-[14px]"
            style={inputStyle}
          />
        </Field>

        {/* Business Score Indicator */}
        <div 
          className="flex items-center justify-between px-3.5 py-2.5 rounded-md"
          style={{
            background: 'var(--surface-subtle, hsl(var(--muted)/0.3))',
            border: '1px solid var(--border-subtle, hsl(var(--border)/0.5))',
          }}
        >
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Business Score
              </span>
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                {(() => {
                  const tier = (data.priority_tier as PriorityTier) || 'unscored';
                  const { label } = getTierDisplayInfo(tier);
                  return tier === 'unscored' ? 'Not yet scored' : label;
                })()}
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab?.('business-score')}
            className="flex items-center gap-1 text-[13px] font-medium hover:underline text-[#c69c6d] dark:text-[#d4a855]"
          >
            View scoring
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Field label="Description">
          <RichTextEditor
            value={data.description || ''}
            onChange={(value) => onChange('description', value)}
            placeholder="Enter detailed description..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Reporter">
            <UserPicker
              value={data.requestor || null}
              onChange={(value) => onChange('requestor', value as string | null)}
              placeholder="Select reporter..."
            />
          </Field>

          <Field label="Assignee">
            <UserPicker
              value={data.assignee || null}
              onChange={(value) => onChange('assignee', value as string | null)}
              placeholder="Select assignee..."
            />
          </Field>
        </div>
      </FormCard>

    </div>
  );
}

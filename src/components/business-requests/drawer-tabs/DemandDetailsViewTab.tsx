import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Button } from '@/components/ui/button';
import { Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '../RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { BusinessRequest } from '@/types/business-request';
import { PlannedQuarterSelect } from '@/components/ui/lookup-select';
import { getTierDisplayInfo, PriorityTier } from '@/hooks/usePrioritizationConfig';

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onNavigateToTab?: (tabKey: string) => void;
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

  return (
    <div className="flex flex-col h-full space-y-4" style={{ background: 'var(--bg)' }}>
      {/* Details Section - Owner/Dept/Target in Meta Strip above */}
      <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}>
        <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Details</h3>
          
        {/* Summary */}
        <div>
          <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
            Summary <span className="text-destructive">*</span>
          </Label>
          <Input
            value={data.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Enter demand summary"
            className="mt-1 h-8 text-[13px]"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
          />
        </div>

        {/* Auto Priority - Compact */}
        <div>
          <Label className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Auto Priority</Label>
          <div 
            className="mt-1 px-2.5 py-1.5 rounded text-[12px] flex items-center gap-2" 
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-2)' }}
          >
            <Lock className="h-3 w-3" style={{ color: 'var(--text-3)' }} />
            {(() => {
              const tier = (data.priority_tier as PriorityTier) || 'unscored';
              const { label } = getTierDisplayInfo(tier);
              return label.charAt(0) + label.slice(1).toLowerCase();
            })()}
            <button
              type="button"
              onClick={() => onNavigateToTab?.('business-score')}
              className="ml-auto text-[11px] hover:underline"
              style={{ color: 'var(--accent-color)' }}
            >
              View scoring
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>Description</Label>
          <div className="mt-1">
            <RichTextEditor
              value={data.description || ''}
              onChange={(value) => onChange('description', value)}
              placeholder="Describe the demand..."
            />
          </div>
        </div>

        {/* People - Reporter + Assignee only (Owner/Dept in Meta Strip) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>Reporter</Label>
            <div className="mt-1">
              <UserPicker
                value={data.requestor || null}
                onChange={(value) => onChange('requestor', value as string | null)}
                placeholder="Select..."
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>Assignee</Label>
            <div className="mt-1">
              <UserPicker
                value={data.assignee || null}
                onChange={(value) => onChange('assignee', value as string | null)}
                placeholder="Select..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Planning & Delivery Section - No Delivery Track */}
      <div className="border rounded-lg p-4 space-y-4 flex-1" style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}>
        <h3 className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Planning & Delivery</h3>
          
        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Business Ask</Label>
            <CatalystDatePicker
              value={data.start_date || null}
              onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select"
            />
          </div>

          <div>
            <Label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Kickoff</Label>
            <CatalystDatePicker
              value={data.impl_start_date || null}
              onChange={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select"
            />
          </div>

          <div>
            <Label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Target Complete</Label>
            <div className="flex gap-1">
              <div className="flex-1">
                <CatalystDatePicker
                  value={data.end_date || null}
                  onChange={(date) => onChange('end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                  placeholder="Select"
                  disabled={targetDateLocked}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleLockToggle}
                className={cn(
                  "shrink-0 h-8 w-8",
                  targetDateLocked && "border-[var(--accent-color)]"
                )}
                style={targetDateLocked ? { background: 'var(--surface-2)', color: 'var(--accent-color)' } : undefined}
                title={targetDateLocked ? `Locked by ${lockedByUser}` : 'Lock date'}
              >
                {targetDateLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Delivery context - Quarter only (Platform in Meta Strip) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>Quarter</Label>
            <div className="mt-1">
              <PlannedQuarterSelect
                value={data.planned_quarter || null}
                onChange={(value) => onChange('planned_quarter', value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

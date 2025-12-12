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
import { 
  DepartmentSelect, 
  DeliveryPlatformSelect, 
  DeliveryTrackSelect, 
  PlannedQuarterSelect 
} from '@/components/ui/lookup-select';

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function DemandDetailsViewTab({ data, onChange }: DemandDetailsViewTabProps) {
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
    <div className="flex flex-col h-full space-y-5 bg-muted/30 p-1">
      {/* DETAILS Section - Consolidated Basic Info + Assignment */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Details</h3>
          
          {/* Summary */}
          <div>
            <Label className="text-xs font-medium">
              Summary <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Enter demand summary"
              className="mt-1 h-9 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-medium">Description</Label>
            <div className="mt-1">
              <RichTextEditor
                value={data.description || ''}
                onChange={(value) => onChange('description', value)}
                placeholder="Describe the demand..."
              />
            </div>
          </div>

          {/* People - 2x2 compact grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Reporter</Label>
              <div className="mt-1">
                <UserPicker
                  value={data.requestor || null}
                  onChange={(value) => onChange('requestor', value as string | null)}
                  placeholder="Select reporter..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Assignee</Label>
              <div className="mt-1">
                <UserPicker
                  value={data.assignee || null}
                  onChange={(value) => onChange('assignee', value as string | null)}
                  placeholder="Select assignee..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Department</Label>
              <div className="mt-1">
                <DepartmentSelect
                  value={data.department || null}
                  onChange={(value) => onChange('department', value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Business Owner</Label>
              <Input
                value={data.business_owner || ''}
                onChange={(e) => onChange('business_owner', e.target.value)}
                placeholder="Enter name"
                className="mt-1 h-9 text-sm"
              />
            </div>
          </div>
        </div>

      {/* PLANNING & DELIVERY Section - Consolidated Timeline + Delivery Context */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm flex-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Planning & Delivery</h3>
          
          {/* Dates - 3-column compact grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Business Ask</Label>
              <CatalystDatePicker
                value={data.start_date || null}
                onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="Select"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Kickoff</Label>
              <CatalystDatePicker
                value={data.impl_start_date || null}
                onChange={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="Select"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Target Complete</Label>
              <div className="flex gap-1.5">
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
                    "shrink-0 h-9 w-9",
                    targetDateLocked && "bg-muted border-brand-gold text-brand-gold"
                  )}
                  title={targetDateLocked ? `Locked by ${lockedByUser}` : 'Lock date'}
                >
                  {targetDateLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery context - 3-column compact grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium">Delivery Track</Label>
              <div className="mt-1">
                <DeliveryTrackSelect
                  value={data.delivery_track || data.track || null}
                  onChange={(value) => onChange('delivery_track', value)}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs font-medium">Delivery Platform</Label>
              <div className="mt-1">
                <DeliveryPlatformSelect
                  value={data.delivery_platform || null}
                  onChange={(value) => onChange('delivery_platform', value)}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs font-medium">Quarter</Label>
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

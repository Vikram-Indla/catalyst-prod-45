/**
 * EpicDetailsViewTab - Cloned from DemandDetailsViewTab
 * 
 * Changes from BusinessRequest:
 * - Summary* (required)
 * - Description (rich text, empty by default)
 * - Reporter* (required)
 * - Assignee* (required)
 * - REMOVED: Department, Business Owner
 * 
 * Planning & Delivery:
 * - REMOVED: Business Ask date
 * - Kickoff → Start Date
 * - Target Complete with lock icon
 * - Delivery Track (same values)
 * - MVP checkbox (boolean)
 * - Delivery Platform
 * - Quarter
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { 
  DeliveryPlatformSelect, 
  DeliveryTrackSelect, 
  PlannedQuarterSelect 
} from '@/components/ui/lookup-select';

interface EpicDetailsViewTabProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function EpicDetailsViewTab({ data, onChange }: EpicDetailsViewTabProps) {
  const [targetDateLocked, setTargetDateLocked] = useState(data.date_locked || false);
  const currentUser = 'Current User';

  const handleLockToggle = () => {
    if (targetDateLocked) {
      setTargetDateLocked(false);
      onChange('date_locked', false);
      toast.info('Target Completion Date unlocked');
    } else {
      if (!data.start_date) {
        toast.error('Cannot lock: Start Date must be populated first');
        return;
      }
      if (!data.target_completion_date && !data.end_date) {
        toast.error('Cannot lock: Target Completion Date must be populated first');
        return;
      }
      setTargetDateLocked(true);
      onChange('date_locked', true);
      toast.success(`Target Completion Date locked by ${currentUser}`);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-5 bg-muted/30 p-1">
      {/* DETAILS Section */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Details</h3>
          
        {/* Summary - required */}
        <div>
          <Label className="text-xs font-medium">
            Summary <span className="text-destructive">*</span>
          </Label>
          <Input
            value={data.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Enter epic summary"
            className="mt-1 h-9 text-sm"
          />
        </div>

        {/* Description - empty by default, no prefilled template */}
        <div>
          <Label className="text-xs font-medium">Description</Label>
          <div className="mt-1">
            <RichTextEditor
              value={data.description || ''}
              onChange={(value) => onChange('description', value)}
              placeholder="Describe the epic..."
            />
          </div>
        </div>

        {/* People - 2 column (Reporter, Assignee only - removed Department, Business Owner) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium">
              Reporter <span className="text-destructive">*</span>
            </Label>
            <div className="mt-1">
              <UserPicker
                value={data.owner_id || null}
                onChange={(value) => onChange('owner_id', value as string | null)}
                placeholder="Select reporter..."
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">
              Assignee <span className="text-destructive">*</span>
            </Label>
            <div className="mt-1">
              <UserPicker
                value={data.owner_id || null}
                onChange={(value) => onChange('owner_id', value as string | null)}
                placeholder="Select assignee..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* PLANNING & DELIVERY Section */}
      <div className="border border-border rounded-xl bg-white p-5 space-y-5 shadow-sm flex-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Planning & Delivery</h3>
          
        {/* Dates - 2-column (Start Date, Target Complete) - removed Business Ask */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Start Date</Label>
            <CatalystDatePicker
              value={data.start_date || null}
              onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Select"
            />
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Target Complete</Label>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <CatalystDatePicker
                  value={data.target_completion_date || data.end_date || null}
                  onChange={(date) => onChange('target_completion_date', date ? format(date, 'yyyy-MM-dd') : null)}
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
                title={targetDateLocked ? 'Unlock date' : 'Lock date'}
              >
                {targetDateLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Delivery context - 3-column + MVP */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-medium">Delivery Track</Label>
            <div className="mt-1">
              <DeliveryTrackSelect
                value={data.delivery_track || null}
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

        {/* MVP Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="mvp"
            checked={data.mvp || false}
            onCheckedChange={(checked) => onChange('mvp', checked)}
          />
          <Label htmlFor="mvp" className="text-sm font-medium cursor-pointer">
            MVP (Minimum Viable Product)
          </Label>
        </div>
      </div>
    </div>
  );
}

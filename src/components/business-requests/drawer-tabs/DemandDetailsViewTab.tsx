import { useState, useEffect } from 'react';
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
  DeliveryPlatformSelect, 
  DeliveryTrackSelect, 
  PlannedQuarterSelect 
} from '@/components/ui/lookup-select';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { BusinessOwnerSelect } from '@/components/business-requests/BusinessOwnerSelect';
import { getTierDisplayInfo, PriorityTier } from '@/hooks/usePrioritizationConfig';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onNavigateToTab?: (tabKey: string) => void;
}

export function DemandDetailsViewTab({ data, onChange, onNavigateToTab }: DemandDetailsViewTabProps) {
  const [targetDateLocked, setTargetDateLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);
  const currentUser = 'Current User';

  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();

  // Resolve legacy text values to IDs on initial load
  useEffect(() => {
    if (departments && !data.department_id && data.department) {
      const dept = departments.find(d => d.name.toLowerCase() === (data.department || '').toLowerCase());
      if (dept) {
        onChange('department_id', dept.id);
      }
    }
  }, [departments, data.department, data.department_id, onChange]);

  useEffect(() => {
    if (owners && !data.business_owner_id && data.business_owner) {
      const owner = owners.find(o => o.name.toLowerCase() === (data.business_owner || '').toLowerCase());
      if (owner) {
        onChange('business_owner_id', owner.id);
      }
    }
  }, [owners, data.business_owner, data.business_owner_id, onChange]);

  // Handle department change with auto-setting of business owner
  const handleDepartmentChange = (departmentId: string) => {
    onChange('department_id', departmentId);
    // Find department name and set it for legacy field
    const dept = departments?.find(d => d.id === departmentId);
    if (dept) {
      onChange('department', dept.name);
    }
    // Auto-set business owner from mapping
    if (mappings) {
      const ownerId = getOwnerIdForDepartment(departmentId, mappings);
      if (ownerId) {
        onChange('business_owner_id', ownerId);
        const owner = owners?.find(o => o.id === ownerId);
        if (owner) {
          onChange('business_owner', owner.name);
        }
      }
    }
  };

  const handleBusinessOwnerChange = (ownerId: string) => {
    onChange('business_owner_id', ownerId);
    const owner = owners?.find(o => o.id === ownerId);
    if (owner) {
      onChange('business_owner', owner.name);
    }
  };

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
    <div className="flex flex-col h-full space-y-5 p-1" style={{ background: 'var(--bg)' }}>
      {/* DETAILS Section - Consolidated Basic Info + Assignment */}
      <div className="border rounded-xl p-5 space-y-5 shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>Details</h3>
          
          {/* Summary */}
          <div>
            <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
              Summary <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Enter demand summary"
              className="mt-1 h-9 text-sm"
            />
          </div>

          {/* Auto Priority - Read-only derived field */}
          <div>
            <Label className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Auto Priority</Label>
            <div className="mt-1 px-3 py-2 rounded-md text-sm italic flex items-center gap-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-2)' }}>
              <Lock className="h-3.5 w-3.5" />
              {(() => {
                const tier = (data.priority_tier as PriorityTier) || 'unscored';
                const { label } = getTierDisplayInfo(tier);
                return label.charAt(0) + label.slice(1).toLowerCase();
              })()}
              <button
                type="button"
                onClick={() => onNavigateToTab?.('business-score')}
                className="ml-auto text-xs text-secondary-green hover:underline"
              >
                Click for info
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Description</Label>
            <div className="mt-1">
              <RichTextEditor
                value={data.description || ''}
                onChange={(value) => onChange('description', value)}
                placeholder="Describe the demand..."
              />
            </div>
          </div>

          {/* People - 2x2 compact grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Reporter</Label>
              <div className="mt-1">
                <UserPicker
                  value={data.requestor || null}
                  onChange={(value) => onChange('requestor', value as string | null)}
                  placeholder="Select reporter..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Assignee</Label>
              <div className="mt-1">
                <UserPicker
                  value={data.assignee || null}
                  onChange={(value) => onChange('assignee', value as string | null)}
                  placeholder="Select assignee..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Department</Label>
              <div className="mt-1">
                <DepartmentSelect
                  value={data.department_id || null}
                  onChange={handleDepartmentChange}
                  placeholder="Select department"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Business Owner</Label>
              <div className="mt-1">
                <BusinessOwnerSelect
                  value={data.business_owner_id || null}
                  onChange={handleBusinessOwnerChange}
                  departmentId={data.department_id || null}
                  placeholder="Select business owner"
                />
              </div>
            </div>

          </div>
        </div>

      {/* PLANNING & DELIVERY Section - Consolidated Timeline + Delivery Context */}
      <div className="border rounded-xl p-5 space-y-5 shadow-sm flex-1" style={{ borderColor: 'var(--border-color)', background: 'var(--surface-1)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>Planning & Delivery</h3>
          
          {/* Dates - 3-column compact grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>Business Ask</Label>
              <CatalystDatePicker
                value={data.start_date || null}
                onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="Select"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>Kickoff</Label>
              <CatalystDatePicker
                value={data.impl_start_date || null}
                onChange={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="Select"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>Target Complete</Label>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Delivery Track</Label>
              <div className="mt-1">
                <DeliveryTrackSelect
                  value={data.delivery_track || data.track || null}
                  onChange={(value) => onChange('delivery_track', value)}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Delivery Platform</Label>
              <div className="mt-1">
                <DeliveryPlatformSelect
                  value={data.delivery_platform || null}
                  onChange={(value) => onChange('delivery_platform', value)}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Quarter</Label>
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

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessRequest, PROCESS_STEPS, HEALTH_OPTIONS, COMPLEXITY_OPTIONS, URGENCY_OPTIONS } from '@/types/business-request';
import { DeliveryPlatformSelect } from '@/components/ui/lookup-select';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { BusinessOwnerSelect } from '@/components/business-requests/BusinessOwnerSelect';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { useEffect } from 'react';

const QUARTER_OPTIONS = [
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
  'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
];

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function DemandDetailsViewTab({ data, onChange, onDirtyChange }: DemandDetailsViewTabProps) {
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

  const handleChange = (field: string, value: any) => {
    onChange(field, value);
    onDirtyChange?.(true);
  };

  // Handle department change with auto-setting of business owner
  const handleDepartmentChange = (departmentId: string) => {
    handleChange('department_id', departmentId);
    // Find department name and set it for legacy field
    const dept = departments?.find(d => d.id === departmentId);
    if (dept) {
      handleChange('department', dept.name);
    }
    // Auto-set business owner from mapping
    if (mappings) {
      const ownerId = getOwnerIdForDepartment(departmentId, mappings);
      if (ownerId) {
        handleChange('business_owner_id', ownerId);
        const owner = owners?.find(o => o.id === ownerId);
        if (owner) {
          handleChange('business_owner', owner.name);
        }
      }
    }
  };

  const handleBusinessOwnerChange = (ownerId: string) => {
    handleChange('business_owner_id', ownerId);
    const owner = owners?.find(o => o.id === ownerId);
    if (owner) {
      handleChange('business_owner', owner.name);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Overview Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Process Step</Label>
            <Select value={data.process_step || ''} onValueChange={(v) => handleChange('process_step', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select step" />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                {PROCESS_STEPS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Health</Label>
            <Select value={data.health || ''} onValueChange={(v) => handleChange('health', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select health" />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                {HEALTH_OPTIONS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Complexity</Label>
            <Select value={data.complexity || ''} onValueChange={(v) => handleChange('complexity', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select complexity" />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                {COMPLEXITY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Urgency</Label>
            <Select value={data.urgency || ''} onValueChange={(v) => handleChange('urgency', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                {URGENCY_OPTIONS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Description</Label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Detailed description"
          rows={4}
          className="bg-background resize-none"
        />
      </div>

      {/* Assignment Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assignment</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Assignee</Label>
            <Input
              value={data.requestor || ''}
              onChange={(e) => handleChange('requestor', e.target.value)}
              placeholder="Assignee name"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Business Owner <span className="text-destructive">*</span></Label>
            <BusinessOwnerSelect
              value={data.business_owner_id || null}
              onChange={handleBusinessOwnerChange}
              departmentId={data.department_id || null}
              placeholder="Select business owner"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Department <span className="text-destructive">*</span></Label>
            <DepartmentSelect
              value={data.department_id || null}
              onChange={handleDepartmentChange}
              placeholder="Select department"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Delivery Platform</Label>
            <DeliveryPlatformSelect
              value={data.delivery_platform || null}
              onChange={(v) => handleChange('delivery_platform', v)}
              placeholder="Select platform"
              className="bg-background"
            />
          </div>
        </div>
      </div>

      {/* Planning Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Planning</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Planned Quarter</Label>
            <Select value={data.planned_quarter || ''} onValueChange={(v) => handleChange('planned_quarter', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                {QUARTER_OPTIONS.map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Date</Label>
            <Input
              type="date"
              value={data.end_date || ''}
              onChange={(e) => handleChange('end_date', e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Start Date</Label>
            <Input
              type="date"
              value={data.start_date || ''}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className="bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

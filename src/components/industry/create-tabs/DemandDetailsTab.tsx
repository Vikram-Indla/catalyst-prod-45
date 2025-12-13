import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';
import { format } from 'date-fns';
import { DepartmentSelect } from '@/components/business-requests/DepartmentSelect';
import { BusinessOwnerSelect } from '@/components/business-requests/BusinessOwnerSelect';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';

const QUARTER_OPTIONS = [
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
  'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
];

interface DemandDetailsTabProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function DemandDetailsTab({ data, onChange }: DemandDetailsTabProps) {
  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();

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

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Summary <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={data.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Brief summary of the request"
          className="bg-background"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Detailed description of the business request"
          rows={4}
          className="bg-background resize-none"
        />
      </div>

      {/* Two column layout for selects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assignee */}
        <div className="space-y-2">
          <Label htmlFor="requestor" className="text-sm font-medium">
            Assignee <span className="text-destructive">*</span>
          </Label>
          <Input
            id="requestor"
            value={data.requestor || ''}
            onChange={(e) => onChange('requestor', e.target.value)}
            placeholder="Enter assignee name"
            className="bg-background"
          />
        </div>

        {/* Department */}
        <div className="space-y-2">
          <Label htmlFor="department" className="text-sm font-medium">
            Department <span className="text-destructive">*</span>
          </Label>
          <DepartmentSelect
            value={data.department_id || null}
            onChange={handleDepartmentChange}
            placeholder="Select department"
          />
        </div>

        {/* Business Owner */}
        <div className="space-y-2">
          <Label htmlFor="business_owner" className="text-sm font-medium">
            Business Owner <span className="text-destructive">*</span>
          </Label>
          <BusinessOwnerSelect
            value={data.business_owner_id || null}
            onChange={handleBusinessOwnerChange}
            departmentId={data.department_id || null}
            placeholder="Select business owner"
          />
        </div>

        {/* Delivery Platform */}
        <div className="space-y-2">
          <Label htmlFor="delivery_platform" className="text-sm font-medium">
            Delivery Platform <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.delivery_platform || ''}
            onValueChange={(value) => onChange('delivery_platform', value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Planned Quarter */}
        <div className="space-y-2">
          <Label htmlFor="planned_quarter" className="text-sm font-medium">
            Planned Quarter
          </Label>
          <Select
            value={data.planned_quarter || ''}
            onValueChange={(value) => onChange('planned_quarter', value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent>
              {QUARTER_OPTIONS.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Date */}
        <div className="space-y-2">
          <Label htmlFor="end_date" className="text-sm font-medium">
            Target Date
          </Label>
          <CatalystDatePicker
            value={data.end_date || null}
            onChange={(date) => onChange('end_date', date ? format(date, 'yyyy-MM-dd') : '')}
            placeholder="Select target date"
          />
        </div>
      </div>
    </div>
  );
}

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
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { FileText, Users, Building2, Briefcase, CalendarDays, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// Unified quarter options - consistent with DemandDetailsViewTab
const QUARTER_OPTIONS = [
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
  'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
  'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027',
];

interface DemandDetailsTabProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

// Premium section card component
function SectionCard({ 
  icon: Icon, 
  title, 
  children, 
  className 
}: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "bg-stone-50 dark:bg-gray-800/50",
      "rounded-xl",
      "border border-gray-200/80 dark:border-gray-700/60",
      "shadow-sm",
      "p-6",
      className
    )}>
      <h3 className="
        text-[12px] font-semibold uppercase tracking-wider
        text-secondary-olive dark:text-green-400
        mb-5
        flex items-center gap-2
      ">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      {children}
    </div>
  );
}

// Premium label component
function PremiumLabel({ 
  children, 
  required = false,
  htmlFor 
}: { 
  children: React.ReactNode; 
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block mb-2">
      <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
        {children}
      </span>
      {required && (
        <span className="text-[10px] text-red-500 ml-2 uppercase tracking-wide font-medium">
          Required
        </span>
      )}
    </label>
  );
}

// Premium helper text
function HelperText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1.5">
      {children}
    </p>
  );
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

  // Premium input class
  const premiumInputClass = cn(
    "w-full px-4 py-3",
    "bg-white dark:bg-gray-900",
    "border border-gray-200 dark:border-gray-700",
    "rounded-lg",
    "text-gray-900 dark:text-gray-100",
    "placeholder:text-gray-400 dark:placeholder:text-gray-500",
    "focus:outline-none",
    "focus:ring-2 focus:ring-secondary-olive/20",
    "focus:border-secondary-olive",
    "transition-all"
  );

  return (
    <div className="p-6 space-y-6">
      {/* Basic Information Section */}
      <SectionCard icon={FileText} title="Basic Information">
        {/* Summary */}
        <div className="space-y-1">
          <PremiumLabel required htmlFor="title">Summary</PremiumLabel>
          <Input
            id="title"
            value={data.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Enter demand summary (min 5 characters)"
            className={premiumInputClass}
          />
        </div>

        {/* Description */}
        <div className="space-y-1 mt-5">
          <PremiumLabel required htmlFor="description">Description</PremiumLabel>
          <HelperText>Provide a detailed description (up to 2,000 words)</HelperText>
          <div className="mt-2">
            <RichTextEditor
              value={data.description || ''}
              onChange={(value) => onChange('description', value)}
              placeholder="Describe the demand in detail..."
              minHeight="200px"
            />
          </div>
        </div>
      </SectionCard>

      {/* Timeline Section */}
      <SectionCard icon={CalendarDays} title="Timeline">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Business Ask Date */}
          <div className="space-y-1">
            <PremiumLabel htmlFor="start_date">Business Ask Date</PremiumLabel>
            <CatalystDatePicker
              value={data.start_date || null}
              onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="Select date..."
              triggerClassName={premiumInputClass}
            />
          </div>

          {/* Kickoff Date */}
          <div className="space-y-1">
            <PremiumLabel htmlFor="impl_start_date">Kickoff Date</PremiumLabel>
            <CatalystDatePicker
              value={data.impl_start_date || null}
              onChange={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="Select date..."
              triggerClassName={premiumInputClass}
            />
          </div>

          {/* Target Completion Date */}
          <div className="space-y-1">
            <PremiumLabel htmlFor="end_date">Target Completion Date</PremiumLabel>
            <CatalystDatePicker
              value={data.end_date || null}
              onChange={(date) => onChange('end_date', date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="Select date..."
              triggerClassName={premiumInputClass}
            />
          </div>
        </div>
      </SectionCard>

      {/* Assignment & Details Section */}
      <SectionCard icon={Users} title="Assignment & Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Assignee */}
          <div className="space-y-1">
            <PremiumLabel required htmlFor="requestor">Assignee</PremiumLabel>
            <Input
              id="requestor"
              value={data.requestor || ''}
              onChange={(e) => onChange('requestor', e.target.value)}
              placeholder="Enter assignee name"
              className={premiumInputClass}
            />
          </div>

          {/* Department */}
          <div className="space-y-1">
            <PremiumLabel required htmlFor="department">Department</PremiumLabel>
            <DepartmentSelect
              value={data.department_id || null}
              onChange={handleDepartmentChange}
              placeholder="Select department"
              className={premiumInputClass}
            />
          </div>

          {/* Business Owner */}
          <div className="space-y-1">
            <PremiumLabel required htmlFor="business_owner">Business Owner</PremiumLabel>
            <BusinessOwnerSelect
              value={data.business_owner_id || null}
              onChange={handleBusinessOwnerChange}
              departmentId={data.department_id || null}
              placeholder="Select business owner"
              className={premiumInputClass}
            />
          </div>

          {/* Delivery Platform */}
          <div className="space-y-1">
            <PremiumLabel required htmlFor="delivery_platform">Delivery Platform</PremiumLabel>
            <Select
              value={data.delivery_platform || ''}
              onValueChange={(value) => onChange('delivery_platform', value)}
            >
              <SelectTrigger className={premiumInputClass}>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl">
                {DELIVERY_PLATFORM_OPTIONS.map((opt) => (
                  <SelectItem 
                    key={opt.value} 
                    value={opt.value}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                  >
                    {opt.label.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Quarter */}
          <div className="space-y-1">
            <PremiumLabel htmlFor="planned_quarter">Target Quarter</PremiumLabel>
            <Select
              value={data.planned_quarter || ''}
              onValueChange={(value) => onChange('planned_quarter', value)}
            >
              <SelectTrigger className={premiumInputClass}>
                <SelectValue placeholder="Select quarter..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl">
                {QUARTER_OPTIONS.map((q) => (
                  <SelectItem 
                    key={q} 
                    value={q}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                  >
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

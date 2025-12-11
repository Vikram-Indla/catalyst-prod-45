import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DELIVERY_PLATFORM_OPTIONS, DEPARTMENT_OPTIONS } from '@/types/business-request';

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
          <Select
            value={data.department || ''}
            onValueChange={(value) => onChange('department', value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Business Owner */}
        <div className="space-y-2">
          <Label htmlFor="business_owner" className="text-sm font-medium">
            Business Owner <span className="text-destructive">*</span>
          </Label>
          <Input
            id="business_owner"
            value={data.business_owner || ''}
            onChange={(e) => onChange('business_owner', e.target.value)}
            placeholder="Enter business owner name"
            className="bg-background"
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
          <Input
            id="end_date"
            type="date"
            value={data.end_date || ''}
            onChange={(e) => onChange('end_date', e.target.value)}
            className="bg-background"
          />
        </div>
      </div>
    </div>
  );
}

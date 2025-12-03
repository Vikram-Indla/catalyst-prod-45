import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessRequest, RESOLUTION_CATEGORY_OPTIONS, IMPLEMENTATION_OUTCOME_OPTIONS } from '@/types/business-request';

interface SupportTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function SupportTab({ data, isEditMode, onChange }: SupportTabProps) {
  return (
    <div className="space-y-4">
      {/* Support Owner */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Support Owner</label>
        <Input
          value={data.support_owner || ''}
          onChange={(e) => onChange('support_owner', e.target.value)}
          disabled={!isEditMode}
          placeholder="Enter support owner"
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
        />
      </div>

      {/* Support Remarks */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Support Remarks</label>
        <Textarea
          value={data.support_remarks || ''}
          onChange={(e) => onChange('support_remarks', e.target.value)}
          disabled={!isEditMode}
          placeholder="Add support remarks..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>

      {/* Resolution Category & Implementation Outcome */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
            Resolution Category {isEditMode && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={data.resolution_category || ''}
            onValueChange={(value) => onChange('resolution_category', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Implementation Outcome</label>
          <Select
            value={data.implementation_outcome || ''}
            onValueChange={(value) => onChange('implementation_outcome', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {IMPLEMENTATION_OUTCOME_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

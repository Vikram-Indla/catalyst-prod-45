import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BusinessRequest, APPROVAL_DECISION_OPTIONS } from '@/types/business-request';

interface ApprovalTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function ApprovalTab({ data, isEditMode, onChange }: ApprovalTabProps) {
  return (
    <div className="space-y-4">
      {/* Approver Name */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Approver Name {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Input
          value={data.approver_name || ''}
          onChange={(e) => onChange('approver_name', e.target.value)}
          disabled={!isEditMode}
          placeholder="Enter approver name"
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
        />
      </div>

      {/* Approval Date & Decision */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Approval Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!isEditMode}
                className={cn(
                  "w-full justify-start text-left font-normal border-[#e5e5e5]",
                  !data.approval_date && "text-muted-foreground",
                  !isEditMode && "bg-[#f9fafb] text-[#6b7280]"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.approval_date ? format(new Date(data.approval_date), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.approval_date ? new Date(data.approval_date) : undefined}
                onSelect={(date) => onChange('approval_date', date ? format(date, 'yyyy-MM-dd') : null)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
            Portfolio Decision {isEditMode && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={data.approval_decision || ''}
            onValueChange={(value) => onChange('approval_decision', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {APPROVAL_DECISION_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Approved Budget Ceiling */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Approved Budget Ceiling</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm">SAR</span>
          <Input
            type="number"
            value={data.approved_budget_ceiling || ''}
            onChange={(e) => onChange('approved_budget_ceiling', e.target.value ? parseFloat(e.target.value) : null)}
            disabled={!isEditMode}
            placeholder="0.00"
            className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] pl-12"
          />
        </div>
      </div>

      {/* Approval Remarks */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Approval Remarks</label>
        <Textarea
          value={data.approval_remarks || ''}
          onChange={(e) => onChange('approval_remarks', e.target.value)}
          disabled={!isEditMode}
          placeholder="Add approval remarks..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>
    </div>
  );
}

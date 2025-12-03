import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BusinessRequest } from '@/types/business-request';

interface OnHoldTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function OnHoldTab({ data, isEditMode, onChange }: OnHoldTabProps) {
  return (
    <div className="space-y-4">
      {/* Reason */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Reason {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Textarea
          value={data.on_hold_reason || ''}
          onChange={(e) => onChange('on_hold_reason', e.target.value)}
          disabled={!isEditMode}
          placeholder="Explain why this request is on hold..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[120px]"
        />
      </div>

      {/* Expected Resume Date */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Expected Resume Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={!isEditMode}
              className={cn(
                "w-full justify-start text-left font-normal border-[#e5e5e5]",
                !data.expected_resume_date && "text-muted-foreground",
                !isEditMode && "bg-[#f9fafb] text-[#6b7280]"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {data.expected_resume_date ? format(new Date(data.expected_resume_date), 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data.expected_resume_date ? new Date(data.expected_resume_date) : undefined}
              onSelect={(date) => onChange('expected_resume_date', date ? format(date, 'yyyy-MM-dd') : null)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Comment */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Comment</label>
        <Textarea
          value={data.on_hold_comment || ''}
          onChange={(e) => onChange('on_hold_comment', e.target.value)}
          disabled={!isEditMode}
          placeholder="Add additional comments..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>
    </div>
  );
}

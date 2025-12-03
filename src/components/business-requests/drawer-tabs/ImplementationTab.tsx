import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BusinessRequest } from '@/types/business-request';

interface ImplementationTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function ImplementationTab({ data, isEditMode, onChange }: ImplementationTabProps) {
  return (
    <div className="space-y-4">
      {/* Implementation Owner */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Implementation Owner {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Input
          value={data.implementation_owner || ''}
          onChange={(e) => onChange('implementation_owner', e.target.value)}
          disabled={!isEditMode}
          placeholder="Enter implementation owner"
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Start Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!isEditMode}
                className={cn(
                  "w-full justify-start text-left font-normal border-[#e5e5e5]",
                  !data.impl_start_date && "text-muted-foreground",
                  !isEditMode && "bg-[#f9fafb] text-[#6b7280]"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.impl_start_date ? format(new Date(data.impl_start_date), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.impl_start_date ? new Date(data.impl_start_date) : undefined}
                onSelect={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Target End Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!isEditMode}
                className={cn(
                  "w-full justify-start text-left font-normal border-[#e5e5e5]",
                  !data.impl_target_end_date && "text-muted-foreground",
                  !isEditMode && "bg-[#f9fafb] text-[#6b7280]"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.impl_target_end_date ? format(new Date(data.impl_target_end_date), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.impl_target_end_date ? new Date(data.impl_target_end_date) : undefined}
                onSelect={(date) => onChange('impl_target_end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Key Risks / Remarks */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Key Risks / Remarks</label>
        <Textarea
          value={data.key_risks_remarks || ''}
          onChange={(e) => onChange('key_risks_remarks', e.target.value)}
          disabled={!isEditMode}
          placeholder="Document key risks and remarks..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>

      {/* Outcome Summary */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Outcome Summary {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Textarea
          value={data.outcome_summary || ''}
          onChange={(e) => onChange('outcome_summary', e.target.value)}
          disabled={!isEditMode}
          placeholder="Summarize the implementation outcome..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>

      {/* QA Remarks */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">QA Remarks</label>
        <Textarea
          value={data.qa_remarks || ''}
          onChange={(e) => onChange('qa_remarks', e.target.value)}
          disabled={!isEditMode}
          placeholder="Add QA remarks..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[80px]"
        />
      </div>
    </div>
  );
}

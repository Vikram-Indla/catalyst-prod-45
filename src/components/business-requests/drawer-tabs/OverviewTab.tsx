import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BusinessRequest, PLATFORM_OPTIONS, COMPLEXITY_OPTIONS, URGENCY_OPTIONS, TRACK_OPTIONS } from '@/types/business-request';

interface OverviewTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function OverviewTab({ data, isEditMode, onChange }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Title {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          disabled={!isEditMode}
          placeholder="Enter request title"
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Description</label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          disabled={!isEditMode}
          placeholder="Describe your request..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>

      {/* Platform, Complexity, Urgency */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
            Platform {isEditMode && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={data.platform || ''}
            onValueChange={(value) => onChange('platform', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
            Complexity {isEditMode && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={data.complexity || ''}
            onValueChange={(value) => onChange('complexity', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {COMPLEXITY_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
            Urgency {isEditMode && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={data.urgency || ''}
            onValueChange={(value) => onChange('urgency', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Track, Requestor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Track</label>
          <Select
            value={data.track || ''}
            onValueChange={(value) => onChange('track', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {TRACK_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Requestor</label>
          <Input
            value={data.requestor || ''}
            onChange={(e) => onChange('requestor', e.target.value)}
            disabled={!isEditMode}
            placeholder="Enter requestor name"
            className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
          />
        </div>
      </div>

      {/* Business Justification */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Business Justification</label>
        <Textarea
          value={data.business_justification || ''}
          onChange={(e) => onChange('business_justification', e.target.value)}
          disabled={!isEditMode}
          placeholder="Explain business value..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
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
                  !data.start_date && "text-muted-foreground",
                  !isEditMode && "bg-[#f9fafb] text-[#6b7280]"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.start_date ? format(new Date(data.start_date), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.start_date ? new Date(data.start_date) : undefined}
                onSelect={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">End Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!isEditMode}
                className={cn(
                  "w-full justify-start text-left font-normal border-[#e5e5e5]",
                  !data.end_date && "text-muted-foreground",
                  !isEditMode && "bg-[#f9fafb] text-[#6b7280]"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.end_date ? format(new Date(data.end_date), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.end_date ? new Date(data.end_date) : undefined}
                onSelect={(date) => onChange('end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

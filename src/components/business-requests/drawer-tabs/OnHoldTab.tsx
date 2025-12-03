import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="space-y-6 p-5">
      {/* On Hold Reason Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">On Hold Details</h3>
          
          <div>
            <Label className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={data.on_hold_reason || ''}
              onChange={(e) => onChange('on_hold_reason', e.target.value)}
              placeholder="Explain why this request is on hold..."
              className="min-h-[120px] resize-none"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Expected Resume Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !data.expected_resume_date && "text-muted-foreground"
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
        </CardContent>
      </Card>

      {/* Additional Comments Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Additional Comments</h3>
          
          <div>
            <Textarea
              value={data.on_hold_comment || ''}
              onChange={(e) => onChange('on_hold_comment', e.target.value)}
              placeholder="Add additional comments..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

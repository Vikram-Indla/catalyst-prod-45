import { Input } from '@/components/ui/input';
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

interface ImplementationTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function ImplementationTab({ data, isEditMode, onChange }: ImplementationTabProps) {
  return (
    <div className="space-y-6 p-5">
      {/* Owner & Timeline Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Owner & Timeline</h3>
          
          <div>
            <Label className="text-sm font-medium">
              Implementation Owner <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.implementation_owner || ''}
              onChange={(e) => onChange('implementation_owner', e.target.value)}
              placeholder="Enter implementation owner"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !data.impl_start_date && "text-muted-foreground"
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
              <Label className="text-sm font-medium">Target End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !data.impl_target_end_date && "text-muted-foreground"
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
        </CardContent>
      </Card>

      {/* Risks & Remarks Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Risks & Remarks</h3>
          
          <div>
            <Label className="text-sm font-medium">Key Risks / Remarks</Label>
            <Textarea
              value={data.key_risks_remarks || ''}
              onChange={(e) => onChange('key_risks_remarks', e.target.value)}
              placeholder="Document key risks and remarks..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Outcome Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Outcome</h3>
          
          <div>
            <Label className="text-sm font-medium">
              Outcome Summary <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={data.outcome_summary || ''}
              onChange={(e) => onChange('outcome_summary', e.target.value)}
              placeholder="Summarize the implementation outcome..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">QA Remarks</Label>
            <Textarea
              value={data.qa_remarks || ''}
              onChange={(e) => onChange('qa_remarks', e.target.value)}
              placeholder="Add QA remarks..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="space-y-6 p-5">
      {/* Approver Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Approver Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Approver Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={data.approver_name || ''}
                onChange={(e) => onChange('approver_name', e.target.value)}
                placeholder="Enter approver name"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Approval Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !data.approval_date && "text-muted-foreground"
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
          </div>
        </CardContent>
      </Card>

      {/* Decision Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Approval Decision</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Decision <span className="text-destructive">*</span>
              </Label>
              <Select
                value={data.approval_decision || ''}
                onValueChange={(value) => onChange('approval_decision', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {APPROVAL_DECISION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Approved Budget Ceiling (SAR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">SAR</span>
                <Input
                  type="number"
                  value={data.approved_budget_ceiling || ''}
                  onChange={(e) => onChange('approved_budget_ceiling', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                  className="pl-12"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Approval Remarks</Label>
            <Textarea
              value={data.approval_remarks || ''}
              onChange={(e) => onChange('approval_remarks', e.target.value)}
              placeholder="Add approval remarks..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

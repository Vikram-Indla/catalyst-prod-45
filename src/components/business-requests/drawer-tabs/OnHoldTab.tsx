import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
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
            <CatalystDatePicker
              value={data.expected_resume_date || null}
              onChange={(date) => onChange('expected_resume_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="Pick a date"
            />
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

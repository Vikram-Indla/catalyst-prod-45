import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { BusinessRequest, RESOLUTION_CATEGORY_OPTIONS, IMPLEMENTATION_OUTCOME_OPTIONS } from '@/types/business-request';

interface SupportTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function SupportTab({ data, isEditMode, onChange }: SupportTabProps) {
  return (
    <div className="space-y-6 p-5">
      {/* Support Owner Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Support Details</h3>
          
          <div>
            <Label className="text-sm font-medium">Support Owner</Label>
            <Input
              value={data.support_owner || ''}
              onChange={(e) => onChange('support_owner', e.target.value)}
              placeholder="Enter support owner"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Support Remarks</Label>
            <Textarea
              value={data.support_remarks || ''}
              onChange={(e) => onChange('support_remarks', e.target.value)}
              placeholder="Add support remarks..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resolution Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Resolution</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Resolution Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={data.resolution_category || ''}
                onValueChange={(value) => onChange('resolution_category', value)}
              >
                <SelectTrigger>
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
              <Label className="text-sm font-medium">Implementation Outcome</Label>
              <Select
                value={data.implementation_outcome || ''}
                onValueChange={(value) => onChange('implementation_outcome', value)}
              >
                <SelectTrigger>
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
        </CardContent>
      </Card>
    </div>
  );
}

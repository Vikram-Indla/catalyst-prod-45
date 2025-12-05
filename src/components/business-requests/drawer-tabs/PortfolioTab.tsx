import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { BusinessRequest, RISK_RATING_OPTIONS, DELIVERY_PLATFORM_OPTIONS, DELIVERY_TRACK_OPTIONS } from '@/types/business-request';

interface PortfolioTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function PortfolioTab({ data, isEditMode, onChange }: PortfolioTabProps) {
  return (
    <div className="space-y-6 p-5">
      {/* Portfolio Assessment Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Portfolio Assessment</h3>
          
          <div>
            <Label className="text-sm font-medium">Dependencies</Label>
            <Textarea
              value={data.dependencies || ''}
              onChange={(e) => onChange('dependencies', e.target.value)}
              placeholder="List dependencies..."
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Risk Rating</Label>
              <Select
                value={data.risk_rating || ''}
                onValueChange={(value) => onChange('risk_rating', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {RISK_RATING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div />
          </div>

          <div>
            <Label className="text-sm font-medium">Portfolio Comments</Label>
            <Textarea
              value={data.portfolio_comments || ''}
              onChange={(e) => onChange('portfolio_comments', e.target.value)}
              placeholder="Add comments..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Configuration Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Delivery Configuration</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Delivery Platform</Label>
              <Select
                value={data.delivery_platform || ''}
                onValueChange={(value) => onChange('delivery_platform', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Delivery Track</Label>
              <Select
                value={data.delivery_track || ''}
                onValueChange={(value) => onChange('delivery_track', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_TRACK_OPTIONS.map((opt) => (
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

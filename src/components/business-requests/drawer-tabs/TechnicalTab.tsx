import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { BusinessRequest, INTEGRATION_SYSTEMS_OPTIONS } from '@/types/business-request';

interface TechnicalTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function TechnicalTab({ data, isEditMode, onChange }: TechnicalTabProps) {
  const integrationSystems = data.integration_systems || [];

  const toggleIntegrationSystem = (system: string) => {
    if (integrationSystems.includes(system)) {
      onChange('integration_systems', integrationSystems.filter(s => s !== system));
    } else {
      onChange('integration_systems', [...integrationSystems, system]);
    }
  };

  return (
    <div className="space-y-6 p-5">
      {/* Solution Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Proposed Solution</h3>
          
          <div>
            <Textarea
              value={data.proposed_solution || ''}
              onChange={(e) => onChange('proposed_solution', e.target.value)}
              placeholder="Describe the proposed solution..."
              className="min-h-[120px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Effort & Cost Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Effort & Cost</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Estimated Effort <span className="text-destructive">*</span>
              </Label>
              <Input
                value={data.estimated_effort || ''}
                onChange={(e) => onChange('estimated_effort', e.target.value)}
                placeholder="e.g., 4 weeks"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Estimated Cost (SAR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">SAR</span>
                <Input
                  type="number"
                  value={data.estimated_cost || ''}
                  onChange={(e) => onChange('estimated_cost', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                  className="pl-12"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Technical Validator</Label>
            <Input
              value={data.technical_validator || ''}
              onChange={(e) => onChange('technical_validator', e.target.value)}
              placeholder="Enter validator name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Integration Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Integration</h3>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Integration Required</Label>
              <p className="text-xs text-muted-foreground">Does this require integration with other systems?</p>
            </div>
            <Switch
              checked={data.integration_required || false}
              onCheckedChange={(checked) => onChange('integration_required', checked)}
            />
          </div>

          {data.integration_required && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Integration Systems</Label>
              <div className="flex flex-wrap gap-2">
                {INTEGRATION_SYSTEMS_OPTIONS.map((system) => {
                  const isSelected = integrationSystems.includes(system);
                  return (
                    <Badge
                      key={system}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => toggleIntegrationSystem(system)}
                    >
                      {system}
                      {isSelected && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

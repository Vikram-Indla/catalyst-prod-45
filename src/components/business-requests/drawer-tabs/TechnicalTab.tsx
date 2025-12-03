import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-4">
      {/* Proposed Solution */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Proposed Solution {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Textarea
          value={data.proposed_solution || ''}
          onChange={(e) => onChange('proposed_solution', e.target.value)}
          disabled={!isEditMode}
          placeholder="Describe the proposed solution..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>

      {/* Estimated Effort & Cost */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
            Estimated Effort {isEditMode && <span className="text-red-500">*</span>}
          </label>
          <Input
            value={data.estimated_effort || ''}
            onChange={(e) => onChange('estimated_effort', e.target.value)}
            disabled={!isEditMode}
            placeholder="e.g., 4 weeks"
            className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Estimated Cost</label>
          <Input
            type="number"
            value={data.estimated_cost || ''}
            onChange={(e) => onChange('estimated_cost', e.target.value ? parseFloat(e.target.value) : null)}
            disabled={!isEditMode}
            placeholder="Enter amount"
            className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
          />
        </div>
      </div>

      {/* Integration Required Toggle */}
      <div className="flex items-center justify-between p-4 border border-[#e5e5e5] rounded-lg">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a]">Integration Required</label>
          <p className="text-xs text-[#6b7280]">Does this require integration with other systems?</p>
        </div>
        <Switch
          checked={data.integration_required || false}
          onCheckedChange={(checked) => onChange('integration_required', checked)}
          disabled={!isEditMode}
        />
      </div>

      {/* Integration Systems - Conditional */}
      {data.integration_required && (
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Integration Systems</label>
          <div className="flex flex-wrap gap-2">
            {INTEGRATION_SYSTEMS_OPTIONS.map((system) => {
              const isSelected = integrationSystems.includes(system);
              return (
                <Badge
                  key={system}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    isSelected 
                      ? 'bg-brand-gold text-white hover:bg-brand-gold-hover' 
                      : 'border-[#e5e5e5] text-[#6b7280] hover:bg-gray-50'
                  } ${!isEditMode ? 'pointer-events-none opacity-60' : ''}`}
                  onClick={() => isEditMode && toggleIntegrationSystem(system)}
                >
                  {system}
                  {isSelected && isEditMode && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Technical Validator */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Technical Validator</label>
        <Input
          value={data.technical_validator || ''}
          onChange={(e) => onChange('technical_validator', e.target.value)}
          disabled={!isEditMode}
          placeholder="Enter validator name"
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
        />
      </div>
    </div>
  );
}

import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessRequest, RISK_RATING_OPTIONS, DELIVERY_PLATFORM_OPTIONS, DELIVERY_TRACK_OPTIONS } from '@/types/business-request';

interface PortfolioTabProps {
  data: Partial<BusinessRequest>;
  isEditMode: boolean;
  onChange: (field: keyof BusinessRequest, value: any) => void;
}

export function PortfolioTab({ data, isEditMode, onChange }: PortfolioTabProps) {
  return (
    <div className="space-y-4">
      {/* Business Justification */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">
          Business Justification {isEditMode && <span className="text-red-500">*</span>}
        </label>
        <Textarea
          value={data.business_justification || ''}
          onChange={(e) => onChange('business_justification', e.target.value)}
          disabled={!isEditMode}
          placeholder="Enter business justification..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[100px]"
        />
      </div>

      {/* Dependencies */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Dependencies</label>
        <Textarea
          value={data.dependencies || ''}
          onChange={(e) => onChange('dependencies', e.target.value)}
          disabled={!isEditMode}
          placeholder="List dependencies..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[80px]"
        />
      </div>

      {/* Risk Rating */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Risk Rating</label>
        <Select
          value={data.risk_rating || ''}
          onValueChange={(value) => onChange('risk_rating', value)}
          disabled={!isEditMode}
        >
          <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {RISK_RATING_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comments */}
      <div>
        <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Comments</label>
        <Textarea
          value={data.portfolio_comments || ''}
          onChange={(e) => onChange('portfolio_comments', e.target.value)}
          disabled={!isEditMode}
          placeholder="Add comments..."
          className="border-[#e5e5e5] focus:border-brand-gold disabled:bg-[#f9fafb] disabled:text-[#6b7280] min-h-[80px]"
        />
      </div>

      {/* Delivery Platform & Track */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Delivery Platform</label>
          <Select
            value={data.delivery_platform || ''}
            onValueChange={(value) => onChange('delivery_platform', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Delivery Track</label>
          <Select
            value={data.delivery_track || ''}
            onValueChange={(value) => onChange('delivery_track', value)}
            disabled={!isEditMode}
          >
            <SelectTrigger className="border-[#e5e5e5] disabled:bg-[#f9fafb]">
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
    </div>
  );
}

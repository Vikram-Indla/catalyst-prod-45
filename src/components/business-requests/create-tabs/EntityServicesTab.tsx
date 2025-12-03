import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

// EFS Factory Service Domains
const EFS_DOMAINS = [
  { value: 'license_models', label: 'License Models / التراخيص الصناعية' },
  { value: 'site_location', label: 'Site Location / الموقع المكاني' },
  { value: 'environment_service', label: 'Environment Service / التصاريح البيئية' },
  { value: 'customs_exemptions', label: 'Customs Exemptions / الإعفاءات الجمركية' },
  { value: 'chemical_permits', label: 'Chemical Permits / الفسوحات الكيميائية' },
  { value: 'labor_enablement', label: 'Labor Enablement / تأييد العمالة' },
  { value: 'incentives_enablers', label: 'Incentives & Enablers / الحوافز والممكنات' },
  { value: 'competitiveness', label: 'Competitiveness / التنافسية' },
];

// EFS Child Services (cascading)
const EFS_SERVICES: Record<string, string[]> = {
  'license_models': [
    'Products / المنتجات',
    'Raw Materials / المواد الأولية',
    'Spare Parts / قطع الغيار',
    'Machines / الآلات والمعدات',
    'Data / البيانات',
    'Energy / الطاقة',
    'Investment / الاستثمار',
    'Labor / العمالة',
    'Site Allocation / التخصيص المكاني',
    'Environmental Permit / التصريح البيئي',
    'Ownership Transfer / نقل الملكية',
    'License Transfer / نقل الترخيص',
  ],
  'site_location': ['RCJY', 'Modon', 'MOMRA', 'MEWA'],
  'environment_service': ['Construction Permit', 'Operation Permit'],
  'customs_exemptions': ['Customs Issuance', 'Return Exemption', 'Clearance', 'ZATCA', 'SASO'],
  'chemical_permits': ['ZATCA'],
  'labor_enablement': ['Labor Support Service', 'HRSD'],
  'incentives_enablers': ['RCJY', 'Modon'],
  'competitiveness': ['RCJY', 'Modon'],
};

// EFS Track Types
const EFS_TRACK_TYPES = [
  'Service in House',
  'Active with Condition',
  'Integration with Entities',
  'Dashboard & Report',
  'AI Track',
];

// ECS Options
const ECS_OPTIONS = [
  'CR with Industry ISIC',
  'CR without Industry ISIC',
];

// IS Saudi Options
const IS_SAUDI_OPTIONS = [
  'Incentives & Enablers',
  'Competitiveness',
];

// IS Non-Saudi Options
const IS_NON_SAUDI_OPTIONS = [
  'Incentives & Enablers',
];

interface EntityServicesTabProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

export function EntityServicesTab({ data, onChange }: EntityServicesTabProps) {
  const selectedDomain = data.efs_domain || '';
  const serviceOptions = EFS_SERVICES[selectedDomain] || [];

  return (
    <div className="space-y-6 p-5">
      {/* Section A - EFS Factory Services */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">
            Section A – Entity – Factory Services (EFS)
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Factory Service Domain</Label>
              <Select
                value={data.efs_domain || ''}
                onValueChange={(value) => {
                  onChange('efs_domain', value);
                  onChange('efs_service', ''); // Reset child when parent changes
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select domain..." />
                </SelectTrigger>
                <SelectContent>
                  {EFS_DOMAINS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Specific Service</Label>
              <Select
                value={data.efs_service || ''}
                onValueChange={(value) => onChange('efs_service', value)}
                disabled={!selectedDomain}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={selectedDomain ? "Select service..." : "Select domain first"} />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">EFS – Track Type</Label>
              <Select
                value={data.efs_track_type || ''}
                onValueChange={(value) => onChange('efs_track_type', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select track type..." />
                </SelectTrigger>
                <SelectContent>
                  {EFS_TRACK_TYPES.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B - ECS Commercial Services */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">
            Section B – Entity – Commercial Services (ECS)
          </h3>
          
          <div>
            <Label className="text-sm font-medium">ECS – Commercial Registry</Label>
            <Select
              value={data.ecs_registry || ''}
              onValueChange={(value) => onChange('ecs_registry', value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select registry type..." />
              </SelectTrigger>
              <SelectContent>
                {ECS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section C - Individual Services */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">
            Section C – Individual Services (IS)
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">IS – Saudi Category</Label>
              <Select
                value={data.is_saudi || ''}
                onValueChange={(value) => onChange('is_saudi', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {IS_SAUDI_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">IS – Non-Saudi Category</Label>
              <Select
                value={data.is_non_saudi || ''}
                onValueChange={(value) => onChange('is_non_saudi', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {IS_NON_SAUDI_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Guidance */}
      <Card className="border border-blue-200 rounded-lg bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-800">
              <p className="font-medium">Usage Guidance:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>If the demand is related to a <strong>FACTORY</strong> (license, site, environment, customs, labor, incentives), choose the domain under EFS – Factory Services.</li>
                <li>If the demand affects <strong>COMMERCIAL REGISTRY</strong>, fill ECS – Commercial Registry.</li>
                <li>If the demand targets <strong>INVESTOR</strong> incentives or competitiveness (Saudi or Non-Saudi), fill the relevant IS fields.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

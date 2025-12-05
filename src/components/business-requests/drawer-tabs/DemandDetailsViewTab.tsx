import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, Lock, Unlock, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '../RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { 
  BusinessRequest, 
  DELIVERY_PLATFORM_OPTIONS
} from '@/types/business-request';

// Delivery Track Options
const DELIVERY_TRACK_OPTIONS = [
  'BAU Fast Track',
  'Project',
  'Entity Integration',
];

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

interface DemandDetailsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function DemandDetailsViewTab({ data, onChange }: DemandDetailsViewTabProps) {
  const [targetDateLocked, setTargetDateLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);
  const currentUser = 'Current User';

  const handleLockToggle = () => {
    if (targetDateLocked) {
      if (lockedByUser && lockedByUser !== currentUser) {
        toast.error(`Cannot unlock. This date was locked by ${lockedByUser}`);
        return;
      }
      setTargetDateLocked(false);
      setLockedByUser(null);
      toast.info('Target Completion Date unlocked');
    } else {
      if (!data.impl_start_date) {
        toast.error('Cannot lock: Initiation Date must be populated first');
        return;
      }
      if (!data.end_date) {
        toast.error('Cannot lock: Target Completion Date must be populated first');
        return;
      }
      setTargetDateLocked(true);
      setLockedByUser(currentUser);
      toast.success(`Target Completion Date locked by ${currentUser}`);
    }
  };

  const selectedDomain = data.efs_domain || '';
  const serviceOptions = EFS_SERVICES[selectedDomain] || [];

  return (
    <div className="space-y-4 p-4">
      {/* DETAILS Section - Consolidated Basic Info + Assignment */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-gold">Details</h3>
          
          {/* Summary */}
          <div>
            <Label className="text-xs font-medium">
              Summary <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Enter demand summary"
              className="mt-1 h-9 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-medium">Description</Label>
            <div className="mt-1">
              <RichTextEditor
                value={data.description || ''}
                onChange={(value) => onChange('description', value)}
                placeholder="Describe the demand..."
              />
            </div>
          </div>

          {/* People - 2x2 compact grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Reporter</Label>
              <div className="mt-1">
                <UserPicker
                  value={data.requestor || null}
                  onChange={(value) => onChange('requestor', value as string | null)}
                  placeholder="Select reporter..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Assignee</Label>
              <div className="mt-1">
                <UserPicker
                  value={data.assignee || null}
                  onChange={(value) => onChange('assignee', value as string | null)}
                  placeholder="Select assignee..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Department</Label>
              <Select
                value={data.department || ''}
                onValueChange={(value) => onChange('department', value)}
              >
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="it">Information Technology</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Business Owner</Label>
              <Input
                value={data.business_owner || ''}
                onChange={(e) => onChange('business_owner', e.target.value)}
                placeholder="Enter name"
                className="mt-1 h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PLANNING & DELIVERY Section - Consolidated Timeline + Delivery Context */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-gold">Planning & Delivery</h3>
          
          {/* Dates - 3-column compact grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium">Business Ask</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1 h-9 text-sm",
                      !data.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {data.start_date ? format(new Date(data.start_date), 'dd/MM/yy') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data.start_date ? new Date(data.start_date) : undefined}
                    onSelect={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-xs font-medium">Initiation</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1 h-9 text-sm",
                      !data.impl_start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {data.impl_start_date ? format(new Date(data.impl_start_date), 'dd/MM/yy') : 'Select'}
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
              <Label className="text-xs font-medium">Target Complete</Label>
              <div className="flex gap-1.5 mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={targetDateLocked}
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-9 text-sm",
                        !data.end_date && "text-muted-foreground",
                        targetDateLocked && "opacity-60"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {data.end_date ? format(new Date(data.end_date), 'dd/MM/yy') : 'Select'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={data.end_date ? new Date(data.end_date) : undefined}
                      onSelect={(date) => onChange('end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLockToggle}
                  className={cn(
                    "shrink-0 h-9 w-9",
                    targetDateLocked && "bg-muted border-brand-gold text-brand-gold"
                  )}
                  title={targetDateLocked ? `Locked by ${lockedByUser}` : 'Lock date'}
                >
                  {targetDateLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery context - 3-column compact grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium">Delivery Track</Label>
              <Select
                value={data.delivery_track || data.track || ''}
                onValueChange={(value) => onChange('delivery_track', value)}
              >
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {DELIVERY_TRACK_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs font-medium">Platform</Label>
              <Select
                value={data.delivery_platform || ''}
                onValueChange={(value) => onChange('delivery_platform', value)}
              >
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {DELIVERY_PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs font-medium">Quarter</Label>
              <Select
                value={data.planned_quarter || ''}
                onValueChange={(value) => onChange('planned_quarter', value)}
              >
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="Q4-2025">Q4 2025</SelectItem>
                  <SelectItem value="Q1-2026">Q1 2026</SelectItem>
                  <SelectItem value="Q2-2026">Q2 2026</SelectItem>
                  <SelectItem value="Q3-2026">Q3 2026</SelectItem>
                  <SelectItem value="Q4-2026">Q4 2026</SelectItem>
                  <SelectItem value="Q1-2027">Q1 2027</SelectItem>
                  <SelectItem value="Q2-2027">Q2 2027</SelectItem>
                  <SelectItem value="Q3-2027">Q3 2027</SelectItem>
                  <SelectItem value="Q4-2027">Q4 2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entity & Individual Services - Collapsible Section */}
      <Collapsible defaultOpen={false}>
        <Card className="border border-border/60 rounded-lg bg-card">
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                  Entity & Individual Services
                </h3>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4 space-y-4">
              {/* EFS - Factory Services */}
              <div className="space-y-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">EFS – Factory Services</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Domain</Label>
                    <Select
                      value={data.efs_domain || ''}
                      onValueChange={(value) => {
                        onChange('efs_domain', value);
                        onChange('efs_service', '');
                      }}
                    >
                      <SelectTrigger className="mt-1 h-9 text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {EFS_DOMAINS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Service</Label>
                    <Select
                      value={data.efs_service || ''}
                      onValueChange={(value) => onChange('efs_service', value)}
                      disabled={!selectedDomain}
                    >
                      <SelectTrigger className="mt-1 h-9 text-sm">
                        <SelectValue placeholder={selectedDomain ? "Select..." : "Select domain"} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {serviceOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Track Type</Label>
                    <Select
                      value={data.efs_track_type || ''}
                      onValueChange={(value) => onChange('efs_track_type', value)}
                    >
                      <SelectTrigger className="mt-1 h-9 text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {EFS_TRACK_TYPES.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ECS - Commercial Services */}
              <div className="space-y-3 pt-3 border-t border-border/40">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ECS – Commercial Services</p>
                <div>
                  <Label className="text-xs font-medium">Commercial Registry</Label>
                  <Select
                    value={data.ecs_registry || ''}
                    onValueChange={(value) => onChange('ecs_registry', value)}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      {ECS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* IS - Individual Services */}
              <div className="space-y-3 pt-3 border-t border-border/40">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">IS – Individual Services</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Saudi Category</Label>
                    <Select
                      value={data.is_saudi || ''}
                      onValueChange={(value) => onChange('is_saudi', value)}
                    >
                      <SelectTrigger className="mt-1 h-9 text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {IS_SAUDI_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Non-Saudi Category</Label>
                    <Select
                      value={data.is_non_saudi || ''}
                      onValueChange={(value) => onChange('is_non_saudi', value)}
                    >
                      <SelectTrigger className="mt-1 h-9 text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {IS_NON_SAUDI_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
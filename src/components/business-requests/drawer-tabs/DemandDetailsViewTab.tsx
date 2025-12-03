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
import { 
  BusinessRequest, 
  PROCESS_STEPS
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
    <div className="space-y-6 p-5">
      {/* Process Step Section (Health removed) */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">Process Step</h3>
          
          <div>
            <Label className="text-sm font-medium">Process Step</Label>
            <Select
              value={data.process_step || 'new_demand'}
              onValueChange={(value) => onChange('process_step', value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">
                {PROCESS_STEPS.map((step) => (
                  <SelectItem key={step.value} value={step.value}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${step.color}`}>
                      {step.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information Section */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">Basic Information</h3>
          
          <div>
            <Label className="text-sm font-medium">
              Summary <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Enter demand summary (min 5 characters)"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Description</Label>
            <div className="mt-1.5">
              <RichTextEditor
                value={data.description || ''}
                onChange={(value) => onChange('description', value)}
                placeholder="Describe the demand in detail..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Section */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">Timeline</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Business Ask Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1.5",
                      !data.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.start_date ? format(new Date(data.start_date), 'dd/MM/yyyy') : 'dd/mm/yyyy'}
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
              <Label className="text-sm font-medium">Initiation Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1.5",
                      !data.impl_start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.impl_start_date ? format(new Date(data.impl_start_date), 'dd/MM/yyyy') : 'dd/mm/yyyy'}
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
              <Label className="text-sm font-medium">Target Completion Date</Label>
              <div className="flex gap-2 mt-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={targetDateLocked}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !data.end_date && "text-muted-foreground",
                        targetDateLocked && "opacity-60"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {data.end_date ? format(new Date(data.end_date), 'dd/MM/yyyy') : 'dd/mm/yyyy'}
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
                    "shrink-0",
                    targetDateLocked && "bg-muted border-brand-gold text-brand-gold"
                  )}
                  title={targetDateLocked ? `Locked by ${lockedByUser}` : 'Click to lock date'}
                >
                  {targetDateLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Section */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">Assignment</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Reporter</Label>
              <Input
                value="Current User"
                disabled
                className="mt-1.5 bg-muted/50"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Assignee</Label>
              <Select
                value={data.requestor || ''}
                onValueChange={(value) => onChange('requestor', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="analyst">Business Analyst</SelectItem>
                  <SelectItem value="tech_lead">Technical Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Department</Label>
              <Select
                value={data.department || ''}
                onValueChange={(value) => onChange('department', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select department..." />
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
              <Label className="text-sm font-medium">Business Owner</Label>
              <Input
                value={data.business_owner || ''}
                onChange={(e) => onChange('business_owner', e.target.value)}
                placeholder="Enter business owner name"
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Context Section */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">Delivery Context</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Delivery Track</Label>
              <Select
                value={data.delivery_track_parent || data.track || ''}
                onValueChange={(value) => onChange('delivery_track_parent', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select track..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {DELIVERY_TRACK_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Delivery Platform</Label>
              <Input
                value={data.delivery_platform || ''}
                disabled
                placeholder="Auto-populated from context"
                className="mt-1.5 bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">Read-only</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Planned Quarter</Label>
              <Select
                value={data.planned_quarter || ''}
                onValueChange={(value) => onChange('planned_quarter', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select quarter..." />
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
                  <SelectItem value="Q1-2028">Q1 2028</SelectItem>
                  <SelectItem value="Q2-2028">Q2 2028</SelectItem>
                  <SelectItem value="Q3-2028">Q3 2028</SelectItem>
                  <SelectItem value="Q4-2028">Q4 2028</SelectItem>
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
            <CardContent className="p-5 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">
                  Entity & Individual Services
                </h3>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-5 pb-5 space-y-5">
              {/* EFS - Factory Services */}
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EFS – Factory Services</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Factory Service Domain</Label>
                    <Select
                      value={data.efs_domain || ''}
                      onValueChange={(value) => {
                        onChange('efs_domain', value);
                        onChange('efs_service', '');
                      }}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select domain..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
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
                      <SelectContent className="bg-popover border shadow-lg z-50">
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
              <div className="space-y-4 pt-4 border-t border-border/40">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ECS – Commercial Services</p>
                <div>
                  <Label className="text-sm font-medium">ECS – Commercial Registry</Label>
                  <Select
                    value={data.ecs_registry || ''}
                    onValueChange={(value) => onChange('ecs_registry', value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select registry type..." />
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
              <div className="space-y-4 pt-4 border-t border-border/40">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IS – Individual Services</p>
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
                      <SelectContent className="bg-popover border shadow-lg z-50">
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

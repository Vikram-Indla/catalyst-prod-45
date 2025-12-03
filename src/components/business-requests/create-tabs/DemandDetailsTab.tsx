import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Lock, Unlock, Upload, X, FileText, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '../RichTextEditor';

// Allowed document MIME types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

// Delivery Track Parent Options
const DELIVERY_TRACK_PARENTS = [
  'BAU Fast Track',
  'Project',
  'Entity Integration',
];

// Delivery Track Child Options (cascading)
const DELIVERY_TRACK_CHILDREN: Record<string, string[]> = {
  'BAU Fast Track': ['Operational', 'Change Request'],
  'Project': ['New Project', 'New Feature'],
  'Entity Integration': ['New Entity', 'Entity CR'],
};

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

interface DemandDetailsTabProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

export function DemandDetailsTab({ data, onChange }: DemandDetailsTabProps) {
  const [targetDateLocked, setTargetDateLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = 'Current User';

  const attachments: File[] = data.attachments || [];

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (attachments.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    let totalSize = attachments.reduce((sum, f) => sum + f.size, 0);

    for (const file of files) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_FILE_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
        toast.error(`"${file.name}" is not a supported document type`);
        continue;
      }

      if (totalSize + file.size > MAX_FILE_SIZE) {
        toast.error(`Total file size cannot exceed 20MB`);
        break;
      }

      validFiles.push(file);
      totalSize += file.size;
    }

    if (validFiles.length > 0) {
      onChange('attachments', [...attachments, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onChange('attachments', newAttachments);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const selectedTrackParent = data.delivery_track_parent || '';
  const childOptions = DELIVERY_TRACK_CHILDREN[selectedTrackParent] || [];
  const selectedDomain = data.efs_domain || '';
  const serviceOptions = EFS_SERVICES[selectedDomain] || [];

  return (
    <div className="space-y-6 p-5">
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
            <p className="text-xs text-muted-foreground mb-1.5">Provide a detailed description (up to 2,000 words)</p>
            <RichTextEditor
              value={data.description || ''}
              onChange={(value) => onChange('description', value)}
              placeholder="Describe the demand in detail..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline Section - Moved after Description */}
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
              {targetDateLocked && lockedByUser && (
                <p className="text-xs text-muted-foreground mt-1">Locked by {lockedByUser}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments & Assignment Section */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">Attachments & Assignment</h3>

          <div>
            <div className="flex items-baseline gap-2">
              <Label className="text-sm font-medium">Attachments</Label>
              <span className="text-xs text-muted-foreground">(Max 5 files, 20MB total. Documents only: PDF, DOC, XLS, PPT, TXT, CSV)</span>
            </div>
            <div className="mt-1.5 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full justify-start text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
              >
                <Upload className="mr-2 h-4 w-4" />
                {attachments.length >= MAX_FILES ? 'Maximum files reached' : 'Upload Files...'}
              </Button>

              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {attachments.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md border border-border/40"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-brand-gold shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Reporter</Label>
              <Input
                value="Current User"
                disabled
                className="mt-1.5 bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-filled (current user)</p>
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

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div>
              <Label className="text-sm font-medium">Delivery Track</Label>
              <Select
                value={data.delivery_track_parent || ''}
                onValueChange={(value) => {
                  onChange('delivery_track_parent', value);
                  onChange('track', '');
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select track..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {DELIVERY_TRACK_PARENTS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Delivery Track (Child)</Label>
              <Select
                value={data.track || ''}
                onValueChange={(value) => onChange('track', value)}
                disabled={!selectedTrackParent}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={selectedTrackParent ? "Select..." : "Select parent first"} />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {childOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <SelectContent className="bg-popover border shadow-lg z-50">
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

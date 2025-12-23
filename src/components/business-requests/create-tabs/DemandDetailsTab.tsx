import { useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Upload, X, FileText, Users, CalendarDays, Paperclip, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '../RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { DepartmentSelect } from '../DepartmentSelect';
import { BusinessOwnerSelect } from '../BusinessOwnerSelect';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';

const ALLOWED_EXTENSIONS = '*';
const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface DemandDetailsTabProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

export function DemandDetailsTab({ data, onChange }: DemandDetailsTabProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = 'Current User';

  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();

  // Initialize lock state from persisted data
  const targetDateLocked = data.end_date_locked ?? false;
  const lockedByUser = data.end_date_locked_by ?? null;

  useEffect(() => {
    if (user?.id && !data.requestor) {
      onChange('requestor', user.id);
    }
  }, [user?.id, data.requestor, onChange]);

  const handleDepartmentChange = (departmentId: string) => {
    onChange('department_id', departmentId);
    const dept = departments?.find(d => d.id === departmentId);
    if (dept) {
      onChange('department', dept.name);
    }
    if (mappings) {
      const ownerId = getOwnerIdForDepartment(departmentId, mappings);
      if (ownerId) {
        onChange('business_owner_id', ownerId);
        const owner = owners?.find(o => o.id === ownerId);
        if (owner) {
          onChange('business_owner', owner.name);
        }
      }
    }
  };

  const handleBusinessOwnerChange = (ownerId: string) => {
    onChange('business_owner_id', ownerId);
    const owner = owners?.find(o => o.id === ownerId);
    if (owner) {
      onChange('business_owner', owner.name);
    }
  };

  const attachments: File[] = data.attachments || [];

  const handleLockToggle = () => {
    if (targetDateLocked) {
      // Only allow the user who locked it to unlock
      if (lockedByUser && lockedByUser !== user?.id) {
        toast.error(`Cannot unlock. This date was locked by another user`);
        return;
      }
      // Unlock
      onChange('end_date_locked', false);
      onChange('end_date_locked_by', null);
      onChange('end_date_locked_at', null);
      toast.info('Target Completion Date unlocked');
    } else {
      if (!data.impl_start_date) {
        toast.error('Cannot lock: Kickoff Date must be populated first');
        return;
      }
      if (!data.end_date) {
        toast.error('Cannot lock: Target Completion Date must be populated first');
        return;
      }
      // Lock
      onChange('end_date_locked', true);
      onChange('end_date_locked_by', user?.id || null);
      onChange('end_date_locked_at', new Date().toISOString());
      toast.success(`Target Completion Date locked`);
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

  // Compact input styling
  const compactInputClass = cn(
    "h-9 text-sm px-3",
    "bg-white dark:bg-gray-900",
    "border border-gray-200 dark:border-gray-700",
    "rounded-md",
    "text-gray-900 dark:text-gray-100",
    "placeholder:text-gray-400",
    "focus:border-secondary-bronze focus:ring-1 focus:ring-secondary-bronze/20",
    "transition-colors"
  );

  // Compact section header - inline style
  const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-200 dark:border-gray-700">
      <Icon className="w-4 h-4 text-secondary-olive" />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary-olive">
        {title}
      </h3>
    </div>
  );

  // Compact label with asterisk for required fields
  const CompactLabel = ({ children, required = false }: { children: React.ReactNode; required?: boolean }) => (
    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-0.5">
      {children}
      {required && <span className="text-red-500 text-sm font-bold">*</span>}
    </label>
  );

  return (
    <div className="space-y-4 p-5">
      {/* Basic Information Section */}
      <div>
        <SectionHeader icon={FileText} title="Basic Information" />
        <div className="space-y-3">
          <div>
            <CompactLabel required>Summary</CompactLabel>
            <Input
              value={data.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Enter demand summary (min 5 characters)"
              className={compactInputClass}
            />
          </div>

          <div>
            <CompactLabel required>Description</CompactLabel>
            <RichTextEditor
              value={data.description || ''}
              onChange={(value) => onChange('description', value)}
              placeholder="Describe the demand in detail..."
            />
          </div>
        </div>
      </div>

      {/* Timeline Section - All 3 fields in ONE row */}
      <div>
        <SectionHeader icon={CalendarDays} title="Timeline" />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <CompactLabel>Business Ask Date</CompactLabel>
            <CatalystDatePicker
              value={data.start_date}
              onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="dd/mm/yyyy"
            />
          </div>

          <div>
            <CompactLabel>Kickoff Date</CompactLabel>
            <CatalystDatePicker
              value={data.impl_start_date}
              onChange={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="dd/mm/yyyy"
            />
          </div>

          <div>
            <CompactLabel>Target Completion</CompactLabel>
            <div className="flex gap-1.5">
              <CatalystDatePicker
                value={data.end_date}
                onChange={(date) => onChange('end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="dd/mm/yyyy"
                disabled={targetDateLocked}
                className={cn(targetDateLocked && "opacity-60")}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleLockToggle}
                className={cn(
                  "h-9 w-9 shrink-0",
                  targetDateLocked && "bg-muted border-secondary-olive text-secondary-olive"
                )}
                title={targetDateLocked ? `Locked by ${lockedByUser}` : 'Click to lock date'}
              >
                {targetDateLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Attachments & Assignment Section */}
      <div>
        <SectionHeader icon={Paperclip} title="Attachments & Assignment" />
        <div className="space-y-3">
          {/* Attachments - full width */}
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <CompactLabel>Attachments</CompactLabel>
              <span className="text-[10px] text-muted-foreground">(Max 5 files, 20MB total)</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="w-full justify-start text-muted-foreground h-9 text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_FILES}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              {attachments.length >= MAX_FILES ? 'Maximum files reached' : 'Upload Files...'}
            </Button>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded border border-border/40 text-xs"
                  >
                    <FileText className="h-3 w-3 text-secondary-bronze shrink-0" />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                    <button
                      className="p-0.5 hover:text-destructive"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reporter + Assignee - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <CompactLabel>Reporter</CompactLabel>
              <UserPicker
                value={data.requestor || null}
                onChange={(value) => onChange('requestor', value as string | null)}
                placeholder="Select reporter..."
              />
            </div>

            <div>
              <CompactLabel required>Assignee</CompactLabel>
              <UserPicker
                value={data.assignee || null}
                onChange={(value) => onChange('assignee', value as string | null)}
                placeholder="Select assignee..."
              />
            </div>
          </div>

          {/* Department + Business Owner - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <CompactLabel required>Department</CompactLabel>
              <DepartmentSelect
                value={data.department_id || null}
                onChange={handleDepartmentChange}
                placeholder="Select department..."
              />
            </div>

            <div>
              <CompactLabel required>Business Owner</CompactLabel>
              <BusinessOwnerSelect
                value={data.business_owner_id || null}
                onChange={handleBusinessOwnerChange}
                departmentId={data.department_id || null}
                placeholder="Select business owner..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Context Section - 2 columns in ONE row */}
      <div>
        <SectionHeader icon={Briefcase} title="Delivery Context" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <CompactLabel>Delivery Platform</CompactLabel>
            <Select
              value={data.delivery_platform || ''}
              onValueChange={(value) => onChange('delivery_platform', value)}
            >
              <SelectTrigger className={compactInputClass}>
                <SelectValue placeholder="Select platform..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-[200]">
                <SelectItem value="Senaei Platform">Senaei Platform</SelectItem>
                <SelectItem value="MIM Platform">MIM Platform</SelectItem>
                <SelectItem value="Enterprise Platform">Enterprise Platform</SelectItem>
                <SelectItem value="Digital Platform">Digital Platform</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <CompactLabel>Planned Quarter</CompactLabel>
            <Select
              value={data.planned_quarter || ''}
              onValueChange={(value) => onChange('planned_quarter', value)}
            >
              <SelectTrigger className={compactInputClass}>
                <SelectValue placeholder="Select quarter..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-[200]">
                <SelectItem value="Q4-2025">Q4 2025</SelectItem>
                <SelectItem value="Q1-2026">Q1 2026</SelectItem>
                <SelectItem value="Q2-2026">Q2 2026</SelectItem>
                <SelectItem value="Q3-2026">Q3 2026</SelectItem>
                <SelectItem value="Q4-2026">Q4 2026</SelectItem>
                <SelectItem value="Q1-2027">Q1 2027</SelectItem>
                <SelectItem value="Q2-2027">Q2 2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

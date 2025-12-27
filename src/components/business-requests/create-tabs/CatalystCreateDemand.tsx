import { useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Upload, X, FileText, Users, CalendarDays, Paperclip, Briefcase, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '../RichTextEditor';
import { UserPicker } from '@/components/ui/user-picker';
import { AssigneeUserPicker } from '../AssigneeUserPicker';
import { DepartmentSelect } from '../DepartmentSelect';
import { BusinessOwnerSelect } from '../BusinessOwnerSelect';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { FormField } from '../create-form';

const ALLOWED_EXTENSIONS = '*';
const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const SUMMARY_MAX_CHARS = 200;
const SUMMARY_MIN_CHARS = 5;
const DESCRIPTION_MAX_WORDS = 2000;
const DESCRIPTION_MIN_WORDS = 10;

interface DemandDetailsTabProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

// Helper to count words in HTML string
function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

export function CatalystCreateDemand({ data, onChange }: DemandDetailsTabProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();

  // Validation states
  const summaryLength = (data.title || '').length;
  const descriptionWordCount = useMemo(() => countWords(data.description || ''), [data.description]);
  const isSummaryValid = summaryLength >= SUMMARY_MIN_CHARS;
  const isDescriptionValid = descriptionWordCount >= DESCRIPTION_MIN_WORDS;

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
      if (lockedByUser && lockedByUser !== user?.id) {
        toast.error(`Cannot unlock. This date was locked by another user`);
        return;
      }
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

  // Compact input styling with dark mode
  const compactInputClass = cn(
    "h-9 text-sm px-3",
    "bg-white dark:bg-gray-800",
    "border border-gray-200 dark:border-gray-600",
    "rounded-lg",
    "text-gray-900 dark:text-gray-100",
    "placeholder:text-gray-400 dark:placeholder:text-gray-500",
    "focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10",
    "transition-colors"
  );

  // Compact section header
  const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-200 dark:border-gray-700">
      <Icon className="w-4 h-4 text-[#2563eb]" />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#2563eb]">
        {title}
      </h3>
    </div>
  );

  return (
    <div className="space-y-5 p-5">
      {/* Basic Information Section */}
      <div>
        <SectionHeader icon={FileText} title="Basic Information" />
        <div className="space-y-4">
          {/* Summary Field with validation */}
          <FormField
            label="Summary"
            required
            isValid={isSummaryValid}
            counter={{ current: summaryLength, max: SUMMARY_MAX_CHARS }}
          >
            <div className="relative">
              <Input
                value={data.title || ''}
                onChange={(e) => onChange('title', e.target.value)}
                placeholder="Brief title of the business request"
                maxLength={SUMMARY_MAX_CHARS}
                className={cn(
                  compactInputClass,
                  isSummaryValid && "border-[#0d9488]/50 focus:border-[#0d9488]"
                )}
              />
            </div>
          </FormField>

          {/* Description Field with word count */}
          <FormField
            label="Description"
            required
            isValid={isDescriptionValid}
            counter={{ current: descriptionWordCount, max: DESCRIPTION_MAX_WORDS, type: 'word' }}
          >
            <RichTextEditor
              value={data.description || ''}
              onChange={(value) => onChange('description', value)}
              placeholder="Describe the business need in detail..."
              minHeight="150px"
              className={cn(
                isDescriptionValid && "border-[#0d9488]/50"
              )}
            />
          </FormField>
        </div>
      </div>

      {/* Timeline Section */}
      <div>
        <SectionHeader icon={CalendarDays} title="Timeline" />
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Business Ask Date" showValidation={false}>
            <CatalystDatePicker
              value={data.start_date}
              onChange={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="dd/mm/yyyy"
            />
          </FormField>

          <FormField label="Kickoff Date" showValidation={false}>
            <CatalystDatePicker
              value={data.impl_start_date}
              onChange={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
              placeholder="dd/mm/yyyy"
            />
          </FormField>

          <FormField label="Target Completion" showValidation={false}>
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
                  "border-gray-200 dark:border-gray-600",
                  targetDateLocked && "bg-[#0d9488]/10 border-[#0d9488] text-[#0d9488]"
                )}
                title={targetDateLocked ? `Locked by ${lockedByUser}` : 'Click to lock date'}
              >
                {targetDateLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </FormField>
        </div>
      </div>

      {/* Attachments & Assignment Section */}
      <div>
        <SectionHeader icon={Paperclip} title="Attachments & Assignment" />
        <div className="space-y-4">
          {/* Attachments */}
          <FormField 
            label="Attachments" 
            showValidation={false}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">(Max 5 files, 20MB total)</span>
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
                className={cn(
                  "w-full justify-start h-9 text-sm",
                  "text-gray-500 dark:text-gray-400",
                  "border-gray-200 dark:border-gray-600",
                  "border-dashed hover:border-[#2563eb] hover:bg-[#2563eb]/5"
                )}
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                {attachments.length >= MAX_FILES ? 'Maximum files reached' : 'Drop files here or click to upload...'}
              </Button>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                        "bg-gray-50 dark:bg-gray-800",
                        "border border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <FileText className="h-3 w-3 text-[#2563eb] shrink-0" />
                      <span className="truncate max-w-[120px] text-gray-700 dark:text-gray-300">{file.name}</span>
                      <span className="text-gray-400 dark:text-gray-500">({formatFileSize(file.size)})</span>
                      <button
                        className="p-0.5 hover:text-red-500 text-gray-400"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          {/* Reporter + Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Reporter" showValidation={false}>
              <UserPicker
                value={data.requestor || null}
                onChange={(value) => onChange('requestor', value as string | null)}
                placeholder="Select reporter..."
              />
            </FormField>

            <FormField label="Assignee" required isValid={!!data.assignee}>
              <AssigneeUserPicker
                value={data.assignee || null}
                onChange={(value) => onChange('assignee', value)}
                placeholder="Select assignee..."
              />
            </FormField>
          </div>

          {/* Department + Business Owner */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Department" required isValid={!!data.department_id}>
              <DepartmentSelect
                value={data.department_id || null}
                onChange={handleDepartmentChange}
                placeholder="Select department..."
              />
            </FormField>

            <FormField label="Business Owner" required isValid={!!data.business_owner_id}>
              <BusinessOwnerSelect
                value={data.business_owner_id || null}
                onChange={handleBusinessOwnerChange}
                departmentId={data.department_id || null}
                placeholder="Select business owner..."
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Delivery Context Section */}
      <div>
        <SectionHeader icon={Briefcase} title="Delivery Context" />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Delivery Platform" showValidation={false}>
            <Select
              value={data.delivery_platform || ''}
              onValueChange={(value) => onChange('delivery_platform', value)}
            >
              <SelectTrigger className={compactInputClass}>
                <SelectValue placeholder="Select platform..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-[200]">
                <SelectItem value="Senaei Platform">Senaei Platform</SelectItem>
                <SelectItem value="MIM Platform">MIM Platform</SelectItem>
                <SelectItem value="Enterprise Platform">Enterprise Platform</SelectItem>
                <SelectItem value="Digital Platform">Digital Platform</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Target Quarter" showValidation={false}>
            <Select
              value={data.planned_quarter || ''}
              onValueChange={(value) => onChange('planned_quarter', value)}
            >
              <SelectTrigger className={compactInputClass}>
                <SelectValue placeholder="Select quarter..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-[200]">
                <SelectItem value="Q4-2025">Q4 2025</SelectItem>
                <SelectItem value="Q1-2026">Q1 2026</SelectItem>
                <SelectItem value="Q2-2026">Q2 2026</SelectItem>
                <SelectItem value="Q3-2026">Q3 2026</SelectItem>
                <SelectItem value="Q4-2026">Q4 2026</SelectItem>
                <SelectItem value="Q1-2027">Q1 2027</SelectItem>
                <SelectItem value="Q2-2027">Q2 2027</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>
    </div>
  );
}

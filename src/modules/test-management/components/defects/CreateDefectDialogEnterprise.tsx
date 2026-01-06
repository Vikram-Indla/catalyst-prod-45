/**
 * Enterprise Create/Edit Defect Dialog
 * Full-featured tabbed dialog with 30+ fields
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Bug,
  Layout,
  Zap,
  Shield,
  Database,
  Link2,
  AlertTriangle,
  Users,
  X,
  Plus,
  CalendarIcon,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DEFECT_TYPES,
  SEVERITY_LEVELS,
  PRIORITY_LEVELS,
  STATUS_OPTIONS,
  FREQUENCY_OPTIONS,
  FOUND_DURING_OPTIONS,
  OS_OPTIONS,
  BROWSER_OPTIONS,
  DEVICE_OPTIONS,
  ENVIRONMENT_OPTIONS,
  COMPONENTS,
} from '../../config/defectConfig';
import { useCreateDefect, useUpdateDefect, useTeamMembers } from '@/hooks/test-management';

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  Bug,
  Layout,
  Zap,
  Shield,
  Database,
  Link: Link2,
  AlertTriangle,
  Users,
};

const defectSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().optional(),
  defect_type: z.string().default('bug'),
  severity: z.string().min(1, 'Severity is required'),
  priority: z.string().min(1, 'Priority is required'),
  status: z.string().default('new'),
  component: z.string().optional(),
  module: z.string().optional(),
  assigned_to: z.string().optional(),
  
  // Environment
  operating_system: z.string().optional(),
  browser: z.string().optional(),
  browser_version: z.string().optional(),
  device_type: z.string().optional(),
  environment: z.string().optional(),
  affects_version: z.string().optional(),
  fix_version: z.string().optional(),
  found_in_build: z.string().optional(),
  
  // Reproduction
  steps_to_reproduce: z.string().optional(),
  expected_result: z.string().optional(),
  actual_result: z.string().optional(),
  frequency: z.string().optional(),
  found_during: z.string().optional(),
  
  // Flags
  is_regression: z.boolean().default(false),
  is_blocker: z.boolean().default(false),
  is_security_issue: z.boolean().default(false),
  customer_reported: z.boolean().default(false),
  customer_name: z.string().optional(),
  
  // Tracking
  due_date: z.date().optional().nullable(),
  sprint: z.string().optional(),
  epic_link: z.string().optional(),
  
  // External
  external_id: z.string().optional(),
  external_url: z.string().optional(),
});

type DefectFormData = z.infer<typeof defectSchema>;

interface CreateDefectDialogEnterpriseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  defect?: any; // Existing defect for edit mode
  prefillData?: {
    title?: string;
    description?: string;
    linkedCaseId?: string;
    linkedRunId?: string;
    linkedStepId?: string;
    linkedCaseKey?: string;
  };
  onSuccess?: () => void;
}

export function CreateDefectDialogEnterprise({
  open,
  onOpenChange,
  projectId,
  defect,
  prefillData,
  onSuccess,
}: CreateDefectDialogEnterpriseProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');

  const { data: teamMembers = [] } = useTeamMembers(projectId || null);
  const createDefect = useCreateDefect();
  const updateDefect = useUpdateDefect();

  const isEdit = !!defect;
  const isSubmitting = createDefect.isPending || updateDefect.isPending;

  const form = useForm<DefectFormData>({
    resolver: zodResolver(defectSchema),
    defaultValues: {
      defect_type: 'bug',
      severity: 'major',
      priority: 'medium',
      status: 'new',
      is_regression: false,
      is_blocker: false,
      is_security_issue: false,
      customer_reported: false,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (defect) {
        // Edit mode - populate from existing defect
        form.reset({
          title: defect.title || '',
          description: defect.description || '',
          defect_type: defect.defect_type || 'bug',
          severity: defect.severity?.toLowerCase() || 'major',
          priority: defect.priority || 'medium',
          status: defect.status?.toLowerCase() || 'new',
          component: defect.component || '',
          module: defect.module || '',
          assigned_to: defect.assigned_to || '',
          operating_system: defect.operating_system || '',
          browser: defect.browser || '',
          browser_version: defect.browser_version || '',
          device_type: defect.device_type || '',
          environment: defect.environment || '',
          affects_version: defect.affects_version || '',
          fix_version: defect.fix_version || '',
          found_in_build: defect.found_in_build || '',
          steps_to_reproduce: defect.steps_to_reproduce || '',
          expected_result: defect.expected_result || '',
          actual_result: defect.actual_result || '',
          frequency: defect.frequency || '',
          found_during: defect.found_during || '',
          is_regression: defect.is_regression || false,
          is_blocker: defect.is_blocker || false,
          is_security_issue: defect.is_security_issue || false,
          customer_reported: defect.customer_reported || false,
          customer_name: defect.customer_name || '',
          due_date: defect.due_date ? new Date(defect.due_date) : null,
          sprint: defect.sprint || '',
          epic_link: defect.epic_link || '',
          external_id: defect.external_id || '',
          external_url: defect.external_url || '',
        });
        setLabels(defect.labels || []);
      } else if (prefillData) {
        // Prefill from execution context
        form.reset({
          title: prefillData.title || '',
          description: prefillData.description || '',
          defect_type: 'bug',
          severity: 'major',
          priority: 'medium',
          status: 'new',
          is_regression: false,
          is_blocker: false,
          is_security_issue: false,
          customer_reported: false,
        });
        setLabels([]);
      } else {
        // New defect
        form.reset({
          defect_type: 'bug',
          severity: 'major',
          priority: 'medium',
          status: 'new',
          is_regression: false,
          is_blocker: false,
          is_security_issue: false,
          customer_reported: false,
        });
        setLabels([]);
      }
      setActiveTab('basic');
    }
  }, [open, defect, prefillData, form]);

  const watchCustomerReported = form.watch('customer_reported');
  const watchDefectType = form.watch('defect_type');

  const addLabel = () => {
    const trimmed = labelInput.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed]);
      setLabelInput('');
    }
  };

  const removeLabel = (label: string) => {
    setLabels(labels.filter(l => l !== label));
  };

  const onSubmit = async (data: DefectFormData) => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    // Map form status to DefectStatus enum
    const statusMap: Record<string, string> = {
      'new': 'OPEN',
      'open': 'OPEN',
      'in_progress': 'IN_PROGRESS',
      'in_review': 'IN_PROGRESS',
      'ready_for_test': 'FIXED',
      'in_testing': 'IN_PROGRESS',
      'verified': 'VERIFIED',
      'closed': 'CLOSED',
      'reopened': 'OPEN',
      'deferred': 'WONT_FIX',
      'wont_fix': 'WONT_FIX',
      'duplicate': 'DUPLICATE',
    };

    // Map form severity to DefectSeverity enum
    const severityMap: Record<string, string> = {
      'blocker': 'CRITICAL',
      'critical': 'CRITICAL',
      'major': 'MAJOR',
      'moderate': 'MAJOR',
      'minor': 'MINOR',
      'trivial': 'TRIVIAL',
    };

    try {
      if (isEdit) {
        await updateDefect.mutateAsync({
          id: defect.id,
          project_id: projectId,
          title: data.title,
          description: data.description,
          severity: (severityMap[data.severity] || 'MAJOR') as any,
          status: (statusMap[data.status] || 'OPEN') as any,
          assigned_to: data.assigned_to || undefined,
          external_id: data.external_id,
          external_url: data.external_url,
        });
        toast.success('Defect updated successfully');
      } else {
        await createDefect.mutateAsync({
          project_id: projectId,
          title: data.title,
          description: data.description,
          severity: (severityMap[data.severity] || 'MAJOR') as any,
          assigned_to: data.assigned_to || undefined,
          external_id: data.external_id,
          external_url: data.external_url,
        });
        toast.success('Defect created successfully');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save defect:', error);
      toast.error(error.message || 'Failed to save defect');
    }
  };

  const getTypeIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || Bug;
    return Icon;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-destructive" />
            {isEdit ? 'Edit Defect' : 'Create Defect'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-6">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="basic" 
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger 
                  value="environment"
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Environment
                </TabsTrigger>
                <TabsTrigger 
                  value="reproduce"
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Reproduce
                </TabsTrigger>
                <TabsTrigger 
                  value="tracking"
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Tracking
                </TabsTrigger>
                <TabsTrigger 
                  value="links"
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Links
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[calc(90vh-200px)] px-6">
              {/* TAB 1: BASIC INFO */}
              <TabsContent value="basic" className="space-y-5 py-4 mt-0">
                {/* Defect Type Selection */}
                <div>
                  <Label className="text-sm font-medium">Defect Type</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {DEFECT_TYPES.map(type => {
                      const Icon = getTypeIcon(type.icon);
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => form.setValue('defect_type', type.value)}
                          className={cn(
                            "p-3 rounded-lg border-2 text-left transition-all flex flex-col items-center gap-1",
                            watchDefectType === type.value
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50"
                          )}
                        >
                          <Icon className={cn(
                            "h-5 w-5",
                            type.color === 'red' && "text-red-500",
                            type.color === 'orange' && "text-orange-500",
                            type.color === 'yellow' && "text-yellow-500",
                            type.color === 'purple' && "text-purple-500",
                            type.color === 'blue' && "text-blue-500",
                            type.color === 'cyan' && "text-cyan-500",
                            type.color === 'green' && "text-green-500",
                          )} />
                          <span className="text-xs font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...form.register('title')}
                    placeholder="Brief description of the defect..."
                    className="mt-1"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Detailed description of the issue..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                {/* Severity & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Severity *</Label>
                    <Select
                      value={form.watch('severity')}
                      onValueChange={(v) => form.setValue('severity', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full", s.color)} />
                              <span>{s.label}</span>
                              <span className="text-muted-foreground text-xs ml-1">
                                - {s.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority *</Label>
                    <Select
                      value={form.watch('priority')}
                      onValueChange={(v) => form.setValue('priority', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LEVELS.map(p => (
                          <SelectItem key={p.value} value={p.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full", p.color)} />
                              <span>{p.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Component & Module */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Component</Label>
                    <Select
                      value={form.watch('component') || ''}
                      onValueChange={(v) => form.setValue('component', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select component" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPONENTS.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Module</Label>
                    <Input
                      {...form.register('module')}
                      placeholder="e.g., Login, Dashboard"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <Label>Assignee</Label>
                  <Select
                    value={form.watch('assigned_to') || 'unassigned'}
                    onValueChange={(v) => form.setValue('assigned_to', v === 'unassigned' ? '' : v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((member: any) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Labels */}
                <div>
                  <Label>Labels</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      placeholder="Add label..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLabel();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addLabel}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {labels.map(label => (
                        <Badge key={label} variant="secondary" className="gap-1">
                          {label}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => removeLabel(label)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Flags */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">Flags</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.watch('is_regression')}
                        onCheckedChange={(c) => form.setValue('is_regression', !!c)}
                      />
                      <span className="text-sm">Regression</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.watch('is_blocker')}
                        onCheckedChange={(c) => form.setValue('is_blocker', !!c)}
                      />
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Blocker</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.watch('is_security_issue')}
                        onCheckedChange={(c) => form.setValue('is_security_issue', !!c)}
                      />
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Security Issue</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.watch('customer_reported')}
                        onCheckedChange={(c) => form.setValue('customer_reported', !!c)}
                      />
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Customer Reported</span>
                    </label>
                  </div>

                  {watchCustomerReported && (
                    <div className="mt-3 pt-3 border-t">
                      <Label>Customer Name</Label>
                      <Input
                        {...form.register('customer_name')}
                        placeholder="Enter customer name"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 2: ENVIRONMENT */}
              <TabsContent value="environment" className="space-y-4 py-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Operating System</Label>
                    <Select
                      value={form.watch('operating_system') || ''}
                      onValueChange={(v) => form.setValue('operating_system', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select OS" />
                      </SelectTrigger>
                      <SelectContent>
                        {OS_OPTIONS.map(os => (
                          <SelectItem key={os.value} value={os.value}>{os.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Device Type</Label>
                    <Select
                      value={form.watch('device_type') || ''}
                      onValueChange={(v) => form.setValue('device_type', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select device" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_OPTIONS.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Browser</Label>
                    <Select
                      value={form.watch('browser') || ''}
                      onValueChange={(v) => form.setValue('browser', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select browser" />
                      </SelectTrigger>
                      <SelectContent>
                        {BROWSER_OPTIONS.map(b => (
                          <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Browser Version</Label>
                    <Input
                      {...form.register('browser_version')}
                      placeholder="e.g., 120.0.6099.71"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Environment</Label>
                  <Select
                    value={form.watch('environment') || ''}
                    onValueChange={(v) => form.setValue('environment', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENT_OPTIONS.map(e => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Affects Version</Label>
                    <Input
                      {...form.register('affects_version')}
                      placeholder="e.g., v2.1.0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Fix Version</Label>
                    <Input
                      {...form.register('fix_version')}
                      placeholder="e.g., v2.2.0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Found in Build</Label>
                    <Input
                      {...form.register('found_in_build')}
                      placeholder="e.g., build-1234"
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: REPRODUCE */}
              <TabsContent value="reproduce" className="space-y-4 py-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select
                      value={form.watch('frequency') || ''}
                      onValueChange={(v) => form.setValue('frequency', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="How often does it occur?" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Found During</Label>
                    <Select
                      value={form.watch('found_during') || ''}
                      onValueChange={(v) => form.setValue('found_during', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="When was it found?" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOUND_DURING_OPTIONS.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Steps to Reproduce</Label>
                  <Textarea
                    {...form.register('steps_to_reproduce')}
                    placeholder="1. Go to login page
2. Enter username
3. Click submit
4. Observe error"
                    rows={6}
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-600 dark:text-green-400">Expected Result</Label>
                    <Textarea
                      {...form.register('expected_result')}
                      placeholder="What should happen..."
                      rows={4}
                      className="mt-1 border-green-200 dark:border-green-800 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <Label className="text-red-600 dark:text-red-400">Actual Result</Label>
                    <Textarea
                      {...form.register('actual_result')}
                      placeholder="What actually happened..."
                      rows={4}
                      className="mt-1 border-red-200 dark:border-red-800 focus:border-red-500"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: TRACKING */}
              <TabsContent value="tracking" className="space-y-4 py-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={form.watch('status')}
                      onValueChange={(v) => form.setValue('status', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", s.color)} />
                              {s.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !form.watch('due_date') && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch('due_date') 
                            ? format(form.watch('due_date')!, 'PPP')
                            : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch('due_date') || undefined}
                          onSelect={(d) => form.setValue('due_date', d || null)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sprint</Label>
                    <Input
                      {...form.register('sprint')}
                      placeholder="e.g., Sprint 23"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Epic Link</Label>
                    <Input
                      {...form.register('epic_link')}
                      placeholder="e.g., PROJ-100"
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 5: LINKS */}
              <TabsContent value="links" className="space-y-4 py-4 mt-0">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">External Link (JIRA, Azure DevOps, etc.)</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">External ID</Label>
                      <Input
                        {...form.register('external_id')}
                        placeholder="JIRA-1234"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">External URL</Label>
                      <Input
                        {...form.register('external_url')}
                        placeholder="https://jira.company.com/browse/JIRA-1234"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {(prefillData?.linkedCaseKey || prefillData?.linkedRunId) && (
                  <div className="p-4 border rounded-lg">
                    <Label className="text-sm font-medium">Linked Test Information</Label>
                    {prefillData?.linkedCaseKey && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-muted-foreground">Test Case:</span>
                        <Badge variant="outline" className="font-mono">
                          {prefillData.linkedCaseKey}
                        </Badge>
                      </div>
                    )}
                    {prefillData?.linkedRunId && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Linked to Test Run
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Update Defect' : 'Create Defect'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateDefectDialogEnterprise;

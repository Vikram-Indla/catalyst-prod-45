/**
 * Enterprise Create/Edit Defect Dialog - Catalyst V5
 * Consolidated 2-tab Bloomberg-grade design
 * Tab 1: Details (Primary Info + Reproduce Steps)
 * Tab 2: Environment & Links
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bug,
  AlertTriangle,
  Shield,
  Users,
  X,
  Plus,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { WorkItemLinker, type LinkedWorkItem } from './WorkItemLinker';
import { DefectFileUploader } from './DefectFileUploader';
import {
  DEFECT_TYPES,
  SEVERITY_LEVELS,
  PRIORITY_LEVELS,
  ENVIRONMENT_OPTIONS,
  COMPONENTS,
} from '../../config/defectConfig';
import { useCreateDefect, useUpdateDefect, useTeamMembers } from '@/hooks/test-management';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Zod schema
const defectSchema = z.object({
  // Tab 1: Details
  defect_type: z.string().default('bug'),
  summary: z.string().min(10, 'Summary must be at least 10 characters').max(200),
  description: z.string().optional(),
  severity: z.string().min(1, 'Severity is required'),
  priority: z.string().min(1, 'Priority is required'),
  component: z.string().optional(),
  assigned_to: z.string().optional(),
  is_regression: z.boolean().default(false),
  is_blocker: z.boolean().default(false),
  is_security_issue: z.boolean().default(false),
  customer_reported: z.boolean().default(false),
  steps_to_reproduce: z.string().optional(),
  expected_result: z.string().optional(),
  actual_result: z.string().optional(),
  
  // Tab 2: Environment & Links
  environment: z.string().optional(),
  found_in_build: z.string().optional(),
  release_version: z.string().optional(),
  affects_version: z.string().optional(),
  external_id: z.string().optional(),
  external_url: z.string().optional(),
});

type DefectFormData = z.infer<typeof defectSchema>;

interface CreateDefectDialogEnterpriseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  defect?: any;
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
  const [activeTab, setActiveTab] = useState('details');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [linkedItems, setLinkedItems] = useState<LinkedWorkItem[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const { data: teamMembers = [] } = useTeamMembers(projectId || null);
  const createDefect = useCreateDefect();
  const updateDefect = useUpdateDefect();

  // Fetch release versions
  const { data: releaseVersions = [] } = useQuery({
    queryKey: ['release-versions', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('release_versions')
        .select('id, name, version_number, status')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!projectId,
  });

  const isEdit = !!defect;
  const isSubmitting = createDefect.isPending || updateDefect.isPending;

  const form = useForm<DefectFormData>({
    resolver: zodResolver(defectSchema),
    defaultValues: {
      defect_type: 'bug',
      severity: 'major',
      priority: 'medium',
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
        form.reset({
          summary: defect.title || '',
          description: defect.description || '',
          defect_type: defect.defect_type || 'bug',
          severity: defect.severity?.toLowerCase() || 'major',
          priority: defect.priority || 'medium',
          component: defect.component || '',
          assigned_to: defect.assigned_to || '',
          environment: defect.environment || '',
          found_in_build: defect.found_in_build || '',
          release_version: defect.fix_version || '',
          affects_version: defect.affects_version || '',
          steps_to_reproduce: defect.steps_to_reproduce || '',
          expected_result: defect.expected_result || '',
          actual_result: defect.actual_result || '',
          is_regression: defect.is_regression || false,
          is_blocker: defect.is_blocker || false,
          is_security_issue: defect.is_security_issue || false,
          customer_reported: defect.customer_reported || false,
          external_id: defect.external_id || '',
          external_url: defect.external_url || '',
        });
        setLabels(defect.labels || []);
      } else if (prefillData) {
        form.reset({
          summary: prefillData.title || '',
          description: prefillData.description || '',
          defect_type: 'bug',
          severity: 'major',
          priority: 'medium',
          is_regression: false,
          is_blocker: false,
          is_security_issue: false,
          customer_reported: false,
        });
        setLabels([]);
      } else {
        form.reset({
          defect_type: 'bug',
          severity: 'major',
          priority: 'medium',
          is_regression: false,
          is_blocker: false,
          is_security_issue: false,
          customer_reported: false,
        });
        setLabels([]);
      }
      setActiveTab('details');
      setLinkedItems([]);
      setAttachments([]);
    }
  }, [open, defect, prefillData, form]);

  const summaryValue = form.watch('summary') || '';

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
          title: data.summary,
          description: data.description,
          severity: (severityMap[data.severity] || 'MAJOR') as any,
          assigned_to: data.assigned_to || undefined,
          external_id: data.external_id,
          external_url: data.external_url,
        });
        toast.success('Defect updated successfully');
      } else {
        await createDefect.mutateAsync({
          project_id: projectId,
          title: data.summary,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--divider)' }}>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md" style={{ background: 'var(--danger-bg)' }}>
              <Bug className="h-4 w-4" style={{ color: 'var(--danger-fg)' }} />
            </div>
            <span style={{ color: 'var(--fg-1)' }}>
              {isEdit ? 'Edit Defect' : 'Create Defect'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-[calc(90vh-140px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <div className="border-b px-6 shrink-0" style={{ borderColor: 'var(--divider)' }}>
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="details" 
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="environment"
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Environment & Links
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              {/* TAB 1: DETAILS */}
              <TabsContent value="details" className="space-y-5 p-6 mt-0">
                {/* Defect Type - Dropdown */}
                <div>
                  <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                    Defect Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.watch('defect_type')}
                    onValueChange={(v) => form.setValue('defect_type', v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFECT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary (was Title) */}
                <div>
                  <Label htmlFor="summary" className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                    Summary <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="summary"
                    {...form.register('summary')}
                    placeholder="Brief description of the defect..."
                    className="mt-1.5"
                    maxLength={200}
                  />
                  <div className="flex justify-between mt-1">
                    {form.formState.errors.summary && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.summary.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground ml-auto">
                      {summaryValue.length}/200
                    </p>
                  </div>
                </div>

                {/* Description - Rich Text */}
                <div>
                  <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                    Description
                  </Label>
                  <div className="mt-1.5">
                    <RichTextEditor
                      value={form.watch('description') || ''}
                      onChange={(v) => form.setValue('description', v)}
                      placeholder="Detailed description of the issue..."
                      minHeight="120px"
                    />
                  </div>
                </div>

                {/* Severity & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                      Severity <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.watch('severity')}
                      onValueChange={(v) => form.setValue('severity', v)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full", s.color)} />
                              <span>{s.label}</span>
                              <span className="text-muted-foreground text-xs">- {s.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                      Priority <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.watch('priority')}
                      onValueChange={(v) => form.setValue('priority', v)}
                    >
                      <SelectTrigger className="mt-1.5">
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

                {/* Test Component/Module & Assignee */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                      Test Component/Module
                    </Label>
                    <Select
                      value={form.watch('component') || ''}
                      onValueChange={(v) => form.setValue('component', v)}
                    >
                      <SelectTrigger className="mt-1.5">
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
                    <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                      Assignee
                    </Label>
                    <Select
                      value={form.watch('assigned_to') || 'unassigned'}
                      onValueChange={(v) => form.setValue('assigned_to', v === 'unassigned' ? '' : v)}
                    >
                      <SelectTrigger className="mt-1.5">
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
                </div>

                {/* Labels */}
                <div>
                  <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>Labels</Label>
                  <div className="flex gap-2 mt-1.5">
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
                    <Button type="button" variant="outline" onClick={addLabel} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {labels.map(label => (
                        <Badge key={label} variant="secondary" className="gap-1 pr-1">
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
                <div className="p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                  <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>Flags</Label>
                  <div className="flex flex-wrap gap-x-6 gap-y-3 mt-3">
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
                      <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning-fg)' }} />
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
                </div>

                {/* Divider */}
                <div className="border-t pt-5" style={{ borderColor: 'var(--divider)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-1)' }}>
                    Steps to Reproduce
                  </h3>
                </div>

                {/* Steps to Reproduce - Rich Text */}
                <div>
                  <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                    Steps to Reproduce
                  </Label>
                  <div className="mt-1.5">
                    <RichTextEditor
                      value={form.watch('steps_to_reproduce') || ''}
                      onChange={(v) => form.setValue('steps_to_reproduce', v)}
                      placeholder="1. Go to login page&#10;2. Enter username&#10;3. Click submit&#10;4. Observe error"
                      minHeight="100px"
                    />
                  </div>
                </div>

                {/* Expected Result - Stacked */}
                <div>
                  <Label className="text-sm font-medium" style={{ color: 'var(--success-fg)' }}>
                    Expected Result
                  </Label>
                  <Textarea
                    {...form.register('expected_result')}
                    placeholder="What should happen..."
                    rows={3}
                    className="mt-1.5"
                    style={{ borderColor: 'var(--success-bd)' }}
                  />
                </div>

                {/* Actual Result - Stacked */}
                <div>
                  <Label className="text-sm font-medium" style={{ color: 'var(--danger-fg)' }}>
                    Actual Result
                  </Label>
                  <Textarea
                    {...form.register('actual_result')}
                    placeholder="What actually happened..."
                    rows={3}
                    className="mt-1.5"
                    style={{ borderColor: 'var(--danger-bd)' }}
                  />
                </div>
              </TabsContent>

              {/* TAB 2: ENVIRONMENT & LINKS */}
              <TabsContent value="environment" className="space-y-5 p-6 mt-0">
                {/* Environment Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-1)' }}>
                    Environment
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                        Environment
                      </Label>
                      <Select
                        value={form.watch('environment') || ''}
                        onValueChange={(v) => form.setValue('environment', v)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          {ENVIRONMENT_OPTIONS.map(e => (
                            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                        Found in Build
                      </Label>
                      <Input
                        {...form.register('found_in_build')}
                        placeholder="e.g., build-1234"
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                        Release Version (Fix Target)
                      </Label>
                      <Select
                        value={form.watch('release_version') || ''}
                        onValueChange={(v) => form.setValue('release_version', v)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select release" />
                        </SelectTrigger>
                        <SelectContent>
                          {releaseVersions.map((v: any) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name || v.version_number}
                            </SelectItem>
                          ))}
                          <SelectItem value="backlog">Backlog</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                        Affects Version
                      </Label>
                      <Select
                        value={form.watch('affects_version') || ''}
                        onValueChange={(v) => form.setValue('affects_version', v)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          {releaseVersions.map((v: any) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name || v.version_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t pt-5" style={{ borderColor: 'var(--divider)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-1)' }}>
                    Linked Work Items
                  </h3>
                </div>

                {/* Work Item Linker */}
                <WorkItemLinker
                  value={linkedItems}
                  onChange={setLinkedItems}
                  projectId={projectId}
                />

                {/* Divider */}
                <div className="border-t pt-5" style={{ borderColor: 'var(--divider)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-1)' }}>
                    Attachments
                  </h3>
                </div>

                {/* File Uploader */}
                <DefectFileUploader
                  value={attachments}
                  onChange={setAttachments}
                />

                {/* Divider */}
                <div className="border-t pt-5" style={{ borderColor: 'var(--divider)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-1)' }}>
                    External Links (Optional)
                  </h3>
                </div>

                {/* External Links */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                      External ID
                    </Label>
                    <Input
                      {...form.register('external_id')}
                      placeholder="JIRA-1234"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>
                      External URL
                    </Label>
                    <Input
                      {...form.register('external_url')}
                      placeholder="https://jira.company.com/..."
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Prefilled linked test info */}
                {(prefillData?.linkedCaseKey || prefillData?.linkedRunId) && (
                  <div className="p-4 border rounded-lg mt-4" style={{ background: 'var(--info-bg)', borderColor: 'var(--info-bd)' }}>
                    <Label className="text-sm font-medium" style={{ color: 'var(--info-fg)' }}>
                      Linked Test Information
                    </Label>
                    {prefillData?.linkedCaseKey && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-muted-foreground">Test Case:</span>
                        <Badge variant="secondary">{prefillData.linkedCaseKey}</Badge>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <div 
            className="flex justify-end gap-3 px-6 py-4 border-t shrink-0"
            style={{ borderColor: 'var(--divider)', background: 'var(--surface-2)' }}
          >
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Create Defect'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateDefectDialogEnterprise;

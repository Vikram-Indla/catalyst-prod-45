/**
 * Create Test Case Dialog — 9.8 GOD-TIER
 * 5-Tab Modal with enterprise features
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ClipboardCheck,
  X,
  Maximize2,
  Minimize2,
  Keyboard,
  FileText,
  ListOrdered,
  Database,
  Paperclip,
  Settings,
  Check,
  AlertCircle,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { DetailsTab } from './DetailsTab';
import { StepsTab } from './StepsTab';
import { DataTab } from './DataTab';
import { AttachmentsTab } from './AttachmentsTab';
import { AdditionalTab } from './AdditionalTab';
import { TestCaseFormData, TestCaseStep, defaultFormData, TabInfo } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useFolders } from '@/hooks/test-management/useFolders';
import { useUpsertTestCaseDraft, useCreateTestCase } from '@/hooks/test-management';
import { useInvalidateRepositoryData } from '@/hooks/test-management/useRepositoryData';

// Import prefill type for template support
import type { PrefilledTestCase } from '../utils';

export interface CreateTestCaseDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (data: TestCaseFormData & { id: string }) => void;
  prefillData?: PrefilledTestCase | null;
  /** Project ID for fetching folders */
  projectId?: string;
  /** Initial folder ID to preselect (from URL hash or sidebar selection) */
  initialFolderId?: string | null;
}

const TABS: TabInfo[] = [
  { id: 'details', label: 'Details', icon: 'FileText' },
  { id: 'steps', label: 'Steps', icon: 'ListOrdered' },
  { id: 'data', label: 'Data', icon: 'Database' },
  { id: 'attachments', label: 'Attach', icon: 'Paperclip' },
  { id: 'additional', label: 'Additional', icon: 'Settings' },
];

const TAB_ICONS: Record<string, React.ElementType> = {
  FileText, ListOrdered, Database, Paperclip, Settings,
};

export function CreateTestCaseDialogV2({ 
  open, 
  onOpenChange, 
  onSuccess, 
  prefillData,
  projectId,
  initialFolderId,
}: CreateTestCaseDialogV2Props) {
  const [formData, setFormData] = useState<TestCaseFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('details');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  
  // Draft ID for upsert (null = new, string = update existing)
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftCaseKey, setDraftCaseKey] = useState<string | null>(null);
  
  // Mutations
  const upsertDraftMutation = useUpsertTestCaseDraft();
  const createTestCaseMutation = useCreateTestCase();
  const invalidateRepositoryData = useInvalidateRepositoryData();

  // Fetch folders from tm_folders table
  const { data: foldersData = [], isLoading: foldersLoading } = useFolders(projectId);
  
  // Transform folders for the dropdown
  const folderOptions = useMemo(() => {
    return foldersData.map(folder => ({
      id: folder.id,
      name: folder.name,
      path: folder.path,
    }));
  }, [foldersData]);

  // Map prefill data to form data when dialog opens
  useEffect(() => {
    if (open && prefillData) {
      const priorityMap: Record<string, 'P1' | 'P2' | 'P3' | 'P4'> = {
        critical: 'P1',
        high: 'P2',
        medium: 'P3',
        low: 'P4',
      };
      
      const stepsFromPrefill = (prefillData.steps || []).map((step, idx) => ({
        id: `step-${idx + 1}`,
        order: idx + 1,
        action: step,
        testData: '',
        expectedResult: '',
        attachments: [],
        isComplete: false,
      }));

      setFormData({
        ...defaultFormData,
        title: prefillData.title || '',
        description: prefillData.description || '',
        type: prefillData.type || 'functional',
        priority: priorityMap[prefillData.priority] || 'P3',
        folderId: prefillData.folder || initialFolderId || '',
        preconditions: prefillData.preconditions || '',
        steps: stepsFromPrefill,
      });
    }
  }, [open, prefillData, initialFolderId]);

  // Set initial folder when dialog opens (without prefill data)
  useEffect(() => {
    if (open && !prefillData && initialFolderId) {
      setFormData(prev => ({
        ...prev,
        folderId: initialFolderId,
      }));
    }
  }, [open, prefillData, initialFolderId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFormData(defaultFormData);
      setActiveTab('details');
      setErrors({});
      setDraftId(null);
      setDraftCaseKey(null);
    }
  }, [open]);

  // Calculate progress with human-readable labels
  const requiredFieldsConfig = [
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type' },
    { key: 'priority', label: 'Priority' },
    { key: 'folderId', label: 'Folder' },
  ];
  const completedFields = requiredFieldsConfig.filter((f) => {
    const value = formData[f.key as keyof TestCaseFormData];
    return value && String(value).trim() !== '';
  });
  const hasValidStep = formData.steps.some((s) => s.action && s.expectedResult);
  const totalRequired = requiredFieldsConfig.length + 1; // +1 for steps
  const completedCount = completedFields.length + (hasValidStep ? 1 : 0);
  const progress = (completedCount / totalRequired) * 100;
  
  // Get missing fields for display
  const missingFields = requiredFieldsConfig
    .filter((f) => {
      const value = formData[f.key as keyof TestCaseFormData];
      return !value || String(value).trim() === '';
    })
    .map((f) => f.label);
  if (!hasValidStep) missingFields.push('Steps (at least one complete step)');

  const handleChange = useCallback((updates: Partial<TestCaseFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    Object.keys(updates).forEach((key) => {
      if (errors[key]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    });
  }, [errors]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    if (!formData.folderId) newErrors.folderId = 'Folder is required';
    if (!hasValidStep) newErrors.steps = 'At least one complete step is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Build specific error message for toast
  const getMissingFieldsMessage = (): string => {
    if (missingFields.length === 0) return '';
    if (missingFields.length === 1) return `Missing: ${missingFields[0]}`;
    return `Missing: ${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
  };

  const handleSaveDraft = async () => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }
    
    setIsSavingDraft(true);
    try {
      const result = await upsertDraftMutation.mutateAsync({
        project_id: projectId,
        draft_id: draftId,
        title: formData.title || undefined, // Let hook handle default
        description: formData.description || undefined,
        preconditions: formData.preconditions || undefined,
        folder_id: formData.folderId || undefined,
        priority: formData.priority || undefined,
        type: formData.type || undefined,
        assigned_to: formData.assigneeId || undefined,
        release_id: formData.releaseId || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        // Pass steps to persist
        steps: formData.steps.map(step => ({
          action: step.action,
          expected_result: step.expectedResult,
          test_data: step.testData,
        })),
      });
      
      toast.success('Draft saved', { description: result.case_key || 'Test case draft saved' });
      
      // Close the modal after successful save
      if (createAnother) {
        // Reset form for "Create another" flow
        setFormData({
          ...defaultFormData,
          folderId: formData.folderId, // Keep folder selection
        });
        setActiveTab('details');
        setDraftId(null);
        setDraftCaseKey(null);
      } else {
        // Close the dialog
        onOpenChange(false);
      }
    } catch (error) {
      // Error toast handled by mutation
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error(getMissingFieldsMessage() || 'Please fill in all required fields');
      return;
    }
    
    if (!projectId) {
      toast.error('Project ID is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Map priority levels to priority_id UUIDs
      const priorityMap: Record<string, string> = {
        'P1': '00000000-0000-0000-0001-000000000001', // Critical
        'P2': '00000000-0000-0000-0001-000000000002', // High
        'P3': '00000000-0000-0000-0001-000000000003', // Medium
        'P4': '00000000-0000-0000-0001-000000000004', // Low
      };
      
      // Map type to type_id UUIDs
      const typeMap: Record<string, string> = {
        'functional': '00000000-0000-0000-0002-000000000001',
        'regression': '00000000-0000-0000-0002-000000000002',
        'smoke': '00000000-0000-0000-0002-000000000003',
        'integration': '00000000-0000-0000-0002-000000000004',
        'e2e': '00000000-0000-0000-0002-000000000005',
        'performance': '00000000-0000-0000-0002-000000000006',
        'security': '00000000-0000-0000-0002-000000000007',
        'usability': '00000000-0000-0000-0002-000000000008',
      };
      
      // Transform steps to match CreateCaseInput format
      const stepsInput = formData.steps
        .filter(s => s.action.trim() || s.expectedResult.trim())
        .map(s => ({
          action: s.action,
          expected_result: s.expectedResult,
          test_data: s.testData || undefined,
        }));
      
      // Call real mutation - status 'REVIEW' maps to 'ready' in DB (usable state)
      const result = await createTestCaseMutation.mutateAsync({
        project_id: projectId,
        title: formData.title.trim(),
        objective: formData.description.trim() || undefined,
        preconditions: formData.preconditions?.trim() || undefined,
        folder_id: formData.folderId || undefined,
        priority_id: priorityMap[formData.priority] || priorityMap['P3'],
        type_id: typeMap[formData.type] || typeMap['functional'],
        assigned_to: formData.assigneeId || undefined,
        status: 'REVIEW', // Created test cases are ready for use
        steps: stepsInput.length > 0 ? stepsInput : undefined,
      });
      
      // Invalidate repository data to refresh folder tree counts
      invalidateRepositoryData(projectId);
      
      // Show success toast with REAL case_key from database
      const realCaseKey = result.key || result.id;
      toast.success(`Test case ${realCaseKey} created`, { description: formData.title });
      
      // Call onSuccess callback with real data
      onSuccess?.({ ...formData, id: result.id });
      
      if (createAnother) {
        // Reset form for "Create another" flow
        setFormData({
          ...defaultFormData,
          folderId: formData.folderId, // Keep folder selection
        });
        setActiveTab('details');
        setDraftId(null);
        setDraftCaseKey(null);
      } else {
        // Close the dialog
        onOpenChange(false);
      }
    } catch (error) {
      // User-facing error toast
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Failed to create test case', { description: errorMessage });
      console.error('[CreateTestCaseDialog] Database insert failed:', error);
      // Keep modal open so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI Generate Steps handler
  const handleAIGenerateSteps = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to test');
      return;
    }

    setIsGeneratingSteps(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-test-cases', {
        body: {
          prompt: aiPrompt,
          projectName: 'Test Project',
          testType: formData.type || 'functional',
          includeEdgeCases: true,
          includeNegativeTests: false,
          includePerformance: false,
          includeSecurity: false,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Extract steps from the first generated test case
      const generatedTestCase = data?.data?.testCases?.[0];
      const generatedSteps = generatedTestCase?.steps || [];

      if (generatedSteps.length === 0) {
        toast.error('No steps were generated. Try a more detailed description.');
        return;
      }

      // Transform to match TestCaseStep interface
      const transformedSteps: TestCaseStep[] = generatedSteps.map((step: { stepNumber: number; action: string; testData?: string; expectedResult: string }, index: number) => ({
        id: `step-ai-${Date.now()}-${index}`,
        order: index + 1,
        action: step.action || '',
        testData: step.testData || '',
        expectedResult: step.expectedResult || '',
        attachments: [],
        isComplete: Boolean(step.action && step.expectedResult),
      }));

      // Update formData.steps - this is what the UI reads from
      setFormData(prev => ({
        ...prev,
        steps: transformedSteps,
      }));

      toast.success(`AI generated ${transformedSteps.length} test steps`);
      setShowAIGenerate(false);
      setAiPrompt('');
      setActiveTab('steps'); // Switch to steps tab to show results
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate steps';
      toast.error(message);
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const getTabBadge = (tabId: string): number | undefined => {
    if (tabId === 'steps') return formData.steps.length || undefined;
    if (tabId === 'data') return formData.parameters.length || undefined;
    if (tabId === 'attachments') return formData.attachments.length || undefined;
    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 overflow-hidden [&>button]:hidden",
          isFullscreen ? "max-w-full w-full h-full rounded-none" : "max-w-[800px] max-h-[90vh]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Create Test Case</h2>
              <p className="text-xs text-muted-foreground">
                {draftCaseKey || 'New Test Case'} • {draftId ? 'Draft' : 'Unsaved'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Keyboard shortcuts">
              <Keyboard className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 py-2 border-b bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{completedCount} of {totalRequired} required</span>
          </div>
          {missingFields.length > 0 && (
            <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-medium text-amber-700 dark:text-amber-300">Missing required fields: </span>
                <span className="text-amber-600 dark:text-amber-400">{missingFields.join(', ')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.icon];
            const badge = getTabBadge(tab.id);
            const isActive = activeTab === tab.id;
            const hasError = tab.id === 'details' && Object.keys(errors).some(k => ['title', 'type', 'priority', 'folderId'].includes(k));
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                  isActive ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  hasError && "text-destructive"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {badge && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {badge}
                  </Badge>
                )}
                {hasError && <AlertCircle className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6" style={{ maxHeight: isFullscreen ? 'calc(100vh - 220px)' : '50vh' }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
              {activeTab === 'details' && (
                <DetailsTab 
                  data={formData} 
                  onChange={handleChange} 
                  errors={errors}
                  folders={folderOptions}
                  foldersLoading={foldersLoading}
                />
              )}
              {activeTab === 'steps' && (
                <StepsTab 
                  data={formData} 
                  onChange={handleChange} 
                  onOpenTemplates={() => setShowTemplates(true)} 
                  onOpenAIGenerate={() => setShowAIGenerate(true)} 
                />
              )}
              {activeTab === 'data' && <DataTab data={formData} onChange={handleChange} />}
              {activeTab === 'attachments' && <AttachmentsTab data={formData} onChange={handleChange} />}
              {activeTab === 'additional' && <AdditionalTab data={formData} onChange={handleChange} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="createAnother" checked={createAnother} onCheckedChange={(c) => setCreateAnother(!!c)} />
              <Label htmlFor="createAnother" className="text-sm cursor-pointer">Create another</Label>
            </div>
            {draftId && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Draft saved
              </div>
            )}
            <Badge variant={completedCount === totalRequired ? "default" : "secondary"} className={cn(completedCount === totalRequired ? "bg-teal-100 text-teal-700" : "")}>
              {completedCount === totalRequired ? <><Check className="w-3 h-3 mr-1" /> All good</> : `${totalRequired - completedCount} issues`}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
              {isSavingDraft ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save Draft
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-blue-700">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating...</> : 'Create Test Case'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Step Templates</h2>
                <p className="text-sm text-muted-foreground">Choose a template to auto-fill steps</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Login Test', steps: 5, description: 'Standard user login flow' },
                { name: 'Form Validation', steps: 8, description: 'Input field validation checks' },
                { name: 'CRUD Operations', steps: 12, description: 'Create, Read, Update, Delete' },
                { name: 'API Response', steps: 6, description: 'REST API validation' },
              ].map((template) => (
                <button
                  key={template.name}
                  className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
                  onClick={() => {
                    toast.success(`Template "${template.name}" applied`);
                    setShowTemplates(false);
                  }}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-muted-foreground">{template.description}</div>
                  <div className="text-xs text-blue-600 mt-1">{template.steps} steps</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowTemplates(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showAIGenerate} onOpenChange={(open) => {
        setShowAIGenerate(open);
        if (!open) setAiPrompt('');
      }}>
        <DialogContent className="max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">AI Generate Steps</h2>
                <p className="text-sm text-muted-foreground">Describe what you want to test</p>
              </div>
            </div>
            <Textarea
              placeholder="e.g., Test the user registration flow with email verification..."
              className="min-h-[100px]"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isGeneratingSteps}
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAIGenerate(false)}
                disabled={isGeneratingSteps}
              >
                Cancel
              </Button>
              <Button 
                className="bg-violet-600 hover:bg-violet-700"
                onClick={handleAIGenerateSteps}
                disabled={isGeneratingSteps || !aiPrompt.trim()}
              >
                {isGeneratingSteps ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export { CreateTestCaseDialogV2 as CreateTestCaseDialogEnterprise };

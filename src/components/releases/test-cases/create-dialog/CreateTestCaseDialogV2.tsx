/**
 * Create Test Case Dialog — 9.8 GOD-TIER
 * 5-Tab Modal with enterprise features
 */

import { useState, useCallback, useEffect } from 'react';
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
import { TestCaseFormData, defaultFormData, TabInfo } from './types';

// Import prefill type for template support
import type { PrefilledTestCase } from '../utils';

export interface CreateTestCaseDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (data: TestCaseFormData & { id: string }) => void;
  prefillData?: PrefilledTestCase | null;
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

export function CreateTestCaseDialogV2({ open, onOpenChange, onSuccess, prefillData }: CreateTestCaseDialogV2Props) {
  const [formData, setFormData] = useState<TestCaseFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('details');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  
  // Generate consistent TC number when dialog opens
  const [tcNumber] = useState(() => `TC-${String(Math.floor(Math.random() * 900) + 100)}`);

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
        folderId: prefillData.folder || '',
        preconditions: prefillData.preconditions || '',
        steps: stepsFromPrefill,
      });
    }
  }, [open, prefillData]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFormData(defaultFormData);
      setActiveTab('details');
      setErrors({});
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
    setIsSavingDraft(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSavingDraft(false);
    toast.success('Draft saved');
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error(getMissingFieldsMessage() || 'Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    const newId = `TC-${String(Math.floor(Math.random() * 900) + 100)}`;
    onSuccess?.({ ...formData, id: newId });
    toast.success(`Test case ${newId} created`, { description: formData.title });
    if (createAnother) {
      setFormData(defaultFormData);
      setActiveTab('details');
    } else {
      onOpenChange(false);
    }
    setIsSubmitting(false);
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
              <p className="text-xs text-muted-foreground">{tcNumber} • New Test Case</p>
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
              {activeTab === 'details' && <DetailsTab data={formData} onChange={handleChange} errors={errors} />}
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Draft saved
            </div>
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
      <Dialog open={showAIGenerate} onOpenChange={setShowAIGenerate}>
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
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAIGenerate(false)}>Cancel</Button>
              <Button 
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => {
                  toast.success('AI generated 5 test steps');
                  setShowAIGenerate(false);
                }}
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export { CreateTestCaseDialogV2 as CreateTestCaseDialogEnterprise };

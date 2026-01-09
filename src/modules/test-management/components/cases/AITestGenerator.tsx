/**
 * Catalyst - AI Generator Modal
 * 3-step flow: Input → Generate → Review & Save
 * Redesigned with Catalyst V5 colors, all 3 tabs working
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Sparkles, Loader2, Lightbulb, Eye, 
  Check, FolderOpen, AlertCircle, MapPin, Settings
} from 'lucide-react';
import { useAIGeneration, type GeneratedTestCase } from '@/hooks/test-management/useAIGeneration';
import { useFoldersWithCounts } from '@/hooks/test-management';
import { cn } from '@/lib/utils';
import { AIFromRequirements } from './ai-generator/AIFromRequirements';
import { AIBulkGenerate, type BulkOptions } from './ai-generator/AIBulkGenerate';
import { LinkedItem } from '@/hooks/test-management/useLinkedItemsForAI';
import { SegmentedTabs, SegmentedTab } from '@/components/ui/segmented-tabs';

interface AITestGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveTestCases: (testCases: GeneratedTestCase[], folderId: string | null, status: string) => Promise<void>;
  defaultFolderId?: string | null;
  projectId: string;
  projectName?: string;
}

type GenerationStep = 'input' | 'generating' | 'preview';

const TEST_TYPES = [
  { value: 'functional', label: 'Functional' },
  { value: 'regression', label: 'Regression' },
  { value: 'integration', label: 'Integration' },
  { value: 'smoke', label: 'Smoke' },
  { value: 'e2e', label: 'End-to-End' },
];

export function AITestGenerator({
  open,
  onOpenChange,
  onSaveTestCases,
  defaultFolderId,
  projectId,
  projectName = 'Project',
}: AITestGeneratorProps) {
  // State
  const [step, setStep] = useState<GenerationStep>('input');
  const [activeTab, setActiveTab] = useState('natural');
  const [prompt, setPrompt] = useState('');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId || null);
  const [testType, setTestType] = useState('functional');
  const [options, setOptions] = useState({
    includeEdgeCases: true,
    includeNegativeTests: true,
    includePerformance: false,
    includeSecurity: false,
  });
  const [generatedCases, setGeneratedCases] = useState<GeneratedTestCase[]>([]);
  const [selectedCases, setSelectedCases] = useState<Set<number>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'draft' | 'ready'>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [previewCase, setPreviewCase] = useState<number | null>(null);

  // From Requirements state
  const [selectedItems, setSelectedItems] = useState<LinkedItem[]>([]);

  // Bulk Generate state
  const [bulkRequirements, setBulkRequirements] = useState<string[]>([]);
  const [bulkOptions, setBulkOptions] = useState<BulkOptions>({
    testType: 'functional',
    testsPerRequirement: '1-3',
    includeEdgeCases: true,
    includeNegativeTests: true,
  });

  // Hooks
  const { data: folders = [] } = useFoldersWithCounts(projectId);
  const { generateTestCases, isGenerating, error, clearError } = useAIGeneration();

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setStep('input');
      setPrompt('');
      setGeneratedCases([]);
      setSelectedCases(new Set());
      setPreviewCase(null);
      setSelectedItems([]);
      setBulkRequirements([]);
      clearError();
      if (defaultFolderId) {
        setFolderId(defaultFolderId);
      }
    }
  }, [open, defaultFolderId, clearError]);

  // Build prompt based on active tab
  const buildPrompt = (): string => {
    if (activeTab === 'natural') {
      return prompt;
    } else if (activeTab === 'requirements') {
      return selectedItems
        .map(item => `${item.key}: ${item.title}\n${item.description || ''}\n${item.acceptance_criteria || ''}`)
        .join('\n\n---\n\n');
    } else if (activeTab === 'bulk') {
      return bulkRequirements.join('\n');
    }
    return '';
  };

  // Check if can generate
  const canGenerate = (): boolean => {
    if (activeTab === 'natural') {
      return prompt.trim().length > 0;
    } else if (activeTab === 'requirements') {
      return selectedItems.length > 0;
    } else if (activeTab === 'bulk') {
      return bulkRequirements.length > 0;
    }
    return false;
  };

  // Handlers
  const handleGenerate = async () => {
    const builtPrompt = buildPrompt();
    if (!builtPrompt.trim()) {
      return;
    }

    setStep('generating');
    clearError();

    const genOptions = activeTab === 'bulk' 
      ? {
          projectName,
          featureName: folders.find(f => f.id === folderId)?.name,
          testType: bulkOptions.testType,
          includeEdgeCases: bulkOptions.includeEdgeCases,
          includeNegativeTests: bulkOptions.includeNegativeTests,
          includePerformance: false,
          includeSecurity: false,
        }
      : {
          projectName,
          featureName: folders.find(f => f.id === folderId)?.name,
          testType,
          ...options,
        };

    const result = await generateTestCases(builtPrompt, genOptions);

    if (result) {
      setGeneratedCases(result.testCases);
      setSelectedCases(new Set(result.testCases.map((_, i) => i)));
      setStep('preview');
    } else {
      setStep('input');
    }
  };

  const handleSave = async () => {
    const casesToSave = generatedCases.filter((_, i) => selectedCases.has(i));
    if (casesToSave.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      await onSaveTestCases(casesToSave, folderId, saveStatus);
      onOpenChange(false);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setGeneratedCases([]);
    setSelectedCases(new Set());
    setPreviewCase(null);
    clearError();
  };

  const toggleSelectAll = () => {
    if (selectedCases.size === generatedCases.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(generatedCases.map((_, i) => i)));
    }
  };

  const toggleCase = (index: number) => {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCases(newSelected);
  };

  // Get generate button label
  const getGenerateLabel = () => {
    if (activeTab === 'requirements') {
      return `Generate from ${selectedItems.length} Requirement${selectedItems.length !== 1 ? 's' : ''}`;
    } else if (activeTab === 'bulk') {
      return `Generate Bulk (${bulkRequirements.length} items)`;
    }
    return 'Generate Test Cases';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Catalyst AI Test Generator
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-3 px-6 bg-muted/30 border-b">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            step === 'input' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">1</span>
            Input
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            step === 'generating' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">2</span>
            Generate
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            step === 'preview' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">3</span>
            Review & Save
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* INPUT STEP */}
          {step === 'input' && (
            <div className="p-6 space-y-5">
              {/* Tab Switcher */}
              <SegmentedTabs value={activeTab} onValueChange={setActiveTab}>
                <SegmentedTab value="natural">Natural Language</SegmentedTab>
                <SegmentedTab value="requirements">From Requirements</SegmentedTab>
                <SegmentedTab value="bulk">Bulk Generate</SegmentedTab>
              </SegmentedTabs>

              {/* Destination Card - Shared across tabs */}
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  <MapPin className="w-4 h-4 text-primary" />
                  Destination
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Target Folder
                    </label>
                    <Select value={folderId || '__root__'} onValueChange={(v) => setFolderId(v === '__root__' ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__root__">No folder (root)</SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                              {f.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {activeTab === 'natural' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">
                        Test Type
                      </label>
                      <Select value={testType} onValueChange={setTestType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEST_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Natural Language Tab Content */}
              {activeTab === 'natural' && (
                <>
                  {/* Prompt Card */}
                  <div className="bg-card rounded-xl border p-5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Describe what you want to test <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Example: Test the user login functionality. Users should be able to login with username and password. Include tests for valid credentials, invalid password, and account lockout after 3 failed attempts."
                      className="min-h-[150px] resize-none"
                      maxLength={2000}
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>{prompt.length}/2000 characters</span>
                    </div>
                  </div>

                  {/* Options Card */}
                  <div className="bg-card rounded-xl border p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      <Settings className="w-4 h-4 text-primary" />
                      Generation Options
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setOptions(o => ({ ...o, includeEdgeCases: !o.includeEdgeCases }))}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all",
                          options.includeEdgeCases 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={options.includeEdgeCases} />
                          <span className="font-medium text-sm">Edge Cases</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">Boundary conditions</p>
                      </div>
                      <div 
                        onClick={() => setOptions(o => ({ ...o, includeNegativeTests: !o.includeNegativeTests }))}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all",
                          options.includeNegativeTests 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={options.includeNegativeTests} />
                          <span className="font-medium text-sm">Negative Tests</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">Error scenarios</p>
                      </div>
                      <div 
                        onClick={() => setOptions(o => ({ ...o, includePerformance: !o.includePerformance }))}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all",
                          options.includePerformance 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={options.includePerformance} />
                          <span className="font-medium text-sm">Performance Tests</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">Load & response</p>
                      </div>
                      <div 
                        onClick={() => setOptions(o => ({ ...o, includeSecurity: !o.includeSecurity }))}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all",
                          options.includeSecurity 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={options.includeSecurity} />
                          <span className="font-medium text-sm">Security Tests</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">Auth & injection</p>
                      </div>
                    </div>
                  </div>

                  {/* Tip - Teal color */}
                  <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-teal-800 dark:text-teal-200">
                      <strong>Tip:</strong> Be specific about features, user roles, and expected behaviors. 
                      Mention specific scenarios like "login with SSO" or "password reset flow" for better results.
                    </div>
                  </div>
                </>
              )}

              {/* From Requirements Tab Content */}
              {activeTab === 'requirements' && (
                <AIFromRequirements
                  projectId={projectId}
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                />
              )}

              {/* Bulk Generate Tab Content */}
              {activeTab === 'bulk' && (
                <AIBulkGenerate
                  requirements={bulkRequirements}
                  onRequirementsChange={setBulkRequirements}
                  options={bulkOptions}
                  onOptionsChange={setBulkOptions}
                />
              )}
            </div>
          )}

          {/* GENERATING STEP */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <Loader2 className="absolute -top-2 -left-2 h-20 w-20 text-primary/30 animate-spin" />
              </div>
              <p className="mt-6 text-lg font-medium">Generating test cases...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a few seconds</p>
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && (
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{generatedCases.length} test cases generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                    {selectedCases.size === generatedCases.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Regenerate
                  </Button>
                </div>
              </div>

              {/* Cases List */}
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {generatedCases.map((tc, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 hover:bg-muted/50 transition-colors",
                      selectedCases.has(index) && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedCases.has(index)}
                        onCheckedChange={() => toggleCase(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{tc.title}</span>
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {/* Priority Badge */}
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full uppercase",
                            tc.priority === 'critical' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                            tc.priority === 'high' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                            tc.priority === 'medium' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                            tc.priority === 'low' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          )}>
                            {tc.priority}
                          </span>
                          {/* Type Badge */}
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full capitalize",
                            tc.testType === 'functional' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                            tc.testType === 'api' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                            tc.testType === 'performance' && "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
                            tc.testType === 'security' && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                          )}>
                            {tc.testType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tc.steps?.length || 0} steps
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{tc.summary}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewCase(previewCase === index ? null : index)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Expanded Preview */}
                    {previewCase === index && (
                      <div className="mt-3 ml-8 p-4 bg-background border rounded-lg space-y-4">
                        {/* AI Reasoning */}
                        {(tc.priorityReason || tc.typeReason) && (
                          <div className="flex gap-4 pb-3 border-b">
                            {tc.priorityReason && (
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground">Priority Reason:</span>
                                <p className="text-xs text-foreground mt-0.5">{tc.priorityReason}</p>
                              </div>
                            )}
                            {tc.typeReason && (
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground">Type Reason:</span>
                                <p className="text-xs text-foreground mt-0.5">{tc.typeReason}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">Preconditions:</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {tc.preconditions?.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">Steps:</h4>
                          <div className="space-y-2">
                            {tc.steps?.map((s, i) => (
                              <div key={i} className="flex gap-2 text-sm">
                                <span className="text-muted-foreground w-6">{i + 1}.</span>
                                <div className="flex-1">
                                  <p>{s.action}</p>
                                  {s.testData && (
                                    <p className="text-xs text-primary mt-0.5">Data: {s.testData}</p>
                                  )}
                                  <p className="text-xs text-green-600 mt-0.5">→ {s.expectedResult}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tags */}
                        {tc.tags && tc.tags.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Tags:</h4>
                            <div className="flex flex-wrap gap-1">
                              {tc.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-muted text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Save Options */}
              <div className="space-y-3 pt-4 border-t">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Save Options
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="saveStatus"
                      checked={saveStatus === 'draft'}
                      onChange={() => setSaveStatus('draft')}
                      className="text-primary"
                    />
                    <span className="text-sm">Save as Draft (for review)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="saveStatus"
                      checked={saveStatus === 'ready'}
                      onChange={() => setSaveStatus('ready')}
                      className="text-primary"
                    />
                    <span className="text-sm">Save as Ready</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate() || isGenerating}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {getGenerateLabel()}
              </Button>
            </>
          )}

          {step === 'generating' && (
            <>
              <Button variant="outline" onClick={handleReset} disabled={isGenerating}>
                Cancel
              </Button>
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={selectedCases.size === 0 || isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save {selectedCases.size} Test Cases
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

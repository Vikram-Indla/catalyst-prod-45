/**
 * AI Test Case Generator Modal
 * 3-step flow: Input → Generate → Review & Save
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, Loader2, Lightbulb, Eye, 
  Check, FolderOpen, AlertCircle, FileText
} from 'lucide-react';
import { useAIGeneration, type GeneratedTestCase } from '@/hooks/test-management/useAIGeneration';
import { useFoldersWithCounts } from '@/hooks/test-management';
import { cn } from '@/lib/utils';

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
      clearError();
      if (defaultFolderId) {
        setFolderId(defaultFolderId);
      }
    }
  }, [open, defaultFolderId, clearError]);

  // Handlers
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }

    setStep('generating');
    clearError();

    const result = await generateTestCases(prompt, {
      projectName,
      featureName: folders.find(f => f.id === folderId)?.name,
      testType,
      ...options,
    });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            AI Test Case Generator
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-3 px-6 bg-muted/30 border-b">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            step === 'input' ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">1</span>
            Input
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            step === 'generating' ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">2</span>
            Generate
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            step === 'preview' ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">3</span>
            Review & Save
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* INPUT STEP */}
          {step === 'input' && (
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="natural">Natural Language</TabsTrigger>
                  <TabsTrigger value="requirements" disabled>From Requirements</TabsTrigger>
                  <TabsTrigger value="bulk" disabled>Bulk Generate</TabsTrigger>
                </TabsList>

                <TabsContent value="natural" className="space-y-5 mt-0">
                  {/* Destination */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Target Folder
                      </label>
                      <Select value={folderId || ''} onValueChange={(v) => setFolderId(v || null)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select folder..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No folder (root)</SelectItem>
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

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                  </div>

                  {/* Prompt */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Describe what you want to test <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Example: Test the user login functionality. Users should be able to login with username and password. Include tests for valid credentials, invalid password, and account lockout after 3 failed attempts."
                      className="min-h-[150px] resize-none"
                      maxLength={2000}
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{prompt.length}/2000 characters</span>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Generation Options
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={options.includeEdgeCases}
                          onCheckedChange={(c) => setOptions(o => ({ ...o, includeEdgeCases: !!c }))}
                        />
                        <span className="text-sm">Include edge cases</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={options.includeNegativeTests}
                          onCheckedChange={(c) => setOptions(o => ({ ...o, includeNegativeTests: !!c }))}
                        />
                        <span className="text-sm">Include negative tests</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={options.includePerformance}
                          onCheckedChange={(c) => setOptions(o => ({ ...o, includePerformance: !!c }))}
                        />
                        <span className="text-sm">Include performance tests</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={options.includeSecurity}
                          onCheckedChange={(c) => setOptions(o => ({ ...o, includeSecurity: !!c }))}
                        />
                        <span className="text-sm">Include security tests</span>
                      </label>
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Tip:</strong> Be specific about features, user roles, and expected behaviors. 
                      Mention specific scenarios like "login with SSO" or "password reset flow" for better results.
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="requirements">
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Paste your User Story or BRD content to generate test cases</p>
                    <p className="text-sm mt-2">Coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="bulk">
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Upload a CSV or Excel file with requirements</p>
                    <p className="text-sm mt-2">Coming soon...</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* GENERATING STEP */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-purple-600 animate-pulse" />
                </div>
                <Loader2 className="absolute -top-2 -left-2 h-20 w-20 text-purple-300 animate-spin" />
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
                      selectedCases.has(index) && "bg-purple-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedCases.has(index)}
                        onCheckedChange={() => toggleCase(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{tc.title}</span>
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{tc.testType}</span>
                          <span>•</span>
                          <span>{tc.priority}</span>
                          <span>•</span>
                          <span>{tc.steps?.length || 0} steps</span>
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
                      <div className="mt-3 ml-8 p-3 bg-background border rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Preconditions:</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mb-3">
                          {tc.preconditions?.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                        <h4 className="font-medium text-sm mb-2">Steps:</h4>
                        <div className="space-y-2">
                          {tc.steps?.map((s, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="text-muted-foreground w-6">{i + 1}.</span>
                              <div className="flex-1">
                                <p>{s.action}</p>
                                {s.testData && (
                                  <p className="text-xs text-purple-600 mt-0.5">Data: {s.testData}</p>
                                )}
                                <p className="text-xs text-green-600 mt-0.5">→ {s.expectedResult}</p>
                              </div>
                            </div>
                          ))}
                        </div>
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
                      className="text-purple-600"
                    />
                    <span className="text-sm">Save as Draft (for review)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="saveStatus"
                      checked={saveStatus === 'ready'}
                      onChange={() => setSaveStatus('ready')}
                      className="text-purple-600"
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
                disabled={!prompt.trim() || isGenerating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Test Cases
              </Button>
            </>
          )}

          {step === 'generating' && (
            <>
              <Button variant="outline" onClick={handleReset} disabled={isGenerating}>
                Cancel
              </Button>
              <Button disabled className="bg-purple-600">
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

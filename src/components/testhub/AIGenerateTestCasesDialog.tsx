/**
 * AI-Powered Test Case Generation Dialog
 *
 * Free-prompt entry point to the `ai-generate-test-artefacts` edge function.
 * Surfaces the model's REAL output per case — test_type + type rationale,
 * coverage area, covers[] traceability, and a duplicate flag — plus the
 * suite-level coverage gaps the model reported.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
} from '@/lib/atlaskit-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';
import { useAIGeneration, type GeneratedTestCase, type GenerationResult } from '@/hooks/test-management/useAIGeneration';

interface AIGenerateTestCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional Catalyst project id, forwarded to the edge fn for attribution. */
  projectId?: string;
  onTestCasesGenerated?: (testCases: GeneratedTestCase[]) => void;
}

const EXAMPLE_PROMPTS = [
  'Generate test cases for a user login feature with email and password authentication',
  'Create comprehensive tests for a shopping cart checkout flow',
  'Generate API test cases for a REST endpoint that handles file uploads',
  'Create security tests for a payment processing module',
];

export function AIGenerateTestCasesDialog({
  open,
  onOpenChange,
  projectId,
  onTestCasesGenerated,
}: AIGenerateTestCasesDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [selectedTestCases, setSelectedTestCases] = useState<Set<number>>(new Set());
  const [expandedTestCase, setExpandedTestCase] = useState<number | null>(null);

  const { generateTestCases, isGenerating, error, isBlocked } = useAIGeneration();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      catalystToast.error('Please enter a description of the test cases you want to generate');
      return;
    }

    const result = await generateTestCases(prompt, { projectId });

    if (result) {
      setGenerationResult(result);
      setSelectedTestCases(new Set(result.testCases.map((_, i) => i)));
      catalystToast.success(`Generated ${result.testCases.length} test cases`);
    }
  }, [prompt, projectId, generateTestCases]);

  const handleSelectTestCase = (index: number) => {
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTestCases(newSelected);
  };

  const handleSelectAll = () => {
    if (generationResult) {
      if (selectedTestCases.size === generationResult.testCases.length) {
        setSelectedTestCases(new Set());
      } else {
        setSelectedTestCases(new Set(generationResult.testCases.map((_, i) => i)));
      }
    }
  };

  const handleAddSelected = () => {
    if (generationResult && selectedTestCases.size > 0) {
      const selected = Array.from(selectedTestCases).map(i => generationResult.testCases[i]);
      onTestCasesGenerated?.(selected);
      catalystToast.success(`Added ${selected.length} test case(s) to your project`);
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setPrompt('');
    setGenerationResult(null);
    setSelectedTestCases(new Set());
    setExpandedTestCase(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (!isGenerating) {
      resetForm();
    }
  };

  const getPriorityAppearance = (priority: string): LozengeAppearance => {
    switch (priority) {
      case 'critical': return 'removed';
      case 'high': return 'moved';
      case 'medium': return 'moved';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ background: 'var(--ds-background-brand-bold)' }}>
              <Wand2 className="w-5 h-5" style={{ color: 'var(--ds-text-inverse)' }} />
            </div>
            AI Test Case Generator
          </DialogTitle>
          <DialogDescription>
            Describe your feature or scenario and let AI generate comprehensive test cases
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!generationResult ? (
            // Generation Form
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Example Prompts */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Try:</span>
                {EXAMPLE_PROMPTS.map((example, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setPrompt(example)}
                  >
                    {example.slice(0, 40)}...
                  </Button>
                ))}
              </div>

              {/* Main Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Describe what you want to test</Label>
                <Textarea
                  id="prompt"
                  placeholder="E.g., Generate test cases for a user registration flow that includes email verification, password strength validation, and social login options..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the feature, expected behaviors, and any edge cases you want covered.
                  The model chooses each case's type and coverage area from your description.
                </p>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || isBlocked || !prompt.trim()}
                  className="min-w-[140px]" style={{ background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)' }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : isBlocked ? (
                    'Generation limit reached'
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Test Cases
                    </>
                  )}
                </Button>
              </div>

              {/* Generation Progress */}
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-muted/50 rounded-lg space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 animate-pulse" style={{ color: 'var(--ds-icon-information)' }} />
                    <span>AI is analyzing your requirements and generating test cases...</span>
                  </div>
                  <Progress value={45} className="h-1" />
                  <p className="text-xs text-muted-foreground">
                    This may take a few seconds depending on complexity
                  </p>
                </motion.div>
              )}

              {/* Error State */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg flex items-start gap-3"
                  style={{
                    background: 'var(--ds-background-danger)',
                    border: '1px solid var(--ds-border-danger)',
                  }}
                >
                  <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--ds-icon-danger)' }} />
                  <div>
                    <p className="font-medium" style={{ color: 'var(--ds-text-danger)' }}>Generation Failed</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            // Results View
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden"
            >
              {/* Summary */}
              <div className="flex items-center justify-between p-4 rounded-lg border shrink-0" style={{ background: 'var(--ds-background-information)' }}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full" style={{ background: 'var(--ds-background-success)' }}>
                    <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--ds-icon-success)' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      Generated {generationResult.testCases.length} Test Cases
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedTestCases.size} selected for import
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedTestCases.size === generationResult.testCases.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setGenerationResult(null)}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>

              {/* Coverage gaps — behaviours the model could not cover. Renders
                  only when the model reported gaps (zero-assumption: silent
                  when there are none). */}
              {generationResult.metadata.gaps.length > 0 && (
                <div
                  className="p-3 rounded-lg shrink-0"
                  style={{
                    background: 'var(--ds-background-warning)',
                    border: '1px solid var(--ds-border)',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="w-4 h-4" style={{ color: 'var(--ds-icon-warning)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--ds-text-warning)' }}>
                      Coverage gaps ({generationResult.metadata.gaps.length})
                    </span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 pl-1">
                    {generationResult.metadata.gaps.map((gap, i) => (
                      <li key={i}>• {gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Test Cases List */}
              <div className="flex-1 min-h-0 overflow-hidden -mx-6 px-6">
                <ScrollArea className="h-full">
                  <div className="space-y-2 pb-4">
                  {generationResult.testCases.map((tc, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-all",
                        selectedTestCases.has(index) && "ring-2 ring-primary"
                      )}
                    >
                      {/* Header */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectTestCase(index)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTestCases.has(index)}
                          onChange={() => handleSelectTestCase(index)}
                          className="w-4 h-4 rounded"
                          style={{ borderColor: 'var(--ds-border)' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{tc.title}</span>
                            <Lozenge appearance={getPriorityAppearance(tc.priority)}>
                              {tc.priority}
                            </Lozenge>
                            {/* Real per-case type from the model. */}
                            <Lozenge appearance="new">
                              {tc.testType}
                            </Lozenge>
                            {/* Coverage area, when the model assigned one. */}
                            {tc.coverageArea && (
                              <Lozenge appearance="default">
                                {tc.coverageArea}
                              </Lozenge>
                            )}
                            {/* Probable-duplicate flag. */}
                            {tc.similarToExisting && (
                              <Lozenge appearance="moved">
                                possible duplicate
                              </Lozenge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {tc.summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lozenge appearance="default">
                            {tc.steps.length} steps
                          </Lozenge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTestCase(expandedTestCase === index ? null : index);
                            }}
                          >
                            {expandedTestCase === index ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedTestCase === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t bg-muted/30"
                          >
                            <div className="p-4 space-y-4">
                              {/* Traceability — the source anchors this case covers. */}
                              {tc.covers.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Covers</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {tc.covers.map((anchor, i) => (
                                      <Lozenge key={i} appearance="inprogress">
                                        {anchor}
                                      </Lozenge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Preconditions */}
                              {tc.preconditions?.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Preconditions</h4>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {tc.preconditions.map((pre, i) => (
                                      <li key={i} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                                        {pre}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Steps */}
                              <div>
                                <h4 className="text-sm font-medium mb-2">Test Steps</h4>
                                <div className="space-y-2">
                                  {tc.steps.map((step) => (
                                    <div
                                      key={step.stepNumber}
                                      className="flex gap-3 text-sm p-2 bg-background rounded border"
                                    >
                                      <span className="font-mono text-muted-foreground">
                                        {step.stepNumber}.
                                      </span>
                                      <div className="flex-1">
                                        <p><strong>Action:</strong> {step.action}</p>
                                        {step.testData && (
                                          <p className="text-muted-foreground">
                                            <strong>Data:</strong> {step.testData}
                                          </p>
                                        )}
                                        <p style={{ color: 'var(--ds-text-success)' }}>
                                          <strong>Expected:</strong> {step.expectedResult}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* AI Reasoning — real priority/type rationales. */}
                              {(tc.priorityReason || tc.typeReason) && (
                                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Sparkles className="w-3 h-3" />
                                    <span className="font-medium">AI Reasoning</span>
                                  </div>
                                  {tc.priorityReason && <p>• Priority: {tc.priorityReason}</p>}
                                  {tc.typeReason && <p>• Type: {tc.typeReason}</p>}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedTestCases.size} of {generationResult.testCases.length} selected
                  </span>
                  <Button
                    onClick={handleAddSelected}
                    disabled={selectedTestCases.size === 0}
                    style={{ background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Selected Test Cases
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * AI-Powered Test Case Generation Dialog
 * Uses Lovable AI to generate comprehensive test cases from natural language prompts
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
  Copy,
  ChevronDown,
  ChevronUp,
  Settings2,
  Zap,
  Shield,
  Bug,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAIGeneration, type GeneratedTestCase, type GenerationResult } from '@/hooks/test-management/useAIGeneration';

interface AIGenerateTestCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCasesGenerated?: (testCases: GeneratedTestCase[]) => void;
}

const EXAMPLE_PROMPTS = [
  'Generate test cases for a user login feature with email and password authentication',
  'Create comprehensive tests for a shopping cart checkout flow',
  'Generate API test cases for a REST endpoint that handles file uploads',
  'Create security tests for a payment processing module',
];

const TEST_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types', icon: Sparkles },
  { value: 'functional', label: 'Functional', icon: CheckCircle2 },
  { value: 'api', label: 'API', icon: Zap },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'performance', label: 'Performance', icon: TrendingUp },
];

export function AIGenerateTestCasesDialog({
  open,
  onOpenChange,
  onTestCasesGenerated,
}: AIGenerateTestCasesDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [testType, setTestType] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includeEdgeCases, setIncludeEdgeCases] = useState(true);
  const [includeNegativeTests, setIncludeNegativeTests] = useState(true);
  const [includePerformance, setIncludePerformance] = useState(false);
  const [includeSecurity, setIncludeSecurity] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [selectedTestCases, setSelectedTestCases] = useState<Set<number>>(new Set());
  const [expandedTestCase, setExpandedTestCase] = useState<number | null>(null);

  const { generateTestCases, isGenerating, error } = useAIGeneration();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description of the test cases you want to generate');
      return;
    }

    const result = await generateTestCases(prompt, {
      projectName: projectName || 'Project',
      featureName: featureName || undefined,
      testType,
      includeEdgeCases,
      includeNegativeTests,
      includePerformance,
      includeSecurity,
    });

    if (result) {
      setGenerationResult(result);
      setSelectedTestCases(new Set(result.testCases.map((_, i) => i)));
      toast.success(`Generated ${result.testCases.length} test cases`);
    }
  }, [prompt, projectName, featureName, testType, includeEdgeCases, includeNegativeTests, includePerformance, includeSecurity, generateTestCases]);

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
      toast.success(`Added ${selected.length} test case(s) to your project`);
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setPrompt('');
    setProjectName('');
    setFeatureName('');
    setTestType('all');
    setShowAdvanced(false);
    setIncludeEdgeCases(true);
    setIncludeNegativeTests(true);
    setIncludePerformance(false);
    setIncludeSecurity(false);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'functional': return <CheckCircle2 className="w-3 h-3" />;
      case 'api': return <Zap className="w-3 h-3" />;
      case 'security': return <Shield className="w-3 h-3" />;
      case 'performance': return <TrendingUp className="w-3 h-3" />;
      default: return <Bug className="w-3 h-3" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Wand2 className="w-5 h-5 text-white" />
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
                  Be specific about the feature, expected behaviors, and any edge cases you want covered
                </p>
              </div>

              {/* Quick Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name (optional)</Label>
                  <Input
                    id="projectName"
                    placeholder="My Project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featureName">Feature Name (optional)</Label>
                  <Input
                    id="featureName"
                    placeholder="User Authentication"
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                  />
                </div>
              </div>

              {/* Test Type */}
              <div className="space-y-2">
                <Label>Test Type Focus</Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Options */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Advanced Options
                    </span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Edge Cases</Label>
                        <p className="text-xs text-muted-foreground">Include boundary and edge scenarios</p>
                      </div>
                      <Switch checked={includeEdgeCases} onCheckedChange={setIncludeEdgeCases} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Negative Tests</Label>
                        <p className="text-xs text-muted-foreground">Include error and failure scenarios</p>
                      </div>
                      <Switch checked={includeNegativeTests} onCheckedChange={setIncludeNegativeTests} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Performance Tests</Label>
                        <p className="text-xs text-muted-foreground">Include load and stress scenarios</p>
                      </div>
                      <Switch checked={includePerformance} onCheckedChange={setIncludePerformance} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Security Tests</Label>
                        <p className="text-xs text-muted-foreground">Include security validation scenarios</p>
                      </div>
                      <Switch checked={includeSecurity} onCheckedChange={setIncludeSecurity} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Generate Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="min-w-[140px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
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
                    <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
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
                  className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">Generation Failed</p>
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
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
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

              {/* Metadata */}
              {generationResult.metadata && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  {generationResult.metadata.coverageAreas?.map((area, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
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
                          className="w-4 h-4 rounded border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{tc.title}</span>
                            <Badge className={cn("text-[10px]", getPriorityColor(tc.priority))}>
                              {tc.priority}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              {getTypeIcon(tc.testType)}
                              {tc.testType}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {tc.summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {tc.steps.length} steps
                          </Badge>
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
                                        <p className="text-green-600 dark:text-green-400">
                                          <strong>Expected:</strong> {step.expectedResult}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Tags */}
                              {tc.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {tc.tags.map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* AI Reasoning */}
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
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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

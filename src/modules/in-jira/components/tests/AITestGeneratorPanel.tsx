/**
 * AI Test Generator Panel
 * AI-1: Story → Test Suite Generator
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTestAIGeneration } from '../../hooks/useTestAIGeneration';
import { useTestAISettings } from '../../hooks/useTestAISettings';

interface GeneratedTestCaseLocal {
  title: string;
  description: string;
  steps: { action: string; expectedResult: string }[];
  priority: string;
  testType: string;
}

interface AITestGeneratorPanelProps {
  storyId?: string;
  storyTitle?: string;
  storyDescription?: string;
  programId?: string;
  onTestsGenerated?: () => void;
}

export function AITestGeneratorPanel({
  storyId,
  storyTitle,
  storyDescription,
  programId,
  onTestsGenerated,
}: AITestGeneratorPanelProps) {
  const { projectKey } = useParams<{ projectKey: string }>();
  
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedTests, setGeneratedTests] = useState<GeneratedTestCaseLocal[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

  const { settings } = useTestAISettings(programId || null);
  const {
    generateTestCases,
    isGeneratingTests,
    saveGeneratedTestCases,
    isSavingTests,
  } = useTestAIGeneration(programId || null);

  const handleGenerate = async () => {
    if (!storyId || !storyTitle) {
      toast.error('Story information is required');
      return;
    }

    try {
      const result = await generateTestCases({
        storyId,
        storyTitle,
        storyDescription,
        acceptanceCriteria: additionalContext,
      });
      if (result?.testCases) {
        setGeneratedTests(result.testCases);
        setSelectedTests(new Set(result.testCases.map((_, i) => i)));
        setExpandedTests(new Set([0]));
        setShowPreview(true);
        toast.success(`Generated ${result.testCases.length} test cases`);
      }
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  const handleApprove = async () => {
    const selectedTestCases = generatedTests.filter((_, i) => selectedTests.has(i));
    if (selectedTestCases.length === 0) {
      toast.error('Select at least one test case');
      return;
    }

    try {
      await saveGeneratedTestCases({ storyId: storyId!, testCases: selectedTestCases as any });
      onTestsGenerated?.();
      setShowPreview(false);
      setGeneratedTests([]);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleReject = () => {
    setShowPreview(false);
    setGeneratedTests([]);
    setSelectedTests(new Set());
  };

  const toggleSelect = (index: number) => {
    setSelectedTests(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  if (!settings?.is_enabled) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-status-warning" />
        <h3 className="text-lg font-medium text-text-primary">AI Not Configured</h3>
        <p className="text-sm text-text-tertiary mt-1">
          Configure AI settings in Test Admin to enable test generation.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <a href={`/project/${projectKey}/tests/admin`}>Configure AI Settings</a>
        </Button>
      </div>
    );
  }

  if (showPreview && generatedTests.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Generated Test Cases</h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              {selectedTests.size} of {generatedTests.length} selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReject}>
              <XCircle className="h-4 w-4 mr-1.5" />Reject
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={isSavingTests}>
              {isSavingTests ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Approve
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {generatedTests.map((tc, index) => (
              <Collapsible key={index} open={expandedTests.has(index)} onOpenChange={() => toggleExpand(index)}>
                <div className={cn('rounded-lg border', selectedTests.has(index) ? 'border-accent-primary bg-accent-subtle/50' : 'border-border-default bg-surface-2')}>
                  <CollapsibleTrigger className="w-full p-3 flex items-center gap-3 text-left">
                    <input type="checkbox" checked={selectedTests.has(index)} onChange={() => toggleSelect(index)} onClick={(e) => e.stopPropagation()} className="h-4 w-4" />
                    {expandedTests.has(index) ? <ChevronDown className="h-4 w-4 text-text-quaternary" /> : <ChevronRight className="h-4 w-4 text-text-quaternary" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{tc.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{tc.testType}</Badge>
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">{tc.title}</p>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2 border-t border-border-default pt-3">
                      {tc.description && <p className="text-sm text-text-secondary">{tc.description}</p>}
                      {tc.steps?.length > 0 && (
                        <div className="space-y-1">
                          {tc.steps.map((step, si) => (
                            <div key={si} className="flex gap-2 text-sm">
                              <span className="text-text-quaternary">{si + 1}.</span>
                              <div><p className="text-text-primary">{step.action}</p><p className="text-text-tertiary text-xs">→ {step.expectedResult}</p></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="p-4 bg-surface-2 rounded-lg border border-border-default">
        <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Source Story</p>
        <p className="text-sm font-medium text-text-primary">{storyTitle || 'No story selected'}</p>
        {storyDescription && <p className="text-sm text-text-tertiary mt-1 line-clamp-2">{storyDescription}</p>}
      </div>
      <div>
        <label className="text-xs text-text-tertiary uppercase tracking-wide mb-1.5 block">Additional Context</label>
        <Textarea value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} placeholder="Add testing requirements..." className="bg-surface-2 border-border-default" rows={3} />
      </div>
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Using {settings?.model || 'AI'}</span>
      </div>
      <Button className="w-full" onClick={handleGenerate} disabled={isGeneratingTests || !storyId}>
        {isGeneratingTests ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Test Cases</>}
      </Button>
      {isGeneratingTests && <Progress value={66} className="h-1" />}
    </div>
  );
}

export default AITestGeneratorPanel;

import React, { useState } from 'react';
import { Sparkles, Wand2, FileText, CheckCircle2, XCircle, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useGenerateTestCases, AITestCase } from '../../hooks/useTestAI';
import { cn } from '@/lib/utils';

interface AITestGeneratorProps {
  storyId: string;
  storyTitle: string;
  storyDescription?: string;
  acceptanceCriteria?: string[];
  programId: string;
  onAccept?: (testCases: AITestCase[]) => void;
}

export function AITestGenerator({
  storyId,
  storyTitle,
  storyDescription,
  acceptanceCriteria = [],
  programId,
  onAccept,
}: AITestGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [generatedCases, setGeneratedCases] = useState<AITestCase[]>([]);
  const [selectedCases, setSelectedCases] = useState<Set<number>>(new Set());
  
  const { generate, isGenerating } = useGenerateTestCases();
  
  const handleGenerate = () => {
    generate({
      storyId,
      storyTitle,
      storyDescription,
      acceptanceCriteria: acceptanceCriteria.join('\n'),
      programId,
    }, {
      onSuccess: (data) => {
        setGeneratedCases(data.testCases);
        setSelectedCases(new Set(data.testCases.map((_, i) => i)));
      },
    });
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
  
  const handleAccept = () => {
    const selected = generatedCases.filter((_, i) => selectedCases.has(i));
    onAccept?.(selected);
    setOpen(false);
    setGeneratedCases([]);
    setSelectedCases(new Set());
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Test Cases
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Test Case Generator
          </DialogTitle>
          <DialogDescription>
            Generate comprehensive test cases from story requirements
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Story Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Source Story
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p className="font-medium">{storyTitle}</p>
              {storyDescription && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {storyDescription}
                </p>
              )}
              {acceptanceCriteria.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Acceptance Criteria:</p>
                  <ul className="text-sm space-y-1">
                    {acceptanceCriteria.slice(0, 3).map((ac, i) => (
                      <li key={i} className="text-muted-foreground">• {ac}</li>
                    ))}
                    {acceptanceCriteria.length > 3 && (
                      <li className="text-muted-foreground">
                        + {acceptanceCriteria.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Generated Test Cases */}
          {generatedCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wand2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">Ready to Generate</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                AI will analyze the story and create comprehensive test cases covering happy paths, edge cases, and error scenarios.
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Test Cases
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {generatedCases.length} test cases generated • {selectedCases.size} selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCases(new Set(generatedCases.map((_, i) => i)))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCases(new Set())}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-4 space-y-3">
                  {generatedCases.map((tc, index) => (
                    <Card
                      key={index}
                      className={cn(
                        'cursor-pointer transition-all',
                        selectedCases.has(index) 
                          ? 'ring-2 ring-primary' 
                          : 'opacity-60 hover:opacity-100'
                      )}
                      onClick={() => toggleCase(index)}
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {selectedCases.has(index) ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <CardTitle className="text-sm">{tc.title}</CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className={getPriorityColor(tc.priority)}>
                              {tc.priority}
                            </Badge>
                            <Badge variant="outline">
                              {tc.testType}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="ml-7">
                          {tc.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-2 ml-7">
                        <p className="text-xs text-muted-foreground mb-2">Test Steps:</p>
                        <ol className="text-sm space-y-2">
                          {tc.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex gap-2">
                              <span className="text-muted-foreground font-mono text-xs w-4">
                                {stepIndex + 1}.
                              </span>
                              <div className="flex-1">
                                <p className="text-foreground">{step.action}</p>
                                <p className="text-muted-foreground text-xs mt-0.5">
                                  → {step.expectedResult}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAccept} 
                    disabled={selectedCases.size === 0}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept {selectedCases.size} as Drafts
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

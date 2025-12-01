import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { GeneratedTestCase } from '@/types/aiFeatures.types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCreateTestCase } from '@/hooks/useTestManagement';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
  storyDescription?: string;
  acceptanceCriteria?: string;
}

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  isOpen,
  onClose,
  storyId,
  storyTitle,
  storyDescription,
  acceptanceCriteria,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTests, setGeneratedTests] = useState<GeneratedTestCase[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const createTestCase = useCreateTestCase();

  const generateTests = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-test-cases', {
        body: {
          storyTitle,
          storyDescription,
          acceptanceCriteria,
        },
      });

      if (error) throw error;

      if (data.testCases) {
        setGeneratedTests(data.testCases);
        // Select all by default
        setSelectedTests(new Set(data.testCases.map((_: any, i: number) => i)));
        toast({
          title: 'Tests Generated',
          description: `Generated ${data.testCases.length} test cases successfully.`,
        });
      }
    } catch (error: any) {
      console.error('Error generating tests:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate test cases. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTest = (index: number) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTests(newSelected);
  };

  const createSelectedTests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to create test cases.',
        variant: 'destructive',
      });
      return;
    }

    let created = 0;
    for (const index of selectedTests) {
      const test = generatedTests[index];
      try {
        await createTestCase.mutateAsync({
          title: test.title,
          description: test.description,
          test_type: test.testType,
          priority: test.priority,
          status: 'draft',
          linked_work_item_id: storyId,
          linked_work_item_type: 'story',
          created_by: user.id,
        });
        created++;
      } catch (error) {
        console.error('Error creating test case:', error);
      }
    }

    toast({
      title: 'Tests Created',
      description: `Successfully created ${created} test case(s).`,
    });

    onClose();
  };

  React.useEffect(() => {
    if (isOpen && generatedTests.length === 0) {
      generateTests();
    }
  }, [isOpen]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-blue-600';
      case 'low': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-brand-gold" />
            AI Test Generator
          </DialogTitle>
          <DialogDescription>
            Story: {storyTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
              <span className="ml-3 text-muted-foreground">Generating test cases...</span>
            </div>
          ) : generatedTests.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Generated {generatedTests.length} test case(s)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateTests}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
              </div>

              <div className="space-y-3">
                {generatedTests.map((test, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedTests.has(index)}
                        onCheckedChange={() => toggleTest(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{test.title}</h3>
                          <Badge className={getPriorityColor(test.priority)}>
                            {test.priority}
                          </Badge>
                          <Badge variant="outline">{test.testType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{test.description}</p>
                        
                        {test.steps && test.steps.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-foreground">Test Steps:</p>
                            {test.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="text-xs text-muted-foreground pl-3">
                                {stepIndex + 1}. {step.action}
                                <br />
                                <span className="text-green-600 dark:text-green-400">
                                  ✓ Expected: {step.expectedResult}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={createSelectedTests}
            disabled={selectedTests.size === 0 || isGenerating}
            className="bg-brand-gold hover:bg-brand-gold/90 text-background"
          >
            Create {selectedTests.size} Test Case(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * AI Generate Cases Component
 * Generate test cases from requirements using AI
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Upload,
  FileText,
  Loader2,
  Check,
  X,
  FolderPlus,
  Wand2,
} from 'lucide-react';
import { useGenerateSteps, useSuggestCases } from '../../hooks/useAI';
import { toast } from 'sonner';

interface GeneratedCase {
  id: string;
  title: string;
  description: string;
  priority: string;
  type: string;
  steps: Array<{
    action: string;
    expected_result: string;
  }>;
  selected: boolean;
}

interface AIGenerateCasesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  folderId?: string;
  onSave: (cases: GeneratedCase[]) => Promise<void>;
}

const TEST_TYPES = [
  { id: 'positive', label: 'Positive', description: 'Happy path scenarios' },
  { id: 'negative', label: 'Negative', description: 'Error handling scenarios' },
  { id: 'boundary', label: 'Boundary', description: 'Edge value testing' },
  { id: 'edge', label: 'Edge Cases', description: 'Unusual scenarios' },
];

export function AIGenerateCases({
  open,
  onOpenChange,
  projectId,
  folderId,
  onSave,
}: AIGenerateCasesProps) {
  const [sourceText, setSourceText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['positive', 'negative']);
  const [outputCount, setOutputCount] = useState([5]);
  const [generatedCases, setGeneratedCases] = useState<GeneratedCase[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Read file content
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  }, []);

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      toast.error('Please enter requirement text or upload a file');
      return;
    }

    setIsGenerating(true);
    try {
      // TODO: Implement actual AI API call for test case generation
      // For now, show a message that AI integration is pending
      toast.info('AI test case generation is not yet connected to the API');
      setGeneratedCases([]);
    } catch (error) {
      toast.error('Failed to generate test cases');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCaseSelection = (caseId: string) => {
    setGeneratedCases((prev) =>
      prev.map((c) =>
        c.id === caseId ? { ...c, selected: !c.selected } : c
      )
    );
  };

  const selectAll = () => {
    setGeneratedCases((prev) => prev.map((c) => ({ ...c, selected: true })));
  };

  const deselectAll = () => {
    setGeneratedCases((prev) => prev.map((c) => ({ ...c, selected: false })));
  };

  const handleSave = async () => {
    const selectedCases = generatedCases.filter((c) => c.selected);
    if (selectedCases.length === 0) {
      toast.error('Please select at least one test case');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(selectedCases);
      toast.success(`Saved ${selectedCases.length} test cases`);
      onOpenChange(false);
      setGeneratedCases([]);
      setSourceText('');
    } catch (error) {
      toast.error('Failed to save test cases');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = generatedCases.filter((c) => c.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Generate Test Cases
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Left Panel - Input */}
          <div className="w-1/2 space-y-4">
            <div className="space-y-2">
              <Label>Requirement Source</Label>
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste requirement text, user story, or specification..."
                rows={8}
                className="resize-none"
              />
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted transition-colors text-sm"
                >
                  <Upload className="h-4 w-4" />
                  {uploadedFile ? uploadedFile.name : 'Upload file'}
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Test Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {TEST_TYPES.map((type) => (
                  <label
                    key={type.id}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      selectedTypes.includes(type.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type.id)}
                      onCheckedChange={() => toggleType(type.id)}
                    />
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Number of Cases</Label>
                <Badge variant="secondary">{outputCount[0]}</Badge>
              </div>
              <Slider
                value={outputCount}
                onValueChange={setOutputCount}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating || !sourceText.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate {outputCount[0]} Cases
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - Generated Cases */}
          <div className="w-1/2 flex flex-col border rounded-lg">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-medium">
                Generated Cases ({selectedCount}/{generatedCases.length})
              </span>
              {generatedCases.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 p-3">
              {generatedCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <Sparkles className="h-12 w-12 mb-2 opacity-50" />
                  <p>Generated cases will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedCases.map((genCase) => (
                    <Card
                      key={genCase.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        genCase.selected
                          ? 'ring-2 ring-primary'
                          : 'opacity-60 hover:opacity-100'
                      )}
                      onClick={() => toggleCaseSelection(genCase.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={genCase.selected}
                            onCheckedChange={() => toggleCaseSelection(genCase.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {genCase.title}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {genCase.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {genCase.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              {genCase.steps.length} steps
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedCount === 0 || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4 mr-2" />
            )}
            Save {selectedCount} Cases
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

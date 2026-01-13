/**
 * AI Analysis Panel Component
 * TC-261 to TC-330: Display AI analysis results
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  FileText,
  Bug,
  Lightbulb,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useEvidenceAI, 
  DetectedDefect, 
  DefectAnalysisResult, 
  TestStepSuggestionResult,
  OCRResult 
} from './useEvidenceAI';
import { toast } from 'sonner';

interface AIAnalysisPanelProps {
  imageUrl: string;
  onCreateDefect?: (defect: DetectedDefect) => void;
  onApplyTestStep?: (step: { action: string; expectedResult: string }) => void;
}

const severityColors: Record<DetectedDefect['severity'], string> = {
  critical: 'bg-red-500',
  major: 'bg-orange-500',
  minor: 'bg-yellow-500',
  trivial: 'bg-blue-500',
};

const severityIcons: Record<DetectedDefect['severity'], typeof AlertCircle> = {
  critical: AlertCircle,
  major: AlertTriangle,
  minor: Info,
  trivial: Info,
};

const qualityColors: Record<DefectAnalysisResult['overallQuality'], string> = {
  excellent: 'text-green-600',
  good: 'text-blue-600',
  fair: 'text-yellow-600',
  poor: 'text-red-600',
};

export function AIAnalysisPanel({ 
  imageUrl, 
  onCreateDefect,
  onApplyTestStep 
}: AIAnalysisPanelProps) {
  const { isAnalyzing, extractText, detectDefects, suggestTestSteps } = useEvidenceAI();
  
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [defectResult, setDefectResult] = useState<DefectAnalysisResult | null>(null);
  const [stepResult, setStepResult] = useState<TestStepSuggestionResult | null>(null);
  const [activeTab, setActiveTab] = useState('ocr');
  const [copied, setCopied] = useState(false);
  const [context, setContext] = useState('');

  const handleExtractText = async () => {
    const result = await extractText(imageUrl);
    if (result) {
      setOcrResult(result);
      setActiveTab('ocr');
    }
  };

  const handleDetectDefects = async () => {
    const result = await detectDefects(imageUrl, undefined, context || undefined);
    if (result) {
      setDefectResult(result);
      setActiveTab('defects');
    }
  };

  const handleSuggestSteps = async () => {
    const result = await suggestTestSteps(imageUrl, undefined, context || undefined);
    if (result) {
      setStepResult(result);
      setActiveTab('steps');
    }
  };

  const handleCopyText = async () => {
    if (ocrResult?.text) {
      await navigator.clipboard.writeText(ocrResult.text);
      setCopied(true);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 pt-0">
        {/* Context input */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Context (optional)
          </label>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Add context for better analysis..."
            className="h-16 resize-none text-sm"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExtractText}
            disabled={isAnalyzing}
          >
            {isAnalyzing && activeTab === 'ocr' ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1.5" />
            )}
            Extract Text
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDetectDefects}
            disabled={isAnalyzing}
          >
            {isAnalyzing && activeTab === 'defects' ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Bug className="h-4 w-4 mr-1.5" />
            )}
            Detect Defects
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggestSteps}
            disabled={isAnalyzing}
          >
            {isAnalyzing && activeTab === 'steps' ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Lightbulb className="h-4 w-4 mr-1.5" />
            )}
            Suggest Steps
          </Button>
        </div>

        <Separator />

        {/* Results */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ocr" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              OCR
            </TabsTrigger>
            <TabsTrigger value="defects" className="text-xs">
              <Bug className="h-3 w-3 mr-1" />
              Defects
              {defectResult && defectResult.defects.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {defectResult.defects.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="steps" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Steps
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-3">
            <TabsContent value="ocr" className="m-0">
              {ocrResult ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Extracted Text</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleCopyText}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-sm whitespace-pre-wrap font-mono">
                    {ocrResult.text || 'No text detected'}
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Click "Extract Text" to perform OCR
                </div>
              )}
            </TabsContent>

            <TabsContent value="defects" className="m-0">
              {defectResult ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-3 rounded-md bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Quality Assessment</span>
                      <span className={cn('text-xs font-semibold capitalize', qualityColors[defectResult.overallQuality])}>
                        {defectResult.overallQuality}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{defectResult.summary}</p>
                  </div>

                  {/* Defects list */}
                  {defectResult.defects.length > 0 ? (
                    <div className="space-y-2">
                      {defectResult.defects.map((defect, index) => {
                        const Icon = severityIcons[defect.severity];
                        return (
                          <div
                            key={index}
                            className="p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <div className={cn('p-1 rounded', severityColors[defect.severity])}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium truncate">{defect.title}</span>
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {defect.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {defect.description}
                                </p>
                                {defect.suggestion && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    💡 {defect.suggestion}
                                  </p>
                                )}
                                {onCreateDefect && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs mt-2"
                                    onClick={() => onCreateDefect(defect)}
                                  >
                                    Create Defect
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-green-600 py-4">
                      ✓ No defects detected
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Click "Detect Defects" to analyze
                </div>
              )}
            </TabsContent>

            <TabsContent value="steps" className="m-0">
              {stepResult ? (
                <div className="space-y-4">
                  {/* Page info */}
                  <div className="p-3 rounded-md bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Page Type</span>
                      <Badge variant="secondary" className="text-xs">
                        {stepResult.pageType}
                      </Badge>
                    </div>
                    {stepResult.mainFeatures && stepResult.mainFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {stepResult.mainFeatures.map((feature, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Steps list */}
                  <div className="space-y-2">
                    {stepResult.steps.map((step, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{step.action}</p>
                            {step.target && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Target: {step.target}
                              </p>
                            )}
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✓ {step.expectedResult}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  'text-[10px]',
                                  step.priority === 'high' && 'border-red-300 text-red-600',
                                  step.priority === 'medium' && 'border-yellow-300 text-yellow-600',
                                  step.priority === 'low' && 'border-blue-300 text-blue-600'
                                )}
                              >
                                {step.priority} priority
                              </Badge>
                              {onApplyTestStep && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 text-[10px]"
                                  onClick={() => onApplyTestStep({
                                    action: step.action,
                                    expectedResult: step.expectedResult
                                  })}
                                >
                                  Apply
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Click "Suggest Steps" to get recommendations
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

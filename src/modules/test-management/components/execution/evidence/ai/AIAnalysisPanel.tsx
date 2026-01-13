/**
 * AI Analysis Panel Component
 * TC-261 to TC-330: Display AI analysis results
 * TC-331 to TC-355: Create defects from AI findings
 * TC-426 to TC-450: Accessibility enhancements
 */

import React, { useState, useRef, useCallback, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useEvidenceAI, 
  DetectedDefect, 
  DefectAnalysisResult, 
  TestStepSuggestionResult,
  OCRResult 
} from './useEvidenceAI';
import { CreateDefectFromAIModal, AIDefectSubmitData } from './CreateDefectFromAIModal';
import { toast } from 'sonner';

interface AIAnalysisPanelProps {
  imageUrl: string;
  evidenceId?: string;
  projectId?: string;
  executionId?: string;
  stepId?: string;
  onCreateDefect?: (defect: DetectedDefect) => void;
  onDefectCreated?: (defectId: string) => void;
  onApplyTestStep?: (step: { action: string; expectedResult: string }) => void;
}

const severityColors: Record<DetectedDefect['severity'], string> = {
  critical: 'bg-destructive',
  major: 'bg-orange-500',
  minor: 'bg-yellow-500',
  trivial: 'bg-blue-500',
};

const severityLabels: Record<DetectedDefect['severity'], string> = {
  critical: 'Critical severity',
  major: 'Major severity',
  minor: 'Minor severity',
  trivial: 'Trivial severity',
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
  evidenceId,
  projectId,
  executionId,
  stepId,
  onCreateDefect,
  onDefectCreated,
  onApplyTestStep 
}: AIAnalysisPanelProps) {
  const { isAnalyzing, extractText, detectDefects, suggestTestSteps } = useEvidenceAI();
  
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [defectResult, setDefectResult] = useState<DefectAnalysisResult | null>(null);
  const [stepResult, setStepResult] = useState<TestStepSuggestionResult | null>(null);
  const [activeTab, setActiveTab] = useState('ocr');
  const [copied, setCopied] = useState(false);
  const [context, setContext] = useState('');
  
  // Defect creation modal state
  const [selectedDefect, setSelectedDefect] = useState<DetectedDefect | null>(null);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [isCreatingDefect, setIsCreatingDefect] = useState(false);

  // Accessibility: unique IDs for ARIA relationships
  const contextInputId = useId();
  const ocrResultId = useId();
  const defectsListId = useId();
  const stepsListId = useId();
  
  // Focus management refs
  const contextInputRef = useRef<HTMLTextAreaElement>(null);
  const extractTextBtnRef = useRef<HTMLButtonElement>(null);

  const handleExtractText = async () => {
    const result = await extractText(imageUrl, undefined, evidenceId);
    if (result) {
      setOcrResult(result);
      setActiveTab('ocr');
      // Announce result to screen readers
      announceToScreenReader(`Text extraction complete. ${result.text ? 'Text detected.' : 'No text detected.'}`);
    }
  };

  const handleDetectDefects = async () => {
    const result = await detectDefects(imageUrl, undefined, context || undefined, evidenceId);
    if (result) {
      setDefectResult(result);
      setActiveTab('defects');
      announceToScreenReader(
        `Defect detection complete. Found ${result.defects.length} potential ${result.defects.length === 1 ? 'issue' : 'issues'}. Overall quality: ${result.overallQuality}.`
      );
    }
  };

  const handleSuggestSteps = async () => {
    const result = await suggestTestSteps(imageUrl, undefined, context || undefined, evidenceId);
    if (result) {
      setStepResult(result);
      setActiveTab('steps');
      announceToScreenReader(
        `Test step suggestions complete. Generated ${result.steps.length} test ${result.steps.length === 1 ? 'step' : 'steps'}.`
      );
    }
  };

  const handleCopyText = async () => {
    if (ocrResult?.text) {
      await navigator.clipboard.writeText(ocrResult.text);
      setCopied(true);
      toast.success('Text copied to clipboard');
      announceToScreenReader('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle opening defect creation modal
  const handleOpenDefectModal = useCallback((defect: DetectedDefect) => {
    if (onCreateDefect) {
      // Use external handler if provided
      onCreateDefect(defect);
    } else {
      // Use internal modal
      setSelectedDefect(defect);
      setIsDefectModalOpen(true);
    }
  }, [onCreateDefect]);

  // Handle defect submission
  const handleDefectSubmit = useCallback(async (data: AIDefectSubmitData) => {
    if (!projectId) {
      toast.error('Project ID is required to create defects');
      return;
    }
    
    setIsCreatingDefect(true);
    try {
      // Import supabase and create defect
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Generate defect key
      const { data: existingDefects } = await supabase
        .from('tm_defects')
        .select('defect_key')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      let nextNum = 1;
      if (existingDefects && existingDefects.length > 0) {
        const lastKey = existingDefects[0].defect_key;
        const match = lastKey.match(/DEF-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      
      const defectKey = `DEF-${nextNum}`;

      const { data: defect, error } = await supabase
        .from('tm_defects')
        .insert({
          project_id: projectId,
          defect_key: defectKey,
          title: data.title,
          description: data.description,
          severity: data.severity as 'critical' | 'major' | 'minor' | 'trivial',
          status: 'open',
          reporter_id: user.id,
          defect_type: data.type,
          found_during: 'ai_analysis',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Link to execution step if available
      if (executionId && stepId) {
        await supabase
          .from('tm_defect_links')
          .insert({
            defect_id: defect.id,
            step_result_id: stepId,
            created_by: user.id,
          });
      }

      toast.success(`Defect ${defectKey} created successfully`);
      onDefectCreated?.(defect.id);
      setIsDefectModalOpen(false);
      setSelectedDefect(null);
    } catch (error) {
      console.error('Failed to create defect:', error);
      toast.error('Failed to create defect');
      throw error;
    } finally {
      setIsCreatingDefect(false);
    }
  }, [projectId, executionId, stepId, onDefectCreated]);

  // Accessibility helper: announce to screen readers
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  };

  return (
    <>
      <Card 
        className="h-full flex flex-col" 
        role="region" 
        aria-label="AI Analysis Panel"
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-4 pt-0">
          {/* Context input with proper labeling */}
          <div className="space-y-2">
            <Label 
              htmlFor={contextInputId}
              className="text-xs text-muted-foreground"
            >
              Context (optional)
            </Label>
            <Textarea
              ref={contextInputRef}
              id={contextInputId}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add context for better analysis..."
              className="h-16 resize-none text-sm"
              aria-describedby={`${contextInputId}-hint`}
            />
            <p id={`${contextInputId}-hint`} className="sr-only">
              Provide additional context about the screenshot to improve AI analysis accuracy
            </p>
          </div>

          {/* Action buttons with proper ARIA attributes */}
          <div 
            className="flex flex-wrap gap-2" 
            role="toolbar" 
            aria-label="AI analysis actions"
          >
            <Button
              ref={extractTextBtnRef}
              variant="outline"
              size="sm"
              onClick={handleExtractText}
              disabled={isAnalyzing}
              aria-busy={isAnalyzing && activeTab === 'ocr'}
              aria-describedby="ocr-action-desc"
            >
              {isAnalyzing && activeTab === 'ocr' ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
              ) : (
                <FileText className="h-4 w-4 mr-1.5" aria-hidden="true" />
              )}
              Extract Text
            </Button>
            <span id="ocr-action-desc" className="sr-only">
              Extract text from the image using OCR
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetectDefects}
              disabled={isAnalyzing}
              aria-busy={isAnalyzing && activeTab === 'defects'}
              aria-describedby="defects-action-desc"
            >
              {isAnalyzing && activeTab === 'defects' ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
              ) : (
                <Bug className="h-4 w-4 mr-1.5" aria-hidden="true" />
              )}
              Detect Defects
            </Button>
            <span id="defects-action-desc" className="sr-only">
              Analyze image for potential defects and issues
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggestSteps}
              disabled={isAnalyzing}
              aria-busy={isAnalyzing && activeTab === 'steps'}
              aria-describedby="steps-action-desc"
            >
              {isAnalyzing && activeTab === 'steps' ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
              ) : (
                <Lightbulb className="h-4 w-4 mr-1.5" aria-hidden="true" />
              )}
              Suggest Steps
            </Button>
            <span id="steps-action-desc" className="sr-only">
              Generate test step suggestions based on the image
            </span>
          </div>

          <Separator />

          {/* Results tabs with accessibility */}
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="flex-1 flex flex-col"
          >
            <TabsList 
              className="grid w-full grid-cols-3" 
              aria-label="Analysis results"
            >
              <TabsTrigger 
                value="ocr" 
                className="text-xs"
                aria-controls={ocrResultId}
              >
                <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                <span>OCR</span>
              </TabsTrigger>
              <TabsTrigger 
                value="defects" 
                className="text-xs"
                aria-controls={defectsListId}
              >
                <Bug className="h-3 w-3 mr-1" aria-hidden="true" />
                <span>Defects</span>
                {defectResult && defectResult.defects.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1 h-4 px-1 text-[10px]"
                    aria-label={`${defectResult.defects.length} defects found`}
                  >
                    {defectResult.defects.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="steps" 
                className="text-xs"
                aria-controls={stepsListId}
              >
                <Lightbulb className="h-3 w-3 mr-1" aria-hidden="true" />
                <span>Steps</span>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-3">
              {/* OCR Results */}
              <TabsContent 
                value="ocr" 
                className="m-0" 
                id={ocrResultId}
                role="tabpanel"
                aria-label="OCR extraction results"
              >
                {ocrResult ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground" id="extracted-text-label">
                        Extracted Text
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={handleCopyText}
                        aria-label={copied ? 'Text copied' : 'Copy extracted text to clipboard'}
                      >
                        {copied ? (
                          <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
                        )}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <div 
                      className="p-3 rounded-md bg-muted/50 text-sm whitespace-pre-wrap font-mono"
                      role="region"
                      aria-labelledby="extracted-text-label"
                      tabIndex={0}
                    >
                      {ocrResult.text || 'No text detected'}
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-center text-sm text-muted-foreground py-8"
                    role="status"
                  >
                    Click "Extract Text" to perform OCR
                  </div>
                )}
              </TabsContent>

              {/* Defects Results */}
              <TabsContent 
                value="defects" 
                className="m-0"
                id={defectsListId}
                role="tabpanel"
                aria-label="Detected defects"
              >
                {defectResult ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div 
                      className="p-3 rounded-md bg-muted/50"
                      role="region"
                      aria-label="Quality assessment summary"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Quality Assessment</span>
                        <span 
                          className={cn('text-xs font-semibold capitalize', qualityColors[defectResult.overallQuality])}
                          aria-label={`Overall quality: ${defectResult.overallQuality}`}
                        >
                          {defectResult.overallQuality}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{defectResult.summary}</p>
                    </div>

                    {/* Defects list */}
                    {defectResult.defects.length > 0 ? (
                      <ul 
                        className="space-y-2" 
                        role="list" 
                        aria-label={`${defectResult.defects.length} detected defects`}
                      >
                        {defectResult.defects.map((defect, index) => {
                          const Icon = severityIcons[defect.severity];
                          return (
                            <li
                              key={index}
                              className="p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors focus-within:ring-2 focus-within:ring-ring"
                              role="article"
                              aria-label={`${defect.severity} defect: ${defect.title}`}
                            >
                              <div className="flex items-start gap-2">
                                <div 
                                  className={cn('p-1 rounded', severityColors[defect.severity])}
                                  aria-label={severityLabels[defect.severity]}
                                >
                                  <Icon className="h-3 w-3 text-white" aria-hidden="true" />
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
                                      <span aria-hidden="true">💡 </span>
                                      <span className="sr-only">Suggestion: </span>
                                      {defect.suggestion}
                                    </p>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs mt-2 gap-1"
                                    onClick={() => handleOpenDefectModal(defect)}
                                    aria-label={`Create defect from: ${defect.title}`}
                                  >
                                    <Plus className="h-3 w-3" aria-hidden="true" />
                                    Create Defect
                                  </Button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div 
                        className="text-center text-sm text-green-600 py-4"
                        role="status"
                        aria-live="polite"
                      >
                        <span aria-hidden="true">✓ </span>No defects detected
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="text-center text-sm text-muted-foreground py-8"
                    role="status"
                  >
                    Click "Detect Defects" to analyze
                  </div>
                )}
              </TabsContent>

              {/* Steps Results */}
              <TabsContent 
                value="steps" 
                className="m-0"
                id={stepsListId}
                role="tabpanel"
                aria-label="Suggested test steps"
              >
                {stepResult ? (
                  <div className="space-y-4">
                    {/* Page info */}
                    <div 
                      className="p-3 rounded-md bg-muted/50"
                      role="region"
                      aria-label="Page analysis"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Page Type</span>
                        <Badge variant="secondary" className="text-xs">
                          {stepResult.pageType}
                        </Badge>
                      </div>
                      {stepResult.mainFeatures && stepResult.mainFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2" aria-label="Main features">
                          {stepResult.mainFeatures.map((feature, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Steps list */}
                    <ol 
                      className="space-y-2" 
                      role="list"
                      aria-label={`${stepResult.steps.length} suggested test steps`}
                    >
                      {stepResult.steps.map((step, index) => (
                        <li
                          key={index}
                          className="p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors focus-within:ring-2 focus-within:ring-ring"
                          role="listitem"
                        >
                          <div className="flex items-start gap-2">
                            <div 
                              className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0"
                              aria-hidden="true"
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                <span className="sr-only">Step {index + 1}: </span>
                                {step.action}
                              </p>
                              {step.target && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Target: {step.target}
                                </p>
                              )}
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                <span aria-hidden="true">✓ </span>
                                <span className="sr-only">Expected result: </span>
                                {step.expectedResult}
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
                                    aria-label={`Apply step ${index + 1}: ${step.action}`}
                                  >
                                    Apply
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div 
                    className="text-center text-sm text-muted-foreground py-8"
                    role="status"
                  >
                    Click "Suggest Steps" to get recommendations
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>

      {/* Defect Creation Modal */}
      <CreateDefectFromAIModal
        open={isDefectModalOpen}
        onOpenChange={setIsDefectModalOpen}
        defect={selectedDefect}
        evidenceId={evidenceId}
        evidenceUrl={imageUrl}
        onSubmit={handleDefectSubmit}
      />
    </>
  );
}

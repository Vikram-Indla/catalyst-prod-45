import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Modal, {
  ModalTransition,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@atlaskit/modal-dialog';
import AKButton from '@atlaskit/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ItemType } from '@/types/requirement-assist';

interface GenerateStepProps {
  generationId: string | null;
  inputText: string;
  selectedOutputs: {
    epics: boolean;
    features: boolean;
    stories: boolean;
    tests: boolean;
  };
  settings?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  onComplete: (
    items: Array<{
      type: ItemType;
      title: string;
      description: string;
      confidence: number;
      confidenceBreakdown?: Record<string, number>;
      parentId?: string;
    }>,
    metrics: { tokensUsed: number; processingTimeMs: number }
  ) => void;
  onCancel: () => void;
}

interface ProgressItem {
  id: string;
  label: string;
  sublabel: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: string;
}

export function GenerateStep({ 
  generationId, 
  inputText,
  selectedOutputs, 
  settings,
  onComplete, 
  onCancel 
}: GenerateStepProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [items, setItems] = useState<ProgressItem[]>([
    { id: 'pi1', label: 'Loading Templates', sublabel: 'Initializing context...', status: 'completed', progress: 'Done' },
    { id: 'pi2', label: 'Analyzing Requirements', sublabel: 'Processing input text...', status: 'pending', progress: 'Pending' },
    { id: 'pi3', label: 'Compliance Validation', sublabel: 'Checking DGA + NCA rules...', status: 'pending', progress: 'Pending' },
    { id: 'pi4', label: 'Generating Outputs', sublabel: 'Creating work items...', status: 'pending', progress: 'Pending' },
  ]);

  // Time elapsed counter
  useEffect(() => {
    startTimeRef.current = Date.now();
    processingTimerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
    };
  }, []);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update progress items based on current progress
  const updateProgressItems = (currentProgress: number, hasError = false) => {
    setItems(current => {
      const updated = [...current];
      
      if (hasError) {
        // Mark current active item as error
        const activeIndex = updated.findIndex(item => item.status === 'active');
        if (activeIndex >= 0) {
          updated[activeIndex] = { ...updated[activeIndex], status: 'error', progress: 'Failed' };
        }
        return updated;
      }
      
      // Step 1: Loading Templates (0-10%)
      if (currentProgress >= 10) {
        updated[0] = { ...updated[0], status: 'completed', progress: 'Done' };
      }
      
      // Step 2: Analyzing Requirements (10-40%)
      if (currentProgress >= 10 && currentProgress < 40) {
        updated[1] = { ...updated[1], status: 'active', progress: `${Math.round(((currentProgress - 10) / 30) * 100)}%` };
      } else if (currentProgress >= 40) {
        updated[1] = { ...updated[1], status: 'completed', progress: 'Done' };
      }
      
      // Step 3: Compliance Validation (40-70%)
      if (currentProgress >= 40 && currentProgress < 70) {
        updated[2] = { ...updated[2], status: 'active', progress: `${Math.round(((currentProgress - 40) / 30) * 100)}%` };
      } else if (currentProgress >= 70) {
        updated[2] = { ...updated[2], status: 'completed', progress: 'Done' };
      }
      
      // Step 4: Generating Outputs (70-100%)
      if (currentProgress >= 70 && currentProgress < 100) {
        updated[3] = { ...updated[3], status: 'active', progress: `${Math.round(((currentProgress - 70) / 30) * 100)}%` };
      } else if (currentProgress >= 100) {
        updated[3] = { ...updated[3], status: 'completed', progress: 'Done' };
      }
      
      return updated;
    });
  };

  // Call edge function for AI generation
  useEffect(() => {
    if (!generationId || !inputText) {
      setError('Missing generation ID or input text');
      return;
    }

    abortControllerRef.current = new AbortController();

    // Start progress animation
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        // Slow down as we approach 90% (waiting for AI response)
        const increment = prev < 30 ? 2 : prev < 60 ? 1 : prev < 85 ? 0.5 : 0;
        const newProgress = Math.min(prev + increment, 85);
        setTokenCount(Math.floor((newProgress / 100) * 2000));
        updateProgressItems(newProgress);
        return newProgress;
      });
    }, 200);

    // Call the edge function
    const callEdgeFunction = async () => {
      try {
        const response = await supabase.functions.invoke('generate-requirements', {
          body: {
            generationId,
            inputText,
            outputTypes: {
              prd: false,
              epics: selectedOutputs.epics,
              features: selectedOutputs.features,
              stories: selectedOutputs.stories,
              testCases: selectedOutputs.tests,
              acceptanceCriteria: true,
            },
            compliance: {
              dga: true,
              nca: true,
              babok: true,
            },
            settings: {
              model: settings?.model || 'google/gemini-3-pro-preview',
              temperature: settings?.temperature || 0.7,
              maxTokens: settings?.maxTokens || 4000,
              systemPrompt: settings?.systemPrompt,
            },
          },
        });

        // Stop progress animation
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        if (response.error) {
          throw new Error(response.error.message || 'Generation failed');
        }

        const data = response.data;

        if (!data.success) {
          throw new Error(data.error || 'Generation failed');
        }

        // Complete progress
        setProgress(100);
        setTokenCount(data.tokensUsed || 0);
        updateProgressItems(100);
        setIsGenerating(false);

        if (processingTimerRef.current) {
          clearInterval(processingTimerRef.current);
        }

        // Fetch generated items from database
        const { data: generatedItems, error: fetchError } = await supabase
          .from('ra_generated_items')
          .select('*')
          .eq('generation_id', generationId)
          .order('sort_order', { ascending: true });

        if (fetchError) {
          console.error('Failed to fetch generated items:', fetchError);
          throw new Error('Failed to fetch generated items');
        }

        // Map to expected format
        const mappedItems = (generatedItems || []).map(item => ({
          type: item.item_type as ItemType,
          title: item.title,
          description: item.description || '',
          confidence: item.confidence_score || 85,
          confidenceBreakdown: item.confidence_breakdown as Record<string, number> | undefined,
          parentId: item.parent_id || undefined,
        }));

        // Brief delay before completing
        setTimeout(() => {
          onComplete(mappedItems, {
            tokensUsed: data.tokensUsed || 0,
            processingTimeMs: data.processingTimeMs || (Date.now() - startTimeRef.current),
          });
        }, 500);

      } catch (err) {
        console.error('Generation error:', err);
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setIsGenerating(false);
        updateProgressItems(progress, true);
        
        if (processingTimerRef.current) {
          clearInterval(processingTimerRef.current);
        }

        toast.error('Generation failed', { description: errorMessage });
      }
    };

    callEdgeFunction();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [generationId, inputText, selectedOutputs, settings, onComplete]);

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setShowCancelDialog(false);
    onCancel();
  };

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    setTokenCount(0);
    setElapsedSeconds(0);
    setIsGenerating(true);
    setItems([
      { id: 'pi1', label: 'Loading Templates', sublabel: 'Initializing context...', status: 'completed', progress: 'Done' },
      { id: 'pi2', label: 'Analyzing Requirements', sublabel: 'Processing input text...', status: 'pending', progress: 'Pending' },
      { id: 'pi3', label: 'Compliance Validation', sublabel: 'Checking DGA + NCA rules...', status: 'pending', progress: 'Pending' },
      { id: 'pi4', label: 'Generating Outputs', sublabel: 'Creating work items...', status: 'pending', progress: 'Pending' },
    ]);
    
    // Force re-run effect by updating startTimeRef
    startTimeRef.current = Date.now();
    
    // Restart timer
    processingTimerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      {/* CATY Avatar */}
      <div className={cn(
        "w-[88px] h-[88px] rounded-[22px] flex items-center justify-center mb-7 shadow-[0_12px_40px_rgba(37,99,235,0.3)]",
        error 
          ? "bg-destructive" 
          : "bg-gradient-to-br from-primary to-teal-500 animate-pulse"
      )}>
        {error ? (
          <AlertTriangle className="w-10 h-10 text-white" />
        ) : (
          <Bot className="w-10 h-10 text-white" />
        )}
      </div>
      
      <h2 className="text-[22px] font-semibold mb-1.5">
        {error ? (
          <span className="text-destructive">Generation Failed</span>
        ) : (
          <>
            <span className="text-primary">CATY</span> is generating
          </>
        )}
      </h2>
      <p className="text-sm text-muted-foreground mb-9">
        {error || 'Analyzing requirements and applying templates...'}
      </p>
      
      {/* Progress Card */}
      <div className="w-full max-w-[540px] bg-card border rounded-xl overflow-hidden">
        {/* Progress Items */}
        <div className="divide-y">
          {items.map(item => (
            <div key={item.id} className={cn(
              "flex items-center gap-4 px-5 py-[18px] transition-colors",
              item.status === 'completed' && "bg-emerald-50 dark:bg-emerald-950/20",
              item.status === 'active' && "bg-primary/5",
              item.status === 'error' && "bg-destructive/10",
              item.status === 'pending' && "bg-transparent"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-[10px] flex items-center justify-center text-[15px]",
                item.status === 'completed' && "bg-emerald-500 text-white",
                item.status === 'active' && "bg-primary text-white",
                item.status === 'error' && "bg-destructive text-white",
                item.status === 'pending' && "bg-muted text-muted-foreground"
              )}>
                {item.status === 'completed' ? (
                  <Check className="w-5 h-5" />
                ) : item.status === 'active' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : item.status === 'error' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <span className="text-xs">—</span>
                )}
              </div>
              <div className="flex-1">
                <h4 className={cn(
                  "text-sm font-medium",
                  item.status === 'pending' && "text-muted-foreground",
                  item.status === 'error' && "text-destructive"
                )}>
                  {item.label}
                </h4>
                <p className="text-xs text-muted-foreground">{item.sublabel}</p>
              </div>
              <span className={cn(
                "text-[13px] font-medium",
                item.status === 'completed' && "text-emerald-600",
                item.status === 'active' && "text-primary",
                item.status === 'error' && "text-destructive",
                item.status === 'pending' && "text-muted-foreground"
              )}>
                {item.progress}
              </span>
            </div>
          ))}
        </div>
        
        {/* Overall Progress */}
        <div className="p-5 bg-muted/30">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] text-muted-foreground">Progress</span>
            <strong className="text-xl font-bold">{Math.round(progress)}%</strong>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-[10px] bg-muted rounded-[5px] overflow-hidden mb-3">
            <div 
              className={cn(
                "absolute inset-y-0 left-0 rounded-[5px] transition-all duration-300",
                error 
                  ? "bg-destructive" 
                  : "bg-gradient-to-r from-primary to-teal-500"
              )}
              style={{ width: `${progress}%` }}
            />
            {isGenerating && !error && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={{ 
                  animation: 'shimmer 1.5s infinite',
                  backgroundSize: '200% 100%'
                }}
              />
            )}
          </div>
          
          {/* Meta */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tokens: {tokenCount.toLocaleString()} / 4,000</span>
            <span>{formatTime(elapsedSeconds)} elapsed</span>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 mt-6">
        {error ? (
          <>
            <Button variant="outline" onClick={onCancel}>
              Go Back
            </Button>
            <Button onClick={handleRetry}>
              Try Again
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Cancel Confirmation Dialog (Atlaskit) */}
      <ModalTransition>
        {showCancelDialog && (
          <Modal onClose={() => setShowCancelDialog(false)} width="small">
            <ModalHeader>
              <ModalTitle appearance="warning">Cancel generation?</ModalTitle>
            </ModalHeader>
            <ModalBody>
              Your draft has been saved. You can continue from where you left off later.
            </ModalBody>
            <ModalFooter>
              <AKButton appearance="subtle" onClick={() => setShowCancelDialog(false)}>
                Continue Generating
              </AKButton>
              <AKButton appearance="warning" onClick={confirmCancel}>
                Yes, Cancel
              </AKButton>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

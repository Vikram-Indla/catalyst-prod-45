/**
 * AI Analysis Panel Component
 * TC-261 to TC-330: AI-powered defect detection with severity classification
 */

import React, { useState } from 'react';
import { Loader2, Sparkles, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { IssueCard } from './IssueCard';
import { 
  AiAnalysisPanelProps, 
  AiAnalysisResult,
  DetectedIssue,
  qualityColors
} from './types';

export const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({ 
  attachmentId,
  imageUrl,
  aiAnalysis, 
  aiAnalyzedAt, 
  testCaseContext,
  onAnalyze, 
  onCreateDefect 
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [localAnalysis, setLocalAnalysis] = useState<AiAnalysisResult | null>(aiAnalysis || null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await onAnalyze();
      if (result) {
        setLocalAnalysis(result);
        const issueCount = result.issues?.length || 0;
        if (issueCount > 0) {
          toast.warning(`AI detected ${issueCount} issue${issueCount > 1 ? 's' : ''}`);
        } else {
          toast.success('No issues detected');
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analysis = localAnalysis || aiAnalysis;

  // Initial state - no analysis yet
  if (!analysis) {
    return (
      <Button
        onClick={handleAnalyze}
        disabled={analyzing}
        variant="default"
        className="w-full py-3 gap-2"
      >
        {analyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Scanning for defects...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            AI Defect Scan
          </>
        )}
      </Button>
    );
  }

  const hasIssues = analysis.issues?.length > 0;
  const issueCount = analysis.issues?.length || 0;

  return (
    <div className="space-y-3">
      {/* Summary Header */}
      <div 
        className={cn(
          "p-3 rounded-lg flex items-start gap-3",
          hasIssues 
            ? qualityColors[analysis.overallQuality] 
            : "bg-green-50 dark:bg-green-900/30"
        )}
      >
        {hasIssues ? (
          <AlertTriangle className="w-5 h-5 text-current flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium",
            hasIssues ? "text-current" : "text-green-700 dark:text-green-400"
          )}>
            {hasIssues 
              ? `${issueCount} issue${issueCount > 1 ? 's' : ''} detected` 
              : 'No issues detected'
            }
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {analysis.summary}
          </p>
          {aiAnalyzedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Analyzed: {new Date(aiAnalyzedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Issue Cards */}
      {hasIssues && (
        <div className="space-y-2">
          {analysis.issues.map((issue, index) => (
            <IssueCard 
              key={index} 
              issue={issue} 
              onCreateDefect={() => onCreateDefect(issue)} 
            />
          ))}
        </div>
      )}

      {/* Re-analyze button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAnalyze}
        disabled={analyzing}
        className="text-sm text-primary hover:text-primary/80"
      >
        {analyzing ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Re-analyzing...
          </>
        ) : (
          <>
            <RefreshCw className="w-3 h-3 mr-1" />
            Re-analyze
          </>
        )}
      </Button>
    </div>
  );
};

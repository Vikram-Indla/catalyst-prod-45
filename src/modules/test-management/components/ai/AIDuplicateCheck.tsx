/**
 * AI Duplicate Check Component
 * Shows similar defects when entering defect title
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Copy,
} from 'lucide-react';

interface SimilarDefect {
  id: string;
  defect_key: string;
  title: string;
  status: string;
  severity: string;
  similarity_score: number;
  created_at: string;
}

interface AIDuplicateCheckProps {
  title: string;
  projectId: string;
  onSelectDuplicate?: (defectId: string) => void;
  className?: string;
}

export function AIDuplicateCheck({
  title,
  projectId,
  onSelectDuplicate,
  className,
}: AIDuplicateCheckProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [similarDefects, setSimilarDefects] = useState<SimilarDefect[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastCheckedTitle, setLastCheckedTitle] = useState('');

  const checkForDuplicates = useCallback(async (searchTitle: string) => {
    if (!searchTitle.trim() || searchTitle.length < 10) {
      setSimilarDefects([]);
      return;
    }

    if (searchTitle === lastCheckedTitle) return;

    setIsLoading(true);
    try {
      // Simulate API call - in real implementation, call the AI duplicate check API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock similar defects
      const mockDefects: SimilarDefect[] = [
        {
          id: '1',
          defect_key: 'DEF-123',
          title: 'Login button not responding on mobile',
          status: 'open',
          severity: 'major',
          similarity_score: 0.87,
          created_at: '2024-01-15',
        },
        {
          id: '2',
          defect_key: 'DEF-098',
          title: 'Login fails on iOS devices',
          status: 'resolved',
          severity: 'critical',
          similarity_score: 0.72,
          created_at: '2024-01-10',
        },
      ].filter(() => Math.random() > 0.3); // Randomly show some

      setSimilarDefects(mockDefects);
      setLastCheckedTitle(searchTitle);
      if (mockDefects.length > 0) {
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lastCheckedTitle]);

  // Debounced check on title change
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForDuplicates(title);
    }, 500);

    return () => clearTimeout(timer);
  }, [title, checkForDuplicates]);

  if (!similarDefects.length && !isLoading) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-[hsl(var(--danger))]';
      case 'major':
        return 'bg-[hsl(var(--warning))]';
      case 'minor':
        return 'bg-[hsl(var(--info))]';
      default:
        return 'bg-muted-foreground/60';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-info/20 text-info-foreground';
      case 'resolved':
        return 'bg-success/20 text-success-foreground';
      case 'closed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={cn('rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full p-3 text-left">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {isLoading
                  ? 'Checking for duplicates...'
                  : `${similarDefects.length} similar defect(s) found`}
              </span>
            </div>
            {!isLoading && similarDefects.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600">View similar</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-amber-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-600" />
                )}
              </div>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {similarDefects.map((defect) => (
              <Card
                key={defect.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelectDuplicate?.(defect.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {defect.defect_key}
                        </span>
                        <Badge className={cn('text-xs', getStatusColor(defect.status))}>
                          {defect.status}
                        </Badge>
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            getSeverityColor(defect.severity)
                          )}
                          title={defect.severity}
                        />
                      </div>
                      <p className="text-sm truncate">{defect.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-mono text-xs',
                          defect.similarity_score > 0.8
                            ? 'border-red-300 text-red-700'
                            : defect.similarity_score > 0.6
                            ? 'border-amber-300 text-amber-700'
                            : 'border-gray-300'
                        )}
                      >
                        {Math.round(defect.similarity_score * 100)}% similar
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              Click a defect to view details or mark as duplicate
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Prompt 10: AI Suggestions Panel
 * UI for showing AI-powered resource recommendations
 */

import { useState, useMemo } from 'react';
import { Bot, Sparkles, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { findBestMatches } from '@/lib/ai-suggestions/scoring-engine';
import type { DemandRequest, ResourceSuggestion, SuggestionResource } from '@/types/ai-suggestions';

interface ResourceAllocation {
  profile_id?: string;
  assignment_name?: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
}

interface AISuggestionsPanelProps {
  demand: DemandRequest;
  resources: SuggestionResource[];
  allocations: ResourceAllocation[];
  onSelectResource?: (resource: SuggestionResource) => void;
  className?: string;
}

export function AISuggestionsPanel({
  demand,
  resources,
  allocations,
  onSelectResource,
  className
}: AISuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const suggestions = useMemo(() => {
    return findBestMatches(demand, resources, allocations, 5);
  }, [demand, resources, allocations]);

  const topMatch = suggestions[0];

  return (
    <div className={cn(
      "bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20",
      "border border-violet-200 dark:border-violet-800 rounded-lg overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500/10 to-blue-500/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1">
              AI Suggestions
              <Sparkles className="w-3 h-3 text-violet-500" />
            </h3>
            <p className="text-xs text-muted-foreground">
              Best matches for {demand.role} • {demand.percentageNeeded}%
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 w-7 p-0"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 space-y-2">
          {suggestions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No matching resources found
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.resource.id}
                suggestion={suggestion}
                rank={index + 1}
                isTopMatch={index === 0}
                onSelect={() => onSelectResource?.(suggestion.resource)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  rank,
  isTopMatch,
  onSelect
}: {
  suggestion: ResourceSuggestion;
  rank: number;
  isTopMatch: boolean;
  onSelect: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-teal-600 dark:text-teal-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-teal-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const initials = suggestion.resource.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TooltipProvider>
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <div className={cn(
          "bg-card dark:bg-[var(--surface-0)] rounded-lg border transition-all",
          isTopMatch 
            ? "border-violet-300 dark:border-violet-500 shadow-sm" 
            : "border-border dark:border-[var(--border-subtle)]",
          "hover:shadow-md"
        )}>
          <div className="flex items-center gap-3 p-3">
            {/* Rank Badge */}
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              isTopMatch 
                ? "bg-gradient-to-br from-violet-500 to-blue-500 text-white" 
                : "bg-muted dark:bg-[var(--surface-3)] text-muted-foreground dark:text-[var(--text-secondary)]"
            )}>
              {rank}
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{suggestion.resource.name}</span>
                {isTopMatch && (
                  <Badge variant="secondary" className="text-[10px] bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
                    Best Match
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {suggestion.resource.role} • {suggestion.resource.department}
              </div>
            </div>

            {/* Score */}
            <div className="flex flex-col items-end gap-1">
              <span className={cn("text-lg font-bold tabular-nums", getScoreColor(suggestion.matchScore))}>
                {suggestion.matchScore}%
              </span>
              <Progress 
                value={suggestion.matchScore} 
                className="w-16 h-1.5"
                // @ts-ignore
                indicatorClassName={getScoreBg(suggestion.matchScore)}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Info className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <Button 
                size="sm" 
                onClick={onSelect}
                className="h-7 px-3 text-xs"
              >
                Select
              </Button>
            </div>
          </div>

          {/* Expandable Details */}
          <CollapsibleContent>
            <div className="px-3 pb-3 pt-0 border-t border-border">
              <div className="pt-3 space-y-3">
                {/* Availability */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Availability:</span>
                  <span className={cn(
                    "font-medium",
                    suggestion.availabilityInPeriod >= 50 
                      ? "text-teal-600 dark:text-teal-400" 
                      : "text-amber-600 dark:text-amber-400"
                  )}>
                    {suggestion.availabilityInPeriod}% in period
                  </span>
                </div>

                {/* Reasons */}
                {suggestion.reasons.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Why this match:</span>
                    {suggestion.reasons.map((reason, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                        <span>{reason.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {suggestion.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Considerations:</span>
                    {suggestion.warnings.map((warning, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className={cn(
                          "w-3.5 h-3.5 mt-0.5 shrink-0",
                          warning.severity === 'high' 
                            ? "text-red-500" 
                            : warning.severity === 'medium' 
                              ? "text-amber-500" 
                              : "text-blue-500"
                        )} />
                        <div>
                          <span>{warning.description}</span>
                          {warning.resolution && (
                            <p className="text-muted-foreground mt-0.5">{warning.resolution}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}

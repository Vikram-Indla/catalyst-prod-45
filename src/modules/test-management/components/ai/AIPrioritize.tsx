/**
 * AI Prioritize Component
 * AI-powered test prioritization for cycles
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  History,
  Bug,
  TrendingUp,
  CheckCircle2,
  Info,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

interface PrioritizedCase {
  id: string;
  case_key: string;
  title: string;
  original_order: number;
  new_order: number;
  priority_score: number;
  reasoning: string[];
  risk_factors: string[];
  estimated_time: number;
}

interface RiskFactor {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface AIPrioritizeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  cases: Array<{
    id: string;
    case_key: string;
    title: string;
    estimated_time?: number;
  }>;
  onApply: (orderedCaseIds: string[]) => Promise<void>;
}

const DEFAULT_RISK_FACTORS: RiskFactor[] = [
  {
    id: 'failure_history',
    label: 'Failure History',
    description: 'Prioritize tests that have failed recently',
    icon: <History className="h-4 w-4" />,
    enabled: true,
  },
  {
    id: 'defect_correlation',
    label: 'Defect Correlation',
    description: 'Tests linked to open defects',
    icon: <Bug className="h-4 w-4" />,
    enabled: true,
  },
  {
    id: 'code_changes',
    label: 'Code Changes',
    description: 'Areas with recent code modifications',
    icon: <TrendingUp className="h-4 w-4" />,
    enabled: true,
  },
  {
    id: 'business_critical',
    label: 'Business Critical',
    description: 'High-priority business functionality',
    icon: <AlertTriangle className="h-4 w-4" />,
    enabled: false,
  },
];

export function AIPrioritize({
  open,
  onOpenChange,
  cycleId,
  cases,
  onApply,
}: AIPrioritizeProps) {
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>(DEFAULT_RISK_FACTORS);
  const [timeBudget, setTimeBudget] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prioritizedCases, setPrioritizedCases] = useState<PrioritizedCase[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const toggleRiskFactor = (factorId: string) => {
    setRiskFactors((prev) =>
      prev.map((f) =>
        f.id === factorId ? { ...f, enabled: !f.enabled } : f
      )
    );
  };

  const handleAnalyze = async () => {
    const enabledFactors = riskFactors.filter((f) => f.enabled);
    if (enabledFactors.length === 0) {
      toast.error('Please select at least one risk factor');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simulate AI analysis - in real implementation, call the API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock prioritized results
      const mockPrioritized: PrioritizedCase[] = cases.map((c, index) => {
        const score = Math.random() * 100;
        return {
          id: c.id,
          case_key: c.case_key,
          title: c.title,
          original_order: index + 1,
          new_order: 0, // Will be set after sorting
          priority_score: score,
          reasoning: [
            score > 80 ? 'Failed in last 3 runs' : 'Stable in recent runs',
            score > 60 ? 'Related to recent code changes' : 'Unchanged area',
            score > 40 ? 'Linked to open defect' : 'No open defects',
          ].filter(() => Math.random() > 0.3),
          risk_factors: enabledFactors
            .filter(() => Math.random() > 0.5)
            .map((f) => f.label),
          estimated_time: c.estimated_time || Math.floor(Math.random() * 30) + 5,
        };
      });

      // Sort by priority score and assign new order
      mockPrioritized.sort((a, b) => b.priority_score - a.priority_score);
      mockPrioritized.forEach((c, i) => {
        c.new_order = i + 1;
      });

      // Filter by time budget if set
      if (timeBudget) {
        const budget = parseInt(timeBudget);
        let totalTime = 0;
        mockPrioritized.forEach((c) => {
          if (totalTime + c.estimated_time <= budget) {
            totalTime += c.estimated_time;
          }
        });
      }

      setPrioritizedCases(mockPrioritized);
      toast.success('Prioritization complete');
    } catch (error) {
      toast.error('Failed to prioritize tests');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const orderedIds = prioritizedCases.map((c) => c.id);
      await onApply(orderedIds);
      toast.success('Priority order applied');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to apply priority order');
    } finally {
      setIsApplying(false);
    }
  };

  const totalEstimatedTime = prioritizedCases.reduce(
    (sum, c) => sum + c.estimated_time,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Test Prioritization
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Left Panel - Configuration */}
          <div className="w-1/3 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Risk Factors</Label>
              <div className="space-y-2">
                {riskFactors.map((factor) => (
                  <label
                    key={factor.id}
                    className={cn(
                      'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      factor.enabled
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Checkbox
                      checked={factor.enabled}
                      onCheckedChange={() => toggleRiskFactor(factor.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {factor.icon}
                        <span className="font-medium text-sm">{factor.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {factor.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="time-budget" className="text-sm font-medium">
                Time Budget (optional)
              </Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="time-budget"
                  type="number"
                  value={timeBudget}
                  onChange={(e) => setTimeBudget(e.target.value)}
                  placeholder="Minutes"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                AI will prioritize tests that fit within this time limit
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Analyze & Prioritize
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - Results */}
          <div className="flex-1 flex flex-col border rounded-lg">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-medium">
                Prioritized Order ({prioritizedCases.length} cases)
              </span>
              {prioritizedCases.length > 0 && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {totalEstimatedTime} min total
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 p-3">
              {prioritizedCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <ArrowUpDown className="h-12 w-12 mb-2 opacity-50" />
                  <p>Prioritized tests will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {prioritizedCases.map((pCase, index) => (
                    <Card
                      key={pCase.id}
                      className={cn(
                        'transition-all',
                        pCase.new_order !== pCase.original_order &&
                          'border-blue-200 bg-blue-50/50'
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div
                              className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                                index < 3
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {index + 1}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-muted-foreground">
                                {pCase.case_key}
                              </span>
                              {pCase.new_order < pCase.original_order && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  ↑ Moved up
                                </Badge>
                              )}
                              {pCase.new_order > pCase.original_order && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                  ↓ Moved down
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm truncate">{pCase.title}</p>

                            {/* Reasoning */}
                            <div className="mt-2 space-y-1">
                              {pCase.reasoning.map((reason, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1 text-xs text-muted-foreground"
                                >
                                  <Info className="h-3 w-3" />
                                  {reason}
                                </div>
                              ))}
                            </div>

                            {/* Risk factors */}
                            {pCase.risk_factors.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {pCase.risk_factors.map((factor) => (
                                  <Badge
                                    key={factor}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <Badge
                              className={cn(
                                'font-mono mb-1',
                                pCase.priority_score > 80
                                  ? 'bg-[hsl(var(--danger))]'
                                  : pCase.priority_score > 60
                                  ? 'bg-[hsl(var(--warning))]'
                                  : pCase.priority_score > 40
                                  ? 'bg-[hsl(var(--info))]'
                                  : 'bg-muted-foreground/60',
                                'text-white'
                              )}
                            >
                              {Math.round(pCase.priority_score)}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              ~{pCase.estimated_time}min
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
            onClick={handleApply}
            disabled={prioritizedCases.length === 0 || isApplying}
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Apply Priority Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

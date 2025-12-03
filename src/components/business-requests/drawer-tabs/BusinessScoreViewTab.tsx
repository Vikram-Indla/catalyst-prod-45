import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Info, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessRequest } from '@/types/business-request';

// Score options 0-10
const SCORE_OPTIONS = Array.from({ length: 11 }, (_, i) => i);

// Get rank based on score
const getRank = (score: number): { label: string; color: string } => {
  if (score >= 90) return { label: 'Must-Do Now', color: 'text-green-600 bg-green-100' };
  if (score >= 75) return { label: 'High', color: 'text-emerald-600 bg-emerald-100' };
  if (score >= 60) return { label: 'Medium', color: 'text-amber-600 bg-amber-100' };
  if (score >= 40) return { label: 'Low', color: 'text-orange-600 bg-orange-100' };
  return { label: 'Backlog / Parked', color: 'text-red-600 bg-red-100' };
};

// Get score circle color
const getScoreColor = (score: number): string => {
  if (score >= 70) return 'border-green-500 text-green-600';
  if (score >= 40) return 'border-amber-500 text-amber-600';
  return 'border-red-500 text-red-600';
};

interface BusinessScoreViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
}

// Check if demand details are complete
const isDemandDetailsComplete = (data: any): boolean => {
  return !!(
    data.title && data.title.length >= 5 &&
    data.description &&
    data.requestor &&
    data.start_date &&
    data.impl_start_date &&
    data.end_date
  );
};

export function BusinessScoreViewTab({ data, onChange }: BusinessScoreViewTabProps) {
  const demandComplete = isDemandDetailsComplete(data);
  const executiveUrgency = data.executive_urgency ?? 0;
  const businessValue = data.business_value ?? 0;
  const complexity = data.complexity_score ?? 0;

  // Calculate normalized values
  const normalizedUrgency = executiveUrgency / 10;
  const normalizedBusinessValue = businessValue / 10;
  const normalizedSimplicity = (10 - complexity) / 10;

  // Calculate business score
  const businessScore = useMemo(() => {
    return Math.round(
      (0.45 * normalizedBusinessValue + 0.35 * normalizedUrgency + 0.20 * normalizedSimplicity) * 100
    );
  }, [normalizedBusinessValue, normalizedUrgency, normalizedSimplicity]);

  const rank = getRank(businessScore);

  return (
    <div className="space-y-6 p-5">
      {/* Warning Banner when Demand Details incomplete */}
      {!demandComplete && (
        <Card className="border-2 border-amber-400 rounded-lg bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-amber-800 text-lg">Complete Demand Details First</h4>
                <p className="text-sm text-amber-700">
                  Please fill in all required fields in the Demand Details tab before scoring this demand.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Banner for High Scores */}
      {demandComplete && businessScore >= 90 && (
        <Card className="border-2 border-green-500 rounded-lg bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-green-800 text-lg">MUST-DO NOW</h4>
                <p className="text-sm text-green-700">
                  This demand has scored {businessScore}/100 and should be prioritized immediately for execution.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {demandComplete && businessScore >= 75 && businessScore < 90 && (
        <Card className="border-2 border-emerald-500 rounded-lg bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-800 text-lg">HIGH PRIORITY</h4>
                <p className="text-sm text-emerald-700">
                  This demand has scored {businessScore}/100 and should be considered as a high priority item.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Inputs */}
        <div className="space-y-6">
          {/* Input Scores */}
          <Card className="border border-border/60 rounded-lg bg-card">
            <CardContent className="p-5 space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">
                Inputs (0–10 Scale)
              </h3>

              {/* Executive Urgency */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">1. Executive Urgency</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    (0 = no urgency, 10 = critical / time-sensitive)
                  </p>
                  <Select
                    value={String(executiveUrgency)}
                    onValueChange={(value) => onChange('executive_urgency', parseInt(value))}
                    disabled={!demandComplete}
                  >
                    <SelectTrigger className={cn("mt-2 w-full", !demandComplete && "opacity-50 cursor-not-allowed")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      {SCORE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={cn(
                  "w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-lg shrink-0",
                  getScoreColor(executiveUrgency * 10)
                )}>
                  {Math.round(normalizedUrgency * 100)}
                </div>
              </div>

              {/* Business Value */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">2. Business Value</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    (0 = minimal value, 10 = very high strategic/business value)
                  </p>
                  <Select
                    value={String(businessValue)}
                    onValueChange={(value) => onChange('business_value', parseInt(value))}
                    disabled={!demandComplete}
                  >
                    <SelectTrigger className={cn("mt-2 w-full", !demandComplete && "opacity-50 cursor-not-allowed")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      {SCORE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={cn(
                  "w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-lg shrink-0",
                  getScoreColor(businessValue * 10)
                )}>
                  {Math.round(normalizedBusinessValue * 100)}
                </div>
              </div>

              {/* Complexity */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">3. Complexity</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    (0 = very simple to implement, 10 = very complex / resource-heavy)
                  </p>
                  <Select
                    value={String(complexity)}
                    onValueChange={(value) => onChange('complexity_score', parseInt(value))}
                    disabled={!demandComplete}
                  >
                    <SelectTrigger className={cn("mt-2 w-full", !demandComplete && "opacity-50 cursor-not-allowed")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      {SCORE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={cn(
                  "w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-lg shrink-0",
                  getScoreColor(normalizedSimplicity * 100)
                )}>
                  {Math.round(normalizedSimplicity * 100)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Business Score Card */}
          <Card className="border border-border/60 rounded-lg bg-card">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold text-center">
                Business Score (Auto-Calculated)
              </h3>

              <div className="text-center py-4">
                <div className="text-6xl font-bold text-brand-gold">
                  {businessScore}
                </div>
                <p className="text-sm text-muted-foreground mt-2">(Average: 60)</p>
              </div>

              <div className="text-center">
                <span className={cn(
                  "inline-flex px-4 py-2 rounded-full text-sm font-semibold",
                  rank.color
                )}>
                  Business Rank: {rank.label}
                </span>
              </div>

              <div className="pt-4 border-t border-border/40">
                <p className="text-xs font-medium text-muted-foreground mb-2">Thresholds:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-green-600">90–100</span>
                    <span>→ Must-Do Now</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">75–89</span>
                    <span>→ High</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-600">60–74</span>
                    <span>→ Medium</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">40–59</span>
                    <span>→ Low</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">0–39</span>
                    <span>→ Backlog / Parked</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Tooltip */}
          <Card className="border border-blue-200 rounded-lg bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">This Business Score combines:</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-blue-700">
                    <span>• Business Value (45% weight)</span>
                    <span>• Executive Urgency (35% weight)</span>
                    <span>• Implementation Simplicity (20% weight)</span>
                  </div>
                  <p className="text-blue-600 mt-2">
                    Use it to compare and rank demands in your backlog.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

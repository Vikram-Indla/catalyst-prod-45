import React, { useState, useEffect, useMemo } from 'react';
import { Shield, CheckCircle2, AlertTriangle, XCircle, ChevronDown, FileText, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { catalystToast } from '@/lib/catalystToast';
import { useComplianceReport, useJustification, type ComplianceRow, type Verdict } from '@/hooks/useComplianceGate';
import { Skeleton } from '@/components/ui/skeleton';
interface ControlItem {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'warning' | 'fail';
  gaps?: string[];
}

interface ComplianceCategory {
  id: string;
  name: string;
  items: ControlItem[];
  totalScore: number;
  maxScore: number;
  passing: number;
  total: number;
}

export interface ComplianceGateStepProps {
  draftId?: string;
  runId?: string;
  verdict?: 'pass' | 'conditional' | 'fail';
  totalScore?: number;
  categories?: ComplianceCategory[];
  justificationRequired?: boolean;
  justificationRecorded?: boolean;
  onJustificationSubmit?: (data: JustificationData) => void;
  onContinueAllowed?: (allowed: boolean) => void;
}

interface JustificationData {
  justification: string;
  decisionOwner: string;
  decisionDate: string;
  riskType: string;
  reviewDate: string;
}

// Radial progress component
function RadialProgress({ score, size = 128, strokeWidth = 12 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'hsl(var(--success))' : score >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold">{score}</span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

export function ComplianceGateStep({
  draftId,
  runId,
  verdict: propVerdict,
  totalScore: propTotalScore,
  categories: propCategories = [],
  justificationRequired = true,
  justificationRecorded: propJustificationRecorded = false,
  onJustificationSubmit,
  onContinueAllowed
}: ComplianceGateStepProps) {
  // Fetch real compliance data
  const { data: complianceData, isLoading: isLoadingCompliance } = useComplianceReport(draftId);
  const { data: existingJustification, isLoading: isLoadingJustification } = useJustification(draftId);
  
  // Derive values from real data or props
  const hasRealData = !!complianceData?.report;
  
  // Transform real compliance data to UI format
  const displayData = useMemo(() => {
    if (!hasRealData || !complianceData?.report) {
      // No real data - check if we have prop categories
      if (propCategories.length > 0) {
        return {
          verdict: propVerdict || 'conditional' as const,
          totalScore: propTotalScore || 0,
          categories: propCategories,
          justificationRecorded: propJustificationRecorded
        };
      }
      // No data at all - show empty state
      return null;
    }
    
    const { matrix, scores } = complianceData.report;
    
    // Transform ComplianceRow[] to UI categories
    const dgaRows = matrix.rows.filter(r => r.framework === 'DGA');
    const ncaRows = matrix.rows.filter(r => r.framework === 'NCA');
    
    const transformRows = (rows: ComplianceRow[]): ControlItem[] => {
      return rows.map(row => {
        const coverageToScore: Record<string, { score: number; max: number }> = {
          'covered': { score: 12, max: 12 },
          'partial': { score: 6, max: 12 },
          'not_specified': { score: 0, max: 12 }
        };
        const { score, max } = coverageToScore[row.coverage] || { score: 0, max: 12 };
        
        return {
          id: row.control_id,
          name: row.control_name,
          score,
          maxScore: max,
          status: row.coverage === 'covered' ? 'pass' as const : 
                  row.coverage === 'partial' ? 'warning' as const : 'fail' as const,
          gaps: row.coverage !== 'covered' ? [`Missing: ${row.control_name} evidence`] : undefined
        };
      });
    };
    
    const dgaItems = transformRows(dgaRows);
    const ncaItems = transformRows(ncaRows);
    
    const calcCategoryScore = (items: ControlItem[]) => ({
      totalScore: items.reduce((sum, i) => sum + i.score, 0),
      maxScore: items.reduce((sum, i) => sum + i.maxScore, 0),
      passing: items.filter(i => i.status === 'pass').length,
      total: items.length
    });
    
    const dgaStats = calcCategoryScore(dgaItems);
    const ncaStats = calcCategoryScore(ncaItems);
    
    const categories: ComplianceCategory[] = [];
    
    if (dgaItems.length > 0) {
      categories.push({
        id: 'dga',
        name: 'DGA Controls',
        items: dgaItems,
        ...dgaStats
      });
    }
    
    if (ncaItems.length > 0) {
      categories.push({
        id: 'nca',
        name: 'NCA Controls',
        items: ncaItems,
        ...ncaStats
      });
    }
    
    // Map API verdict to UI verdict
    const verdictMap: Record<Verdict, 'pass' | 'conditional' | 'fail'> = {
      'COMPLIANT': 'pass',
      'CONDITIONAL': 'conditional',
      'NON_COMPLIANT': 'fail'
    };
    
    return {
      verdict: verdictMap[scores.verdict] || 'conditional',
      totalScore: Math.round(scores.weighted_score),
      categories,
      justificationRecorded: !!existingJustification
    };
  }, [complianceData, hasRealData, propCategories, propVerdict, propTotalScore, propJustificationRecorded, existingJustification]);

  const verdict = displayData?.verdict || 'conditional';
  const totalScore = displayData?.totalScore || 0;
  const displayCategories = displayData?.categories || [];
  const justificationRecorded = displayData?.justificationRecorded || false;
  
  // Open categories by default
  const [openCategories, setOpenCategories] = useState<string[]>(['dga', 'nca']);
  const [showJustificationForm, setShowJustificationForm] = useState(verdict === 'conditional');
  const [justificationData, setJustificationData] = useState<JustificationData>({
    justification: '',
    decisionOwner: '',
    decisionDate: new Date().toISOString().split('T')[0],
    riskType: '',
    reviewDate: ''
  });

  // Auto-expand justification form when conditional
  useEffect(() => {
    if (verdict === 'conditional') {
      setShowJustificationForm(true);
    }
  }, [verdict]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getVerdictConfig = () => {
    switch (verdict) {
      case 'pass':
        return {
          icon: CheckCircle2,
          title: 'Full Compliance',
          description: 'Your draft meets all DGA and NCA requirements.',
          bgClass: 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30',
          iconClass: 'text-[hsl(var(--success))]',
          badgeClass: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]'
        };
      case 'conditional':
        return {
          icon: AlertTriangle,
          title: 'Conditional Pass — Justification Required',
          description: 'Your draft meets most requirements but has gaps in compliance controls. Record justification to proceed.',
          bgClass: 'bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/30',
          iconClass: 'text-[hsl(var(--warning))]',
          badgeClass: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]'
        };
      case 'fail':
        return {
          icon: XCircle,
          title: 'Does Not Meet Requirements',
          description: 'Critical compliance gaps identified. Review and address before proceeding.',
          bgClass: 'bg-destructive/10 border-destructive/30',
          iconClass: 'text-destructive',
          badgeClass: 'bg-destructive/10 text-destructive'
        };
    }
  };

  const verdictConfig = getVerdictConfig();
  const VerdictIcon = verdictConfig.icon;

  const handleSubmitJustification = () => {
    if (onJustificationSubmit) {
      onJustificationSubmit(justificationData);
    }
    if (onContinueAllowed) {
      onContinueAllowed(true);
    }
    catalystToast.success('Justification Recorded', 'Risk acceptance has been documented for audit');
    setShowJustificationForm(false);
  };

  // Loading state
  if (isLoadingCompliance || isLoadingJustification) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }
  
  // Empty state - no compliance data yet
  if (!displayData || displayCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Compliance Data</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Compliance analysis has not been run yet. Complete the previous steps to generate compliance data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verdict Banner */}
      <div className={cn(
        "border rounded-xl p-6 flex items-start gap-4 transition-all duration-200",
        verdictConfig.bgClass
      )}>
        <VerdictIcon className={cn("h-6 w-6 flex-shrink-0 mt-0.5", verdictConfig.iconClass)} />
        <div>
          <h3 className="font-semibold text-lg">{verdictConfig.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{verdictConfig.description}</p>
        </div>
      </div>

      {/* Score Overview with Radial Progress */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Score with radial chart */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <RadialProgress score={totalScore} />
          <h3 className="font-semibold text-foreground mt-4">Total Score</h3>
          <Badge variant="outline" className={cn("mt-2", verdictConfig.badgeClass)}>
            {verdict === 'pass' ? '✓ Compliant' : verdict === 'conditional' ? '⚠ Conditional' : '✗ Non-Compliant'}
          </Badge>
        </div>

        {displayCategories.slice(0, 2).map((cat) => {
          const percentage = Math.round((cat.totalScore / cat.maxScore) * 100);
          const isPassing = percentage >= 80;
          return (
            <div key={cat.id} className="bg-card border border-border rounded-xl p-6 flex flex-col items-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <RadialProgress score={percentage} />
              <h3 className="font-semibold text-foreground mt-4">{cat.name}</h3>
              <Badge variant="outline" className={cn(
                "mt-2",
                isPassing ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
              )}>
                {isPassing ? (
                  <><CheckCircle2 className="h-3 w-3 me-1" /> {cat.passing}/{cat.total} Compliant</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 me-1" /> {cat.passing}/{cat.total} Fully Compliant</>
                )}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Control Breakdown - EXPANDED by default */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Control Breakdown</h4>
        
        {displayCategories.map((category) => {
          const isPassing = Math.round((category.totalScore / category.maxScore) * 100) >= 80;
          const isOpen = openCategories.includes(category.id);
          
          return (
            <Collapsible
              key={category.id}
              open={isOpen}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <div className={cn(
                "bg-card border rounded-xl overflow-hidden transition-all duration-200",
                !isPassing && "border-[hsl(var(--warning))]/30"
              )}>
                <CollapsibleTrigger asChild>
                  <button className={cn(
                    "w-full p-4 flex items-center justify-between transition-colors",
                    isPassing ? "bg-[hsl(var(--success))]/5 hover:bg-[hsl(var(--success))]/10" : "bg-[hsl(var(--warning))]/5 hover:bg-[hsl(var(--warning))]/10"
                  )}>
                    <div className="flex items-center gap-3">
                      <Shield className={cn("h-5 w-5", isPassing ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]")} />
                      <span className="font-semibold">{category.name}</span>
                      <Badge variant={isPassing ? "default" : "secondary"} className={cn(
                        isPassing ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                      )}>
                        {category.passing}/{category.total} Fully Compliant
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("font-bold", isPassing ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]")}>
                        {category.totalScore}/{category.maxScore}
                      </span>
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                      )} />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t border-border divide-y divide-border">
                    {category.items.map((item) => (
                      <div key={item.id} className="py-4">
                        <div className="flex items-center gap-4">
                          {item.status === 'pass' && (
                            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] flex-shrink-0" />
                          )}
                          {item.status === 'warning' && (
                            <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0" />
                          )}
                          {item.status === 'fail' && (
                            <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{item.id}</div>
                          </div>
                          <span className="font-semibold">{item.score}/{item.maxScore}</span>
                        </div>
                        
                        {/* GAP detail - ALWAYS VISIBLE for failing controls */}
                        {item.gaps && item.gaps.length > 0 && (
                          <div className="mt-3 ms-9 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                            <div className="text-xs font-semibold text-destructive uppercase mb-1">Gap</div>
                            {item.gaps.map((gap, idx) => (
                              <p key={idx} className="text-sm text-destructive/80">{gap}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Justification Form - VISIBLE by default when conditional */}
      {justificationRequired && !justificationRecorded && verdict === 'conditional' && (
        <div className="bg-card border-2 border-[hsl(var(--warning))]/50 rounded-xl overflow-hidden">
          <div className="p-4 bg-[hsl(var(--warning))]/10 border-b border-[hsl(var(--warning))]/20 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-[hsl(var(--warning))]" />
            <div>
              <h3 className="font-semibold text-foreground">Justification Required</h3>
              <p className="text-sm text-muted-foreground">Record why you're proceeding despite {displayCategories.flatMap(c => c.items.filter(i => i.gaps && i.gaps.length > 0)).length} compliance gap(s)</p>
            </div>
          </div>
          
          {/* Form fields - VISIBLE by default */}
          <div className="p-6 space-y-4">
            <div>
              <Label htmlFor="justification">Justification *</Label>
              <Textarea
                id="justification"
                className="mt-2 min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Explain why you're proceeding despite compliance gaps..."
                value={justificationData.justification}
                onChange={(e) => setJustificationData(prev => ({ ...prev, justification: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="decisionOwner">Decision Owner *</Label>
                <Input
                  id="decisionOwner"
                  className="mt-2 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Full name"
                  value={justificationData.decisionOwner}
                  onChange={(e) => setJustificationData(prev => ({ ...prev, decisionOwner: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="decisionDate">Decision Date *</Label>
                <Input
                  id="decisionDate"
                  type="date"
                  className="mt-2 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={justificationData.decisionDate}
                  onChange={(e) => setJustificationData(prev => ({ ...prev, decisionDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="riskType">Risk Type *</Label>
                <Select 
                  value={justificationData.riskType}
                  onValueChange={(value) => setJustificationData(prev => ({ ...prev, riskType: value }))}
                >
                  <SelectTrigger className="mt-2 focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="temp">Temporary Accept</SelectItem>
                    <SelectItem value="mitigate">Mitigation Plan</SelectItem>
                    <SelectItem value="exception">Approved Exception</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reviewDate">Review Date *</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  className="mt-2 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={justificationData.reviewDate}
                  onChange={(e) => setJustificationData(prev => ({ ...prev, reviewDate: e.target.value }))}
                />
              </div>
            </div>
            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={handleSubmitJustification}
              disabled={!justificationData.justification || !justificationData.decisionOwner || !justificationData.riskType || !justificationData.reviewDate}
            >
              <Lock className="w-4 h-4" />
              Record Justification
            </Button>
          </div>
        </div>
      )}

      {/* Success state when justification recorded */}
      {justificationRecorded && (
        <div className="bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
          <div>
            <p className="font-medium text-sm">Justification Recorded</p>
            <p className="text-xs text-muted-foreground">You may now continue to the next step.</p>
          </div>
        </div>
      )}
    </div>
  );
}

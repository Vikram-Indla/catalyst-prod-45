import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, CheckCircle, AlertTriangle, XCircle, ChevronDown, 
  Lock, Unlock, Loader2, User, Calendar, FileText, Target,
  BarChart3, AlertOctagon, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';
import { useComplianceReport, useJustification, type ComplianceRow, type Verdict } from '@/hooks/useComplianceGate';
import { Skeleton } from '@/components/ui/skeleton';

interface ControlItem {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'warning' | 'fail';
  gaps?: Array<{ severity: 'high' | 'medium' | 'low'; title: string; description: string }>;
}

interface ComplianceCategory {
  id: string;
  name: string;
  code: string;
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
  decision: string;
  justification: string;
  decisionOwner: string;
  reviewDate: string;
}

// Animated Radial Progress Chart
function RadialProgress({ 
  score, 
  size = 120, 
  strokeWidth = 10, 
  status 
}: { 
  score: number; 
  size?: number; 
  strokeWidth?: number; 
  status: 'compliant' | 'conditional' | 'non_compliant';
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const getColors = () => {
    if (status === 'compliant') return { stroke: 'hsl(var(--success))', bg: 'hsl(var(--success) / 0.15)', text: 'text-[hsl(var(--success))]' };
    if (status === 'conditional') return { stroke: 'hsl(var(--warning))', bg: 'hsl(var(--warning) / 0.15)', text: 'text-[hsl(var(--warning))]' };
    return { stroke: 'hsl(var(--danger))', bg: 'hsl(var(--danger) / 0.15)', text: 'text-[hsl(var(--danger))]' };
  };
  
  const colors = getColors();
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.bg}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", colors.text)}>
          {score}%
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Score</span>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: 'compliant' | 'conditional' | 'non_compliant' }) {
  const config = {
    compliant: { 
      bgClass: 'bg-[hsl(var(--success))]/15', 
      textClass: 'text-[hsl(var(--success))]', 
      icon: CheckCircle,
      label: 'Compliant',
      borderClass: 'border-[hsl(var(--success))]/30'
    },
    conditional: { 
      bgClass: 'bg-[hsl(var(--warning))]/15', 
      textClass: 'text-[hsl(var(--warning))]', 
      icon: AlertTriangle,
      label: 'Conditional',
      borderClass: 'border-[hsl(var(--warning))]/30'
    },
    non_compliant: { 
      bgClass: 'bg-[hsl(var(--danger))]/15', 
      textClass: 'text-[hsl(var(--danger))]', 
      icon: XCircle,
      label: 'Non-Compliant',
      borderClass: 'border-[hsl(var(--danger))]/30'
    },
  };
  
  const { bgClass, textClass, icon: Icon, label, borderClass } = config[status] || config.conditional;
  
  return (
    <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl border", bgClass, textClass, borderClass)}>
      <Icon className="w-5 h-5" />
      <span className="font-semibold">{label}</span>
    </div>
  );
}

// Standard Card with Pass/Fail
function StandardCard({ 
  standard, 
  isExpanded, 
  onToggle 
}: { 
  standard: ComplianceCategory; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const percentage = Math.round((standard.totalScore / standard.maxScore) * 100);
  const isPassing = percentage >= 80;
  
  return (
    <div className={cn(
      "rounded-2xl border-2 overflow-hidden transition-all duration-300",
      isPassing 
        ? "border-[hsl(var(--success))]/30 bg-gradient-to-br from-[hsl(var(--success))]/5 to-[hsl(var(--success))]/10" 
        : "border-[hsl(var(--warning))]/30 bg-gradient-to-br from-[hsl(var(--warning))]/5 to-[hsl(var(--warning))]/10"
    )}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-background/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
            isPassing 
              ? "bg-[hsl(var(--success))] text-white shadow-[hsl(var(--success))]/30" 
              : "bg-[hsl(var(--warning))] text-white shadow-[hsl(var(--warning))]/30"
          )}>
            {isPassing ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          
          <div className="text-left">
            <h3 className="font-semibold text-foreground text-lg">{standard.name}</h3>
            <p className="text-sm text-muted-foreground">{standard.code}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className={cn(
              "text-2xl font-bold",
              isPassing ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"
            )}>
              {percentage}%
            </div>
            <div className="text-xs text-muted-foreground">
              Threshold: 80%
            </div>
          </div>
          
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isExpanded && "rotate-180"
          )} />
        </div>
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-border/50">
          {/* Criteria Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {standard.items.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "p-3 rounded-xl border flex items-center gap-3 bg-card",
                  item.status === 'pass' ? "border-[hsl(var(--success))]/30" : "border-[hsl(var(--danger))]/30"
                )}
              >
                {item.status === 'pass' ? (
                  <CheckCircle className="w-5 h-5 text-[hsl(var(--success))] shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-[hsl(var(--danger))] shrink-0" />
                )}
                <span className="text-sm text-foreground">{item.name}</span>
              </div>
            ))}
          </div>
          
          {/* Gap Details */}
          {standard.items.some(i => i.gaps && i.gaps.length > 0) && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-[hsl(var(--warning))]" />
                Gaps Identified ({standard.items.flatMap(i => i.gaps || []).length})
              </h4>
              <div className="space-y-2">
                {standard.items.flatMap(item => item.gaps || []).map((gap, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded-xl bg-card border border-[hsl(var(--warning))]/30 flex items-start gap-3"
                  >
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-xs font-bold uppercase shrink-0",
                      gap.severity === 'high' && "bg-[hsl(var(--danger))]/15 text-[hsl(var(--danger))]",
                      gap.severity === 'medium' && "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
                      gap.severity === 'low' && "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                    )}>
                      {gap.severity}
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">{gap.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{gap.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Justification Form
function JustificationForm({ 
  gapCount,
  onSubmit 
}: { 
  gapCount: number;
  onSubmit: (data: JustificationData) => void;
}) {
  const [formData, setFormData] = useState<JustificationData>({
    decision: '',
    justification: '',
    decisionOwner: '',
    reviewDate: ''
  });
  
  const decisions = [
    { id: 'proceed_with_gaps', label: 'Proceed with Gaps', desc: 'Accept gaps and continue', icon: Unlock },
    { id: 'request_waiver', label: 'Request Waiver', desc: 'Submit for approval', icon: FileText },
    { id: 'remediate', label: 'Remediate First', desc: 'Fix gaps before proceeding', icon: Target },
  ];
  
  const isValid = formData.decision && formData.justification.length >= 50 && formData.decisionOwner;
  
  return (
    <div className="p-6 rounded-2xl bg-card border-2 border-[hsl(var(--warning))]/30 shadow-lg shadow-[hsl(var(--warning))]/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--warning))]/15 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-[hsl(var(--warning))]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Justification Required</h3>
          <p className="text-sm text-muted-foreground">Document your decision to proceed with {gapCount} gap(s)</p>
        </div>
      </div>
      
      {/* Decision Options */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {decisions.map((decision) => {
          const Icon = decision.icon;
          const isSelected = formData.decision === decision.id;
          
          return (
            <button
              key={decision.id}
              type="button"
              onClick={() => setFormData({ ...formData, decision: decision.id })}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all duration-200",
                isSelected 
                  ? "border-primary bg-primary/5 shadow-md" 
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-2", isSelected ? "text-primary" : "text-muted-foreground")} />
              <div className={cn("font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                {decision.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{decision.desc}</div>
            </button>
          );
        })}
      </div>
      
      {/* Justification Text */}
      <div className="mb-4">
        <Label className="block text-sm font-medium text-foreground mb-2">
          Justification <span className="text-[hsl(var(--danger))]">*</span>
        </Label>
        <Textarea
          value={formData.justification}
          onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
          placeholder="Explain the rationale for proceeding with identified gaps..."
          rows={4}
          className="w-full resize-none"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">Minimum 50 characters</span>
          <span className={cn(
            "text-xs",
            formData.justification.length >= 50 ? "text-[hsl(var(--success))]" : "text-muted-foreground"
          )}>
            {formData.justification.length}/500
          </span>
        </div>
      </div>
      
      {/* Owner and Review Date */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label className="block text-sm font-medium text-foreground mb-2">
            Decision Owner <span className="text-[hsl(var(--danger))]">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={formData.decisionOwner}
              onChange={(e) => setFormData({ ...formData, decisionOwner: e.target.value })}
              placeholder="Full name"
              className="pl-11"
            />
          </div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-foreground mb-2">
            Review Date
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="date"
              value={formData.reviewDate}
              onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
              className="pl-11"
            />
          </div>
        </div>
      </div>
      
      {/* Submit Button */}
      <Button
        onClick={() => onSubmit(formData)}
        disabled={!isValid}
        className="w-full gap-2"
        size="lg"
      >
        <Lock className="w-5 h-5" />
        Record Decision & Unlock Gate
      </Button>
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
  
  // State
  const [expandedStandard, setExpandedStandard] = useState<string | null>(null);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  
  // Derive values from real data or props
  const hasRealData = !!complianceData?.report;
  
  // Transform real compliance data to UI format
  const displayData = useMemo(() => {
    if (!hasRealData || !complianceData?.report) {
      if (propCategories.length > 0) {
        return {
          verdict: propVerdict || 'conditional' as const,
          totalScore: propTotalScore || 0,
          categories: propCategories,
          justificationRecorded: propJustificationRecorded
        };
      }
      return null;
    }
    
    const { matrix, scores } = complianceData.report;
    
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
        
        const gaps: ControlItem['gaps'] = row.coverage !== 'covered' ? [{
          severity: row.coverage === 'not_specified' ? 'high' : 'medium',
          title: `${row.control_name} Gap`,
          description: `Missing evidence for ${row.control_name}`
        }] : undefined;
        
        return {
          id: row.control_id,
          name: row.control_name,
          score,
          maxScore: max,
          status: row.coverage === 'covered' ? 'pass' as const : 
                  row.coverage === 'partial' ? 'warning' as const : 'fail' as const,
          gaps
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
        name: 'DGA Data Standards',
        code: 'DGA-DS-2024',
        items: dgaItems,
        ...dgaStats
      });
    }
    
    if (ncaItems.length > 0) {
      categories.push({
        id: 'nca',
        name: 'NCA Controls',
        code: 'NCA-2024',
        items: ncaItems,
        ...ncaStats
      });
    }
    
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
  const justificationRecorded = displayData?.justificationRecorded || gateUnlocked;
  
  const passingCount = displayCategories.filter(c => Math.round((c.totalScore / c.maxScore) * 100) >= 80).length;
  const totalGaps = displayCategories.flatMap(c => c.items.flatMap(i => i.gaps || [])).length;
  
  // Map verdict to status type
  const statusMap: Record<string, 'compliant' | 'conditional' | 'non_compliant'> = {
    pass: 'compliant',
    conditional: 'conditional',
    fail: 'non_compliant'
  };
  const complianceStatus = statusMap[verdict] || 'conditional';

  // Sync gate state with justification
  useEffect(() => {
    if (verdict === 'pass' || justificationRecorded) {
      setGateUnlocked(true);
      onContinueAllowed?.(true);
    } else {
      setGateUnlocked(false);
      onContinueAllowed?.(false);
    }
  }, [verdict, justificationRecorded, onContinueAllowed]);

  const handleJustificationSubmit = (data: JustificationData) => {
    onJustificationSubmit?.(data);
    setGateUnlocked(true);
    onContinueAllowed?.(true);
    catalystToast.success('Justification Recorded', 'Risk acceptance has been documented for audit');
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
        </div>
      </div>
    );
  }
  
  // Empty state
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
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        {/* Overall Score */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-6">
          <RadialProgress 
            score={totalScore} 
            status={complianceStatus}
          />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Overall Status</h3>
            <StatusBadge status={complianceStatus} />
          </div>
        </div>
        
        {/* Standards Summary */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Standards Checked</h3>
          <div className="flex items-end gap-4">
            <div>
              <div className="text-4xl font-bold text-foreground">
                {passingCount}/{displayCategories.length}
              </div>
              <div className="text-sm text-muted-foreground">Passing</div>
            </div>
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(var(--success))]/80 rounded-full transition-all duration-500"
                style={{ width: `${(passingCount / displayCategories.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Gate Status */}
        <div className={cn(
          "p-6 rounded-2xl border-2 flex items-center gap-4 transition-all duration-500",
          gateUnlocked 
            ? "bg-gradient-to-br from-[hsl(var(--success))]/5 to-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30" 
            : "bg-gradient-to-br from-[hsl(var(--warning))]/5 to-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/30"
        )}>
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
            gateUnlocked 
              ? "bg-[hsl(var(--success))] shadow-[hsl(var(--success))]/30" 
              : "bg-[hsl(var(--warning))] shadow-[hsl(var(--warning))]/30"
          )}>
            {gateUnlocked ? (
              <Unlock className="w-7 h-7 text-white" />
            ) : (
              <Lock className="w-7 h-7 text-white" />
            )}
          </div>
          <div>
            <h3 className={cn(
              "font-semibold text-lg",
              gateUnlocked ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"
            )}>
              {gateUnlocked ? 'Gate Unlocked' : 'Gate Locked'}
            </h3>
            <p className={cn(
              "text-sm",
              gateUnlocked ? "text-[hsl(var(--success))]/80" : "text-[hsl(var(--warning))]/80"
            )}>
              {gateUnlocked ? 'Ready to proceed' : 'Justification required'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Standards Detail */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Compliance Standards
        </h2>
        <div className="space-y-4">
          {displayCategories.map((standard) => (
            <StandardCard
              key={standard.id}
              standard={standard}
              isExpanded={expandedStandard === standard.id}
              onToggle={() => setExpandedStandard(
                expandedStandard === standard.id ? null : standard.id
              )}
            />
          ))}
        </div>
      </div>
      
      {/* Justification Form (only show if not unlocked and has gaps) */}
      {!gateUnlocked && verdict !== 'pass' && justificationRequired && (
        <JustificationForm 
          gapCount={totalGaps}
          onSubmit={handleJustificationSubmit} 
        />
      )}
      
      {/* Success State */}
      {gateUnlocked && verdict !== 'pass' && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[hsl(var(--success))]/5 to-[hsl(var(--success))]/10 border-2 border-[hsl(var(--success))]/30 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[hsl(var(--success))] flex items-center justify-center mb-4 shadow-lg shadow-[hsl(var(--success))]/30">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-[hsl(var(--success))] mb-2">Compliance Gate Cleared</h3>
          <p className="text-[hsl(var(--success))]/80">Your justification has been recorded. You may now proceed.</p>
        </div>
      )}
    </div>
  );
}

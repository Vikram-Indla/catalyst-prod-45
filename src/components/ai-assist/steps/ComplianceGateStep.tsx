import React, { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, XCircle, ChevronDown, FileText, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface ComplianceGateStepProps {
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

export function ComplianceGateStep({
  verdict = 'conditional',
  totalScore = 72,
  categories = [],
  justificationRequired = true,
  justificationRecorded = false,
  onJustificationSubmit,
  onContinueAllowed
}: ComplianceGateStepProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showJustificationForm, setShowJustificationForm] = useState(false);
  const [justificationData, setJustificationData] = useState<JustificationData>({
    justification: '',
    decisionOwner: '',
    decisionDate: new Date().toISOString().split('T')[0],
    riskType: '',
    reviewDate: ''
  });

  const getVerdictConfig = () => {
    switch (verdict) {
      case 'pass':
        return {
          icon: CheckCircle2,
          title: 'Full Compliance',
          description: 'Your draft meets all DGA and NCA requirements.',
          bgClass: 'bg-success/10 border-success/30',
          iconClass: 'text-success'
        };
      case 'conditional':
        return {
          icon: AlertTriangle,
          title: 'Conditional Pass — Justification Required',
          description: 'Your draft meets most requirements but has gaps in compliance controls. Record justification to proceed.',
          bgClass: 'bg-warning/10 border-warning/30',
          iconClass: 'text-warning'
        };
      case 'fail':
        return {
          icon: XCircle,
          title: 'Does Not Meet Requirements',
          description: 'Critical compliance gaps identified. Review and address before proceeding.',
          bgClass: 'bg-destructive/10 border-destructive/30',
          iconClass: 'text-destructive'
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
    setShowJustificationForm(false);
  };

  // Mock categories if none provided
  const displayCategories = categories.length > 0 ? categories : [
    {
      id: 'dga',
      name: 'DGA Controls',
      items: [
        { id: 'DGA-DS-001', name: 'Digital Service Standards', score: 12, maxScore: 12, status: 'pass' as const },
        { id: 'DGA-DS-002', name: 'Accessibility Requirements', score: 10, maxScore: 12, status: 'pass' as const },
        { id: 'DGA-INT-001', name: 'Government Integration', score: 14, maxScore: 14, status: 'pass' as const }
      ],
      totalScore: 36,
      maxScore: 38,
      passing: 3,
      total: 3
    },
    {
      id: 'nca',
      name: 'NCA Controls',
      items: [
        { id: 'NCA-ECC-001', name: 'Essential Cybersecurity', score: 18, maxScore: 25, status: 'warning' as const, gaps: ['Missing: Security logging evidence'] },
        { id: 'NCA-CCC-001', name: 'Cloud Computing Controls', score: 6, maxScore: 15, status: 'fail' as const, gaps: ['Missing: Data residency documentation', 'Missing: Cloud provider certification'] }
      ],
      totalScore: 24,
      maxScore: 40,
      passing: 0,
      total: 2
    }
  ];

  return (
    <div className="space-y-6">
      {/* Verdict Banner */}
      <div className={cn(
        "border rounded-xl p-6 flex items-start gap-4",
        verdictConfig.bgClass
      )}>
        <VerdictIcon className={cn("h-6 w-6 flex-shrink-0 mt-0.5", verdictConfig.iconClass)} />
        <div>
          <h3 className="font-semibold text-lg">{verdictConfig.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{verdictConfig.description}</p>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-foreground mb-1">{totalScore}</div>
          <div className="text-sm text-muted-foreground">/100</div>
          <p className="text-xs text-muted-foreground mt-2">Total Score</p>
          <Badge variant="outline" className={cn(
            "mt-2",
            verdict === 'pass' && "bg-success/10 text-success",
            verdict === 'conditional' && "bg-warning/10 text-warning",
            verdict === 'fail' && "bg-destructive/10 text-destructive"
          )}>
            {verdict === 'pass' ? 'Compliant' : verdict === 'conditional' ? 'Conditional' : 'Non-Compliant'}
          </Badge>
        </div>

        {displayCategories.slice(0, 2).map((cat) => {
          const percentage = Math.round((cat.totalScore / cat.maxScore) * 100);
          const isPassing = percentage >= 80;
          return (
            <div key={cat.id} className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-foreground mb-1">
                {cat.totalScore}/{cat.maxScore}
              </div>
              <div className="text-sm text-muted-foreground">{percentage}%</div>
              <p className="text-xs text-muted-foreground mt-2">{cat.name}</p>
              <Badge variant="outline" className={cn(
                "mt-2",
                isPassing ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}>
                {isPassing ? (
                  <><CheckCircle2 className="h-3 w-3 me-1" /> Compliant</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 me-1" /> Gaps Identified</>
                )}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Control Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Control Breakdown</h4>
        
        {displayCategories.map((category) => (
          <Collapsible
            key={category.id}
            open={expandedCategory === category.id}
            onOpenChange={(open) => setExpandedCategory(open ? category.id : null)}
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {category.passing}/{category.total} Passing
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {category.totalScore}/{category.maxScore}
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      expandedCategory === category.id && "rotate-180"
                    )} />
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 border-t border-border">
                  <div className="pt-4 space-y-3">
                    {category.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        {item.status === 'pass' && (
                          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        )}
                        {item.status === 'warning' && (
                          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                        )}
                        {item.status === 'fail' && (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                              <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            <span className="text-sm font-medium">{item.score}/{item.maxScore}</span>
                          </div>
                          {item.gaps && item.gaps.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.gaps.map((gap, idx) => (
                                <p key={idx} className="text-xs text-muted-foreground ps-4 border-s-2 border-destructive/30">
                                  {gap}
                                </p>
                              ))}
                              {item.status === 'fail' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="mt-2 gap-1 text-xs"
                                  onClick={() => setShowJustificationForm(true)}
                                >
                                  <FileText className="h-3 w-3" />
                                  Add Justification
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {/* Justification Form */}
      {justificationRequired && !justificationRecorded && (
        <Collapsible open={showJustificationForm} onOpenChange={setShowJustificationForm}>
          <div className="bg-card border border-warning/30 rounded-xl overflow-hidden">
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-warning" />
                  <span className="font-medium">Justification Form</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showJustificationForm && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-4 pb-4 border-t border-border">
                <div className="pt-4 space-y-4">
                  <div className="p-3 bg-warning/5 rounded-lg border border-warning/20">
                    <p className="text-sm text-muted-foreground">
                      <strong>Why is justification required?</strong> You scored below 80% on NCA controls. 
                      To proceed, document the reason and mitigation plan for audit.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="justification">Justification *</Label>
                    <Textarea
                      id="justification"
                      placeholder="Explain the compliance gap and mitigation plan..."
                      value={justificationData.justification}
                      onChange={(e) => setJustificationData(prev => ({ ...prev, justification: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="decisionOwner">Decision Owner *</Label>
                      <Input
                        id="decisionOwner"
                        placeholder="e.g. Dr. Mohammed Al-Faisal"
                        value={justificationData.decisionOwner}
                        onChange={(e) => setJustificationData(prev => ({ ...prev, decisionOwner: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="decisionDate">Decision Date *</Label>
                      <Input
                        id="decisionDate"
                        type="date"
                        value={justificationData.decisionDate}
                        onChange={(e) => setJustificationData(prev => ({ ...prev, decisionDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="riskType">Risk Type *</Label>
                      <Select 
                        value={justificationData.riskType}
                        onValueChange={(value) => setJustificationData(prev => ({ ...prev, riskType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mitigation">Mitigation Plan</SelectItem>
                          <SelectItem value="accepted">Accepted Risk</SelectItem>
                          <SelectItem value="deferred">Deferred Action</SelectItem>
                          <SelectItem value="transferred">Risk Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reviewDate">Review Date *</Label>
                      <Input
                        id="reviewDate"
                        type="date"
                        value={justificationData.reviewDate}
                        onChange={(e) => setJustificationData(prev => ({ ...prev, reviewDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full gap-2" 
                    onClick={handleSubmitJustification}
                    disabled={!justificationData.justification || !justificationData.decisionOwner || !justificationData.riskType || !justificationData.reviewDate}
                  >
                    <Shield className="h-4 w-4" />
                    Record Justification for Audit
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Success state when justification recorded */}
      {justificationRecorded && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-sm">Justification Recorded</p>
            <p className="text-xs text-muted-foreground">You may now continue to the next step.</p>
          </div>
        </div>
      )}
    </div>
  );
}

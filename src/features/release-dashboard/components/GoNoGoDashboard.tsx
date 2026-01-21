/**
 * Go/No-Go Dashboard Component
 * Module 5B-2: Release decision management UI
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  TrendingUp,
  Bug,
  Users,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoNoGoAssessment, useRecordDecision } from '../hooks/useGoNoGo';
import {
  GoNoGoDecision,
  DECISION_CONFIG,
  RISK_SEVERITY_CONFIG,
  GateStatus,
  RiskFactor,
} from '../types/go-no-go';

interface GoNoGoDashboardProps {
  releaseId: string;
  userId?: string;
}

// Decision icon component
function DecisionIcon({ decision, className }: { decision: GoNoGoDecision; className?: string }) {
  const icons = {
    go: CheckCircle2,
    no_go: XCircle,
    conditional: AlertTriangle,
    pending: Clock,
  };
  const Icon = icons[decision];
  return <Icon className={className} />;
}

// Gate status row
function GateRow({ gate }: { gate: GateStatus }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        {gate.passed ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <span className="text-sm font-medium">{gate.name}</span>
        {gate.isBlocking && (
          <Badge variant="outline" className="text-xs">Blocking</Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {gate.actualValue.toFixed(1)} {gate.threshold}
      </div>
    </div>
  );
}

// Risk factor card
function RiskCard({ risk }: { risk: RiskFactor }) {
  const config = RISK_SEVERITY_CONFIG[risk.severity];
  
  return (
    <div className={cn('p-3 rounded-lg border', config.bgColor)}>
      <div className="flex items-center justify-between mb-1">
        <span className={cn('text-sm font-medium', config.color)}>
          {risk.description}
        </span>
        <Badge variant="outline" className={config.color}>
          {config.label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{risk.impact}</p>
      {risk.mitigation && (
        <p className="text-xs text-primary mt-1">→ {risk.mitigation}</p>
      )}
    </div>
  );
}

export function GoNoGoDashboard({ releaseId, userId }: GoNoGoDashboardProps) {
  const { data: assessment, isLoading, refetch } = useGoNoGoAssessment(releaseId);
  const recordDecision = useRecordDecision();
  
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<GoNoGoDecision | null>(null);
  const [rationale, setRationale] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!assessment) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Unable to load assessment data</p>
        </CardContent>
      </Card>
    );
  }
  
  const { summary, gates, testMetrics, defectMetrics } = assessment;
  const config = DECISION_CONFIG[summary.decision];
  const isOverride = selectedDecision && selectedDecision !== summary.decision;
  
  const handleRecordDecision = (decision: GoNoGoDecision) => {
    setSelectedDecision(decision);
    setRationale(summary.recommendation);
    setOverrideReason('');
    setShowDecisionDialog(true);
  };
  
  const handleConfirmDecision = () => {
    if (!selectedDecision || !userId) return;
    
    recordDecision.mutate({
      releaseId,
      decision: selectedDecision,
      rationale,
      overrideReason: isOverride ? overrideReason : undefined,
      userId,
    }, {
      onSuccess: () => {
        setShowDecisionDialog(false);
        setSelectedDecision(null);
        setRationale('');
        setOverrideReason('');
      },
    });
  };
  
  const blockingGates = gates.filter(g => g.isBlocking);
  const nonBlockingGates = gates.filter(g => !g.isBlocking);
  
  return (
    <div className="space-y-4">
      {/* Main Decision Card */}
      <Card className={cn('border-2', config.borderColor)}>
        <CardHeader className={cn('pb-3', config.bgColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DecisionIcon 
                decision={summary.decision} 
                className={cn('h-8 w-8', config.color)} 
              />
              <div>
                <CardTitle className="text-xl">{assessment.releaseName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Go/No-Go Assessment
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge 
                className={cn(
                  'text-lg px-4 py-1', 
                  config.bgColor, 
                  config.color,
                  'border',
                  config.borderColor
                )}
              >
                {config.label}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Confidence: {summary.confidence}%
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm mb-4">{summary.recommendation}</p>
          
          {/* Decision Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => handleRecordDecision('go')}
              className="bg-green-600 hover:bg-green-700"
              disabled={!userId}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve (GO)
            </Button>
            <Button 
              onClick={() => handleRecordDecision('conditional')}
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-50"
              disabled={!userId}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Conditional
            </Button>
            <Button 
              onClick={() => handleRecordDecision('no_go')}
              variant="outline"
              className="border-red-500 text-red-700 hover:bg-red-50"
              disabled={!userId}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject (NO-GO)
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetch()}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Metrics Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Pass Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {testMetrics.passRate.toFixed(1)}%
            </div>
            <Progress value={testMetrics.passRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Execution</span>
            </div>
            <div className="text-2xl font-bold">
              {testMetrics.executionRate.toFixed(1)}%
            </div>
            <Progress value={testMetrics.executionRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Bug className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Open Blockers</span>
            </div>
            <div className={cn(
              'text-2xl font-bold',
              defectMetrics.openBlockers > 0 ? 'text-destructive' : 'text-green-600'
            )}>
              {defectMetrics.openBlockers}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Gates Passed</span>
            </div>
            <div className="text-2xl font-bold">
              {summary.blockingGatesPassed}/{summary.blockingGatesTotal}
            </div>
            <p className="text-xs text-muted-foreground">blocking gates</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Quality Gates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Quality Gates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blockingGates.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                  Blocking ({blockingGates.filter(g => g.passed).length}/{blockingGates.length})
                </p>
                {blockingGates.map(gate => (
                  <GateRow key={gate.id} gate={gate} />
                ))}
              </div>
            )}
            
            {nonBlockingGates.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                  Non-Blocking ({nonBlockingGates.filter(g => g.passed).length}/{nonBlockingGates.length})
                </p>
                {nonBlockingGates.map(gate => (
                  <GateRow key={gate.id} gate={gate} />
                ))}
              </div>
            )}
            
            {gates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No quality gates configured
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Risk Factors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Risk Factors ({summary.riskFactors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.riskFactors.length > 0 ? (
              summary.riskFactors.map(risk => (
                <RiskCard key={risk.id} risk={risk} />
              ))
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No significant risks identified
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Decision Dialog */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDecision && (
                <>
                  <DecisionIcon 
                    decision={selectedDecision} 
                    className={cn('h-5 w-5', DECISION_CONFIG[selectedDecision].color)} 
                  />
                  Record {DECISION_CONFIG[selectedDecision].label} Decision
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isOverride ? (
                <span className="text-amber-600">
                  This overrides the recommended decision. Please provide justification.
                </span>
              ) : (
                'Confirm and record your Go/No-Go decision for this release.'
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rationale</label>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Explain the reasoning for this decision..."
                rows={3}
              />
            </div>
            
            {isOverride && (
              <div>
                <label className="text-sm font-medium text-amber-600">
                  Override Justification (Required)
                </label>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why you are overriding the recommendation..."
                  rows={2}
                  className="border-amber-300 focus:border-amber-500"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDecisionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDecision}
              disabled={
                !rationale.trim() || 
                (isOverride && !overrideReason.trim()) ||
                recordDecision.isPending
              }
              className={selectedDecision ? DECISION_CONFIG[selectedDecision].bgColor : ''}
            >
              {recordDecision.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  useComplianceReport,
  useJustification,
  useRecordJustification,
  computeLocalScores,
  type ComplianceRow,
  type ComplianceScores,
  type Verdict,
  type JustificationData,
  type ComplianceMatrix,
} from '@/hooks/useComplianceGate';

interface ComplianceGateProps {
  draftId: string;
  runId: string | undefined;
  onContinueAllowed?: (allowed: boolean) => void;
}

// Verdict badge component
function VerdictChip({ verdict }: { verdict: Verdict }) {
  const config = {
    COMPLIANT: {
      bg: 'bg-[hsl(var(--success))]/10',
      border: 'border-[hsl(var(--success))]/30',
      text: 'text-[hsl(var(--success))]',
      icon: CheckCircle,
      label: 'Compliant',
    },
    CONDITIONAL: {
      bg: 'bg-[hsl(var(--warning))]/10',
      border: 'border-[hsl(var(--warning))]/30',
      text: 'text-[hsl(var(--warning))]',
      icon: AlertTriangle,
      label: 'Conditional',
    },
    NON_COMPLIANT: {
      bg: 'bg-[hsl(var(--danger))]/10',
      border: 'border-[hsl(var(--danger))]/30',
      text: 'text-[hsl(var(--danger))]',
      icon: XCircle,
      label: 'Non-Compliant',
    },
  };

  const { bg, border, text, icon: Icon, label } = config[verdict];

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border', bg, border)}>
      <Icon className={cn('h-4 w-4', text)} />
      <span className={cn('text-sm font-medium', text)}>{label}</span>
    </div>
  );
}

// Score bar component
function ScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'bg-[hsl(var(--success))]';
    if (s >= 60) return 'bg-[hsl(var(--warning))]';
    return 'bg-[hsl(var(--danger))]';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label} (weight: {weight}%)</span>
        <span className="font-medium">{score.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-[var(--bg-2)] rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// Compliance matrix table
function ComplianceMatrix({ rows }: { rows: ComplianceRow[] }) {
  const getCoverageStyle = (coverage: string) => {
    switch (coverage) {
      case 'covered':
        return 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]';
      case 'partial':
        return 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]';
      default:
        return 'bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]';
    }
  };

  const getCoverageLabel = (coverage: string) => {
    switch (coverage) {
      case 'covered':
        return 'Covered';
      case 'partial':
        return 'Partial';
      default:
        return 'Not Specified';
    }
  };

  return (
    <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-2)] border-b border-[var(--border-subtle)]">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Framework</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Control ID</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Control Name</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Coverage</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--row-hover)]">
                <td className="px-3 py-2">
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    row.framework === 'DGA' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'
                  )}>
                    {row.framework}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.control_id}</td>
                <td className="px-3 py-2">{row.control_name}</td>
                <td className="px-3 py-2">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getCoverageStyle(row.coverage))}>
                    {getCoverageLabel(row.coverage)}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.evidence_refs.length > 0 ? row.evidence_refs.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Justification form
function JustificationForm({
  onSubmit,
  isSubmitting,
  existingJustification,
}: {
  onSubmit: (data: JustificationData) => void;
  isSubmitting: boolean;
  existingJustification: JustificationData | null;
}) {
  const [formData, setFormData] = useState<JustificationData>(
    existingJustification || {
      justification_text: '',
      decision_owner: '',
      decision_date: new Date().toISOString().split('T')[0],
      risk_acceptance_type: '',
      review_date: '',
    }
  );

  const isValid = formData.justification_text && formData.decision_owner && 
                  formData.decision_date && formData.risk_acceptance_type;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(formData);
    }
  };

  if (existingJustification) {
    return (
      <div className="bg-[hsl(var(--success))]/5 border border-[hsl(var(--success))]/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-[hsl(var(--success))]">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Justification Recorded</span>
        </div>
        <div className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Decision Owner:</span> {existingJustification.decision_owner}</p>
          <p><span className="text-muted-foreground">Decision Date:</span> {existingJustification.decision_date}</p>
          <p><span className="text-muted-foreground">Risk Acceptance:</span> {existingJustification.risk_acceptance_type}</p>
          {existingJustification.review_date && (
            <p><span className="text-muted-foreground">Review Date:</span> {existingJustification.review_date}</p>
          )}
          <p className="mt-2 p-2 bg-[var(--bg-2)] rounded text-muted-foreground">
            {existingJustification.justification_text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[hsl(var(--danger))]/5 border border-[hsl(var(--danger))]/20 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-[hsl(var(--danger))]">
        <FileWarning className="h-5 w-5" />
        <span className="font-medium">Justification Required to Continue</span>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="justification_text">Justification *</Label>
          <Textarea
            id="justification_text"
            placeholder="Provide detailed justification for proceeding despite non-compliance..."
            value={formData.justification_text}
            onChange={(e) => setFormData({ ...formData, justification_text: e.target.value })}
            className="min-h-[100px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="decision_owner">Decision Owner *</Label>
            <Input
              id="decision_owner"
              placeholder="Name of decision owner"
              value={formData.decision_owner}
              onChange={(e) => setFormData({ ...formData, decision_owner: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision_date">Decision Date *</Label>
            <Input
              id="decision_date"
              type="date"
              value={formData.decision_date}
              onChange={(e) => setFormData({ ...formData, decision_date: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="risk_acceptance_type">Risk Acceptance Type *</Label>
            <Select
              value={formData.risk_acceptance_type}
              onValueChange={(value) => setFormData({ ...formData, risk_acceptance_type: value })}
            >
              <SelectTrigger id="risk_acceptance_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">Temporary Exception</SelectItem>
                <SelectItem value="permanent">Permanent Exception</SelectItem>
                <SelectItem value="mitigated">Risk Mitigated</SelectItem>
                <SelectItem value="accepted">Risk Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review_date">Review Date (Optional)</Label>
            <Input
              id="review_date"
              type="date"
              value={formData.review_date || ''}
              onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={!isValid || isSubmitting} className="w-full">
        {isSubmitting ? 'Recording...' : 'Record Justification'}
      </Button>
    </form>
  );
}

// Main component
export function ComplianceGate({ draftId, runId, onContinueAllowed }: ComplianceGateProps) {
  const { data: reportData, isLoading: reportLoading } = useComplianceReport(draftId);
  const { data: justification, isLoading: justificationLoading } = useJustification(draftId);
  const recordJustification = useRecordJustification();

  const report = reportData?.report;
  const scores = report?.scores;
  const matrix = report?.matrix;

  // Determine if continue is allowed
  const canContinue = useMemo(() => {
    if (!scores) return false;
    if (scores.verdict !== 'NON_COMPLIANT') return true;
    return !!justification;
  }, [scores, justification]);

  // Notify parent of continue status
  React.useEffect(() => {
    onContinueAllowed?.(canContinue);
  }, [canContinue, onContinueAllowed]);

  const handleJustificationSubmit = async (data: JustificationData) => {
    if (!runId) return;
    await recordJustification.mutateAsync({
      draftId,
      runId,
      justification: data,
    });
  };

  if (reportLoading || justificationLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-[var(--bg-2)] rounded-lg" />
        <div className="h-32 bg-[var(--bg-2)] rounded-lg" />
        <div className="h-64 bg-[var(--bg-2)] rounded-lg" />
      </div>
    );
  }

  if (!report || !scores || !matrix) {
    return (
      <div className="space-y-6">
        <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20 rounded-lg p-4 flex items-center gap-3">
          <Shield className="h-6 w-6 text-[hsl(var(--warning))]" />
          <div>
            <p className="text-sm font-medium text-[hsl(var(--warning))]">Compliance Gate</p>
            <p className="text-xs text-muted-foreground">DGA/NCA automated scoring pending AI analysis</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--bg-2)] rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">DGA Score (60%)</p>
            <p className="text-3xl font-bold">—</p>
          </div>
          <div className="bg-[var(--bg-2)] rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">NCA Score (40%)</p>
            <p className="text-3xl font-bold">—</p>
          </div>
        </div>
        <div className="text-center text-muted-foreground text-sm py-8">
          Run AI analysis to generate compliance matrix and scores.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with verdict */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-[hsl(var(--info))]" />
          <div>
            <p className="text-sm font-medium">Compliance Gate</p>
            <p className="text-xs text-muted-foreground">DGA/NCA automated scoring</p>
          </div>
        </div>
        <VerdictChip verdict={scores.verdict} />
      </div>

      {/* Score bars */}
      <div className="space-y-4 bg-[var(--bg-2)] rounded-lg p-4">
        <ScoreBar label="DGA" score={scores.dga_score} weight={60} />
        <ScoreBar label="NCA" score={scores.nca_score} weight={40} />
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Weighted Score</span>
            <span className="text-lg font-bold">{scores.weighted_score.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Compliance matrix table */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Compliance Matrix</h4>
        <ComplianceMatrix rows={matrix.rows} />
      </div>

      {/* Justification form for non-compliant */}
      {scores.verdict === 'NON_COMPLIANT' && (
        <JustificationForm
          onSubmit={handleJustificationSubmit}
          isSubmitting={recordJustification.isPending}
          existingJustification={justification}
        />
      )}

      {/* Continue status indicator */}
      {scores.verdict === 'NON_COMPLIANT' && !justification && (
        <div className="text-center text-xs text-[hsl(var(--danger))]">
          You must record a justification before continuing to the next step.
        </div>
      )}
    </div>
  );
}

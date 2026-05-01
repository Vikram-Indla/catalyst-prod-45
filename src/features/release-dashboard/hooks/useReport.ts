/**
 * Release Readiness Report Hooks
 * Module 5B-4: Report generation and export
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ReadinessReport,
  ReportConfig,
  ReportMetadata,
  ReportSummary,
  ReportQualityGates,
  ReportTestMetrics,
  ReportDefectSummary,
  ReportSignoffs,
  ReportRiskFactor,
  ReportTrendPoint,
  DEFAULT_REPORT_CONFIG,
} from '../types/report';
import { v4 as uuidv4 } from 'uuid';

// Generate recommendations based on metrics
function generateRecommendations(
  summary: ReportSummary,
  gates: ReportQualityGates,
  defects: ReportDefectSummary,
  signoffs: ReportSignoffs
): string[] {
  const recommendations: string[] = [];

  if (gates.failedGates > 0) {
    recommendations.push(
      `Address ${gates.failedGates} failed quality gate(s) before proceeding with release.`
    );
  }

  if (defects.blockers > 0) {
    recommendations.push(
      `Resolve ${defects.blockers} blocker defect(s) - these must be fixed before release.`
    );
  }

  if (defects.criticals > 2) {
    recommendations.push(
      `Review and prioritize ${defects.criticals} critical defects for resolution or deferral.`
    );
  }

  if (signoffs.pending > 0) {
    recommendations.push(
      `Follow up with ${signoffs.pending} stakeholder(s) who have not yet signed off.`
    );
  }

  if (signoffs.rejected > 0) {
    recommendations.push(
      `Address concerns from ${signoffs.rejected} stakeholder(s) who rejected the release.`
    );
  }

  if (summary.healthScore < 70) {
    recommendations.push(
      'Consider extending the testing phase to improve overall quality metrics.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('All quality criteria met. Release is recommended to proceed.');
  }

  return recommendations;
}

// Hook to generate a complete readiness report
export function useGenerateReport(releaseId: string, config: ReportConfig = DEFAULT_REPORT_CONFIG) {
  return useQuery({
    queryKey: ['readiness-report', releaseId, config],
    queryFn: async (): Promise<ReadinessReport> => {
      // Fetch all required data in parallel
      const [
        releaseResult,
        gatesResult,
        testSummaryResult,
        signoffsResult,
        healthResult,
      ] = await Promise.all([
        supabase.from('releases').select('name, version').eq('id', releaseId).single(),
        supabase.rpc('tm_evaluate_release_gates', { p_release_id: releaseId, p_user_id: null }),
        supabase.rpc('tm_get_release_test_summary', { p_release_id: releaseId }),
        supabase.rpc('tm_get_release_signoff_status', { p_release_id: releaseId }),
        supabase.rpc('calculate_release_health', { p_release_id: releaseId }),
      ]);

      // Transform gates data
      const gatesData = gatesResult.data as unknown as {
        gates: Array<{
          gate_name: string;
          gate_type: string;
          threshold: string;
          actual_value: number;
          passed: boolean;
          is_blocking: boolean;
        }>;
        summary: {
          total_gates: number;
          passed_gates: number;
          blocking_passed: number;
          blocking_total: number;
        };
        test_summary: {
          totals: {
            total_cases: number;
            passed: number;
            failed: number;
            blocked: number;
            not_run: number;
            execution_pct: number;
            pass_pct: number;
          };
          defects: {
            total: number;
            open: number;
            blockers: number;
            criticals: number;
          };
          cycles: Array<{
            cycle_name: string;
            status: string;
            total_cases: number;
            passed: number;
            failed: number;
            execution_pct: number;
          }>;
        };
      };

      const signoffsData = signoffsResult.data as unknown as {
        signoffs: Array<{
          stakeholder_name: string;
          stakeholder_role: string;
          decision: string;
          decided_at: string | null;
          comments: string | null;
          is_required: boolean;
        }>;
        summary: {
          total: number;
          approved: number;
          pending: number;
          rejected: number;
          required_total: number;
          all_required_approved: boolean;
        };
      };

      const healthData = healthResult.data as unknown as {
        health_score: number;
        health_level: string;
      };

      // Build metadata
      const metadata: ReportMetadata = {
        releaseId,
        releaseName: releaseResult.data?.name || 'Unknown Release',
        releaseVersion: releaseResult.data?.version || undefined,
        generatedAt: new Date().toISOString(),
        reportId: uuidv4(),
      };

      // Determine decision
      const allBlockingPassed = gatesData?.summary?.blocking_passed === gatesData?.summary?.blocking_total;
      const noBlockers = (gatesData?.test_summary?.defects?.blockers || 0) === 0;
      let decision: ReportSummary['decision'] = 'pending';
      
      if (allBlockingPassed && noBlockers && signoffsData?.summary?.all_required_approved) {
        decision = 'go';
      } else if (allBlockingPassed && noBlockers) {
        decision = 'conditional';
      } else {
        decision = 'no_go';
      }

      // Build summary
      const summary: ReportSummary = {
        decision,
        confidence: Math.round((healthData?.health_score || 0)),
        healthScore: healthData?.health_score || 0,
        healthLevel: (healthData?.health_level as ReportSummary['healthLevel']) || 'at_risk',
        overallStatus: decision === 'go' ? 'Ready for Release' : 
                       decision === 'conditional' ? 'Conditional Approval' : 'Not Ready',
        keyHighlights: [
          `${gatesData?.summary?.passed_gates || 0}/${gatesData?.summary?.total_gates || 0} quality gates passed`,
          `${gatesData?.test_summary?.totals?.pass_pct?.toFixed(1) || 0}% test pass rate`,
          `${gatesData?.test_summary?.defects?.open || 0} open defects`,
          `${signoffsData?.summary?.approved || 0}/${signoffsData?.summary?.total || 0} stakeholder approvals`,
        ],
      };

      // Build quality gates section
      const qualityGates: ReportQualityGates = {
        totalGates: gatesData?.summary?.total_gates || 0,
        passedGates: gatesData?.summary?.passed_gates || 0,
        failedGates: (gatesData?.summary?.total_gates || 0) - (gatesData?.summary?.passed_gates || 0),
        blockingPassed: gatesData?.summary?.blocking_passed || 0,
        blockingTotal: gatesData?.summary?.blocking_total || 0,
        gates: (gatesData?.gates || []).map(g => ({
          name: g.gate_name,
          type: g.gate_type,
          threshold: g.threshold,
          actual: g.actual_value,
          passed: g.passed,
          isBlocking: g.is_blocking,
        })),
      };

      // Build test metrics section
      const totals = gatesData?.test_summary?.totals;
      const testMetrics: ReportTestMetrics = {
        totalCases: totals?.total_cases || 0,
        executed: (totals?.passed || 0) + (totals?.failed || 0) + (totals?.blocked || 0),
        passed: totals?.passed || 0,
        failed: totals?.failed || 0,
        blocked: totals?.blocked || 0,
        skipped: totals?.not_run || 0,
        executionRate: totals?.execution_pct || 0,
        passRate: totals?.pass_pct || 0,
        automationRate: 0, // TODO: Add automation rate
        cycleBreakdown: (gatesData?.test_summary?.cycles || []).map(c => ({
          cycleName: c.cycle_name,
          status: c.status,
          total: c.total_cases,
          passed: c.passed,
          failed: c.failed,
          executionRate: c.execution_pct,
        })),
      };

      // Build defect summary
      const defects = gatesData?.test_summary?.defects;
      const defectSummary: ReportDefectSummary = {
        totalOpen: defects?.open || 0,
        blockers: defects?.blockers || 0,
        criticals: defects?.criticals || 0,
        majors: 0,
        minors: 0,
        resolvedThisRelease: 0,
        newThisRelease: 0,
        byStatus: {},
      };

      // Build signoffs section
      const signoffs: ReportSignoffs = {
        totalRequired: signoffsData?.summary?.required_total || 0,
        approved: signoffsData?.summary?.approved || 0,
        pending: signoffsData?.summary?.pending || 0,
        rejected: signoffsData?.summary?.rejected || 0,
        allRequiredComplete: signoffsData?.summary?.all_required_approved || false,
        stakeholders: (signoffsData?.signoffs || []).map(s => ({
          name: s.stakeholder_name,
          role: s.stakeholder_role,
          decision: s.decision,
          date: s.decided_at || undefined,
          comments: s.comments || undefined,
        })),
      };

      // Generate risk factors
      const riskFactors: ReportRiskFactor[] = [];
      
      if (defects?.blockers > 0) {
        riskFactors.push({
          category: 'Defects',
          severity: 'critical',
          description: `${defects.blockers} blocker defect(s) remain open`,
          impact: 'Release cannot proceed with open blockers',
          mitigation: 'Prioritize blocker resolution or defer release',
        });
      }
      
      if ((totals?.pass_pct || 0) < 80) {
        riskFactors.push({
          category: 'Quality',
          severity: (totals?.pass_pct || 0) < 60 ? 'high' : 'medium',
          description: `Test pass rate is ${totals?.pass_pct?.toFixed(1)}%`,
          impact: 'Low pass rate indicates potential quality issues',
          mitigation: 'Investigate and fix failing tests',
        });
      }

      if (signoffsData?.summary?.rejected > 0) {
        riskFactors.push({
          category: 'Approvals',
          severity: 'high',
          description: `${signoffsData.summary.rejected} stakeholder(s) rejected the release`,
          impact: 'Release may not have required consensus',
          mitigation: 'Address stakeholder concerns before proceeding',
        });
      }

      // Generate recommendations
      const recommendations = generateRecommendations(summary, qualityGates, defectSummary, signoffs);

      return {
        metadata,
        summary,
        qualityGates,
        testMetrics,
        defectSummary,
        signoffs,
        riskFactors,
        executionTrend: [], // TODO: Add trend data
        recommendations,
      };
    },
    enabled: !!releaseId,
    staleTime: 60000, // 1 minute
  });
}

// Hook to export report as different formats
export function useExportReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      report,
      format,
    }: {
      report: ReadinessReport;
      format: 'pdf' | 'html' | 'json';
    }) => {
      if (format === 'json') {
        // Export as JSON
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `release-report-${report.metadata.releaseName}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, format };
      }

      if (format === 'html') {
        // Generate HTML report
        const html = generateHtmlReport(report);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `release-report-${report.metadata.releaseName}-${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, format };
      }

      // PDF export would require a library like jspdf
      // For now, we'll use print-to-PDF via the HTML report
      const html = generateHtmlReport(report);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
      
      return { success: true, format };
    },
    onSuccess: (data) => {
      toast({
        title: 'Report Exported',
        description: `Report exported as ${data.format.toUpperCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    },
  });
}

// Generate HTML report
function generateHtmlReport(report: ReadinessReport): string {
  const decisionColors = {
    go: 'var(--ds-text-success, var(--ds-text-success, #22c55e))',
    no_go: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',
    conditional: 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))',
    pending: '#6b7280',
  };

  const decisionColor = decisionColors[report.summary.decision];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Release Readiness Report - ${report.metadata.releaseName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1f2937; }
    h1 { color: #111827; border-bottom: 2px solid var(--ds-border, #e5e7eb); padding-bottom: 16px; }
    h2 { color: #374151; margin-top: 32px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .decision { padding: 12px 24px; border-radius: 8px; font-size: 24px; font-weight: bold; color: white; background: ${decisionColor}; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
    .metric-card { background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid var(--ds-border, #e5e7eb); }
    .metric-value { font-size: 28px; font-weight: bold; color: #111827; }
    .metric-label { font-size: 14px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--ds-border, #e5e7eb); }
    th { background: #f9fafb; font-weight: 600; }
    .passed { color: var(--ds-text-success, #22c55e); }
    .failed { color: var(--ds-text-danger, #ef4444); }
    .risk-critical { background: var(--ds-background-danger, #fef2f2); border-left: 4px solid var(--ds-text-danger, #ef4444); padding: 12px; margin: 8px 0; }
    .risk-high { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px; margin: 8px 0; }
    .risk-medium { background: #fffbeb; border-left: 4px solid var(--ds-text-warning, #f59e0b); padding: 12px; margin: 8px 0; }
    .recommendation { background: #f0fdf4; border-left: 4px solid var(--ds-text-success, #22c55e); padding: 12px; margin: 8px 0; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--ds-border, #e5e7eb); color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Release Readiness Report</h1>
      <p><strong>${report.metadata.releaseName}</strong> ${report.metadata.releaseVersion ? `v${report.metadata.releaseVersion}` : ''}</p>
    </div>
    <div class="decision">${report.summary.decision.toUpperCase().replace('_', '-')}</div>
  </div>

  <h2>Executive Summary</h2>
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-value">${report.summary.healthScore.toFixed(0)}%</div>
      <div class="metric-label">Health Score</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${report.testMetrics.passRate.toFixed(1)}%</div>
      <div class="metric-label">Pass Rate</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${report.defectSummary.totalOpen}</div>
      <div class="metric-label">Open Defects</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${report.signoffs.approved}/${report.signoffs.totalRequired}</div>
      <div class="metric-label">Approvals</div>
    </div>
  </div>

  <h2>Quality Gates</h2>
  <table>
    <tr><th>Gate</th><th>Type</th><th>Threshold</th><th>Actual</th><th>Status</th></tr>
    ${report.qualityGates.gates.map(g => `
      <tr>
        <td>${g.name} ${g.isBlocking ? '(Blocking)' : ''}</td>
        <td>${g.type}</td>
        <td>${g.threshold}</td>
        <td>${g.actual.toFixed(1)}</td>
        <td class="${g.passed ? 'passed' : 'failed'}">${g.passed ? '✓ Passed' : '✗ Failed'}</td>
      </tr>
    `).join('')}
  </table>

  <h2>Test Metrics</h2>
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-value">${report.testMetrics.totalCases}</div>
      <div class="metric-label">Total Cases</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${report.testMetrics.passed}</div>
      <div class="metric-label">Passed</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${report.testMetrics.failed}</div>
      <div class="metric-label">Failed</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${report.testMetrics.executionRate.toFixed(1)}%</div>
      <div class="metric-label">Execution Rate</div>
    </div>
  </div>

  <h2>Defect Summary</h2>
  <table>
    <tr><th>Severity</th><th>Count</th></tr>
    <tr><td>Blockers</td><td class="${report.defectSummary.blockers > 0 ? 'failed' : ''}">${report.defectSummary.blockers}</td></tr>
    <tr><td>Critical</td><td>${report.defectSummary.criticals}</td></tr>
    <tr><td>Major</td><td>${report.defectSummary.majors}</td></tr>
    <tr><td>Minor</td><td>${report.defectSummary.minors}</td></tr>
    <tr><td><strong>Total Open</strong></td><td><strong>${report.defectSummary.totalOpen}</strong></td></tr>
  </table>

  ${report.riskFactors.length > 0 ? `
  <h2>Risk Factors</h2>
  ${report.riskFactors.map(r => `
    <div class="risk-${r.severity}">
      <strong>${r.category}:</strong> ${r.description}<br>
      <em>Impact:</em> ${r.impact}
      ${r.mitigation ? `<br><em>Mitigation:</em> ${r.mitigation}` : ''}
    </div>
  `).join('')}
  ` : ''}

  <h2>Recommendations</h2>
  ${report.recommendations.map(r => `<div class="recommendation">${r}</div>`).join('')}

  <h2>Stakeholder Sign-offs</h2>
  <table>
    <tr><th>Stakeholder</th><th>Role</th><th>Decision</th><th>Date</th></tr>
    ${report.signoffs.stakeholders.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.role}</td>
        <td class="${s.decision === 'approve' ? 'passed' : s.decision === 'reject' ? 'failed' : ''}">${s.decision}</td>
        <td>${s.date ? new Date(s.date).toLocaleDateString() : '-'}</td>
      </tr>
    `).join('')}
  </table>

  <div class="footer">
    <p>Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}</p>
    <p>Report ID: ${report.metadata.reportId}</p>
  </div>
</body>
</html>
  `;
}

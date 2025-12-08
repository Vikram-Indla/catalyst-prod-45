/**
 * Design Audit Report Generator
 * Generates markdown and JSON reports from audit findings
 */

import type { AuditFinding, AuditScores, AuditReport, ChangeSummary } from './auditTypes';
import { calculateScores, prioritizeFindings } from './auditScoring';

// Generate markdown report
export function generateMarkdownReport(findings: AuditFinding[], scores: AuditScores): string {
  const timestamp = new Date().toISOString();
  const prioritized = prioritizeFindings(findings);
  
  let md = `# Catalyst Design Audit Report

Generated: ${timestamp}
Version: 1.0.0

## Executive Summary

**Overall Score: ${scores.overall}/100**

| Area | Score | Status |
|------|-------|--------|
| Side Navigation | ${scores.sideNav}/100 | ${getStatusEmoji(scores.sideNav)} |
| Header | ${scores.header}/100 | ${getStatusEmoji(scores.header)} |
| Modals/Drawers | ${scores.modals}/100 | ${getStatusEmoji(scores.modals)} |
| Toasts | ${scores.toasts}/100 | ${getStatusEmoji(scores.toasts)} |
| Buttons | ${scores.buttons}/100 | ${getStatusEmoji(scores.buttons)} |
| Charts | ${scores.charts}/100 | ${getStatusEmoji(scores.charts)} |
| Typography | ${scores.typography}/100 | ${getStatusEmoji(scores.typography)} |
| Spacing | ${scores.spacing}/100 | ${getStatusEmoji(scores.spacing)} |
| Colors | ${scores.colors}/100 | ${getStatusEmoji(scores.colors)} |
| Elevation | ${scores.elevation}/100 | ${getStatusEmoji(scores.elevation)} |
| Accessibility | ${scores.accessibility}/100 | ${getStatusEmoji(scores.accessibility)} |

## Top Priority Fixes (P0/P1)

`;

  const criticalFindings = prioritized.filter(f => f.severity === 'P0' || f.severity === 'P1');
  criticalFindings.slice(0, 20).forEach((finding, i) => {
    md += `### ${i + 1}. ${finding.element} (${finding.area})

- **Route:** ${finding.route}
- **Severity:** ${finding.severity}
- **Status:** ${finding.status}
- **Current:** ${finding.current}
- **Target:** ${finding.target}
- **Delta:** ${finding.delta}
- **Recommendation:** ${finding.recommendation}
${finding.file ? `- **File:** ${finding.file}` : ''}

`;
  });

  md += `## All Findings Matrix

| Route | Area | Element | Current | Target | Delta | Severity | Status |
|-------|------|---------|---------|--------|-------|----------|--------|
`;

  findings.forEach(f => {
    md += `| ${f.route} | ${f.area} | ${f.element} | ${f.current} | ${f.target} | ${f.delta} | ${f.severity} | ${f.status} |\n`;
  });

  md += `
## Remaining Design Debt

`;

  const remaining = prioritized.filter(f => f.status === 'warn' || f.status === 'fail');
  remaining.forEach(f => {
    md += `- **${f.element}** (${f.route}): ${f.recommendation}\n`;
  });

  return md;
}

function getStatusEmoji(score: number): string {
  if (score >= 90) return '✅ Excellent';
  if (score >= 70) return '⚠️ Good';
  if (score >= 50) return '🔶 Needs Work';
  return '❌ Critical';
}

// Generate JSON report
export function generateJSONReport(
  findings: AuditFinding[],
  scores: AuditScores,
  changes?: ChangeSummary[]
): AuditReport {
  return {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    routes: [],
    globalScores: scores,
    topFindings: prioritizeFindings(findings).slice(0, 20),
    remainingDebt: findings.filter(f => f.status === 'warn' || f.status === 'fail'),
    changesSummary: changes || [],
  };
}

// Download report as file
export function downloadReport(content: string, filename: string, type: 'json' | 'md'): void {
  const mimeType = type === 'json' ? 'application/json' : 'text/markdown';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Compare before/after findings
export function compareAuditResults(
  before: AuditFinding[],
  after: AuditFinding[]
): { improved: AuditFinding[]; regressed: AuditFinding[]; unchanged: AuditFinding[] } {
  const improved: AuditFinding[] = [];
  const regressed: AuditFinding[] = [];
  const unchanged: AuditFinding[] = [];
  
  after.forEach(afterFinding => {
    const beforeFinding = before.find(b => b.id === afterFinding.id);
    
    if (!beforeFinding) {
      unchanged.push(afterFinding);
      return;
    }
    
    const statusOrder = { pass: 0, fixed: 0, warn: 1, fail: 2 };
    const beforeStatus = statusOrder[beforeFinding.status] ?? 1;
    const afterStatus = statusOrder[afterFinding.status] ?? 1;
    
    if (afterStatus < beforeStatus) {
      improved.push(afterFinding);
    } else if (afterStatus > beforeStatus) {
      regressed.push(afterFinding);
    } else {
      unchanged.push(afterFinding);
    }
  });
  
  return { improved, regressed, unchanged };
}

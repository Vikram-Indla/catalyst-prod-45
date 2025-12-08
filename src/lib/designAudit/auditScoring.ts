/**
 * Design Audit Scoring Utilities
 */

import { AuditFinding, AuditScores } from './auditTypes';
import { AuditArea } from './auditConfig';

// Area weights for overall score calculation
const areaWeights: Record<string, number> = {
  sideNav: 1.2,
  header: 1.2,
  modals: 1.0,
  toasts: 0.8,
  buttons: 1.0,
  charts: 0.8,
  typography: 1.3, // Higher weight
  spacing: 1.3,    // Higher weight
  colors: 1.0,
  elevation: 0.7,
  accessibility: 1.5, // Highest weight
};

// Map areas to score categories
const areaToScoreCategory: Record<AuditArea, keyof AuditScores> = {
  SideNav: 'sideNav',
  Header: 'header',
  Modal: 'modals',
  Drawer: 'modals',
  Toast: 'toasts',
  Button: 'buttons',
  Input: 'buttons',
  Table: 'typography',
  Card: 'spacing',
  Badge: 'colors',
  Typography: 'typography',
  Spacing: 'spacing',
  Color: 'colors',
  Elevation: 'elevation',
  Chart: 'charts',
};

export function calculateAreaScore(findings: AuditFinding[], area: AuditArea): number {
  const areaFindings = findings.filter(f => f.area === area);
  if (areaFindings.length === 0) return 100;
  
  const passCount = areaFindings.filter(f => f.status === 'pass' || f.status === 'fixed').length;
  return Math.round((passCount / areaFindings.length) * 100);
}

export function calculateScores(findings: AuditFinding[]): AuditScores {
  const scores: AuditScores = {
    overall: 0,
    sideNav: calculateAreaScore(findings, 'SideNav'),
    header: calculateAreaScore(findings, 'Header'),
    modals: Math.round((calculateAreaScore(findings, 'Modal') + calculateAreaScore(findings, 'Drawer')) / 2),
    toasts: calculateAreaScore(findings, 'Toast'),
    buttons: Math.round((calculateAreaScore(findings, 'Button') + calculateAreaScore(findings, 'Input')) / 2),
    charts: calculateAreaScore(findings, 'Chart'),
    typography: calculateAreaScore(findings, 'Typography'),
    spacing: calculateAreaScore(findings, 'Spacing'),
    colors: Math.round((calculateAreaScore(findings, 'Color') + calculateAreaScore(findings, 'Badge')) / 2),
    elevation: calculateAreaScore(findings, 'Elevation'),
    accessibility: 85, // Placeholder - would need real a11y checks
  };
  
  // Calculate weighted overall score
  let totalWeight = 0;
  let weightedSum = 0;
  
  Object.entries(areaWeights).forEach(([key, weight]) => {
    const score = scores[key as keyof AuditScores];
    if (typeof score === 'number') {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  });
  
  scores.overall = Math.round(weightedSum / totalWeight);
  
  return scores;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-warning';
  return 'text-destructive';
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-success/10';
  if (score >= 70) return 'bg-warning/10';
  return 'bg-destructive/10';
}

export function formatDelta(current: string, target: string): string {
  // Try to extract numeric values
  const currentNum = parseFloat(current);
  const targetNum = parseFloat(target);
  
  if (!isNaN(currentNum) && !isNaN(targetNum)) {
    const diff = currentNum - targetNum;
    if (diff > 0) return `+${diff}px`;
    if (diff < 0) return `${diff}px`;
    return '0';
  }
  
  return current === target ? 'Match' : 'Mismatch';
}

export function prioritizeFindings(findings: AuditFinding[]): AuditFinding[] {
  const severityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const statusOrder: Record<string, number> = { fail: 0, warn: 1, pass: 2, fixed: 3 };
  
  return [...findings].sort((a, b) => {
    // First by status (fail > warn > pass)
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by severity
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

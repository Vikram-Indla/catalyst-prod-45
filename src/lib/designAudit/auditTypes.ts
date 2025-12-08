/**
 * Design Audit Type Definitions
 */

import { AuditSeverity, AuditArea } from './auditConfig';

export interface AuditFinding {
  id: string;
  route: string;
  area: AuditArea;
  element: string;
  selector: string;
  current: string;
  target: string;
  delta: string;
  severity: AuditSeverity;
  status: 'pass' | 'warn' | 'fail' | 'fixed';
  recommendation: string;
  file?: string;
  notes?: string;
  computed?: string;
  evidence?: string;
}

export interface RouteAuditResult {
  route: string;
  name: string;
  category: string;
  timestamp: string;
  viewport: 'desktop' | 'tablet' | 'mobile';
  findings: AuditFinding[];
  scores: AuditScores;
  elementCounts: Record<string, number>;
  accessibilityInfo: AccessibilityInfo;
}

export interface AuditScores {
  overall: number;
  sideNav: number;
  header: number;
  modals: number;
  toasts: number;
  buttons: number;
  charts: number;
  typography: number;
  spacing: number;
  colors: number;
  elevation: number;
  accessibility: number;
}

export interface AccessibilityInfo {
  focusableCount: number;
  headingStructure: string[];
  focusVisiblePresent: boolean;
  landmarkRegions: string[];
  ariaLabels: number;
}

export interface AuditReport {
  generatedAt: string;
  version: string;
  routes: RouteAuditResult[];
  globalScores: AuditScores;
  topFindings: AuditFinding[];
  remainingDebt: AuditFinding[];
  changesSummary: ChangeSummary[];
}

export interface ChangeSummary {
  file: string;
  changes: string[];
  before?: string;
  after?: string;
}

export interface ToastAuditItem {
  id: string;
  element: string;
  current: string;
  target: string;
  status: 'pass' | 'warn' | 'fail';
  notes: string;
}

export interface ChartAuditItem {
  id: string;
  element: string;
  current: string;
  target: string;
  status: 'pass' | 'warn' | 'fail';
  notes: string;
}

export interface InteractionAuditItem {
  id: string;
  element: string;
  current: string;
  target: string;
  computed: string;
  status: 'pass' | 'warn' | 'fail';
  notes: string;
}

export interface StatusColorAuditItem {
  id: string;
  element: string;
  current: string;
  hex?: string;
  usage?: string;
  status: 'pass' | 'warn' | 'fail';
  notes: string;
}

export interface ButtonAuditItem {
  id: string;
  element: string;
  current: string;
  target: string;
  delta?: string;
  status: 'pass' | 'warn' | 'fail';
  notes: string;
}

// Design token audit types
export interface TokenAuditResult {
  tokenName: string;
  expectedValue: string;
  actualValue: string;
  isMatch: boolean;
  usageCount: number;
  locations: string[];
}

/**
 * Responsive Audit Type Definitions
 */

import type { 
  ViewportId, 
  ResponsiveSeverity, 
  IssueCategory, 
  RouteCategory, 
  RoutePriority 
} from './responsiveConfig';

// Individual responsive issue
export interface ResponsiveIssue {
  id: string;
  route: string;
  viewport: ViewportId;
  category: IssueCategory;
  severity: ResponsiveSeverity;
  element: string;
  selector: string;
  description: string;
  measured: MeasuredData;
  expected: string;
  recommendation: string;
  fixPattern: string;
  file?: string;
  component?: string;
  evidence?: string;
}

// Measured data for an issue
export interface MeasuredData {
  width?: number;
  height?: number;
  overflow?: { x: boolean; y: boolean };
  boundingBox?: DOMRect;
  computedStyles?: Record<string, string>;
  scrollWidth?: number;
  scrollHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
  isVisible?: boolean;
  isClipped?: boolean;
  contrast?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  tableWidth?: number;
  columnCount?: number;
  narrowColumns?: number[];
  hasScrollContainer?: boolean;
  footerVisible?: boolean;
}

// Route audit result
export interface RouteResponsiveResult {
  route: string;
  name: string;
  category: RouteCategory;
  priority: RoutePriority;
  timestamp: string;
  viewportResults: ViewportResult[];
  overallScore: number;
  issues: ResponsiveIssue[];
}

// Per-viewport result
export interface ViewportResult {
  viewport: ViewportId;
  width: number;
  height: number;
  score: number;
  issueCount: number;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  checks: ResponsiveCheck[];
  screenshot?: string;
}

// Individual check result
export interface ResponsiveCheck {
  name: string;
  category: IssueCategory;
  passed: boolean;
  details?: string;
  elements?: ElementCheck[];
}

// Element-level check
export interface ElementCheck {
  selector: string;
  passed: boolean;
  issue?: string;
  measured?: MeasuredData;
}

// Component family scores
export interface ComponentFamilyScores {
  navigation: number;
  header: number;
  tables: number;
  forms: number;
  overlays: number;
  charts: number;
  cards: number;
  buttons: number;
}

// Module scores
export interface ModuleScores {
  admin: number;
  dashboard: number;
  table: number;
  board: number;
  visualization: number;
  form: number;
  utility: number;
}

// Global audit scores
export interface ResponsiveAuditScores {
  globalScore: number;
  byViewport: Record<ViewportId, number>;
  byCategory: Record<IssueCategory, number>;
  byModule: ModuleScores;
  byComponentFamily: ComponentFamilyScores;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
}

// Complete audit report
export interface ResponsiveAuditReport {
  generatedAt: string;
  version: string;
  routesScanned: number;
  viewportsTested: number;
  totalIssues: number;
  scores: ResponsiveAuditScores;
  routes: RouteResponsiveResult[];
  topIssues: ResponsiveIssue[];
  issuesByCategory: Record<IssueCategory, ResponsiveIssue[]>;
  recommendations: FixRecommendation[];
}

// Fix recommendation
export interface FixRecommendation {
  id: string;
  priority: ResponsiveSeverity;
  category: IssueCategory;
  affectedRoutes: string[];
  affectedViewports: ViewportId[];
  description: string;
  fixPattern: string;
  file: string;
  component?: string;
  codeExample?: string;
}

// Audit progress
export interface AuditProgress {
  status: 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error';
  currentRoute?: string;
  currentViewport?: ViewportId;
  routesScanned: number;
  totalRoutes: number;
  viewportsScanned: number;
  totalViewports: number;
  issuesFound: number;
  startTime?: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

// Audit filter options
export interface AuditFilters {
  routes: string[];
  viewports: ViewportId[];
  categories: IssueCategory[];
  severities: ResponsiveSeverity[];
  modules: RouteCategory[];
}

// Detection result from scanner
export interface DetectionResult {
  hasOverflow: boolean;
  overflowElements: OverflowElement[];
  hasOverlap: boolean;
  overlapElements: OverlapElement[];
  touchTargetIssues: TouchTargetIssue[];
  textOverflowIssues: TextOverflowIssue[];
  tableIssues: TableIssue[];
  modalDrawerIssues: ModalDrawerIssue[];
  navigationIssues: NavigationIssue[];
  headerIssues: HeaderIssue[];
}

// Specific issue types
export interface OverflowElement {
  selector: string;
  scrollWidth: number;
  clientWidth: number;
  overflow: number;
  element: string;
}

export interface OverlapElement {
  selector: string;
  overlappingWith: string;
  zIndex: number;
  position: string;
}

export interface TouchTargetIssue {
  selector: string;
  width: number;
  height: number;
  minRequired: number;
  element: string;
}

export interface TextOverflowIssue {
  selector: string;
  text: string;
  containerWidth: number;
  textWidth: number;
  hasEllipsis: boolean;
}

export interface TableIssue {
  selector: string;
  tableWidth: number;
  viewportWidth: number;
  hasScrollContainer: boolean;
  columnCount: number;
  narrowColumns: number[];
}

export interface ModalDrawerIssue {
  selector: string;
  type: 'modal' | 'drawer';
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  footerVisible: boolean;
}

export interface NavigationIssue {
  selector: string;
  issue: 'not-collapsed' | 'overlapping' | 'not-accessible';
  width: number;
  isCollapsed: boolean;
}

export interface HeaderIssue {
  selector: string;
  issue: 'overflow' | 'truncation' | 'overlap';
  height: number;
  actionsVisible: boolean;
}

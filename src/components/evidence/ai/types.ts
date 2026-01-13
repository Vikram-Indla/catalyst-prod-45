/**
 * AI Analysis Types for Evidence System
 * TC-261 to TC-330: AI Defect Detection Types
 */

export type IssueType = 
  | 'ERROR_MESSAGE' 
  | 'UI_ANOMALY' 
  | 'BROKEN_LAYOUT' 
  | 'EMPTY_STATE' 
  | 'LOADING_ISSUE' 
  | 'DATA_ISSUE' 
  | 'CONSOLE_ERROR';

export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type OverallQuality = 'PASS' | 'ISSUES_FOUND' | 'CRITICAL_ISSUES';

export interface IssueLocation {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedIssue {
  type: IssueType;
  severity: IssueSeverity;
  confidence: number;
  description: string;
  location?: IssueLocation;
  suggestedTitle: string;
  suggestedSteps?: string[];
}

export interface AiAnalysisResult {
  issues: DetectedIssue[];
  overallQuality: OverallQuality;
  summary: string;
}

export interface AiAnalysisPanelProps {
  attachmentId: string;
  imageUrl: string;
  aiAnalysis?: AiAnalysisResult;
  aiAnalyzedAt?: string;
  testCaseContext?: string;
  onAnalyze: () => Promise<AiAnalysisResult | null>;
  onCreateDefect: (issue: DetectedIssue) => void;
  onReanalyze?: () => void;
}

export const issueTypeLabels: Record<IssueType, string> = {
  ERROR_MESSAGE: 'Error Message',
  UI_ANOMALY: 'UI Anomaly',
  BROKEN_LAYOUT: 'Broken Layout',
  EMPTY_STATE: 'Empty State',
  LOADING_ISSUE: 'Loading Issue',
  DATA_ISSUE: 'Data Issue',
  CONSOLE_ERROR: 'Console Error',
};

export const severityColors: Record<IssueSeverity, string> = {
  CRITICAL: 'bg-destructive text-destructive-foreground border-destructive',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  LOW: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
};

export const qualityColors: Record<OverallQuality, string> = {
  PASS: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ISSUES_FOUND: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CRITICAL_ISSUES: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

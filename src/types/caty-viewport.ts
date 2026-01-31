/**
 * CATY AI Viewport Types — Enterprise Probing Questions Interface
 */

export interface ProbingQuestion {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  text: string;
  highlightedText: string; // The bold part
  tags: Array<{
    type: 'project' | 'vendor' | 'date' | 'count';
    label: string;
  }>;
  resourceIds?: string[]; // For drilling down
  departmentId?: string;
}

export interface ViewportSection {
  id: string;
  title: string;
  severity: 'danger' | 'warning' | 'info';
  totalCount: number;
  questions: ProbingQuestion[];
}

export interface ViewportStats {
  totalResources: number;
  expiringContracts: number;
  overAllocated: number;
  zeroUtilization: number;
}

export interface ViewportData {
  stats: ViewportStats;
  sections: ViewportSection[];
}

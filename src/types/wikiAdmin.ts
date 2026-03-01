/**
 * Wiki Admin Panel — TypeScript Interfaces
 */

export interface WikiSyncRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'complete' | 'failed' | 'partial';
  steps: WikiSyncStep[];
  totalItemsProcessed: number;
  newPages: number;
  updatedPages: number;
  newChunks: number;
  totalDurationMs: number;
  errorMessage: string | null;
  triggeredBy: 'scheduled' | 'manual';
}

export interface WikiSyncStep {
  stepNumber: number;
  name: string;
  status: 'done' | 'active' | 'pending' | 'failed';
  itemsProcessed: number;
  result: string;
  durationMs: number;
}

export interface WikiPageAdmin {
  id: string;
  slug: string;
  title: string;
  domainCode: string;
  status: 'published' | 'draft' | 'review' | 'archived';
  aiConfidence: number;
  sourceCoverage: number;
  version: number;
  referenceCount: number;
  readCount: number;
  lastGenerated: string;
  daysSinceUpdate: number;
}

export interface WikiHealthMetric {
  category: string;
  metric: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface WikiQueryLogEntry {
  id: string;
  queryText: string;
  userId: string;
  language: string;
  retrievalMethod: string;
  confidence: number;
  responseTimeMs: number;
  cacheHit: boolean;
  timestamp: string;
}

export type WikiAdminTab = 'sync' | 'pages' | 'sources' | 'health' | 'queries' | 'training' | 'access';

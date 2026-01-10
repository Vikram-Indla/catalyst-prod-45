export interface GenerationHistoryItem {
  id: string;
  title: string;
  status: 'published' | 'draft' | 'failed';
  items: {
    epics: number;
    features: number;
    stories: number;
    testCases: number;
  };
  author: {
    name: string;
    initial: string;
  };
  date: string;
  dateSort: number;
  program: string;
  project?: string;
  // PRD is a background document, not a work item
  hasPrd: boolean;
  prdTitle?: string;
  complianceStatus?: {
    dgaStandards: { passed: number; total: number };
    ncaEcc: { met: number; total: number };
    babokValidation: boolean;
  };
  generatedItems?: {
    type: 'epic' | 'feature' | 'story' | 'test_case';
    id: string;
    title: string;
    confidence?: number;
  }[];
  // Original database ID for CRUD operations
  _originalId?: string;
}

export type StatusFilter = 'all' | 'published' | 'draft' | 'failed';
export type SortOption = 'newest' | 'oldest' | 'items' | 'title';

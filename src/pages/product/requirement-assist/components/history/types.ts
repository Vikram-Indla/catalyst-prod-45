export interface GenerationHistoryItem {
  id: string;
  title: string;
  status: 'published' | 'draft' | 'failed';
  items: {
    prd: number;
    epics: number;
    features: number;
    stories: number;
  };
  author: {
    name: string;
    initial: string;
  };
  date: string;
  dateSort: number;
  program: string;
  project?: string;
  complianceStatus?: {
    dgaStandards: { passed: number; total: number };
    ncaEcc: { met: number; total: number };
    babokValidation: boolean;
  };
  generatedItems?: {
    type: 'prd' | 'epic' | 'feature' | 'story';
    id: string;
    title: string;
    confidence?: number;
  }[];
  // Original database ID for CRUD operations
  _originalId?: string;
}

export type StatusFilter = 'all' | 'published' | 'draft' | 'failed';
export type SortOption = 'newest' | 'oldest' | 'items' | 'title';

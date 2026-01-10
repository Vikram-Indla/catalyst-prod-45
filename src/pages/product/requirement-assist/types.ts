export interface GeneratedItem {
  id: string;
  type: 'epic' | 'feature' | 'story' | 'prd';
  key: string;
  title: string;
  description: string;
  confidence: number;
  confidenceBreakdown?: {
    scopeClarity: number;
    functionalReqs: number;
    nfrCoverage: number;
    compliance: number;
  };
}

export interface HistoryEntry {
  id: string;
  title: string;
  program: string;
  project: string;
  itemCount: number;
  epics: number;
  features: number;
  stories: number;
  status: 'draft' | 'published' | 'failed';
  createdAt: string;
  createdBy: {
    name: string;
    initials: string;
  };
  tokensUsed: number;
  duration: number;
  avgConfidence: number;
}

export interface Template {
  id: string;
  name: string;
  type: 'prd' | 'epic' | 'feature' | 'story' | 'test';
  version: string;
  status: 'active' | 'draft';
}

export interface ComplianceRule {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
}

export interface GlossaryTerm {
  id: string;
  english: string;
  arabic: string;
  domain: string;
}

export interface WizardState {
  currentStep: number;
  inputContent: string;
  uploadedFile: File | null;
  selectedOutputs: {
    epics: boolean;
    features: boolean;
    stories: boolean;
    tests: boolean;
  };
  selectedProgram: {
    id: string;
    name: string;
    nextEpic: string;
    nextFeat: string;
  } | null;
  selectedProject: {
    id: string;
    name: string;
    nextStory: string;
  } | null;
  selectedTheme: string | null;
  generatedItems: GeneratedItem[];
  // Database integration fields
  generationId: string | null;
  generationDisplayId: string | null;
  tokensUsed: number;
  processingTimeMs: number;
}

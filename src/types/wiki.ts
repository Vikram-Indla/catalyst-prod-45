/**
 * Catalyst Wiki — TypeScript Domain Interfaces
 * Domain numbering follows Dewey Decimal: D1, D1.1, D1.1.1
 */

export interface WikiDomain {
  id: string;
  domainCode: string;        // "D1", "D2", ... "D8"
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  descriptionAr: string;
  articleCount: number;
  documentCount: number;
  lastUpdated: string;
  sortOrder: number;
}

export interface WikiCategory {
  id: string;
  domainId: string;
  categoryCode: string;      // "D6.1", "D6.2"
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  parentId: string | null;
  level: number;             // 1, 2, or 3
  articleCount: number;
  documentCount: number;
  sortOrder: number;
}

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  domainCode: string;
  categoryId: string;
  status: 'published' | 'draft' | 'review' | 'archived';
  leadContent: string;
  leadContentAr: string;
  sections: WikiSection[];
  infobox: WikiInfobox;
  references: WikiReference[];
  crossReferences: string[];  // page slugs
  aiConfidence: number;
  sourceCoverage: number;
  version: number;
  lastGenerated: string;
  lastJiraSync: string;
  createdAt: string;
  updatedAt: string;
}

export interface WikiSection {
  id: string;
  pageId: string;
  sectionNumber: number;
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  sectionType: 'overview' | 'functionality' | 'delivery_status' | 'technical' | 'related' | 'references';
  isLiveData: boolean;
  sortOrder: number;
}

export interface WikiInfobox {
  status: string;
  hub: string;
  project: string;
  epicKey: string;
  totalStories: number;
  doneStories: number;
  donePercent: number;
  openDefects: number;
  currentSprint: string;
  owner: string;
  brdVersion: string;
  documentsCount: number;
  lastSync: string;
  aiConfidence: number;
  domainCode: string;
}

export interface WikiReference {
  id: string;
  refNumber: number;
  sourceType: 'jira' | 'brd' | 'document' | 'url';
  sourceKey: string;
  description: string;
  url: string | null;
}

export interface WikiSearchResult {
  pageSlug: string;
  title: string;
  path: string;
  excerpt: string;
  confidence: number;
  updatedAt: string;
  referenceCount: number;
}

export interface WikiDocument {
  id: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  domainCode: string;
  categoryId: string;
  docType: 'brd' | 'architecture' | 'design' | 'api_doc' | 'user_guide' | 'meeting' | 'policy' | 'other';
  purpose: string;
  version: string;
  language: 'en' | 'ar' | 'mixed';
  linkedEpic: string | null;
  status: 'uploaded' | 'parsing' | 'chunking' | 'embedding' | 'complete' | 'failed';
  pagesExtracted: number;
  wordsExtracted: number;
  chunksGenerated: number;
  errorMessage: string | null;
  uploadedBy: string;
  createdAt: string;
}

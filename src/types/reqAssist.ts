// ─── PIPELINE STAGE ENUM ───────────────────────────────────────────
export type PipelineStage =
  | 'intake'
  | 'extract'
  | 'process'
  | 'validate'
  | 'distribute'
  | 'complete'
  | 'failed';

// ─── SOURCE TYPE ENUM ──────────────────────────────────────────────
export type SourceType =
  | 'jira_webhook'
  | 'jira_bulk'
  | 'manual_upload'
  | 'ai_generated';

// ─── EXTRACTION TIER ───────────────────────────────────────────────
export type ExtractionTier = 1 | 2; // 1 = pdfplumber, 2 = vision_ocr

// ─── COMPLEXITY ────────────────────────────────────────────────────
export type Complexity = 'XS' | 'S' | 'M' | 'L' | 'XL';

// ─── QUEUE STATUS ──────────────────────────────────────────────────
export type QueueStatus =
  | 'pending'
  | 'extracting'
  | 'extracted'
  | 'processing'
  | 'processed'
  | 'distributing'
  | 'complete'
  | 'failed';

// ─── BRD DOCUMENT ─────────────────────────────────────────────────
export interface BrdDocument {
  id: string;
  jira_key: string | null;
  title: string;
  source_type: SourceType;
  original_url: string | null;
  content_hash: string | null;
  raw_text: string | null;
  json_data: Record<string, unknown> | null;
  extraction_tier: ExtractionTier | null;
  language: string;
  quality_score: number | null;
  pipeline_stage: PipelineStage;
  methodology: string | null;
  domain_tag: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

// ─── BRD EPIC ─────────────────────────────────────────────────────
export interface BrdEpic {
  id: string;
  brd_id: string;
  epic_key: string;
  title: string;
  description: string | null;
  brd_sections: number[];
  complexity: Complexity;
  invest_score: InvestScore | null;
  stories: Story[];
  acceptance_criteria: string[];
  created_at: string;
}

// ─── INVEST SCORE ─────────────────────────────────────────────────
export interface InvestScore {
  independent: number;
  negotiable: number;
  valuable: number;
  estimable: number;
  small: number;
  testable: number;
  total: number;
}

// ─── STORY ────────────────────────────────────────────────────────
export interface Story {
  id: string;
  title: string;
  acceptance_criteria: string[];
  story_points: number | null;
}

// ─── PROCESSING QUEUE ITEM ────────────────────────────────────────
export interface BrdQueueItem {
  id: string;
  brd_id: string;
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ─── ARTIFACT CHAIN NODE ──────────────────────────────────────────
export interface ArtifactNode {
  id: string;
  label: string;
  type: 'pdf' | 'json' | 'translation' | 'brd' | 'wiki_chunk' | 'epic' | 'uat' | 'word';
  status: 'pending' | 'complete' | 'failed';
  children: ArtifactNode[];
}

// ─── QUALITY AXES ─────────────────────────────────────────────────
export interface QualityAxes {
  completeness: number;   // 0–100
  clarity: number;        // 0–100
  traceability: number;   // 0–100
  consistency: number;    // 0–100
  overall: number;        // 0–100
}

// ─── PIPELINE STAGE STATS ─────────────────────────────────────────
export interface StageStats {
  stage: PipelineStage;
  count: number;
  label: string;
}

// ─── INTAKE DRAWER TAB ────────────────────────────────────────────
export type IntakeTab = 'upload_pdf' | 'generate_text' | 'import_jira';

// ─── FILTER STATE ─────────────────────────────────────────────────
export interface PipelineFilterState {
  stage: PipelineStage | 'all';
  search: string;
  domainTag: string | null;
  dateRange: { from: string | null; to: string | null };
}

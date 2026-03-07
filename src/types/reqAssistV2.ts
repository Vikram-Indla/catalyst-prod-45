/**
 * Req Assist™ V2 — TypeScript Interfaces
 * Stage A: Type definitions only
 */

export type DocumentStatus = 'processing' | 'ready' | 'failed' | 'pending';

export type ArtifactType = 'brd' | 'epics' | 'uat' | 'initiative';

export type GenerationSlotState = 'done' | 'processing' | 'pending' | 'error';

export interface RADocument {
  id: string;
  jira_ticket_key: string;
  jira_project: string;
  jira_ticket_url: string | null;
  jira_created_at: string | null;
  pulled_at: string;
  title: string;
  source_type: 'jira_pdf' | 'manual_upload' | 'text_generated';
  language: 'en' | 'ar';
  is_brd: boolean | null;
  page_count: number | null;
  word_count: number | null;
  content_raw: string | null;
  content_processed: string | null;
  domain: string | null;
  wikihub_synced: boolean;
  wikihub_synced_at: string | null;
  wikihub_chunk_count: number | null;
  pdf_url: string | null;
  status: DocumentStatus;
  kb_synced: boolean;
  kb_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RADocumentWithArtifacts extends RADocument {
  artifact_counts: {
    brd: number;
    epics: number;
    uat: number;
    initiative: number;
  };
  generation_slots: {
    brd: GenerationSlotState;
    epics: GenerationSlotState;
    uat: GenerationSlotState;
    wiki: GenerationSlotState;
  };
}

export interface RAArtifact {
  id: string;
  ra_document_id: string;
  artifact_type: ArtifactType;
  title: string;
  content_json: Record<string, unknown>;
  content_raw: string | null;
  status: 'generating' | 'ready' | 'failed';
  catalyst_ref_id: string | null;
  generated_by: string | null;
  generated_at: string;
  model_used: string | null;
}

export interface RAJiraSyncLog {
  id: string;
  synced_at: string;
  project_key: string;
  tickets_found: number;
  pdfs_found: number;
  new_documents: number;
  duplicates_skipped: number;
  errors: Record<string, unknown> | null;
  duration_ms: number | null;
}

export interface RAProcessingJob {
  id: string;
  ra_document_id: string;
  job_type: 'import' | 'generate_brd' | 'generate_epics' | 'generate_uat' | 'generate_initiative' | 'wikihub_sync';
  status: 'queued' | 'processing' | 'done' | 'failed';
  progress_pct: number;
  current_step: string | null;
  eta_seconds: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type RAFilterTab = 'all' | 'ready' | 'processing' | 'pending' | 'failed';

export interface RALibraryFilters {
  tab: RAFilterTab;
  search: string;
}

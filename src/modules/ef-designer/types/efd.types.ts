export interface EFDSession {
  id: string;
  created_by: string;
  current_step: number;
  status: 'draft' | 'in_progress' | 'completed' | 'published';
  theme_id: string | null;
  business_request_id: string | null;
  text_input: string | null;
  text_word_count: number;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  is_published: boolean;
  published_at: string | null;
  is_pushed_to_catalyst: boolean;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
}

export interface EFDDocument {
  id: string;
  session_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: 'pdf' | 'docx' | 'txt';
  mime_type: string;
  page_count: number | null;
  extracted_text: string | null;
  is_parsed: boolean;
  parsed_at: string | null;
  upload_order: number;
  created_at: string;
}

export interface EFDAtom {
  id: string;
  session_id: string;
  atom_key: string;
  text: string;
  text_ar: string | null;
  type: 'FR' | 'NFR';
  nfr_type: string | null;
  priority: 'Must' | 'Should' | 'Could' | 'Wont';
  complexity: 'Low' | 'Medium' | 'High' | null;
  source_document_id: string | null;
  source_type: 'document' | 'text_input';
  source_page: number | null;
  source_paragraph: number | null;
  trace_anchor: string | null;
  ai_suggested: boolean;
  ai_confidence: number | null;
  ai_suggested_feature: string | null;
  ai_accepted: boolean | null;
  ai_rejected: boolean | null;
  status: 'unmapped' | 'mapped' | 'excluded';
  mapped_to_feature_id: string | null;
  is_excluded: boolean;
  exclude_reason: string | null;
  exclude_detail: string | null;
  created_at: string;
  updated_at: string;
}

export interface EFDEpic {
  id: string;
  session_id: string;
  epic_key: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  state: 'Funnel' | 'Analyzing' | 'Portfolio Backlog' | 'Implementing' | 'Done';
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | null;
  lbc_hypothesis: string | null;
  lbc_business_outcome: string | null;
  lbc_leading_indicators: string | null;
  lbc_nfrs: string | null;
  wsjf_business_value: number | null;
  wsjf_time_criticality: number | null;
  wsjf_risk_reduction: number | null;
  wsjf_job_size: number | null;
  mvp_definition: string | null;
  reporter_id: string | null;
  assignee_id: string | null;
  is_selected_for_features: boolean;
  catalyst_epic_id: string | null;
  is_synced_to_catalyst: boolean;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EFDFeature {
  id: string;
  session_id: string;
  epic_id: string;
  feature_key: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  state: 'Defined' | 'In Progress' | 'Done';
  program_increment: string | null;
  target_sprint: string | null;
  benefit_hypothesis: string | null;
  acceptance_criteria: string | null;
  assignee_id: string | null;
  catalyst_feature_id: string | null;
  is_synced_to_catalyst: boolean;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EFDTraceLink {
  id: string;
  session_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  link_type: 'derives' | 'implements' | 'tests' | 'refines' | 'traces';
  direction: 'forward' | 'backward' | 'bidirectional';
  status: 'active' | 'suspect' | 'deleted';
  created_at: string;
  created_by: string | null;
}

export interface EFDAuditLog {
  id: string;
  session_id: string;
  action: string;
  detail: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export const EFD_STEPS = [
  { id: 0, name: 'Setup', description: 'Upload documents or enter text' },
  { id: 1, name: 'Parse', description: 'Extract requirements' },
  { id: 2, name: 'Configure', description: 'Link to theme & BR' },
  { id: 3, name: 'Generate Epics', description: 'Create SAFe epics' },
  { id: 4, name: 'Select Epics', description: 'Choose for features' },
  { id: 5, name: 'Generate Features', description: 'Create features' },
  { id: 6, name: 'Mapping', description: 'Map atoms to features' },
  { id: 7, name: 'RTM', description: 'Traceability matrix' },
  { id: 8, name: 'QA Gates', description: 'Validate quality' },
  { id: 9, name: 'Approval', description: 'Get approval' },
  { id: 10, name: 'Publish', description: 'Export or push' },
] as const;

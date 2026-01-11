// ============================================================
// IMPROVEMENT IDEAS MODULE - TYPES
// ============================================================

export type ImprovementInitiativeStatus = 'draft' | 'active' | 'collecting' | 'evaluating' | 'closed' | 'archived';
export type ImprovementVisibility = 'internal' | 'external' | 'both';
export type ImprovementVotingType = 'simple' | 'weighted' | 'token';
export type ImprovementIdeaStatus = 'draft' | 'submitted' | 'under_review' | 'scoring' | 'approved' | 'rejected' | 'deferred' | 'converted' | 'archived';
export type ImprovementSubmitterType = 'employee' | 'investor' | 'partner' | 'public';
export type ImprovementVoteType = 'for' | 'against';
export type ImprovementIdeaCategory = 
  | 'licensing_improvement' 
  | 'compliance_automation' 
  | 'investor_experience' 
  | 'process_optimization' 
  | 'digital_service' 
  | 'integration' 
  | 'data_quality' 
  | 'accessibility' 
  | 'security_enhancement' 
  | 'reporting_analytics' 
  | 'mobile_capability' 
  | 'other';

export interface ImprovementInitiativeSettings {
  require_arabic: boolean;
  allow_anonymous: boolean;
  moderation_required: boolean;
  max_ideas_per_user: number;
  voting_enabled: boolean;
  comments_enabled: boolean;
}

export interface ImprovementInitiative {
  id: string;
  code: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  status: ImprovementInitiativeStatus;
  visibility: ImprovementVisibility;
  voting_type: ImprovementVotingType;
  start_date?: string;
  end_date?: string;
  owner_id?: string;
  product_id?: string;
  settings: ImprovementInitiativeSettings;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Computed
  idea_count?: number;
  vote_count?: number;
}

export interface ImprovementIdea {
  id: string;
  code: string;
  initiative_id?: string;
  title: string;
  title_ar?: string;
  description: string;
  description_ar?: string;
  category: ImprovementIdeaCategory;
  status: ImprovementIdeaStatus;
  submitter_id?: string;
  submitter_type: ImprovementSubmitterType;
  submitter_name?: string;
  submitter_email?: string;
  is_anonymous: boolean;
  for_votes: number;
  against_votes: number;
  total_votes: number;
  ai_category?: ImprovementIdeaCategory;
  ai_compliance_tags: string[];
  ai_v2030_mapping: string[];
  ai_duplicate_ids: string[];
  ai_summary?: string;
  ai_summary_ar?: string;
  converted_to_br_id?: string;
  converted_at?: string;
  converted_by?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joined data
  initiative?: ImprovementInitiative;
  impact_score?: ImpactScore;
  submitter?: { full_name: string; avatar_url?: string };
}

export interface ImpactScore {
  id: string;
  idea_id: string;
  imperative?: number;
  ministry_efficiency?: number;
  pain_severity?: number;
  alignment?: number;
  complexity?: number;
  timeframe?: number;
  calculated_score?: number;
  justification?: string;
  scored_by?: string;
  ai_assisted: boolean;
  version: number;
  is_current: boolean;
  created_at: string;
}

export interface IdeaVote {
  id: string;
  idea_id: string;
  user_id: string;
  vote_type: ImprovementVoteType;
  importance_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  is_internal: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  user?: { full_name: string; avatar_url?: string };
  replies?: IdeaComment[];
}

export interface IdeaTag {
  id: string;
  name: string;
  name_ar?: string;
  color: string;
  usage_count: number;
}

export interface IdeaAttachment {
  id: string;
  idea_id: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  storage_path: string;
  uploaded_by?: string;
  created_at: string;
}

// Analytics types
export interface IdeasHubMetrics {
  totalIdeas: number;
  pendingReview: number;
  avgImpactScore: number;
  conversionRate: number;
  activeInitiatives: number;
}

// Category display labels
export const IDEA_CATEGORY_LABELS: Record<ImprovementIdeaCategory, string> = {
  licensing_improvement: 'Licensing Improvement',
  compliance_automation: 'Compliance Automation',
  investor_experience: 'Investor Experience',
  process_optimization: 'Process Optimization',
  digital_service: 'Digital Service',
  integration: 'Integration',
  data_quality: 'Data Quality',
  accessibility: 'Accessibility',
  security_enhancement: 'Security Enhancement',
  reporting_analytics: 'Reporting & Analytics',
  mobile_capability: 'Mobile Capability',
  other: 'Other',
};

export const IDEA_STATUS_LABELS: Record<ImprovementIdeaStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  scoring: 'Scoring',
  approved: 'Approved',
  rejected: 'Rejected',
  deferred: 'Deferred',
  converted: 'Converted',
  archived: 'Archived',
};

export const INITIATIVE_STATUS_LABELS: Record<ImprovementInitiativeStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  collecting: 'Collecting Ideas',
  evaluating: 'Evaluating',
  closed: 'Closed',
  archived: 'Archived',
};

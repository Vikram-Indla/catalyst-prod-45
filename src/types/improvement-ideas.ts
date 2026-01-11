// ============================================================
// IMPROVEMENT IDEAS MODULE - TYPES (Hybrid Model)
// ============================================================

// Status types - Extended for Hybrid Model
export type ImprovementInitiativeStatus = 
  | 'draft' 
  | 'active' 
  | 'collecting' 
  | 'evaluating' 
  | 'validated'    // Ready for BR conversion
  | 'converted'    // BR created
  | 'closed' 
  | 'archived';

export type ImprovementIdeaStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'triaged'           // Classified as quick_win or strategic
  | 'scoring' 
  | 'quick_win_approved' // Quick win path: ready for BR
  | 'linked'             // Strategic path: linked to initiative
  | 'approved'           // Legacy/general approved
  | 'rejected' 
  | 'deferred' 
  | 'converted'          // BR created
  | 'archived';

// Idea Type Classification (Triage Result)
export type IdeaType = 'standard' | 'quick_win' | 'strategic';

export type ImprovementVisibility = 'internal' | 'external' | 'both';
export type ImprovementVotingType = 'simple' | 'weighted' | 'token';
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
  auto_link_similar?: boolean;
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
  // BR Conversion (Strategic Path Exit)
  business_request_id?: string;
  converted_at?: string;
  converted_by?: string;
  conversion_notes?: string;
  // Aggregated stats
  ideas_count: number;
  total_votes: number;
  avg_impact_score: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Computed/Joined
  owner?: { full_name: string; avatar_url?: string };
  ideas?: ImprovementIdea[];
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
  // Idea Type Classification (Triage Result)
  idea_type: IdeaType;
  triaged_at?: string;
  triaged_by?: string;
  triage_notes?: string;
  // Submitter Info
  submitter_id?: string;
  submitter_type: ImprovementSubmitterType;
  submitter_name?: string;
  submitter_email?: string;
  is_anonymous: boolean;
  // Vote counts
  for_votes: number;
  against_votes: number;
  total_votes: number;
  // AI fields
  ai_category?: ImprovementIdeaCategory;
  ai_compliance_tags: string[];
  ai_v2030_mapping: string[];
  ai_duplicate_ids: string[];
  ai_summary?: string;
  ai_summary_ar?: string;
  ai_suggested_type?: IdeaType;
  // BR Conversion (Quick Win Path Exit)
  business_request_id?: string;
  converted_at?: string;
  converted_by?: string;
  conversion_notes?: string;
  source_type: 'direct' | 'initiative';
  // Legacy field (for backwards compat)
  converted_to_br_id?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joined data
  initiative?: ImprovementInitiative;
  impact_score?: ImpactScore;
  submitter?: { full_name: string; avatar_url?: string };
  business_request?: { id: string; request_key: string; title: string };
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

export interface IdeaStatusHistory {
  id: string;
  idea_id: string;
  from_status?: ImprovementIdeaStatus;
  to_status: ImprovementIdeaStatus;
  changed_by?: string;
  change_reason?: string;
  metadata: {
    idea_type?: IdeaType;
    initiative_id?: string;
    business_request_id?: string;
  };
  created_at: string;
  // Joined
  changed_by_user?: { full_name: string };
}

// Analytics types
export interface IdeasHubMetrics {
  totalIdeas: number;
  pendingReview: number;
  quickWinsPending: number;
  strategicIdeas: number;
  avgImpactScore: number;
  conversionRate: number;
  activeInitiatives: number;
}

export interface ConversionFunnelMetrics {
  submitted: number;
  triaged: number;
  quickWins: number;
  quickWinsConverted: number;
  strategic: number;
  linkedToInitiative: number;
  strategicConverted: number;
}

export interface PathComparisonMetrics {
  quickWinPath: {
    avgTimeToConvert: number;
    ideasPerBR: number;
    avgImpact: number;
    successRate: number;
  };
  strategicPath: {
    avgTimeToConvert: number;
    ideasPerBR: number;
    avgImpact: number;
    successRate: number;
  };
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
  triaged: 'Triaged',
  scoring: 'Scoring',
  quick_win_approved: 'Quick Win Approved',
  linked: 'Linked to Initiative',
  approved: 'Approved',
  rejected: 'Rejected',
  deferred: 'Deferred',
  converted: 'Converted to BR',
  archived: 'Archived',
};

export const INITIATIVE_STATUS_LABELS: Record<ImprovementInitiativeStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  collecting: 'Collecting Ideas',
  evaluating: 'Evaluating',
  validated: 'Validated',
  converted: 'Converted to BR',
  closed: 'Closed',
  archived: 'Archived',
};

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = {
  standard: 'Standard',
  quick_win: 'Quick Win',
  strategic: 'Strategic',
};

export const IDEA_TYPE_COLORS: Record<IdeaType, { bg: string; text: string; border: string }> = {
  standard: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  quick_win: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' },
  strategic: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
};

export const IDEA_TYPE_ICONS = {
  standard: null,
  quick_win: '🚀',
  strategic: '📦',
};

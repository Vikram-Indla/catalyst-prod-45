// ==============================================
// IDEATION MODULE - TYPE DEFINITIONS
// Based on Jira Align Ideation specification
// ==============================================

export type IdeaCategory = 'Enhancement' | 'Question' | 'Ticket';
export type IdeaStatus = 'New' | 'Open' | 'Planned' | 'Completed' | 'Shelved';
export type TShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type VotingType = 'ForAgainst' | 'Token';
export type VoteType = 'For' | 'Against' | 'Token';
export type WorkItemType = 'Epic' | 'Feature' | 'Story';
export type FormFieldType = 'textbox' | 'opentext' | 'dropdown';

// Core Entities
export interface IdeaGroup {
  id: string;
  name: string;
  category: IdeaCategory;
  is_enabled: boolean;
  is_public: boolean;
  make_states_public: boolean;
  allow_voting: boolean;
  voting_type: VotingType;
  max_votes_per_idea: number | null;
  total_user_tokens: number;
  approve_external_users: boolean;
  external_link: string | null;
  form_id: string | null;
  product_id: string | null;
  admin_user_ids: string[];
  contributor_user_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  idea_group_id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  t_shirt_size: TShirtSize | null;
  is_public: boolean;
  owner_id: string;
  created_by_id: string;
  product_id: string | null;
  customer_id: string | null;
  work_item_id: string | null;
  work_item_type: WorkItemType | null;
  vote_score: number;
  for_votes: number;
  against_votes: number;
  token_votes: number;
  comment_count: number;
  attachment_count: number;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  created_by?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  idea_group?: IdeaGroup;
}

export interface IdeationVote {
  id: string;
  idea_id: string;
  user_id: string;
  vote_type: VoteType;
  token_count: number;
  created_at: string;
}

export interface IdeationComment {
  id: string;
  idea_id: string;
  user_id: string;
  is_external: boolean;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface IdeationAttachment {
  id: string;
  idea_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by_id: string;
  is_external: boolean;
  created_at: string;
}

export interface IdeationSubscription {
  id: string;
  idea_id: string;
  user_id: string;
  is_external: boolean;
  created_at: string;
}

export interface IdeationForm {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  fields?: IdeationFormField[];
}

export interface IdeationFormField {
  id: string;
  form_id: string;
  label: string;
  field_type: FormFieldType;
  options: string[];
  is_active: boolean;
  is_required: boolean;
  is_external: boolean;
  help_text: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface IdeationExternalUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_enabled: boolean;
  is_approved: boolean;
  registered_group_ids: string[];
  created_at: string;
  last_login_at: string | null;
}

// API Request/Response Types
export interface CreateIdeaRequest {
  idea_group_id: string;
  title: string;
  description: string;
  owner_id: string;
  is_public?: boolean;
  product_id?: string;
  customer_id?: string;
  custom_fields?: Record<string, any>;
}

export interface UpdateIdeaRequest {
  title?: string;
  description?: string;
  status?: IdeaStatus;
  t_shirt_size?: TShirtSize;
  owner_id?: string;
  is_public?: boolean;
  product_id?: string;
  customer_id?: string;
  work_item_id?: string;
  work_item_type?: WorkItemType;
  custom_fields?: Record<string, any>;
}

export interface CastVoteRequest {
  vote_type: VoteType;
  token_count?: number;
}

export interface CreateIdeaGroupRequest {
  name: string;
  category: IdeaCategory;
  is_public?: boolean;
  voting_type?: VotingType;
  form_id?: string;
  product_id?: string;
}

export interface UpdateIdeaGroupRequest {
  name?: string;
  category?: IdeaCategory;
  is_enabled?: boolean;
  is_public?: boolean;
  make_states_public?: boolean;
  allow_voting?: boolean;
  voting_type?: VotingType;
  max_votes_per_idea?: number;
  total_user_tokens?: number;
  approve_external_users?: boolean;
  form_id?: string;
  product_id?: string;
  admin_user_ids?: string[];
  contributor_user_ids?: string[];
}

// Filter Types
export interface IdeaFilters {
  status?: IdeaStatus[];
  search?: string;
  owner_id?: string;
  created_by_id?: string;
  has_votes?: boolean;
  has_comments?: boolean;
}

export type IdeaSortField = 'created_at' | 'vote_score' | 'title' | 'status' | 'updated_at';
export type SortDirection = 'asc' | 'desc';

export interface IdeaSort {
  field: IdeaSortField;
  direction: SortDirection;
}

// Metrics Types
export interface IdeationMetrics {
  total_ideas: number;
  total_managed: number; // Planned + Completed + Shelved
  total_with_votes: number;
  total_with_comments: number;
  percent_managed: number;
  percent_with_votes: number;
  percent_with_comments: number;
  user_contributed: number;
  user_with_votes: number;
  user_with_comments: number;
  percent_user_contributed: number;
  percent_user_with_votes: number;
  percent_user_with_comments: number;
}

// Status color mapping
export const IDEA_STATUS_COLORS: Record<IdeaStatus, string> = {
  'New': 'bg-blue-100 text-blue-800 border-blue-200',
  'Open': 'bg-amber-100 text-amber-800 border-amber-200',
  'Planned': 'bg-purple-100 text-purple-800 border-purple-200',
  'Completed': 'bg-green-100 text-green-800 border-green-200',
  'Shelved': 'bg-gray-100 text-gray-800 border-gray-200',
};

export const T_SHIRT_SIZE_ORDER: TShirtSize[] = ['XS', 'S', 'M', 'L', 'XL'];

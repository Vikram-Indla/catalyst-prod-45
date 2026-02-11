export type CatyMessageRole = 'user' | 'assistant' | 'system';
export type CatyMessageStatus = 'pending' | 'streaming' | 'complete' | 'error';
export type CatySuggestionType = 'test_case' | 'test_step' | 'test_data' | 'coverage_gap' | 'risk_area' | 'query_result';
export type CatySuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'modified';
export type CatyConversationType = 'chat' | 'generation' | 'analysis' | 'query';

export interface CatyConversation {
  id: string;
  user_id: string;
  project_id: string;
  title: string | null;
  conversation_type: CatyConversationType;
  context_type: string | null;
  context_id: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface CatyMessage {
  id: string;
  conversation_id: string;
  role: CatyMessageRole;
  content: string;
  structured_content: any | null;
  status: CatyMessageStatus;
  error_message: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  response_time_ms: number | null;
  model_used: string | null;
  feedback_rating: -1 | 0 | 1 | null;
  feedback_comment: string | null;
  sequence_number: number;
  created_at: string;
}

export interface CatySuggestion {
  id: string;
  message_id: string | null;
  conversation_id: string;
  project_id: string;
  suggestion_type: CatySuggestionType;
  content: any;
  display_order: number;
  status: CatySuggestionStatus;
  created_entity_type: string | null;
  created_entity_id: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export interface GeneratedTestCase {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  preconditions?: string;
  steps: {
    step_number: number;
    action: string;
    expected_result: string;
    test_data?: string;
  }[];
  postconditions?: string;
}

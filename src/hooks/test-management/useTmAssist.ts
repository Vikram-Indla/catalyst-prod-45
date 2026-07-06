/**
 * useTmAssist — client for the ai-tm-assist edge function (CAT-TESTHUB-V2 D6/H4).
 *
 * Nine governed ops; output is a DRAFT PROPOSAL only. Nothing is persisted by
 * the hook — the caller routes results through explicit accept/reject before
 * any DB write. Quota / config / gateway errors surface verbatim so the UI can
 * show a SectionMessage rather than a silent failure.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TmAssistOp =
  | 'complete'
  | 'improve'
  | 'correct'
  | 'convert_uat'
  | 'coverage'
  | 'gaps'
  | 'link_suggest'
  | 'sprint_risk'
  | 'release_risk';

export interface TmAssistCaseEdit {
  updated_case: {
    title: string;
    objective: string;
    preconditions: string;
    steps: Array<{ step_number: number; action: string; expected_result: string; test_data: string }>;
  };
  changes: string[];
  rationale: string;
}

export interface TmAssistAnalysis {
  covered: string[];
  gaps: string[];
  suggestions: string[];
}

export interface TmAssistLinks {
  suggestions: Array<{ external_key: string; requirement_type: string; reason: string }>;
}

export interface TmAssistRisk {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  top_risks: string[];
  recommendations: string[];
}

export interface TmAssistResponse<T = unknown> {
  op: TmAssistOp;
  anchor: string;
  language: 'en' | 'ar';
  draft_only: true;
  result: T;
  model: string;
}

export interface TmAssistInput {
  op: TmAssistOp;
  language?: 'en' | 'ar';
  project_id?: string | null;
  case_key?: string;
  issue_key?: string;
  sprint_id?: string;
  release_id?: string;
}

/** Maps the edge fn's error envelope to a human message. */
function messageForError(err: { error?: string; message?: string } | null): string {
  if (!err) return 'The AI assistant is unavailable right now.';
  switch (err.error) {
    case 'config_error':
      return 'AI is not configured yet (missing API key). Ask an admin to enable it.';
    case 'quota_exceeded':
      return err.message || 'Daily AI limit reached — try again tomorrow.';
    case 'cooldown':
      return err.message || 'Please wait a moment before the next AI request.';
    case 'rate_limited':
      return 'AI is rate limited right now — retry shortly.';
    case 'refusal':
      return 'The model declined this request.';
    default:
      return err.message || 'AI request failed.';
  }
}

export function useTmAssist<T = unknown>() {
  return useMutation<TmAssistResponse<T>, Error, TmAssistInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke('ai-tm-assist', { body: input });
      // supabase.functions.invoke surfaces non-2xx as error with context; the
      // fn also returns a JSON error envelope in data for some paths.
      if (error) {
        // Try to read the structured envelope the fn returns
        const envelope = (data ?? null) as { error?: string; message?: string } | null;
        throw new Error(messageForError(envelope) || error.message);
      }
      const envelope = data as { error?: string } | TmAssistResponse<T>;
      if (envelope && 'error' in envelope && envelope.error) {
        throw new Error(messageForError(envelope as { error?: string; message?: string }));
      }
      return data as TmAssistResponse<T>;
    },
  });
}

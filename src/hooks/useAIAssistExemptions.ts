import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from './useAIAssistDrafts';

export type ExemptionType = 
  | 'OCR_UNREADABLE'
  | 'LOW_CONFIDENCE'
  | 'MISSING_PAGE'
  | 'MANUAL_FALLBACK_USED'
  | 'COMPLIANCE_INCONCLUSIVE'
  | 'UNANSWERED_QUESTIONS';

export interface AIAssistExemption {
  id: string;
  draft_id: string;
  run_id: string | null;
  exemption_type: ExemptionType;
  page_from: number | null;
  page_to: number | null;
  description_en: string;
  description_ar: string | null;
  impact_en: string | null;
  impact_ar: string | null;
  mitigation_en: string | null;
  mitigation_ar: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateExemptionInput {
  draft_id: string;
  run_id?: string;
  exemption_type: ExemptionType;
  page_from?: number;
  page_to?: number;
  description_en: string;
  description_ar?: string;
  impact_en?: string;
  impact_ar?: string;
  mitigation_en?: string;
  mitigation_ar?: string;
}

// Fetch all exemptions for a draft
export function useAIAssistExemptions(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-exemptions', draftId],
    queryFn: async (): Promise<AIAssistExemption[]> => {
      if (!draftId) return [];

      const { data, error } = await supabase
        .from('ai_assist_exemptions')
        .select('*')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAssistExemption[];
    },
    enabled: !!draftId,
  });
}

// Create a new exemption
export function useCreateExemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExemptionInput): Promise<AIAssistExemption> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from('ai_assist_exemptions')
        .insert({
          draft_id: input.draft_id,
          run_id: input.run_id,
          exemption_type: input.exemption_type,
          page_from: input.page_from,
          page_to: input.page_to,
          description_en: input.description_en,
          description_ar: input.description_ar,
          impact_en: input.impact_en,
          impact_ar: input.impact_ar,
          mitigation_en: input.mitigation_en,
          mitigation_ar: input.mitigation_ar,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await logAuditEvent(input.draft_id, input.run_id || null, 'state_corrected' as any, userId, {
        exemption_type: input.exemption_type,
        description: input.description_en,
      });

      return data as AIAssistExemption;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-exemptions', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-draft', data.draft_id] });
      toast.success('Exemption recorded');
    },
    onError: (error) => {
      toast.error('Failed to create exemption: ' + error.message);
    },
  });
}

// Get exemption type display info
export function getExemptionTypeInfo(type: ExemptionType): { label: string; labelAr: string; severity: 'low' | 'medium' | 'high' } {
  const info: Record<ExemptionType, { label: string; labelAr: string; severity: 'low' | 'medium' | 'high' }> = {
    OCR_UNREADABLE: { label: 'OCR Unreadable', labelAr: 'التعرف الضوئي غير قابل للقراءة', severity: 'high' },
    LOW_CONFIDENCE: { label: 'Low OCR Confidence', labelAr: 'ثقة التعرف الضوئي منخفضة', severity: 'medium' },
    MISSING_PAGE: { label: 'Missing Page', labelAr: 'صفحة مفقودة', severity: 'high' },
    MANUAL_FALLBACK_USED: { label: 'Manual Text Used', labelAr: 'تم استخدام النص اليدوي', severity: 'medium' },
    COMPLIANCE_INCONCLUSIVE: { label: 'Compliance Inconclusive', labelAr: 'الامتثال غير حاسم', severity: 'medium' },
    UNANSWERED_QUESTIONS: { label: 'Unanswered Questions', labelAr: 'أسئلة بدون إجابة', severity: 'low' },
  };
  return info[type];
}

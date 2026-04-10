import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery, typedQuery, typedQuery } from '@/integrations/supabase/client';
import { CatyConversation, CatyMessage } from '@/types/caty-ai';
import { toast } from 'sonner';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export function useCatyConversations(userId: string, projectId?: string) {
  return useQuery({
    queryKey: ['caty-conversations', userId, projectId],
    queryFn: async () => {
      const { data, error } = await typedQuery('caty_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId || DEFAULT_PROJECT_ID)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as CatyConversation[];
    },
    enabled: !!userId,
  });
}

export function useCatyMessages(conversationId: string) {
  return useQuery({
    queryKey: ['caty-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await typedQuery('caty_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sequence_number', { ascending: true });
      if (error) throw new Error(error.message);
      return data as CatyMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useCreateCatyConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, projectId, type = 'chat' }: { userId: string; projectId: string; type?: string }) => {
      const { data, error } = await typedQuery('caty_conversations')
        .insert({ user_id: userId, project_id: projectId, conversation_type: type })
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Log conversation_started analytics
      await typedQuery('caty_analytics').insert({
        project_id: projectId,
        user_id: userId,
        conversation_id: data.id,
        event_type: 'conversation_started',
        event_data: { conversation_type: type },
      });

      return data as CatyConversation;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['caty-conversations'] }); },
  });
}

export function useDeleteCatyConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await typedQuery('caty_conversations').delete().eq('id', conversationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caty-conversations'] });
      toast.success('Conversation deleted');
    },
  });
}

export function useSendCatyMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      // Get next sequence
      const { data: seqData } = await typedRpc('get_next_caty_message_sequence', { p_conversation_id: conversationId });

      // Insert user message
      const { data: userMsg, error: userError } = await typedQuery('caty_messages')
        .insert({ conversation_id: conversationId, role: 'user', content, sequence_number: seqData || 1, status: 'complete' })
        .select()
        .single();
      if (userError) throw new Error(userError.message);

      // Call edge function
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('caty-chat', {
        body: { conversation_id: conversationId, message: content },
      });
      if (aiError) throw new Error(aiError.message || 'Failed to get AI response');

      return { userMessage: userMsg, aiResponse };
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['caty-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['caty-conversations'] });
    },
    onError: (error) => {
      toast.error('Failed to send message');
      console.error(error);
    },
  });
}

export function useCatyFeedback() {
  return useMutation({
    mutationFn: async ({ messageId, rating }: { messageId: string; rating: -1 | 1 }) => {
      const { error } = await typedQuery('caty_messages')
        .update({ feedback_rating: rating, feedback_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success('Thanks for your feedback!'),
  });
}

export function useGenerateCatyTestCases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, userId, input, options }: { projectId: string; userId: string; input: string; options: any }) => {
      // Create conversation
      const { data: conversation, error: convError } = await typedQuery('caty_conversations')
        .insert({ user_id: userId, project_id: projectId, conversation_type: 'generation', title: `Test Generation - ${new Date().toLocaleDateString()}` })
        .select()
        .single();
      if (convError) throw new Error(convError.message);

      const { data, error } = await supabase.functions.invoke('caty-generate', {
        body: { conversation_id: conversation.id, project_id: projectId, input_content: input, options },
      });
      if (error) throw new Error(error.message || 'Generation failed');

      return { conversationId: conversation.id, testCases: data.test_cases, suggestions: data.suggestions };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['caty-conversations'] }); },
    onError: (e) => { toast.error('Failed to generate test cases'); console.error(e); },
  });
}

export function useSaveCatyGeneratedTests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, folderId, testCases, suggestionIds }: { projectId: string; folderId?: string; testCases: any[]; suggestionIds: string[] }) => {
      const savedIds: string[] = [];
      for (const tc of testCases) {
        const { data: testCase, error: tcError } = await typedQuery('tm_test_cases')
          .insert({ project_id: projectId, folder_id: folderId || null, title: tc.title, description: tc.description, preconditions: tc.preconditions, status: 'draft', automation_status: 'manual', case_key: `TC-AI-${Date.now()}` })
          .select()
          .single();
        if (tcError) throw new Error(tcError.message);

        if (tc.steps?.length > 0) {
          await typedQuery('tm_test_steps').insert(
            tc.steps.map((s: any) => ({ test_case_id: testCase.id, step_number: s.step_number, action: s.action, expected_result: s.expected_result, test_data: s.test_data }))
          );
        }
        savedIds.push(testCase.id);
      }

      if (suggestionIds.length > 0) {
        await typedQuery('caty_suggestions').update({ status: 'accepted', processed_at: new Date().toISOString() }).in('id', suggestionIds);
      }
      return savedIds;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`${ids.length} test cases saved`);
    },
    onError: (e) => { toast.error('Failed to save test cases'); console.error(e); },
  });
}

export function useAnalyzeCatyCoverage() {
  return useMutation({
    mutationFn: async ({ projectId, userId, scope }: { projectId: string; userId: string; scope?: any }) => {
      const { data, error } = await supabase.functions.invoke('caty-analyze', {
        body: { project_id: projectId, user_id: userId, analysis_type: 'coverage', scope },
      });
      if (error) throw new Error(error.message || 'Analysis failed');
      return data;
    },
    onError: (e) => { toast.error('Failed to analyze coverage'); console.error(e); },
  });
}

export function useCatyNaturalQuery() {
  return useMutation({
    mutationFn: async ({ projectId, question }: { projectId: string; question: string }) => {
      const { data, error } = await supabase.functions.invoke('caty-query', {
        body: { project_id: projectId, question },
      });
      if (error) throw new Error(error.message || 'Query failed');
      return data;
    },
  });
}

export function useCatySuggestStep() {
  return useMutation({
    mutationFn: async ({ projectId, testCaseTitle, testCaseDescription, existingSteps }: {
      projectId: string; testCaseTitle: string; testCaseDescription?: string;
      existingSteps: Array<{ action: string; expected_result: string }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('caty-suggest-step', {
        body: { project_id: projectId, test_case_title: testCaseTitle, test_case_description: testCaseDescription, existing_steps: existingSteps },
      });
      if (error) throw new Error(error.message || 'Suggestion failed');
      return data;
    },
  });
}

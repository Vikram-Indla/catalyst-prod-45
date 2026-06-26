import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface CommandStep {
  id: string;
  label: string;
  action_type: string;
  params: Record<string, unknown>;
  rollback_label?: string;
}

export interface CommandPlan {
  summary: string;
  steps: CommandStep[];
  warnings: string[];
}

export interface StepResult {
  id: string;
  label: string;
  status: 'success' | 'failed' | 'rolled_back' | 'skipped';
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  plan?: CommandPlan;
  steps?: StepResult[];
  rolled_back?: boolean;
}

type AssistantStatus = 'idle' | 'loading' | 'awaiting_confirm' | 'executing';

let _msgId = 0;
function nextId() { return `m${++_msgId}`; }

export function useAdminAiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [pendingPlan, setPendingPlan] = useState<CommandPlan | null>(null);

  const appendMsg = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (status !== 'idle') return;

    appendMsg({ id: nextId(), role: 'user', text });
    setStatus('loading');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Build history for Gemini context (last 10 exchanges)
      const historyForApi = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const { data, error } = await supabase.functions.invoke('ai-admin-assistant', {
        body: { message: text, history: historyForApi },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data.type === 'plan') {
        setPendingPlan(data.plan);
        appendMsg({ id: nextId(), role: 'assistant', text: data.text, plan: data.plan });
        setStatus('awaiting_confirm');
      } else {
        appendMsg({ id: nextId(), role: 'assistant', text: data.text });
        setStatus('idle');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      catalystToast.error('AI assistant error: ' + msg);
      appendMsg({ id: nextId(), role: 'assistant', text: `Error: ${msg}` });
      setStatus('idle');
    }
  }, [status, messages, appendMsg]);

  const confirmPlan = useCallback(async () => {
    if (!pendingPlan || status !== 'awaiting_confirm') return;
    setStatus('executing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-admin-assistant', {
        body: { action: 'execute', plan: pendingPlan },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const resultMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        text: data.success
          ? `Done. ${pendingPlan.steps.length} step${pendingPlan.steps.length !== 1 ? 's' : ''} completed.`
          : `Execution failed${data.rolled_back ? ' — changes rolled back' : ''}.`,
        steps: data.steps,
        rolled_back: data.rolled_back,
      };
      appendMsg(resultMsg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      catalystToast.error('Execution failed: ' + msg);
      appendMsg({ id: nextId(), role: 'assistant', text: `Execution error: ${msg}` });
    } finally {
      setPendingPlan(null);
      setStatus('idle');
    }
  }, [pendingPlan, status, appendMsg]);

  const cancelPlan = useCallback(() => {
    setPendingPlan(null);
    appendMsg({ id: nextId(), role: 'assistant', text: 'Cancelled. What else can I help with?' });
    setStatus('idle');
  }, [appendMsg]);

  const reset = useCallback(() => {
    setMessages([]);
    setPendingPlan(null);
    setStatus('idle');
  }, []);

  return { messages, status, pendingPlan, sendMessage, confirmPlan, cancelPlan, reset };
}

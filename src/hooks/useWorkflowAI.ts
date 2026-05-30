/**
 * useWorkflowAI — Manages the Ask CATY workflow AI session.
 *
 * Responsibilities:
 *  - Call the workflow-ai edge function with the user's prompt + conversation history
 *  - Apply AI proposals to Supabase via typedQuery (user JWT, not service role)
 *  - Track an undo stack so "Restore to session start" can reverse every change
 *  - Provide restoreSession() that replays the undo stack in reverse order
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { WorkflowStatus, WorkflowTransition } from './useCatalystWorkflow';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatusToAdd {
  name: string;
  slug: string;
  category: 'todo' | 'in_progress' | 'done';
  color: string;
  position: number;
  is_final?: boolean;
}

export interface StatusRef { id: string }

export interface StatusUpdate {
  id: string;
  name?: string;
  category?: 'todo' | 'in_progress' | 'done';
  position?: number;
  is_final?: boolean;
}

export interface TransitionToAdd {
  name: string | null;
  from_status_id: string | null;
  to_status_id: string; // may be "NEW:{statusName}" to ref a newly-added status
  is_global: boolean;
  sort_order: number;
}

export interface TransitionRef { id: string }

export interface WorkflowAIProposal {
  statusesToAdd: StatusToAdd[];
  statusesToRemove: StatusRef[];
  statusesToUpdate: StatusUpdate[];
  transitionsToAdd: TransitionToAdd[];
  transitionsToRemove: TransitionRef[];
}

export type WorkflowAIResponseType = 'proposal' | 'questions' | 'violation';

export interface WorkflowAIResponse {
  type: WorkflowAIResponseType;
  message: string;
  questions?: string[];
  violations?: string[];
  proposal?: WorkflowAIProposal;
}

export interface WorkflowAIMessage {
  id: string;
  role: 'user' | 'caty';
  content: string;
  response?: WorkflowAIResponse;
  applied?: boolean;
  rejected?: boolean;
}

type UndoType =
  | 'insert_status'
  | 'delete_status'
  | 'update_status'
  | 'insert_transition'
  | 'delete_transition';

interface UndoEntry {
  type: UndoType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseWorkflowAIOptions {
  schemeId: string;
  schemeName: string;
  issueType: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  onInvalidate: () => void;
}

export function useWorkflowAI({
  schemeId,
  schemeName,
  issueType,
  statuses,
  transitions,
  onInvalidate,
}: UseWorkflowAIOptions) {
  const [messages, setMessages] = useState<WorkflowAIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const hasUnappliedChanges = undoStack.length > 0;

  // ─── Send message to AI ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (userPrompt: string) => {
    if (!userPrompt.trim() || isLoading) return;

    const userMsg: WorkflowAIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userPrompt,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const fnUrl = `${supabaseUrl}/functions/v1/workflow-ai`;

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({
          issueType,
          schemeName,
          currentStatuses: statuses,
          currentTransitions: transitions,
          userPrompt,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const aiResponse: WorkflowAIResponse = await res.json();

      const catyMsg: WorkflowAIMessage = {
        id: crypto.randomUUID(),
        role: 'caty',
        content: aiResponse.message,
        response: aiResponse,
      };
      setMessages(prev => [...prev, catyMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'caty',
        content: 'Sorry, I ran into an error. Please try again.',
      }]);
      console.error('workflow-ai error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, issueType, schemeName, statuses, transitions, messages]);

  // ─── Apply a proposal to Supabase ───────────────────────────────────────────
  const applyProposal = useCallback(async (
    messageId: string,
    proposal: WorkflowAIProposal,
  ) => {
    const newUndoEntries: UndoEntry[] = [];
    // Map "NEW:{name}" → inserted uuid
    const newStatusIds: Record<string, string> = {};

    try {
      // 1. Insert new statuses
      for (const s of proposal.statusesToAdd ?? []) {
        const { data, error } = await typedQuery('catalyst_workflow_statuses')
          .insert({
            scheme_id: schemeId,
            name: s.name,
            slug: s.slug,
            category: s.category,
            color: s.color,
            position: s.position,
            is_initial: false,
            is_final: s.is_final ?? false,
            is_active: true,
          } as never)
          .select()
          .single();
        if (error) throw new Error(`Add status "${s.name}": ${error.message}`);
        newStatusIds[s.name] = (data as { id: string }).id;
        newUndoEntries.push({ type: 'insert_status', data: { id: (data as { id: string }).id } });
      }

      // 2. Update statuses
      for (const s of proposal.statusesToUpdate ?? []) {
        const original = statuses.find(st => st.id === s.id);
        const { id, ...updates } = s;
        const { error } = await typedQuery('catalyst_workflow_statuses')
          .update(updates as never)
          .eq('id', id);
        if (error) throw new Error(`Update status ${id}: ${error.message}`);
        newUndoEntries.push({ type: 'update_status', data: { id, original } });
      }

      // 3. Remove statuses
      for (const s of proposal.statusesToRemove ?? []) {
        const original = statuses.find(st => st.id === s.id);
        const { error } = await typedQuery('catalyst_workflow_statuses')
          .delete()
          .eq('id', s.id);
        if (error) throw new Error(`Remove status ${s.id}: ${error.message}`);
        newUndoEntries.push({ type: 'delete_status', data: original });
      }

      // 4. Insert transitions (resolve NEW: references)
      for (const t of proposal.transitionsToAdd ?? []) {
        const resolveId = (ref: string | null) => {
          if (!ref) return null;
          if (ref.startsWith('NEW:')) return newStatusIds[ref.slice(4)] ?? null;
          return ref;
        };
        const toId = resolveId(t.to_status_id);
        if (!toId) throw new Error(`Could not resolve to_status_id "${t.to_status_id}"`);
        const { data, error } = await typedQuery('catalyst_workflow_transitions')
          .insert({
            scheme_id: schemeId,
            name: t.name,
            from_status_id: resolveId(t.from_status_id),
            to_status_id: toId,
            is_global: t.is_global,
            sort_order: t.sort_order,
          } as never)
          .select()
          .single();
        if (error) throw new Error(`Add transition: ${error.message}`);
        newUndoEntries.push({ type: 'insert_transition', data: { id: (data as { id: string }).id } });
      }

      // 5. Remove transitions
      for (const t of proposal.transitionsToRemove ?? []) {
        const original = transitions.find(tr => tr.id === t.id);
        const { error } = await typedQuery('catalyst_workflow_transitions')
          .delete()
          .eq('id', t.id);
        if (error) throw new Error(`Remove transition ${t.id}: ${error.message}`);
        newUndoEntries.push({ type: 'delete_transition', data: original });
      }

      // Mark message as applied
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, applied: true } : m
      ));
      setUndoStack(prev => [...prev, ...newUndoEntries]);
      onInvalidate();
      catalystToast.success('Workflow updated');
    } catch (err: unknown) {
      catalystToast.error(`Apply failed: ${(err as Error).message}`);
      console.error('applyProposal error:', err);
    }
  }, [schemeId, statuses, transitions, onInvalidate]);

  // ─── Reject a proposal ──────────────────────────────────────────────────────
  const rejectProposal = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, rejected: true } : m
    ));
  }, []);

  // ─── Restore session — reverse the full undo stack ──────────────────────────
  const restoreSession = useCallback(async () => {
    if (undoStack.length === 0) return;
    try {
      for (const entry of [...undoStack].reverse()) {
        if (entry.type === 'insert_status') {
          await typedQuery('catalyst_workflow_statuses').delete().eq('id', entry.data.id);
        } else if (entry.type === 'delete_status' && entry.data) {
          await typedQuery('catalyst_workflow_statuses').insert(entry.data as never);
        } else if (entry.type === 'update_status' && entry.data?.original) {
          const { id, ...orig } = entry.data.original;
          await typedQuery('catalyst_workflow_statuses').update(orig as never).eq('id', id);
        } else if (entry.type === 'insert_transition') {
          await typedQuery('catalyst_workflow_transitions').delete().eq('id', entry.data.id);
        } else if (entry.type === 'delete_transition' && entry.data) {
          await typedQuery('catalyst_workflow_transitions').insert(entry.data as never);
        }
      }
      setUndoStack([]);
      setMessages([]);
      onInvalidate();
      catalystToast.success('Workflow restored to session start');
    } catch (err: unknown) {
      catalystToast.error(`Restore failed: ${(err as Error).message}`);
    }
  }, [undoStack, onInvalidate]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setUndoStack([]);
  }, []);

  return {
    messages,
    isLoading,
    hasUnappliedChanges,
    sendMessage,
    applyProposal,
    rejectProposal,
    restoreSession,
    clearMessages,
  };
}

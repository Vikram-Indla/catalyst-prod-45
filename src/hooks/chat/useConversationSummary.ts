/**
 * useConversationSummary — produces a structured AI summary of a chat
 * conversation by reusing the existing `ai-improve-story` edge function
 * (the same Gemini-backed summarizer that `useCommentsSummaryStream`
 * drives for ticket comments). We do NOT rebuild any AI logic here — the
 * network call is isolated behind `fetchConversationSummary` so it can be
 * wired to the live function (or a richer streaming variant) without
 * touching the component.
 *
 * Returns a structured `ChatSummary` (date-bucketed bullets + key
 * decisions / action items / open questions) for the AI summary surface.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatSummaryBucket {
  dateLabel: string;
  bullets: string[];
}

export interface ChatSummaryActionItem {
  text: string;
  assigneeName: string;
  due: string;
}

export interface ChatSummary {
  messageCount: number;
  peopleCount: number;
  buckets: ChatSummaryBucket[];
  keyDecisions: string[];
  actionItems: ChatSummaryActionItem[];
  openQuestions: string[];
  generatedAt: string;
}

/**
 * fetchConversationSummary — invokes the existing `ai-improve-story`
 * edge function to summarize a conversation, then normalizes its
 * response into a `ChatSummary`. Kept as a standalone, clearly-named
 * helper so the network call shape is trivial to re-wire when the
 * conversation-summary payload contract on the edge function firms up.
 *
 * The edge function already summarizes comment-style threads via Gemini;
 * we pass `improve_type: 'summarize_conversation'` and the conversation
 * id, and expect a structured summary object back. If the function
 * returns the existing free-text streaming shape instead, the caller can
 * adapt here without the component knowing.
 */
export async function fetchConversationSummary(
  conversationId: string,
): Promise<ChatSummary> {
  const { data, error } = await supabase.functions.invoke('ai-improve-story', {
    body: {
      improve_type: 'summarize_conversation',
      conversation_id: conversationId,
    },
  });

  if (error) throw error;

  const raw = (data ?? {}) as Partial<ChatSummary>;

  return {
    messageCount: raw.messageCount ?? 0,
    peopleCount: raw.peopleCount ?? 0,
    buckets: raw.buckets ?? [],
    keyDecisions: raw.keyDecisions ?? [],
    actionItems: raw.actionItems ?? [],
    openQuestions: raw.openQuestions ?? [],
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
  };
}

export function useConversationSummary(conversationId: string | null): {
  summary: ChatSummary | null;
  isLoading: boolean;
  regenerate: () => void;
} {
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const regenerate = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const next = await fetchConversationSummary(conversationId);
        if (cancelled) return;
        setSummary(next);
      } catch {
        if (cancelled) return;
        setSummary(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, nonce]);

  return { summary, isLoading, regenerate };
}

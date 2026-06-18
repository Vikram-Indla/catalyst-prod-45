/**
 * useChatSummarize — calls the chat-summarize Supabase edge function
 * (Gemini-backed) and returns a SummaryPayload matching the existing
 * SummaryPanel contract. Falls back to a neutral "couldn't summarize"
 * payload on any error so the UI never gets stuck loading.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  SummaryPayload,
} from '@/features/chat-v2/components/Summarize/summarize.types';
import type { ChatMessage } from '@/types/chat';

export interface SummarizeRequest {
  conversationTitle: string;
  conversationIsPrivate: boolean;
  rangeStart: string;
  rangeEnd: string;
  mode: 'range' | 'thread';
  messages: ChatMessage[];
  participants: Array<{ id: string; name: string; avatarUrl: string | null }>;
}

function fallback(req: SummarizeRequest, reason: string): SummaryPayload {
  return {
    rangeStart: req.rangeStart,
    rangeEnd: req.rangeEnd,
    conversationTitle: req.conversationTitle,
    conversationIsPrivate: req.conversationIsPrivate,
    messageCount: req.messages.length,
    participants: req.participants.slice(0, 6),
    sections: [{ id: 'no-summary', title: 'No summary available', body: reason, details: [] }],
    references: [],
  };
}

export function useChatSummarize() {
  return useMutation({
    mutationFn: async (req: SummarizeRequest): Promise<SummaryPayload> => {
      try {
        const payload = {
          conversationTitle: req.conversationTitle,
          conversationIsPrivate: req.conversationIsPrivate,
          rangeStart: req.rangeStart,
          rangeEnd: req.rangeEnd,
          mode: req.mode,
          participants: req.participants,
          messages: req.messages.map(m => ({
            id: m.id,
            authorName: m.authorName,
            bodyText: m.bodyText,
            createdAt: m.createdAt,
            parentId: m.parentId,
          })),
        };
        const { data, error } = await supabase.functions.invoke('chat-summarize', {
          body: payload,
        });
        if (error) {
          // Surface the full error so we can tell deployment failures apart
          // from runtime failures in the browser console.
          console.error('[chat-summarize] invoke error', {
            name: (error as Error)?.name,
            message: (error as Error)?.message,
            error,
          });
          const msg = String((error as Error)?.message ?? '').toLowerCase();
          if (msg.includes('not found') || msg.includes('404')) {
            return fallback(
              req,
              `The summarizer function is not deployed yet. Run: supabase functions deploy chat-summarize --project-ref lmqwtldpfacrrlvdnmld`,
            );
          }
          return fallback(req, `Couldn't reach the summarizer (${(error as Error)?.message ?? 'unknown'}).`);
        }
        if (!data || typeof data !== 'object') {
          return fallback(req, `Summarizer returned an empty response.`);
        }
        return data as SummaryPayload;
      } catch (e) {
        console.error('useChatSummarize fatal', e);
        return fallback(req, `Summarization failed.`);
      }
    },
  });
}

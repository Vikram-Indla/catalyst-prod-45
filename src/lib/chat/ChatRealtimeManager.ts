/**
 * ChatRealtimeManager — singleton owning ONE Supabase realtime connection,
 * multiplexing channel subscriptions across all of Catalyst Chat.
 *
 * - Durable `postgres_changes` on `chat_messages` (per conversation).
 * - Ephemeral `broadcast` for typing indicators (per conversation).
 *
 * Channels are reference-counted: multiple callers for the same conversation
 * share ONE underlying Supabase channel, and the channel is torn down only when
 * the last subscriber unsubscribes. This prevents Supabase channel-limit
 * exhaustion — the entire reason this manager exists.
 */
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type MessageChangeCallback = (payload: unknown) => void;
export type TypingCallback = (userName: string) => void;
export type UnsubscribeFn = () => void;

interface ChannelEntry {
  channel: RealtimeChannel;
  callbacks: Set<(arg: unknown) => void>;
}

const TYPING_EVENT = 'chat-typing';

class ChatRealtimeManager {
  private messageChannels = new Map<string, ChannelEntry>();
  private typingChannels = new Map<string, ChannelEntry>();

  /** Subscribe to durable message changes for a conversation. */
  subscribeMessages(conversationId: string, cb: MessageChangeCallback): UnsubscribeFn {
    if (!conversationId) return () => {};

    let entry = this.messageChannels.get(conversationId);
    if (!entry) {
      const channel = supabase.channel(`chat-messages:${conversationId}`);
      const callbacks = new Set<(arg: unknown) => void>();
      const created: ChannelEntry = { channel, callbacks };

      channel
        .on(
          // postgres_changes typing in supabase-js is overly strict for dynamic
          // table names; the runtime contract is correct.
          'postgres_changes' as 'system',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`,
          } as never,
          (payload: unknown) => {
            created.callbacks.forEach((fn) => fn(payload));
          },
        )
        .subscribe();

      this.messageChannels.set(conversationId, created);
      entry = created;
    }

    const wrapped = (arg: unknown) => cb(arg);
    entry.callbacks.add(wrapped);

    return () => {
      const current = this.messageChannels.get(conversationId);
      if (!current) return;
      current.callbacks.delete(wrapped);
      if (current.callbacks.size === 0) {
        supabase.removeChannel(current.channel);
        this.messageChannels.delete(conversationId);
      }
    };
  }

  /** Subscribe to ephemeral typing broadcasts for a conversation. */
  subscribeTyping(conversationId: string, cb: TypingCallback): UnsubscribeFn {
    if (!conversationId) return () => {};

    let entry = this.typingChannels.get(conversationId);
    if (!entry) {
      const channel = supabase.channel(`chat-typing:${conversationId}`, {
        config: { broadcast: { self: false } },
      });
      const callbacks = new Set<(arg: unknown) => void>();
      const created: ChannelEntry = { channel, callbacks };

      channel
        .on('broadcast', { event: TYPING_EVENT }, (payload: { payload?: { userName?: string } }) => {
          const userName = payload?.payload?.userName;
          if (typeof userName === 'string') {
            created.callbacks.forEach((fn) => fn(userName));
          }
        })
        .subscribe();

      this.typingChannels.set(conversationId, created);
      entry = created;
    }

    const wrapped = (arg: unknown) => cb(arg as string);
    entry.callbacks.add(wrapped);

    return () => {
      const current = this.typingChannels.get(conversationId);
      if (!current) return;
      current.callbacks.delete(wrapped);
      if (current.callbacks.size === 0) {
        supabase.removeChannel(current.channel);
        this.typingChannels.delete(conversationId);
      }
    };
  }

  /** Broadcast that `userName` is typing in `conversationId`. */
  broadcastTyping(conversationId: string, userName: string): void {
    if (!conversationId || !userName) return;
    const entry = this.typingChannels.get(conversationId);
    if (!entry) return;
    void entry.channel.send({
      type: 'broadcast',
      event: TYPING_EVENT,
      payload: { userName },
    });
  }
}

export const chatRealtime = new ChatRealtimeManager();
export type { ChatRealtimeManager };

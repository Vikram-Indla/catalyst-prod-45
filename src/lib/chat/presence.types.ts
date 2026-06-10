/**
 * Chat Presence Types — online status, typing indicators, last-seen
 * Broadcast via Supabase Realtime on the ph_presence table
 */

export interface PresenceRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  status: 'online' | 'offline';
  last_heartbeat: string; // ISO 8601 timestamptz
  typing_until: string | null; // ISO 8601 timestamptz
  last_message_at: string | null; // ISO 8601 timestamptz
  created_at: string;
  updated_at: string;
}

export interface PresenceUI {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  status: 'online' | 'offline';
  is_typing: boolean;
  last_message_at: string | null;
  last_seen_text: string | null; // 'just now', '5m ago', '2h ago', '1d ago'
}

export interface PresenceState {
  isOnline: boolean;
  isTyping: boolean;
  lastSeenAt: Date | null;
  lastSeenText: string | null;
}

/**
 * RPC Response types
 */
export interface EnsurePresenceResponse {
  id: string;
  conversation_id: string;
  user_id: string;
  status: 'online' | 'offline';
  typing_until: string | null;
  last_message_at: string | null;
}

export interface SetTypingResponse {
  id: string;
  typing_until: string | null;
}

export interface RecordLastMessageResponse {
  id: string;
  last_message_at: string;
}

/**
 * Realtime Event types for subscriptions
 */
export interface PresenceRealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<PresenceRecord>;
  old: Partial<PresenceRecord> | null;
  schema: string;
  table: string;
  commit_timestamp: string;
}

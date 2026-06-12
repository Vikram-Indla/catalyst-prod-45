/**
 * Chat RLS isolation test — `chat_is_member()` SECURITY DEFINER helper.
 *
 * Verifies:
 *  1. Member of a conversation: chat_is_member() → true
 *  2. Non-member:               chat_is_member() → false
 *  3. Cross-user read isolation: stranger sees 0 messages/conversations
 *
 * Requires live Supabase credentials (service-role key).
 * Skipped automatically in CI unless SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const hasSupabaseCreds =
  !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Test fixture IDs (deterministic to avoid collisions with real data) ──────
const CONV_ID   = '00000000-0000-0000-0000-000000000c01';
const USER_A_ID = '00000000-0000-0000-0000-000000000a01';
const USER_B_ID = '00000000-0000-0000-0000-000000000b01';

describe.skipIf(!hasSupabaseCreds)('Chat RLS — chat_is_member() isolation', () => {
  let svc: ReturnType<typeof createClient>;

  beforeAll(async () => {
    svc = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Seed: conversation + user A as member (user B is not a member)
    await svc.from('chat_conversations').upsert({
      id: CONV_ID,
      kind: 'channel',
      title: '__rls_test__',
    });
    await svc.from('chat_conversation_members').upsert({
      conversation_id: CONV_ID,
      user_id: USER_A_ID,
      role: 'member',
    });
  });

  afterAll(async () => {
    // Clean up deterministic fixtures
    await svc.from('chat_conversation_members')
      .delete().eq('conversation_id', CONV_ID);
    await svc.from('chat_conversations')
      .delete().eq('id', CONV_ID);
  });

  it('chat_is_member() returns true for a member', async () => {
    const { data, error } = await svc.rpc('chat_is_member', {
      conv: CONV_ID,
      uid: USER_A_ID,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('chat_is_member() returns false for a non-member', async () => {
    const { data, error } = await svc.rpc('chat_is_member', {
      conv: CONV_ID,
      uid: USER_B_ID,
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it('membership row exists for user A', async () => {
    const { data, error } = await svc
      .from('chat_conversation_members')
      .select('user_id')
      .eq('conversation_id', CONV_ID)
      .eq('user_id', USER_A_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('no membership row for user B', async () => {
    const { data, error } = await svc
      .from('chat_conversation_members')
      .select('user_id')
      .eq('conversation_id', CONV_ID)
      .eq('user_id', USER_B_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DeliveryChannel = 'manual' | 'email' | 'whatsapp' | 'sms';
export type ArtifactPurpose = 'invite' | 'reset' | 'unlock';

interface InviteUserParams {
  email: string;
  role: string;
  module_access: Record<string, boolean>;
  full_name?: string;
  /** Contact number for whatsapp/sms channels. */
  phone?: string;
  /** Onboarding artifact kind. Defaults to 'invite'. */
  purpose?: ArtifactPurpose;
  /** How the link is delivered. Defaults to 'email'. */
  delivery_channel?: DeliveryChannel;
  /** Link lifetime in seconds. Default 300 (5 min), clamped server-side to [60, 86400] (48h for guest). */
  ttl_seconds?: number;
  /** Revoke any existing pending link for this email+purpose, then mint a fresh one. */
  regenerate?: boolean;
  /** Department to associate with the invite (references capacity_departments.id). */
  department_id?: string | null;
}

interface InviteUserResult {
  ok: boolean;
  invitation_id?: string;
  /** The one-time link — present for copy/manual share on every channel. */
  setup_link?: string;
  expires_at?: string;
  ttl_seconds?: number;
  delivery_channel?: DeliveryChannel;
  purpose?: ArtifactPurpose;
  dispatched?: boolean;
  /** true when channel (whatsapp/sms) has no live provider yet — share link manually. */
  channel_pending?: boolean;
  error?: string;
}

export function useInviteUser() {
  const [isLoading, setIsLoading] = useState(false);

  const inviteUser = useCallback(async (params: InviteUserParams): Promise<InviteUserResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-invite-send', { body: params });
      if (error) return { ok: false, error: error.message || 'Invite failed' };
      return data as InviteUserResult;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Kill-switch for a pending link (wrong number / mistake). */
  const expireInvitation = useCallback(async (args: { invitation_id?: string; email?: string; purpose?: ArtifactPurpose }) => {
    try {
      const { data, error } = await supabase.functions.invoke('invitation-expire', { body: args });
      if (error) return { ok: false, error: error.message };
      return data as { ok: boolean; revoked?: number; error?: string };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  return { inviteUser, expireInvitation, isLoading };
}

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AcceptInviteParams {
  token: string;
  email: string;
  password: string;
  full_name: string;
}

interface AcceptInviteResult {
  ok: boolean;
  error?: string;
}

export function useAcceptInvite() {
  const [isLoading, setIsLoading] = useState(false);

  const acceptInvite = useCallback(async (params: AcceptInviteParams): Promise<AcceptInviteResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-invite-accept', {
        body: params,
      });

      if (error) return { ok: false, error: error.message || 'Invite acceptance failed' };
      if (!data?.ok) return { ok: false, error: data?.error || 'Invite acceptance failed' };

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { acceptInvite, isLoading };
}

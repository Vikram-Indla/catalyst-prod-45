import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InviteUserParams {
  email: string;
  role: string;
  module_access: Record<string, boolean>;
  full_name?: string;
}

interface InviteUserResult {
  ok: boolean;
  invitation_id?: string;
  error?: string;
}

export function useInviteUser() {
  const [isLoading, setIsLoading] = useState(false);

  const inviteUser = useCallback(async (params: InviteUserParams): Promise<InviteUserResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-invite-send', {
        body: params,
      });
      if (error) return { ok: false, error: error.message || 'Invite failed' };
      return data as InviteUserResult;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { inviteUser, isLoading };
}

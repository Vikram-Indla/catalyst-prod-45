import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves the current Supabase user's display name from the profiles table.
 * Returns null until the session is loaded or if the user is unauthenticated.
 * Used by useJQLFilteredIssues to resolve the currentUser() JQL function.
 */
export function useCurrentUserDisplayName(): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (!cancelled && data?.full_name) setName(data.full_name);
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  return name;
}

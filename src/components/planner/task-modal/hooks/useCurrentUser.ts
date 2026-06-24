// ============================================================================
// HOOK: useCurrentUser — Get logged-in user info
// ============================================================================

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
}

// Generate a consistent color from user id
const getColorFromId = (id: string): string => {
  const colors = ['var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))', 'var(--ds-background-discovery-bold, #7C3AED)', 'var(--ds-background-accent-magenta-bolder, #BE185D)', 'var(--ds-background-warning-bold, #E2B203)', 'var(--ds-text-success, #16a34a)', 'var(--ds-link, #0C66E4)'];
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const useCurrentUser = (): CurrentUser | null => {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Get user profile from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', authUser.id)
          .single();
        
        const name = profile?.full_name || authUser.email?.split('@')[0] || 'User';
        const nameParts = name.split(' ');
        const initials = nameParts.length >= 2 
          ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
          : name.substring(0, 2).toUpperCase();
        
        setUser({
          id: authUser.id,
          name,
          initials,
          color: getColorFromId(authUser.id),
          email: authUser.email || ''
        });
      }
    };

    fetchUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
};

export default useCurrentUser;

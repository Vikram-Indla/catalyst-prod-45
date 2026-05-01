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
  const colors = ['var(--ds-text-brand, var(--ds-text-brand, #2563eb))', '#7c3aed', '#db2777', '#ea580c', 'var(--ds-text-success, var(--ds-text-success, #16a34a))', '#0891b2'];
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

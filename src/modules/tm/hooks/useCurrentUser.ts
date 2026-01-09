/**
 * Hook to get current authenticated user
 * Returns dynamic user data instead of mocked "Current User"
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  initials: string;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Try to get profile from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', authUser.id)
            .single();
          
          const fullName = profile?.full_name || 
            authUser.user_metadata?.full_name || 
            authUser.email?.split('@')[0] || 
            'User';
          
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            fullName,
            avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url,
            initials: fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};

export default useCurrentUser;

/**
 * useCurrentUserProfile — Hook to get current authenticated user profile
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<{ id: string; name: string; initials: string; color: string } | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const name = p?.full_name || user.email?.split('@')[0] || 'User';
      const parts = name.trim().split(/\s+/);
      const ini = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) hash = user.id.charCodeAt(i) + ((hash << 5) - hash);
      const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
      setProfile({ id: user.id, name, initials: ini, color: colors[Math.abs(hash) % colors.length] });
    })();
  }, []);
  return profile;
}

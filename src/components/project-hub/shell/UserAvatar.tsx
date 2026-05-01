import { useState, useEffect } from 'react';
import { CircleUser } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAvatarColor, getUserInitials } from '@/utils/avatarColor';
import { Tooltip } from '@/components/ads';

export function UserAvatar() {
  const [profile, setProfile] = useState<{ id: string; name: string; avatarUrl: string | null } | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      setProfile({
        id: user.id,
        name: p?.full_name || user.email?.split('@')[0] || 'User',
        avatarUrl: p?.avatar_url || null,
      });
    })();
  }, []);

  const size = 32;
  const name = profile?.name || 'User';
  const initials = getUserInitials(name);
  const bg = profile?.id ? getAvatarColor(profile.id) : 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))';
  const showImage = profile?.avatarUrl && !imgError;

  return (
    <Tooltip content={name} position="bottom">
      <button
        className="flex items-center justify-center rounded-full flex-shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] focus-visible:ring-offset-2 outline-none"
        style={{
          width: size,
          height: size,
          border: '2px solid #E2E8F0',
          padding: 0,
          cursor: 'pointer',
          background: showImage ? 'transparent' : bg,
          overflow: 'hidden',
        }}
        title="Profile"
      >
        {showImage ? (
          <img
            src={profile!.avatarUrl!}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              console.warn('[UserAvatar] Image failed to load:', profile!.avatarUrl, e);
              setImgError(true);
            }}
          />
        ) : (
          <CircleUser size={size * 0.7} color="var(--ds-text-inverse, #FFFFFF)" strokeWidth={1.5} />
        )}
      </button>
    </Tooltip>
  );
}

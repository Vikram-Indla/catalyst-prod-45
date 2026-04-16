import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAvatarColor, getUserInitials } from '@/utils/avatarColor';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

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
  const bg = profile?.id ? getAvatarColor(profile.id) : '#2563EB';
  const showImage = profile?.avatarUrl && !imgError;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex items-center justify-center rounded-full flex-shrink-0 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 outline-none"
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
                className="w-full h-full object-cover rounded-full"
                onError={() => setImgError(true)}
              />
            ) : (
              <span
                style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1,
                }}
              >
                {initials}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

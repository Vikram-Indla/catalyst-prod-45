import { Bell, CheckCircle, Eye } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface EmptyStateProps {
  variant: 'allCaughtUp' | 'noNotifications' | 'noWatching';
}

export default function EmptyState({ variant }: EmptyStateProps) {
  const { isDark } = useTheme();
  const text1 = isDark ? '#F5F3F0' : '#0F172A';
  const text3 = isDark ? '#6B6560' : '#94A3B8';
  const iconBgMuted = isDark ? '#232019' : '#F1F5F9';

  if (variant === 'allCaughtUp') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 8 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: isDark ? '#0F2A1A' : '#E3FCEF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={24} color={isDark ? '#86EFAC' : '#006644'} />
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: text1 }}>All caught up!</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: text3 }}>You're on top of everything.</span>
      </div>
    );
  }

  if (variant === 'noWatching') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 8 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: iconBgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Eye size={24} color={text3} />
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: text1 }}>No watched items yet</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: text3, textAlign: 'center', maxWidth: 280 }}>
          Start watching items from any hub to get updates here.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 8 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: iconBgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={24} color={text3} />
      </div>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: text1 }}>No notifications yet</span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: text3, textAlign: 'center', maxWidth: 280 }}>
        When people assign or mention you, you'll see it here.
      </span>
    </div>
  );
}

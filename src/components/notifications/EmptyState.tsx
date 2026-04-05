import { Bell, CheckCircle, Eye } from "lucide-react";

interface EmptyStateProps {
  variant: 'allCaughtUp' | 'noNotifications' | 'noWatching';
}

export default function EmptyState({ variant }: EmptyStateProps) {
  if (variant === 'allCaughtUp') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 8 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#E3FCEF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={24} color="#006644" />
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>All caught up!</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94A3B8' }}>You're on top of everything.</span>
      </div>
    );
  }

  if (variant === 'noWatching') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 8 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Eye size={24} color="#94A3B8" />
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>No watched items yet</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94A3B8', textAlign: 'center', maxWidth: 280 }}>
          Start watching items from any hub to get updates here.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 8 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={24} color="#94A3B8" />
      </div>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>No notifications yet</span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94A3B8', textAlign: 'center', maxWidth: 280 }}>
        When people assign or mention you, you'll see it here.
      </span>
    </div>
  );
}

import { Bell } from 'lucide-react';

const NOTIFICATION_OPTIONS = [
  'Item assigned to me',
  'Item I\'m watching gets updated',
  'New comment on my items',
  'Status change on my items',
  'New item created in project',
];

export function NotificationsTab() {
  return (
    <div
      className="rounded-xl"
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>
        Notification Preferences
      </h3>

      <div className="space-y-1">
        {NOTIFICATION_OPTIONS.map(label => (
          <div
            key={label}
            className="flex items-center justify-between px-3 rounded-lg"
            style={{ height: 44, opacity: 0.5 }}
          >
            <span style={{ fontSize: 13, color: '#94A3B8' }}>{label}</span>

            {/* Disabled toggle */}
            <div
              className="flex-shrink-0 rounded-full"
              style={{
                width: 40, height: 22, borderRadius: 11, background: '#CBD5E1',
                position: 'relative', cursor: 'not-allowed',
              }}
            >
              <span
                className="rounded-full"
                style={{
                  width: 16, height: 16, background: '#FFFFFF', borderRadius: '50%',
                  position: 'absolute', top: 3, left: 3,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #E2E8F0' }}>
        <Bell size={14} color="#94A3B8" />
        <p style={{ fontSize: 12, color: '#94A3B8' }}>
          Email and in-app notifications. Coming soon.
        </p>
      </div>
    </div>
  );
}

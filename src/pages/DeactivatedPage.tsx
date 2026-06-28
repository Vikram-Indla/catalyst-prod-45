import { supabase } from '@/integrations/supabase/client';

export default function DeactivatedPage() {
  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ds-surface, var(--cp-bg-sunken))',
    }}>
      <div style={{
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
        borderRadius: 8,
        padding: '40px 48px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 1px 3px var(--ds-shadow-raised, rgba(0,0,0,0.12))',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h1 style={{
          margin: '0 0 12px',
          fontSize: 'var(--ds-font-size-800)',
          fontWeight: 600,
          color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))',
        }}>
          Account deactivated
        </h1>
        <p style={{
          margin: '0 0 8px',
          fontSize: 'var(--ds-font-size-400)',
          color: 'var(--ds-text-subtle, var(--cp-text-secondary))',
          lineHeight: 1.6,
        }}>
          Your Catalyst account has been deactivated due to inactivity.
        </p>
        <p style={{
          margin: '0 0 32px',
          fontSize: 'var(--ds-font-size-400)',
          color: 'var(--ds-text-subtle, var(--cp-text-secondary))',
          lineHeight: 1.6,
        }}>
          Please contact your Catalyst admin to reactivate your access.
        </p>
        <button
          onClick={handleSignOut}
          style={{
            padding: '8px 20px',
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 500,
            color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            background: 'var(--ds-background-brand-bold, var(--cp-primary-60))',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

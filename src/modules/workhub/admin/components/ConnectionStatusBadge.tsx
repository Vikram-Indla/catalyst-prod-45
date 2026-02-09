import { Loader2 } from 'lucide-react';

interface ConnectionStatusBadgeProps {
  status: 'not_configured' | 'testing' | 'connected' | 'error';
}

const CONFIG: Record<string, { label: string; className: string }> = {
  not_configured: { label: 'Not Configured', className: 'wh-status-default' },
  testing: { label: 'Testing...', className: 'wh-status-testing' },
  connected: { label: 'Connected', className: 'wh-status-connected' },
  error: { label: 'Connection Error', className: 'wh-status-error' },
};

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const config = CONFIG[status] || CONFIG.not_configured;

  return (
    <span
      className={config.className}
      aria-label={`Connection status: ${status}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 'var(--wh-rad)',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--wh-fn)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
    >
      {status === 'testing' && <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />}
      {status === 'connected' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {status === 'error' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {config.label}
    </span>
  );
}

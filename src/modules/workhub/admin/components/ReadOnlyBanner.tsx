import { ShieldAlert } from 'lucide-react';

export function ReadOnlyBanner() {
  return (
    <div className="wh-readonly-banner">
      <ShieldAlert style={{ width: 18, height: 18, color: 'var(--wh-warn)', flexShrink: 0, marginTop: 1 }} />
      <div>
        <strong>READ-ONLY INTEGRATION</strong>
        <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
          Catalyst syncs data <strong style={{ color: 'var(--wh-tx)' }}>from</strong> Jira Cloud. 
          It will never create, update, or delete issues in your Jira instance.
        </p>
      </div>
    </div>
  );
}

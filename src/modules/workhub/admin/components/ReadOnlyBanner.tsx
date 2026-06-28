import ShieldIcon from '@atlaskit/icon/core/shield';

export function ReadOnlyBanner() {
  return (
    <div className="wh-readonly-banner">
      <span style={{ color: 'var(--wh-warn)', flexShrink: 0, marginTop: 0, display: 'flex' }}>
        <ShieldIcon label="" size="small" />
      </span>
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

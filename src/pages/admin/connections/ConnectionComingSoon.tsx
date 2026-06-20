import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';

interface Feature {
  label: string;
  description: string;
}

interface ConnectionComingSoonProps {
  name: string;
  description: string;
  /** Single emoji used as the integration icon */
  iconEmoji: string;
  features?: Feature[];
}

export function ConnectionComingSoon({
  name,
  description,
  iconEmoji,
  features = [],
}: ConnectionComingSoonProps) {
  return (
    <div style={{ padding: '32px 48px', maxWidth: 680 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'var(--ds-background-neutral, #F1F2F4)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            flexShrink: 0,
          }}
        >
          {iconEmoji}
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 653,
              color: 'var(--ds-text, #172B4D)',
              lineHeight: '28px',
            }}
          >
            {name}
          </h1>
          <div style={{ marginTop: 6 }}>
            <Lozenge appearance="new">Coming soon</Lozenge>
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          margin: '0 0 32px',
          fontSize: 14,
          lineHeight: '20px',
          color: 'var(--ds-text-subtle, #42526E)',
        }}
      >
        {description}
      </p>

      {/* Feature bullets */}
      {features.length > 0 && (
        <div
          style={{
            background: 'var(--ds-surface-sunken, #F7F8F9)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 8,
            padding: '20px 24px',
            marginBottom: 32,
          }}
        >
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 12,
              fontWeight: 653,
              color: 'var(--ds-text-subtlest, #6B778C)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            What this integration will enable
          </p>
          <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
            {features.map((f) => (
              <li
                key={f.label}
                style={{
                  marginBottom: 8,
                  fontSize: 14,
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                <strong>{f.label}</strong>
                {f.description ? ` — ${f.description}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <Button appearance="default" isDisabled>
        Request early access
      </Button>
      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          color: 'var(--ds-text-subtlest, #6B778C)',
        }}
      >
        This integration is on the roadmap. Early access is available to select customers.
      </p>
    </div>
  );
}

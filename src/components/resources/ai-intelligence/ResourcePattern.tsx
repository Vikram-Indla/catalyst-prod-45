import React from 'react';

interface ResourcePatternProps {
  summary: string | null;
  warning: string | null;
}

const WarningIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <path d="M10 2L19 18H1L10 2Z" fill="rgba(217, 119, 6, 0.15)" stroke="var(--ds-text-warning, #D97706)" strokeWidth="1.5" strokeLinejoin="round"/>
    <text x="10" y="15" textAnchor="middle" fill="var(--ds-text-warning, #D97706)" fontSize="10" fontWeight="700">!</text>
  </svg>
);

export const ResourcePattern: React.FC<ResourcePatternProps> = ({ summary, warning }) => (
  <div className="rai-section">
    <div className="rai-section-header">
      <span className="rai-section-title">Resource Pattern</span>
      <span className="rai-ai-badge">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ marginRight: 2 }}>
          <path d="M8 0L9.8 6.2L16 8L9.8 9.8L8 16L6.2 9.8L0 8L6.2 6.2Z" fill="currentColor"/>
        </svg>
        AI
      </span>
    </div>
    {summary ? (
      <p className="rai-pattern-text" style={{ margin: 0 }}>{summary}</p>
    ) : (
      <p style={{ fontSize: 13, color: 'var(--rai-ink-muted)', margin: 0, fontStyle: 'italic' }}>
        Click "Refresh AI" to generate resource pattern analysis.
      </p>
    )}
    {warning && (
      <div className="rai-callout">
        <WarningIcon />
        <span className="rai-callout-text">{warning}</span>
      </div>
    )}
  </div>
);

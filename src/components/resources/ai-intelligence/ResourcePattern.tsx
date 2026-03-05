import React from 'react';

interface ResourcePatternProps {
  summary: string | null;
  warning: string | null;
}

const WarningIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <path d="M10 2L19 18H1L10 2Z" fill="rgba(217, 119, 6, 0.15)" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/>
    <text x="10" y="15" textAnchor="middle" fill="#D97706" fontSize="10" fontWeight="700">!</text>
  </svg>
);

export const ResourcePattern: React.FC<ResourcePatternProps> = ({ summary, warning }) => (
  <div className="rai-section">
    <div className="rai-section-header">
      <span className="rai-section-title">Resource Pattern</span>
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

import React from 'react';

interface ResourcePatternProps {
  summary: string | null;
  warning: string | null;
}

export const ResourcePattern: React.FC<ResourcePatternProps> = ({ summary, warning }) => (
  <div className="rai-section">
    <div className="rai-section-header">
      <span className="rai-section-title">Resource Pattern</span>
      <span className="rai-ai-badge">✦ AI</span>
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
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
        <span className="rai-callout-text">{warning}</span>
      </div>
    )}
  </div>
);

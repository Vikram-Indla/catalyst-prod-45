import React from 'react';

export interface PatternInsight {
  text: string;
  refs: string[];
}

interface Props {
  insights: PatternInsight[];
}

export const BehavioralPatterns: React.FC<Props> = ({ insights }) => (
  <div className="rai-section">
    <div className="rai-section-header">
      <span className="rai-section-title">Behavioral Patterns</span>
      <span className="rai-ai-badge">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ marginRight: 2 }}>
          <path d="M8 0L9.8 6.2L16 8L9.8 9.8L8 16L6.2 9.8L0 8L6.2 6.2Z" fill="currentColor"/>
        </svg>
        AI
      </span>
    </div>
    {insights.length === 0 && (
      <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--rai-ink-muted)', margin: 0, fontStyle: 'italic' }}>
        Click "Refresh AI" to generate behavioral pattern insights.
      </p>
    )}
    {insights.map((ins, i) => (
      <div key={i} className="rai-insight">
        <div className="rai-insight-dot" />
        <div className="rai-insight-text">
          {ins.text}
          {ins.refs.map(ref => (
            <span key={ref} className="rai-ticket-ref" style={{ cursor: 'pointer' }}>{ref}</span>
          ))}
        </div>
      </div>
    ))}
  </div>
);

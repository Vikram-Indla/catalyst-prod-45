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
      <span className="rai-ai-badge">✦ AI</span>
    </div>
    {insights.length === 0 && (
      <p style={{ fontSize: 13, color: 'var(--rai-ink-muted)', margin: 0, fontStyle: 'italic' }}>
        Click "Refresh AI" to generate behavioral pattern insights.
      </p>
    )}
    {insights.map((ins, i) => (
      <div key={i} className="rai-insight">
        <div className="rai-insight-dot" />
        <div className="rai-insight-text">
          {ins.text}
          {ins.refs.map(ref => (
            <span key={ref} className="rai-ticket-ref">{ref}</span>
          ))}
        </div>
      </div>
    ))}
  </div>
);

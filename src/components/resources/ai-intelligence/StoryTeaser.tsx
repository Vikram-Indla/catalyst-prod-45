import React from 'react';

interface StoryTeaserProps {
  hook: string;
  weekNumber: number;
  closed: number;
  inReview: number;
  remaining: number;
  onScrollToStory: () => void;
}

export const StoryTeaser: React.FC<StoryTeaserProps> = ({
  hook, weekNumber, closed, inReview, remaining, onScrollToStory,
}) => (
  <div className="rai-teaser" onClick={onScrollToStory} id="storyTeaser">
    <div className="rai-teaser-icon">📖</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--rai-primary)', textTransform: 'uppercase' }}>
          WEEKLY STORY
        </span>
        <span style={{
          fontFamily: 'var(--rai-font-mono)', fontSize: 10,
          background: 'var(--rai-surface)', border: '1px solid var(--rai-border)',
          padding: '1px 6px', borderRadius: 4,
        }}>
          W{weekNumber}
        </span>
        <span className="rai-ai-badge">✦ AI</span>
      </div>
      <div className="rai-teaser-hook">"{hook}"</div>
      <div className="rai-teaser-meta">
        <span className="rai-teaser-stat">
          <span className="rai-teaser-stat-dot" style={{ background: 'var(--rai-success)' }} />
          {closed} closed
        </span>
        <span className="rai-teaser-stat">
          <span className="rai-teaser-stat-dot" style={{ background: 'var(--rai-warning)' }} />
          {inReview} review
        </span>
        <span className="rai-teaser-stat">
          <span className="rai-teaser-stat-dot" style={{ background: 'var(--rai-border-strong)' }} />
          {remaining} left
        </span>
      </div>
    </div>
    <div style={{ color: 'var(--rai-primary)', alignSelf: 'center', fontSize: 16, flexShrink: 0 }}>→</div>
  </div>
);

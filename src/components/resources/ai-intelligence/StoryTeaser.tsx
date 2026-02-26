import React from 'react';

interface StoryTeaserProps {
  hook: string;
  weekNumber: number;
  closed: number;
  inReview: number;
  remaining: number;
  onScrollToStory: () => void;
  isLoading?: boolean;
}

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

export const StoryTeaser: React.FC<StoryTeaserProps> = ({
  hook, weekNumber, closed, inReview, remaining, onScrollToStory, isLoading,
}) => {
  const isDefault = !hook || hook === 'Loading weekly story…' || hook === 'Loading weekly story...';
  const displayHook = isLoading || isDefault
    ? null
    : hook;

  return (
    <div className="rai-teaser" onClick={onScrollToStory} id="storyTeaser">
      <div className="rai-teaser-icon"><BookIcon /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--rai-primary)', textTransform: 'uppercase' as const }}>
            WEEKLY STORY
          </span>
          <span style={{
            fontFamily: 'var(--rai-font-mono)', fontSize: 10,
            background: 'var(--rai-surface)', border: '1px solid var(--rai-border)',
            padding: '1px 6px', borderRadius: 4,
          }}>
            W{weekNumber}
          </span>
          <span className="rai-ai-badge">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ marginRight: 2 }}>
              <path d="M8 0L9.8 6.2L16 8L9.8 9.8L8 16L6.2 9.8L0 8L6.2 6.2Z" fill="currentColor"/>
            </svg>
            AI
          </span>
        </div>
        {displayHook ? (
          <div className="rai-teaser-hook">"{displayHook}"</div>
        ) : (
          <div style={{ marginTop: 6 }}>
            <div className="rai-skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
          </div>
        )}
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
};

import React, { useState, useEffect, useRef } from 'react';

interface Props {
  hook: string;
  onScrollToStory: () => void;
}

export const StoryBeacon: React.FC<Props> = ({ hook, onScrollToStory }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number>();

  useEffect(() => {
    const storyEl = document.getElementById('weeklyStory');
    const teaserEl = document.getElementById('storyTeaser');
    if (!storyEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const storyEntry = entries.find(e => e.target === storyEl);
        const teaserEntry = entries.find(e => e.target === teaserEl);

        const storyVisible = storyEntry?.isIntersecting ?? false;
        const teaserVisible = teaserEntry?.isIntersecting ?? false;

        // Show when story is below fold AND teaser is not visible
        setVisible(!storyVisible && !teaserVisible);
      },
      { threshold: 0.1 }
    );

    observer.observe(storyEl);
    if (teaserEl) observer.observe(teaserEl);

    // Show after 800ms delay initially
    timeoutRef.current = window.setTimeout(() => {
      if (!storyEl.getBoundingClientRect || storyEl.getBoundingClientRect().top > window.innerHeight) {
        setVisible(true);
      }
    }, 800);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="rai-beacon">
      <div className="rai-beacon-pill" onClick={onScrollToStory}>
        <span className="rai-beacon-arrow">↓</span>
        <span style={{ fontStyle: 'italic', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          "{hook}"
        </span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>↓ عربي</span>
      </div>
    </div>
  );
};

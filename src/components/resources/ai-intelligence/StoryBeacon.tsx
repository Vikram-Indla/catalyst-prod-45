import React, { useState, useEffect, useRef } from 'react';

interface Props {
  hook: string;
  onScrollToStory: () => void;
}

export const StoryBeacon: React.FC<Props> = ({ hook, onScrollToStory }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number>();

  const displayHook = hook && hook.trim().length > 0 ? hook : "This week's story awaits…";

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

        setVisible(!storyVisible && !teaserVisible);
      },
      { threshold: 0.1 }
    );

    observer.observe(storyEl);
    if (teaserEl) observer.observe(teaserEl);

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
          "{displayHook}"
        </span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>↓ عربي</span>
      </div>
    </div>
  );
};

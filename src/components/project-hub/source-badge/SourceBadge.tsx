/**
 * SourceBadge — "CATALYST" or "JIRA" pill indicator
 * C1: Pixel-perfect per spec
 */
import React from 'react';

type WorkItemSource = 'catalyst' | 'jira';

interface SourceBadgeProps {
  source: WorkItemSource;
}

const JIRA_DIAMOND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"><path fill="#9A3412" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84zM6.77 6.8a4.362 4.362 0 0 0 4.34 4.34h1.78v1.71a4.362 4.362 0 0 0 4.35 4.35V7.63a.839.839 0 0 0-.84-.83zM2 11.6c0 2.4 1.96 4.34 4.35 4.34h1.78v1.72c.01 2.39 1.97 4.34 4.35 4.34v-9.57a.84.84 0 0 0-.84-.83z"/></svg>`;

export function SourceBadge({ source }: SourceBadgeProps) {
  const isJira = source === 'jira';

  return (
    <span
      className="inline-flex items-center gap-[3px] shrink-0 select-none"
      style={{
        height: 18,
        padding: '0 5px',
        borderRadius: 4,
        border: `0.75px solid ${isJira ? 'var(--src-jira-border)' : 'var(--src-catalyst-border)'}`,
        backgroundColor: isJira ? 'var(--src-jira-bg)' : 'var(--src-catalyst-bg)',
        color: isJira ? 'var(--src-jira-text)' : 'var(--src-catalyst-text)',
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'var(--cp-font-body)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        lineHeight: '18px',
      }}
    >
      {isJira ? (
        <span dangerouslySetInnerHTML={{ __html: JIRA_DIAMOND_SVG }} className="flex items-center" />
      ) : (
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 10,
            height: 10,
            borderRadius: 4,
            backgroundColor: 'var(--cp-blue)',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            fontSize: 7,
            fontWeight: 700,
            lineHeight: '10px',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          C
        </span>
      )}
      {isJira ? 'JIRA' : 'CATALYST'}
    </span>
  );
}

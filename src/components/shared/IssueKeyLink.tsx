/**
 * IssueKeyLink — Canonical anchor for issue keys.
 * Always opens in a new tab via target="_blank" with noopener noreferrer.
 * Supports native browser interactions (Ctrl/Cmd+click, middle-click, right-click).
 */
import React from 'react';

interface IssueKeyLinkProps {
  issueKey: string;
  /** Optional className for styling */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Children override — defaults to issueKey text */
  children?: React.ReactNode;
  /** Stop propagation on click (useful inside clickable rows) */
  stopPropagation?: boolean;
}

export function IssueKeyLink({
  issueKey,
  className,
  style,
  children,
  stopPropagation = true,
}: IssueKeyLinkProps) {
  const href = `/issue/${encodeURIComponent(issueKey)}`;

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={handleClick}
    >
      {children ?? issueKey}
    </a>
  );
}

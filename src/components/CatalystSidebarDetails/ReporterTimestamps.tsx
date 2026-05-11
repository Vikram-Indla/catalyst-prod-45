/**
 * ReporterTimestamps — Reporter and timestamps (F3.9)
 */
import React, { memo } from 'react';

export const ReporterTimestamps = memo(function ReporterTimestamps({
  reporter,
  createdAt,
  updatedAt,
}: {
  reporter: string;
  createdAt: string;
  updatedAt: string;
}) {
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return formatted.replace(/^[a-z]/, (c) => c.toUpperCase());
  };

  const formatRelative = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} days ago`;
  };

  return (
    <div>
      <label>Reporter</label>
      <div>{reporter}</div>
      <div>
        <label>Created</label>
        <time dateTime={createdAt}>{formatDate(createdAt)}</time>
        <span>{formatRelative(createdAt)}</span>
      </div>
      <div>
        <label>Updated</label>
        <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
        <span>{formatRelative(updatedAt)}</span>
      </div>
    </div>
  );
});

/**
 * IssueHeader — Detail header (F2.2)
 */
import React, { memo } from 'react';

export const IssueHeader = memo(function IssueHeader({ issue, onClose }: { issue: any; onClose: () => void }) {
  return (
    <div data-testid="issue-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
      <nav style={{ flex: 1 }} role="navigation" />
      <button aria-label="Previous issue" />
      <button aria-label="Next issue" />
      <button aria-label="Close" onClick={onClose} />
    </div>
  );
});

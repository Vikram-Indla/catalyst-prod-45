/**
 * ActivityPanel — Activity panel with comments (F2.10)
 */
import React, { memo, useState } from 'react';

export const ActivityPanel = memo(function ActivityPanel({ issueKey, comments = [] }: any) {
  const [activeTab, setActiveTab] = useState('comments');

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <h2>Activity</h2>
      <div role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'comments'}
          onClick={() => setActiveTab('comments')}
        >
          Comments
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>
      {activeTab === 'comments' && (
        <div>
          {!comments.length && <div>No comments</div>}
          {comments.map((c: any) => (
            <div key={c.id}>
              <div>{c.author} - {formatDate(c.timestamp)}</div>
              <div>{c.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * LinkedWorkItemsSection — Linked work items (F2.7)
 */
import React, { memo } from 'react';

export const LinkedWorkItemsSection = memo(function LinkedWorkItemsSection({ parentKey, relates = [], blocks = [] }: any) {
  const hasLinks = parentKey || relates.length || blocks.length;

  return (
    <div>
      <h2>Linked</h2>
      {!hasLinks && <div>No linked work items</div>}
      {parentKey && <a href={`/browse/${parentKey}`}>{parentKey}</a>}
      {relates.map((r: any) => <div key={r.key}>{r.summary}</div>)}
      {blocks.map((b: any) => <div key={b.key}>{b.summary}</div>)}
    </div>
  );
});

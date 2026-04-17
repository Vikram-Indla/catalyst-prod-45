/**
 * ParentAndLabels — Above-description Parent row for the Epic detail view.
 *
 * RULE: Epics are linked ONLY to Business Requests as parents — never to other Epics.
 * Uses the canonical CatalystParentLinker, which routes Epic → BusinessRequestParentPicker
 * via PARENT_LINK_RULES (rule.useBusinessRequests = true).
 */
import React from 'react';
import { CatalystParentLinker } from '../shared/sections/CatalystParentLinker';
import type { PhIssue, CatalystItemType } from '../shared/types';

interface ParentAndLabelsProps {
  issue: PhIssue | null;
  itemId: string;
  itemType: CatalystItemType;
  projectKey?: string;
  onOpenItem?: (itemId: string) => void;
}

export function ParentAndLabels({ issue, itemId, itemType, projectKey, onOpenItem }: ParentAndLabelsProps) {
  return (
    <div style={{ padding: '4px 0 16px' }}>
      <CatalystParentLinker
        issue={issue}
        itemId={itemId}
        itemType={itemType}
        projectKey={projectKey}
        onOpenItem={onOpenItem}
      />
    </div>
  );
}

export default ParentAndLabels;

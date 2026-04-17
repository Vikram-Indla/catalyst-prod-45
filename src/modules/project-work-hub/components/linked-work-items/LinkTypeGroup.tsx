/**
 * LinkTypeGroup — renders all linked rows for a single link type.
 *
 * Preserves Jira's grouping model (one header per link type) and keeps the
 * group border/padding consistent across groups. Pure presentational: owns
 * layout only. Mutations flow from the parent orchestrator.
 */
import React from 'react';
import { LinkedWorkItemRow } from './LinkedWorkItemRow';
import type { LinkedWorkItem } from './types';

export interface LinkTypeGroupProps {
  linkType: string;
  links: LinkedWorkItem[];
  onOpen: (link: LinkedWorkItem) => void;
  onCopyKey: (link: LinkedWorkItem) => void;
  onUnlink: (link: LinkedWorkItem) => void;
  pendingUnlinkIds?: Set<string>;
  readOnly?: boolean;
}

export function LinkTypeGroup({
  linkType,
  links,
  onOpen,
  onCopyKey,
  onUnlink,
  pendingUnlinkIds,
  readOnly,
}: LinkTypeGroupProps) {
  return (
    <div className="lwi-group">
      <div className="lwi-group__header" id={`lwi-group-${linkType}`}>
        {linkType}
      </div>
      <div
        className="lwi-group__rows"
        role="list"
        aria-labelledby={`lwi-group-${linkType}`}
      >
        {links.map((link) => (
          <LinkedWorkItemRow
            key={link.id}
            link={link}
            onOpen={onOpen}
            onCopyKey={onCopyKey}
            onUnlink={onUnlink}
            isPending={pendingUnlinkIds?.has(link.id)}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

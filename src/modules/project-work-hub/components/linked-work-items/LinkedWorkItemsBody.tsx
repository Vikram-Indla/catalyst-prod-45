/**
 * LinkedWorkItemsBody — body region with grouped rows + (empty | loading | error).
 *
 * Pure presentational: receives pre-grouped links and dispatches row
 * interactions upward. Skeleton + empty markup mirror the visual cadence of
 * the legacy section so switching between implementations during the
 * BAU-4771 pilot does not cause perceived layout shifts.
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { LinkTypeGroup } from './LinkTypeGroup';
import type { LinkedWorkItem } from './types';

export interface LinkedWorkItemsBodyProps {
  id: string;
  groups: Array<{ linkType: string; links: LinkedWorkItem[] }>;
  isLoading: boolean;
  isError: boolean;
  onOpen: (link: LinkedWorkItem) => void;
  onCopyKey: (link: LinkedWorkItem) => void;
  onUnlink: (link: LinkedWorkItem) => void;
  pendingUnlinkIds?: Set<string>;
  readOnly?: boolean;
  footer?: React.ReactNode;
  emptyCta?: React.ReactNode;
}

export function LinkedWorkItemsBody({
  id,
  groups,
  isLoading,
  isError,
  onOpen,
  onCopyKey,
  onUnlink,
  pendingUnlinkIds,
  readOnly,
  footer,
  emptyCta,
}: LinkedWorkItemsBodyProps) {
  const hasGroups = groups.length > 0;

  return (
    <div id={id} className="lwi-body">
      {isLoading && (
        <div className="lwi-skeleton" aria-busy="true" aria-label="Loading linked work items">
          {[0, 1, 2].map((i) => (
            <div key={i} className="lwi-skeleton__row">
              <span className="lwi-skeleton__pulse lwi-skeleton__icon" />
              <span className="lwi-skeleton__pulse lwi-skeleton__key" />
              <span className="lwi-skeleton__pulse lwi-skeleton__summary" />
              <span className="lwi-skeleton__pulse lwi-skeleton__status" />
              <span className="lwi-skeleton__pulse lwi-skeleton__avatar" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="lwi-error" role="alert">
          <AlertTriangle size={18} />
          <span>Couldn&rsquo;t load linked work items. Try again.</span>
        </div>
      )}

      {!isLoading && !isError && !hasGroups && (
        <div className="lwi-empty">
          <div className="lwi-empty__heading">No linked work items</div>
          <div className="lwi-empty__sub">
            Link related, blocking, or duplicate work items to keep dependencies visible.
          </div>
          {emptyCta}
        </div>
      )}

      {!isLoading && !isError && hasGroups && (
        <div className="lwi-groups">
          {groups.map((g) => (
            <LinkTypeGroup
              key={g.linkType}
              linkType={g.linkType}
              links={g.links}
              onOpen={onOpen}
              onCopyKey={onCopyKey}
              onUnlink={onUnlink}
              pendingUnlinkIds={pendingUnlinkIds}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {footer}
    </div>
  );
}

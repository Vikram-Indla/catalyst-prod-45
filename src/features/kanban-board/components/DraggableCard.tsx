/**
 * DraggableCard — wraps Card with @atlaskit/pragmatic-drag-and-drop draggable
 * AND registers the card as a drop target so we can render the Jira-style
 * per-slot drop indicator (blue bar with an unfilled circle terminal) when
 * another card is dragged over its top or bottom edge.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { Card } from './Card';
import type { BoardIssue, CardVisibleFields } from '../types';

interface Props {
  issue: BoardIssue;
  fromColId: string;
  isSelected: boolean;
  isBusy?: boolean;
  avatarUrl?: string | null;
  visibleFields: CardVisibleFields;
  onSelect: (id: string) => void;
  onAvatarClick?: (issue: BoardIssue, anchor: HTMLElement) => void;
  onEditSummary?: (issue: BoardIssue, summary: string) => void;
  menuSlot?: React.ReactNode;
  healthRequestKey?: string | null;
}

export const DraggableCard: React.FC<Props> = (props) => {
  const { healthRequestKey } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  /* When a drag ends, the browser can still fire a click event on the card
     (esp. for short drags). Without this guard the card's onSelect opens the
     detail view every time the user drops. Set justDraggedRef in onDrop and
     clear it after a short cooldown; onSelect below skips while true. */
  const justDraggedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return draggable({
      element: el,
      getInitialData: () => ({ type: 'card', issueId: props.issue.id, fromColId: props.fromColId }),
      onDragStart: () => {
        setDragging(true);
        justDraggedRef.current = true;
      },
      onDrop: () => {
        setDragging(false);
        // Slightly longer than the browser's click-after-drop delay.
        window.setTimeout(() => { justDraggedRef.current = false; }, 250);
      },
    });
  }, [props.issue.id, props.fromColId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data?.type === 'card' && source.data?.issueId !== props.issue.id,
      getData: ({ input, element }) =>
        attachClosestEdge(
          { type: 'card-slot', targetIssueId: props.issue.id, colId: props.fromColId },
          { input, element, allowedEdges: ['top', 'bottom'] },
        ),
      onDragEnter: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
      onDrag: ({ self }) => {
        const next = extractClosestEdge(self.data);
        setClosestEdge((prev) => (prev === next ? prev : next));
      },
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    });
  }, [props.issue.id, props.fromColId]);

  const guardedOnSelect = useCallback((id: string) => {
    if (justDraggedRef.current) return;
    props.onSelect(id);
  }, [props]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Card
        issue={props.issue}
        isSelected={props.isSelected}
        isDragging={dragging}
        isBusy={props.isBusy}
        avatarUrl={props.avatarUrl}
        visibleFields={props.visibleFields}
        onSelect={guardedOnSelect}
        onAvatarClick={props.onAvatarClick}
        onEditSummary={props.onEditSummary}
        menuSlot={props.menuSlot}
        healthRequestKey={healthRequestKey}
      />
      {closestEdge && <DropIndicator edge={closestEdge} gap="8px" type="terminal" />}
    </div>
  );
};

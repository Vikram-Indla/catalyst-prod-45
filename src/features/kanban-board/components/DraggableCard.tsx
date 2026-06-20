/**
 * DraggableCard — wraps Card with @atlaskit/pragmatic-drag-and-drop draggable.
 */
import React, { useEffect, useRef, useState } from 'react';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Card } from './Card';
import type { BoardIssue, CardVisibleFields } from '../types';

interface Props {
  issue: BoardIssue;
  fromColId: string;
  isSelected: boolean;
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return draggable({
      element: el,
      getInitialData: () => ({ type: 'card', issueId: props.issue.id, fromColId: props.fromColId }),
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    });
  }, [props.issue.id, props.fromColId]);

  return (
    <div ref={ref}>
      <Card
        issue={props.issue}
        isSelected={props.isSelected}
        isDragging={dragging}
        avatarUrl={props.avatarUrl}
        visibleFields={props.visibleFields}
        onSelect={props.onSelect}
        onAvatarClick={props.onAvatarClick}
        onEditSummary={props.onEditSummary}
        menuSlot={props.menuSlot}
        healthRequestKey={healthRequestKey}
      />
    </div>
  );
};

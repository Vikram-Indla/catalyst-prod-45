import type { ReactNode } from 'react';

export interface CdsUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
}

/**
 * One reaction group on a comment — every user who picked the same
 * emoji is aggregated into a single chip. `hasMine` lets the toolbar
 * paint the current user's own reactions with the "active" treatment
 * (light blue background + dark blue border) and toggle them off on
 * click.
 */
export interface CdsCommentReaction {
  emoji: string;
  count: number;
  hasMine: boolean;
}

export interface CdsComment {
  id: string;
  author: CdsUser;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isSystem?: boolean;
  /** Aggregated reactions for this comment, ordered by first-applied. */
  reactions?: CdsCommentReaction[];
  /** Self-referencing FK — points to the immediate parent comment.
   *  NULL for top-level comments. The tree is built client-side and
   *  rendered with a curved L connector from parent to each child. */
  parentId?: string | null;
}

export interface CdsFieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export type CdsActivityAction = 'create' | 'update' | 'delete' | 'comment';

export interface CdsActivityItem {
  id: string;
  type: CdsActivityAction;
  actor: CdsUser;
  timestamp: string;
  fieldChange?: CdsFieldChange;
  comment?: CdsComment;
  description?: string;
}

export type CdsSortOrder = 'newest' | 'oldest';

export interface CdsQuickReply {
  label: string;
  template: string;
}

export type CdsSpacing = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12';

export type CdsAppearance =
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'inprogress'
  | 'new'
  | 'moved'
  | 'removed';

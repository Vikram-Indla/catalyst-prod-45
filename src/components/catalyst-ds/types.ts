import type { ReactNode } from 'react';

export interface CdsUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
}

export interface CdsComment {
  id: string;
  author: CdsUser;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isSystem?: boolean;
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

/**
 * AssigneePickerPopover — DELETED 2026-06-21.
 *
 * Component body removed. Every consumer now mounts the canonical
 * <ProfilePicker /> from `@/components/ads`. The `AssigneeOption` type is
 * preserved as a re-export so existing kanban callers (KanbanColumn,
 * KanbanSwimlane, PragmaticBoard, SortableCard, InlineCreateCard,
 * WorkItemCard, tasksKanbanSource) keep compiling without a sweep.
 *
 * New code: import `ProfilePickerMember` from `@/components/ads` instead.
 * Future cleanup pass: rename + delete this file once every importer
 * migrates the type name.
 */

export interface AssigneeOption {
  name: string;
  avatarUrl?: string | null;
  email?: string | null;
}

/**
 * quickActionsBus — tiny React-friendly pubsub for the `+` quick-actions
 * menu in detail views (CatalystQuickActions).
 *
 * Why: "Create child work item" in the + dropdown lives in
 * CatalystQuickActions, but the inline-create row it should open lives
 * in SubtasksPanel — a sibling section. Threading a callback ref
 * through every CatalystView* would force changes in 8 view components
 * plus CatalystViewBase. Instead, the dropdown emits a typed event and
 * SubtasksPanel subscribes via a React hook.
 *
 * Not a DOM event — pure module-scoped Set of handlers. The emit/
 * subscribe pair is React-idiomatic (hook-based listener with
 * useEffect cleanup) and avoids touching window/document APIs.
 */
import { useEffect } from 'react';

type Handler = () => void;

const createChildSubs = new Set<Handler>();
const linkWorkItemSubs = new Set<Handler>();
const addAttachmentSubs = new Set<Handler>();
const addWebLinkSubs = new Set<Handler>();
const addDesignSubs = new Set<Handler>();

export function emitCreateChild(): void {
  createChildSubs.forEach((h) => h());
}

export function useCreateChildListener(handler: Handler): void {
  useEffect(() => {
    createChildSubs.add(handler);
    return () => {
      createChildSubs.delete(handler);
    };
  }, [handler]);
}

// Mirror channel for "Link work item" — same pattern as create-child,
// listened to by LinkedWorkItems so the + dropdown can open its
// inline link toolbar from anywhere.
export function emitLinkWorkItem(): void {
  linkWorkItemSubs.forEach((h) => h());
}

export function useLinkWorkItemListener(handler: Handler): void {
  useEffect(() => {
    linkWorkItemSubs.add(handler);
    return () => {
      linkWorkItemSubs.delete(handler);
    };
  }, [handler]);
}

// Mirror channel for "Add attachment" — listened to by AttachmentsSection
// so the + dropdown can expand the panel, scroll it into view, and pop
// the OS file picker. The emit() call MUST be synchronous on the user's
// click so the browser preserves the user-activation gesture chain
// required to programmatically open a file input dialog.
export function emitAddAttachment(): void {
  addAttachmentSubs.forEach((h) => h());
}

export function useAddAttachmentListener(handler: Handler): void {
  useEffect(() => {
    addAttachmentSubs.add(handler);
    return () => {
      addAttachmentSubs.delete(handler);
    };
  }, [handler]);
}

// Mirror channel for "Add web link" — listened to by WebLinksSection.
// Opens the inline form (URL + Link Text), focuses URL, and scrolls
// into view. The section makes itself visible when the form opens
// even if no links exist yet.
export function emitAddWebLink(): void {
  addWebLinkSubs.forEach((h) => h());
}

export function useAddWebLinkListener(handler: Handler): void {
  useEffect(() => {
    addWebLinkSubs.add(handler);
    return () => {
      addWebLinkSubs.delete(handler);
    };
  }, [handler]);
}

// Mirror channel for "Add design" — listened to by DesignsSection.
// Opens the Figma URL form, focuses the URL input, scrolls into view.
export function emitAddDesign(): void {
  addDesignSubs.forEach((h) => h());
}

export function useAddDesignListener(handler: Handler): void {
  useEffect(() => {
    addDesignSubs.add(handler);
    return () => {
      addDesignSubs.delete(handler);
    };
  }, [handler]);
}

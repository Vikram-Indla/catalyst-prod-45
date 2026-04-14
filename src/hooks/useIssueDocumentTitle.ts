/**
 * useIssueDocumentTitle — Manages document.title for issue detail pages.
 * 
 * Title format: "[KEY] Summary"
 * Loading:      "[KEY] Loading…"
 * Error:        "[KEY] Not found" or "[KEY] Error"
 */
import { useEffect, useRef } from 'react';

interface UseIssueDocumentTitleParams {
  issueKey: string | undefined;
  summary: string | undefined | null;
  isLoading: boolean;
  isError: boolean;
  isNotFound?: boolean;
}

function normaliseSummary(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function useIssueDocumentTitle({
  issueKey,
  summary,
  isLoading,
  isError,
  isNotFound,
}: UseIssueDocumentTitleParams) {
  const prevTitle = useRef(document.title);

  useEffect(() => {
    // Capture original title on mount
    prevTitle.current = document.title;
  }, []);

  useEffect(() => {
    if (!issueKey) return;

    if (isLoading) {
      document.title = `[${issueKey}] Loading…`;
    } else if (isNotFound) {
      document.title = `[${issueKey}] Not found`;
    } else if (isError) {
      document.title = `[${issueKey}] Error`;
    } else {
      const clean = normaliseSummary(summary);
      document.title = clean ? `[${issueKey}] ${clean}` : `[${issueKey}]`;
    }
  }, [issueKey, summary, isLoading, isError, isNotFound]);

  // Restore original title on unmount
  useEffect(() => {
    const original = prevTitle.current;
    return () => {
      document.title = original;
    };
  }, []);
}

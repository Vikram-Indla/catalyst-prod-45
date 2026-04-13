/**
 * HierarchyAllWorkPage — 3-column issue view at /project-hub/:key/hierarchy/allwork
 * ════════════════════════════════════════════════════════════════════════════
 * Route: /project-hub/:key/hierarchy/allwork
 * Does NOT touch existing AllWork components under /components/workhub/allwork/
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { IssueViewShell } from '@/components/workhub/issue-view/IssueViewShell';

export default function HierarchyAllWorkPage() {
  const { key: projectKey } = useParams<{ key: string }>();

  if (!projectKey) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="font-body text-sm text-[var(--text-secondary)]">
          No project key provided.
        </p>
      </div>
    );
  }

  return (
    <IssueViewShell
      projectKey={projectKey}
      storageKey={`allwork.${projectKey}.layoutWidths`}
    />
  );
}

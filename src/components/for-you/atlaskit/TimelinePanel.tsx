/**
 * TimelinePanel — top-level "Timeline" tab in the For You page.
 *
 * Renders R360MemberDetail locked to the chronology view (day-grouped
 * timeline of work items) for the current user. Named "Timeline" to
 * align with Jira's native terminology for chronological issue history
 * under a user profile context.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import { useMyR360ResourceId } from '@/hooks/useR360PanelData';
import R360MemberDetail from '@/pages/R360MemberDetail';
import Spinner from '@atlaskit/spinner';

export default function TimelinePanel() {
  const { data: myResourceId, isLoading: idLoading } = useMyR360ResourceId();

  if (idLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (!myResourceId) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        color: token('color.text.subtle', '#6B778C'), fontSize: 14,
      }}>
        No resource profile found for your account.
      </div>
    );
  }

  return (
    <div style={{ minHeight: 600 }}>
      <R360MemberDetail resourceId={myResourceId} embedded forceView="chronology" />
    </div>
  );
}

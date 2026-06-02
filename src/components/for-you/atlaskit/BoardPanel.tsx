/**
 * BoardPanel — top-level "Board" tab in the For You page.
 *
 * Renders R360MemberDetail locked to the board view (Kanban columns by
 * status_category) for the current user, reusing the same R360Panel
 * roster/picker pattern for team lead multi-member support.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyR360ResourceId, useTeamResourceIds } from '@/hooks/useR360PanelData';
import { useAuth } from '@/lib/auth';
import R360MemberDetail from '@/pages/R360MemberDetail';
import Spinner from '@atlaskit/spinner';

export default function BoardPanel() {
  const { user } = useAuth();
  const { isTeamLead } = useUserRole();
  const { data: myResourceId, isLoading: idLoading } = useMyR360ResourceId();
  const { data: teamResources = [], isLoading: teamLoading } = useTeamResourceIds(
    isTeamLead ? (user?.id ?? null) : null,
  );

  const activeResourceId = myResourceId ?? null;

  if (idLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (!activeResourceId) {
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
      <R360MemberDetail resourceId={activeResourceId} embedded forceView="board" />
    </div>
  );
}

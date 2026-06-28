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
export interface BoardPanelViewProps {
  resourceId: string | null;
  isLoading: boolean;
}

export function BoardPanelView({ resourceId, isLoading }: BoardPanelViewProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (!resourceId) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        color: token('color.text.subtle', 'var(--ds-text-subtlest)'), fontSize: 'var(--ds-font-size-400)',
      }}>
        No resource profile found for your account.
      </div>
    );
  }

  return (
    <div style={{ minHeight: 600 }}>
      <R360MemberDetail resourceId={resourceId} embedded forceView="board" />
    </div>
  );
}

export default function BoardPanel() {
  const { user } = useAuth();
  const { isTeamLead } = useUserRole();
  const { data: myResourceId, isLoading: idLoading } = useMyR360ResourceId();
  const { data: teamResources = [], isLoading: teamLoading } = useTeamResourceIds(
    isTeamLead ? (user?.id ?? null) : null,
  );
  return <BoardPanelView resourceId={myResourceId ?? null} isLoading={idLoading} />;
}

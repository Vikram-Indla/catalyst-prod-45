/**
 * StrategyRoleContext — RBAC provider for Strategy Room
 * Fetches user role from es_strategy_roles, defaults to viewer
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStrategyRoleForUser } from '@/hooks/strategy/useStrategyData';
import type { StrategyRole } from '@/types/strategy';

interface StrategyRoleContextValue {
  role: StrategyRole | null;
  isLoading: boolean;
  isOwner: boolean;
  isContributor: boolean;
  isViewer: boolean;
  canEdit: boolean;
  canEditTheme: (themeId: string) => boolean;
  assignedThemeId: string | null;
}

const StrategyRoleContext = createContext<StrategyRoleContextValue>({
  role: null,
  isLoading: true,
  isOwner: false,
  isContributor: false,
  isViewer: true,
  canEdit: false,
  canEditTheme: () => false,
  assignedThemeId: null,
});

export function StrategyRoleProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { data: roleRecord, isLoading: roleLoading } = useStrategyRoleForUser(user?.id);

  const value = useMemo<StrategyRoleContextValue>(() => {
    const isLoading = authLoading || roleLoading;
    const role = (roleRecord?.role as StrategyRole) ?? 'strategy_viewer';
    const isOwner = role === 'strategy_owner';
    const isContributor = role === 'strategy_contributor';
    const isViewer = role === 'strategy_viewer';
    const assignedThemeId = roleRecord?.scope_entity_id ?? null;

    return {
      role,
      isLoading,
      isOwner,
      isContributor,
      isViewer,
      canEdit: isOwner || isContributor,
      canEditTheme: (themeId: string) => isOwner || (isContributor && assignedThemeId === themeId),
      assignedThemeId,
    };
  }, [authLoading, roleLoading, roleRecord]);

  return (
    <StrategyRoleContext.Provider value={value}>
      {children}
    </StrategyRoleContext.Provider>
  );
}

export function useStrategyRole() {
  return useContext(StrategyRoleContext);
}

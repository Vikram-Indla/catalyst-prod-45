/**
 * useReleaseOpsPermissions — UI permission layer for Release Operations.
 *
 * The handoff's role model (release_manager / change_manager / viewer …) is
 * proposed-only; it is NOT in Catalyst's live role tables. This composes the
 * real `useUserRole` (system + product roles) into the two booleans the UI
 * needs: any elevated role can manage; a plain `user` (no elevated role) is a
 * read-only Viewer. This is the USABILITY layer only — the authoritative gate
 * is the server-side RLS helpers (rh_user_has_role / rh_is_manager / rh_is_approver).
 */
import { useUserRole } from '@/hooks/useUserRole';

export interface ReleaseOpsPermissions {
  /** Create / edit / schedule / link releases & changes. */
  canManage: boolean;
  /** Approve / reject sign-offs (mapped to the same elevated set for now). */
  canApprove: boolean;
  isLoading: boolean;
}

export const PERMISSION_DENIED_TOOLTIP = "You don't have permission";

export function useReleaseOpsPermissions(): ReleaseOpsPermissions {
  const { isAdmin, isProgramManager, isTeamLead, isProductOwner, isLoading } = useUserRole();
  const canManage = isAdmin || isProgramManager || isTeamLead || isProductOwner;
  return { canManage, canApprove: canManage, isLoading };
}

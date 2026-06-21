/**
 * AssigneePopover — Subtasks panel assignee picker.
 *
 * 2026-06-21 Phase 8: rewrapped around the canonical <ProfilePicker /> in
 * body-only `anchorRef` mode. Public API unchanged — `children` is the
 * visible trigger, `currentAccountId` is the current value (jira account
 * id), `onChange({ accountId, displayName })` fires when a member is
 * picked or cleared.
 *
 * Lock rule: subtasks are work-items — canonical lock applies via
 * `lockWhenAssigned`.
 *
 * Data source: jira_identity_map (active in Catalyst OR active in Jira).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';
import { ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';

export interface AssigneeOption {
  jira_account_id: string | null;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
}

interface AssigneePopoverProps {
  currentAccountId: string | null;
  onChange: (assignee: { accountId: string | null; displayName: string | null }) => void;
  children: React.ReactNode;
  /** When false, no "current value" check mark is rendered — use in bulk-edit contexts. */
  showActive?: boolean;
}

export function AssigneePopover({ currentAccountId, onChange, children, showActive = true }: AssigneePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const { data: people = [] } = useQuery({
    queryKey: ['subtask-assignee-options-local'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jira_identity_map')
        .select('jira_account_id,display_name,email,is_active_in_catalyst,is_active_in_jira')
        .order('display_name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? [])
        .filter((p) => p.is_active_in_catalyst !== false || p.is_active_in_jira !== false)
        .map((p) => ({
          jira_account_id: p.jira_account_id,
          display_name: p.display_name,
          avatar_url: p.display_name ? resolveAvatarUrl(p.display_name) : null,
          email: p.email,
        })) as AssigneeOption[];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const members: ProfilePickerMember[] = useMemo(
    () => people
      .filter((p) => !!p.jira_account_id)
      .map((p) => ({
        userId: p.jira_account_id as string,
        name: p.display_name,
        email: p.email,
        avatarUrl: p.avatar_url,
      })),
    [people],
  );

  const value: ProfilePickerSelection = currentAccountId
    ? (() => {
        const m = people.find((p) => p.jira_account_id === currentAccountId);
        return m ? { userId: m.jira_account_id as string, name: m.display_name, avatarUrl: m.avatar_url } : null;
      })()
    : null;

  /* Stable RefObject pointing at the trigger span. */
  const stableAnchor = useRef<HTMLElement | null>(null);
  useEffect(() => { stableAnchor.current = triggerRef.current; }, [isOpen]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((o) => !o);
  };

  return (
    <>
      <span ref={triggerRef} onClick={toggle} style={{ display: 'inline-flex', cursor: 'pointer' }}>
        {children}
      </span>
      {isOpen && (
        <ProfilePicker
          value={value}
          onChange={(next) => {
            if (next === null) {
              onChange({ accountId: null, displayName: null });
              return;
            }
            onChange({ accountId: next.userId, displayName: next.name });
          }}
          members={members}
          fieldLabel="Assignee"
          anchorRef={stableAnchor}
          onClose={() => setIsOpen(false)}
          /* Bulk-edit context (showActive=false) intentionally opts out of
             the lock — bulk reassignment must work even when targets
             already have an assignee. */
          lockWhenAssigned={showActive}
        />
      )}
    </>
  );
}

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Check, Search, UserX } from 'lucide-react';
import { getInitials, getAvatarColor } from '../../dialogs/story-detail-modules/helpers';

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
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['subtask-assignee-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jira_identity_map')
        .select('jira_account_id,display_name,avatar_url,email,is_active_in_catalyst,is_active_in_jira')
        .order('display_name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []).filter((p) => p.is_active_in_catalyst !== false || p.is_active_in_jira !== false) as AssigneeOption[];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return people.slice(0, 60);
    return people
      .filter((p) =>
        p.display_name?.toLowerCase().includes(needle) ||
        p.email?.toLowerCase().includes(needle)
      )
      .slice(0, 60);
  }, [people, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="sp-pop"
        style={{ width: 280, padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sp-pop-search">
          <Search size={14} color="#6B778C" />
          <input
            type="text"
            autoFocus
            placeholder="Assign to..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sp-pop-search-input"
          />
        </div>

        <div className="sp-pop-list">
          <button
            type="button"
            className="sp-pop-row"
            onClick={() => {
              onChange({ accountId: null, displayName: null });
              setOpen(false);
            }}
          >
            <span
              className="sp-avatar-fallback"
              style={{ background: '#DFE1E6', color: '#6B778C', width: 24, height: 24 }}
            >
              <UserX size={12} />
            </span>
            <span style={{ fontSize: 13, color: '#172B4D' }}>Unassigned</span>
            {showActive && !currentAccountId && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
          </button>

          {isLoading && (
            <div style={{ padding: '12px', fontSize: 12, color: '#6B778C' }}>Loading…</div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: '12px', fontSize: 12, color: '#6B778C' }}>No matches</div>
          )}

          {filtered.map((p) => {
            const active = showActive && p.jira_account_id === currentAccountId;
            return (
              <button
                key={p.jira_account_id ?? p.email ?? p.display_name}
                type="button"
                className="sp-pop-row"
                onClick={() => {
                  onChange({ accountId: p.jira_account_id, displayName: p.display_name });
                  setOpen(false);
                }}
              >
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.display_name}
                    className="sp-avatar"
                    style={{ width: 24, height: 24 }}
                  />
                ) : (
                  <span
                    className="sp-avatar-fallback"
                    style={{ background: getAvatarColor(p.display_name || ''), width: 24, height: 24 }}
                  >
                    {getInitials(p.display_name)}
                  </span>
                )}
                <span style={{ fontSize: 13, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.display_name}
                </span>
                {active && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

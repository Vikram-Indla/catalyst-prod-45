/**
 * AssigneePopover — @atlaskit/popup hosting a typeahead over jira_identity_map.
 *
 * Uses Atlaskit Avatar for row glyphs so names, avatars, and fallback
 * initials render against the same token palette as the main table cells.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Popup from '@atlaskit/popup';
import Avatar from '@atlaskit/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Check, Search, UserX } from 'lucide-react';
import { resolveAvatarUrl } from '@/lib/avatars';

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
  const [isOpen, setIsOpen] = React.useState(false);
  const [q, setQ] = React.useState('');

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['subtask-assignee-options-local'],
    queryFn: async () => {
      // §19 chokepoint: do not SELECT avatar_url; resolve locally from display_name.
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
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      content={() => (
        <div className="sp-pop" style={{ width: 280, padding: 0 }} onClick={(e) => e.stopPropagation()}>
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
                setIsOpen(false);
              }}
            >
              <span className="sp-avatar-fallback" style={{ background: '#DFE1E6', color: '#6B778C', width: 24, height: 24 }}>
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
                    setIsOpen(false);
                  }}
                >
                  <Avatar
                    size="small"
                    name={p.display_name}
                    src={p.avatar_url ?? undefined}
                    borderColor="transparent"
                  />
                  <span style={{ fontSize: 13, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.display_name}
                  </span>
                  {active && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      trigger={(triggerProps) => (
        <span
          {...triggerProps}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((o) => !o);
          }}
          style={{ display: 'inline-flex' }}
        >
          {children}
        </span>
      )}
    />
  );
}

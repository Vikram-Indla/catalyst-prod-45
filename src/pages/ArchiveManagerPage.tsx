/**
 * ArchiveManagerPage — /for-you/archives
 * Shows both archived AND deleted items with who/when/type metadata.
 * Admin-only unarchive control. Items shredded after 12 months.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { getArchivedIssues, unarchiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import ProjectIcon from '@/components/shared/ProjectIcon';
import { supabase } from '@/integrations/supabase/client';

interface ManagedItem {
  issue_key: string;
  project_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
  priority: string;
  assignee_display_name: string;
  reporter_display_name: string;
  jira_created_at: string;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  _type: 'archived' | 'deleted';
}

type TypeFilter = 'all' | 'archived' | 'deleted';

// ─── Project filter dropdown with ProjectIcon per option ─────────────────────
// Native <select> can't render icons, so this is a self-rolled popover
// (canonical Catalyst pattern: useRef + mousedown click-outside).
function ProjectFilterDropdown({ value, options, onChange }: {
  value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const allOptions = ['', ...options];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 8px', borderRadius: 3, fontSize: 'var(--ds-font-size-400)',
          border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
          background: token('color.background.input', 'var(--ds-surface-sunken)'),
          color: token('color.text', 'var(--ds-text)'), cursor: 'pointer',
          minWidth: 160, justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {value && <ProjectIcon projectKey={value} name={value} size="xsmall" />}
          {value || 'All projects'}
        </span>
        <span style={{ fontSize: 'var(--ds-font-size-50)', color: token('color.icon.subtle', 'var(--ds-text-subtlest)') }}>▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 9999,
            background: token('elevation.surface.overlay', 'var(--ds-surface)'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            borderRadius: 8,
            boxShadow: token('elevation.shadow.overlay', '0 8px 16px var(--ds-shadow-raised, rgba(9,30,66,0.15))'),
            minWidth: 200, padding: '4px 0', maxHeight: 320, overflowY: 'auto',
          }}
        >
          {allOptions.map(opt => {
            const selected = opt === value;
            return (
              <button
                key={opt || '__all'}
                role="option"
                aria-selected={selected}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', textAlign: 'left', border: 'none', cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-400)',
                  background: selected
                    ? token('color.background.selected', 'var(--ds-background-selected)')
                    : 'transparent',
                  color: selected
                    ? token('color.text.selected', 'var(--ds-link)')
                    : token('color.text', 'var(--ds-text)'),
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'); }}
                onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {opt
                  ? <ProjectIcon projectKey={opt} name={opt} size="xsmall" />
                  : <span style={{ width: 16, display: 'inline-block' }} />}
                {opt || 'All projects'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ArchiveManagerPage() {
  const { role } = useUserRole();
  const { user } = useAuth();
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<ManagedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unarchiving, setUnarchiving] = useState<Set<string>>(new Set());
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [myJiraId, setMyJiraId] = useState<string | null>(null);
  // Stable project list — populated once from the unfiltered fetch so the
  // dropdown doesn't collapse when a project is selected.
  const [allProjects, setAllProjects] = useState<string[]>([]);

  // Resolve current user's Jira account ID
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('jira_account_id').eq('id', user.id).single()
      .then(({ data }) => { if (data?.jira_account_id) setMyJiraId(data.jira_account_id); });
  }, [user?.id]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getArchivedIssues({
        search: search || undefined,
        projectKey: filterProject || undefined,
        typeFilter,
        jiraAccountId: myJiraId || undefined,
        isAdmin,
      });
      setItems(data as ManagedItem[]);

      // Populate the stable project list only on the unfiltered "all" fetch,
      // so selecting a project doesn't shrink the dropdown options.
      if (!filterProject && !search && typeFilter === 'all') {
        const projSet = new Set((data as ManagedItem[]).map(i => i.project_key).filter(Boolean));
        setAllProjects(Array.from(projSet).sort());
      }

      // Resolve archived_by / deleted_by UUIDs to names
      const uuids = [...new Set(
        data.flatMap((i: any) => [i.archived_by, i.deleted_by]).filter(Boolean)
      )];
      if (uuids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', uuids);
        const map: Record<string, string> = {};
        for (const p of profiles || []) map[p.id] = p.full_name || 'Unknown';
        setProfileMap(map);
      }
    } catch (e) {
      console.error('[ArchiveManager] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [search, filterProject, typeFilter, myJiraId, isAdmin]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const projects = allProjects;

  const handleUnarchive = async (issueKey: string) => {
    if (!user?.id) return;
    setUnarchiving(prev => new Set(prev).add(issueKey));
    try {
      await unarchiveIssue(issueKey, user.id);
      setItems(prev => prev.filter(i => i.issue_key !== issueKey));
      setSelected(prev => { const n = new Set(prev); n.delete(issueKey); return n; });
    } catch (e: any) {
      alert(e.message || 'Failed to unarchive');
    } finally {
      setUnarchiving(prev => { const n = new Set(prev); n.delete(issueKey); return n; });
    }
  };

  const handleBulkUnarchive = async () => {
    for (const key of selected) await handleUnarchive(key);
  };

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const daysOpen = (d: string) => {
    if (!d) return 0;
    return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  };

  const archivedCount = items.filter(i => i._type === 'archived').length;
  const deletedCount = items.filter(i => i._type === 'deleted').length;

  return (
    <div style={{ padding: token('space.400', '32px'), maxWidth: 1280 }}>
      {/* Header */}
      <h1 style={{
        margin: 0, fontSize: 'var(--ds-font-size-800)', fontWeight: 653,
        color: token('color.text', 'var(--ds-text)'),
        marginBottom: token('space.050', '4px'),
      }}>
        Archive manager
      </h1>
      <p style={{
        margin: 0, fontSize: 'var(--ds-font-size-400)', fontWeight: 400,
        color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        marginBottom: token('space.200', '16px'),
      }}>
        Archived and deleted items. Auto-archived after 60 days of inactivity. Permanently shredded after 12 months.
        {!isAdmin && ' Only admins can unarchive items.'}
      </p>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: token('space.200', '16px'),
        marginBottom: token('space.200', '16px'), flexWrap: 'wrap',
      }}>
        <div style={{ width: 280 }}>
          <Textfield
            placeholder="Search by key or summary..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </div>
        <ProjectFilterDropdown
          value={filterProject}
          options={projects}
          onChange={setFilterProject}
        />
        {/* Type filter tabs */}
        <div style={{ display: 'flex', gap: token('space.050', '4px') }}>
          {([
            { id: 'all' as TypeFilter, label: `All (${items.length})` },
            { id: 'archived' as TypeFilter, label: `Archived (${archivedCount})` },
            { id: 'deleted' as TypeFilter, label: `Deleted (${deletedCount})` },
          ]).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              style={{
                padding: '4px 8px', borderRadius: 3, fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
                border: `1px solid ${typeFilter === t.id
                  ? token('color.border.selected', 'var(--ds-background-information-bold)')
                  : token('color.border', 'var(--ds-border)')}`,
                background: typeFilter === t.id
                  ? token('color.background.selected', 'var(--ds-background-selected)')
                  : token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
                color: typeFilter === t.id
                  ? token('color.text.selected', 'var(--ds-link)')
                  : token('color.text', 'var(--ds-text)'),
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {isAdmin && selected.size > 0 && (
          <Button appearance="primary" onClick={handleBulkUnarchive}>
            Unarchive {selected.size} selected
          </Button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
          {items.length} items
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: token('space.400', '32px'), textAlign: 'center' }}>
          <Spinner size="medium" />
        </div>
      ) : items.length === 0 ? (
        <div style={{
          padding: token('space.600', '48px'), textAlign: 'center',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'), fontSize: 'var(--ds-font-size-400)',
        }}>
          No {typeFilter === 'all' ? 'archived or deleted' : typeFilter} items found.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {isAdmin && <th style={thStyle}></th>}
              <th style={{ ...thStyle, textAlign: 'left' }}>Key</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Summary</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>When</th>
              <th style={thStyle}>By</th>
              <th style={thStyle}>Age</th>
              {isAdmin && <th style={thStyle}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isDeleted = item._type === 'deleted';
              const actionDate = isDeleted ? item.deleted_at : item.archived_at;
              const actionBy = isDeleted ? item.deleted_by : item.archived_by;
              const byName = actionBy ? (profileMap[actionBy] || 'System') : (actionDate ? 'System (auto)' : 'Age-based');

              return (
                <tr key={item.issue_key + item._type} style={{
                  borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                }}>
                  {isAdmin && (
                    <td style={{ ...tdStyle, width: 32 }}>
                      {!isDeleted && (
                        <input
                          type="checkbox"
                          checked={selected.has(item.issue_key)}
                          onChange={() => toggleSelect(item.issue_key)}
                        />
                      )}
                    </td>
                  )}
                  <td style={{ ...tdStyle, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <JiraIssueTypeIcon type={item.issue_type} size={14} />
                      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, fontFamily: '"SFMono-Regular", monospace', color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
                        {item.issue_key}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'left', maxWidth: 360 }}>
                    <span style={{
                      fontSize: 'var(--ds-font-size-400)', color: token('color.text', 'var(--ds-text)'),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                    }}>
                      {item.summary}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <Lozenge appearance={isDeleted ? 'removed' : 'default'}>
                      {isDeleted ? 'Deleted' : 'Archived'}
                    </Lozenge>
                  </td>
                  <td style={tdStyle}>
                    <Lozenge appearance="default">{item.status}</Lozenge>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <ProjectIcon projectKey={item.project_key} name={item.project_key} size="xsmall" />
                      <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
                        {item.project_key}
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
                      {formatDate(actionDate)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
                      {byName}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
                      {daysOpen(item.jira_created_at)}d
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={tdStyle}>
                      {!isDeleted && (
                        <Button
                          appearance="subtle"
                          onClick={() => handleUnarchive(item.issue_key)}
                          isDisabled={unarchiving.has(item.issue_key)}
                        >
                          {unarchiving.has(item.issue_key) ? 'Restoring…' : 'Unarchive'}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-200)', fontWeight: 653, textAlign: 'center',
  color: token('color.text.subtle', 'var(--ds-text-subtle)'),
  padding: '4px 8px',
  borderBottom: `1.67px solid ${token('color.border', 'var(--ds-border)')}`,
  textTransform: 'none' as const,
};

const tdStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-400)', padding: '8px',
  textAlign: 'center',
  verticalAlign: 'middle',
};

/**
 * ArchiveManagerPage — /profile/archives
 * Admin-only page to view and manage archived issues.
 * Regular users can view but cannot unarchive.
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { getArchivedIssues, unarchiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { supabase } from '@/integrations/supabase/client';

interface ArchivedItem {
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
  archived_at: string;
  archived_by: string | null;
}

export default function ArchiveManagerPage() {
  const { role } = useUserRole();
  const { user } = useAuth();
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unarchiving, setUnarchiving] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getArchivedIssues({
        search: search || undefined,
        projectKey: filterProject || undefined,
      });
      setItems(data as ArchivedItem[]);
    } catch (e) {
      console.error('[ArchiveManager] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [search, filterProject]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const projects = useMemo(() => {
    const set = new Set(items.map(i => i.project_key).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const handleUnarchive = async (issueKey: string) => {
    if (!user?.id) return;
    setUnarchiving(prev => new Set(prev).add(issueKey));
    try {
      await unarchiveIssue(issueKey, user.id);
      setItems(prev => prev.filter(i => i.issue_key !== issueKey));
      setSelected(prev => { const n = new Set(prev); n.delete(issueKey); return n; });
    } catch (e: any) {
      console.error('[ArchiveManager] unarchive error:', e);
      alert(e.message || 'Failed to unarchive');
    } finally {
      setUnarchiving(prev => { const n = new Set(prev); n.delete(issueKey); return n; });
    }
  };

  const handleBulkUnarchive = async () => {
    for (const key of selected) {
      await handleUnarchive(key);
    }
  };

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ padding: token('space.400', '32px'), maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: token('space.300', '24px') }}>
        <h1 style={{
          margin: 0, fontSize: 24, fontWeight: 653,
          color: token('color.text', '#292A2E'),
        }}>
          Archive manager
        </h1>
        <p style={{
          margin: '4px 0 0', fontSize: 14, fontWeight: 400,
          color: token('color.text.subtle', '#505258'),
        }}>
          View and manage archived work items. Items are auto-archived after 60 days of inactivity.
          {!isAdmin && ' Only admins can unarchive items.'}
        </p>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: token('space.200', '16px'),
        marginBottom: token('space.200', '16px'),
      }}>
        <div style={{ width: 280 }}>
          <Textfield
            placeholder="Search by key or summary..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          style={{
            padding: '6px 8px', borderRadius: 3, fontSize: 14,
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            background: token('color.background.input', '#FAFBFC'),
            color: token('color.text', '#292A2E'),
          }}
        >
          <option value="">All projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {isAdmin && selected.size > 0 && (
          <Button appearance="primary" onClick={handleBulkUnarchive}>
            Unarchive {selected.size} selected
          </Button>
        )}
        <span style={{
          marginLeft: 'auto', fontSize: 12, color: token('color.text.subtlest', '#6B778C'),
        }}>
          {items.length} archived items
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
          color: token('color.text.subtle', '#505258'), fontSize: 14,
        }}>
          No archived items found.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {isAdmin && (
                <th style={thStyle}>
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={e => {
                      if (e.target.checked) setSelected(new Set(items.map(i => i.issue_key)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
              )}
              <th style={thStyle}>Key</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Summary</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>Archived</th>
              {isAdmin && <th style={thStyle}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.issue_key} style={{
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
              }}>
                {isAdmin && (
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.issue_key)}
                      onChange={() => toggleSelect(item.issue_key)}
                    />
                  </td>
                )}
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <JiraIssueTypeIcon type={item.issue_type} size={14} />
                    <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace', color: token('color.text.subtle', '#505258') }}>
                      {item.issue_key}
                    </span>
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'left', maxWidth: 400 }}>
                  <span style={{
                    fontSize: 14, color: token('color.text', '#292A2E'),
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'block',
                  }}>
                    {item.summary}
                  </span>
                </td>
                <td style={tdStyle}>
                  <Lozenge appearance="default">{item.status}</Lozenge>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C') }}>
                    {item.project_key}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C') }}>
                    {formatDate(item.archived_at)}
                  </span>
                </td>
                {isAdmin && (
                  <td style={tdStyle}>
                    <Button
                      appearance="subtle"
                      onClick={() => handleUnarchive(item.issue_key)}
                      isDisabled={unarchiving.has(item.issue_key)}
                    >
                      {unarchiving.has(item.issue_key) ? 'Restoring…' : 'Unarchive'}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 653, textAlign: 'center',
  color: token('color.text.subtle', '#505258'),
  padding: '4px 8px',
  borderBottom: `1.67px solid ${token('color.border', '#DFE1E6')}`,
  textTransform: 'none' as const,
};

const tdStyle: React.CSSProperties = {
  fontSize: 14, padding: '8px',
  textAlign: 'center',
  verticalAlign: 'middle',
};

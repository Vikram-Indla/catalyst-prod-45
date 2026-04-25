/**
 * ClaimDrillInPanel — Side panel that shows matching tickets when a di-claim link is clicked.
 * Queries ph_issues by resource name + claim context (closures, defects, items, etc.)
 */
import { useState, useEffect } from 'react';
import { X, ExternalLink, Clock } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { formatDistanceToNow } from 'date-fns';

interface ClaimDrillInProps {
  resourceName: string;
  claimText: string;       // e.g. "3 closures", "5 items re-opened"
  weekStart: Date;
  avatarMap: Map<string, string>;
  onClose: () => void;
}

interface TicketRow {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  issue_type: string;
  priority: string;
  project_key: string;
  jira_updated_at: string | null;
  parent_key: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Done: { bg: '#dcfce7', text: '#166534' },
  'In Progress': { bg: '#dbeafe', text: '#1e40af' },
  'To Do': { bg: '#f1f5f9', text: '#475569' },
};

function getStatusStyle(cat: string) {
  return STATUS_COLORS[cat] || STATUS_COLORS['To Do'];
}

const AVATAR_COLORS = ["#6b7a8d", "#7a8b6b", "#8b7a6b", "#6b6b8b", "#6b8b8b", "#8b6b7a", "#7a6b8b", "#6b8b7a"];
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export default function ClaimDrillInPanel({ resourceName, claimText, weekStart, avatarMap, onClose }: ClaimDrillInProps) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    fetchTickets();
  }, [resourceName, claimText]);

  async function fetchTickets() {
    setLoading(true);
    try {
      // Determine filter strategy from claim text
      const lower = claimText.toLowerCase();
      const isClosure = /closures?|closed/i.test(lower);
      const isReopen = /re-?opened/i.test(lower);
      const isDefect = /defects?|bugs?/i.test(lower);
      const isTransition = /transitions?/i.test(lower);

      // Extract specific status from "to 'STATUS'" pattern (e.g. "1 item to 'Monitor'")
      const statusMatch = lower.match(/to\s+'([^']+)'/);
      const targetStatus = statusMatch ? statusMatch[1] : null;

      // Extract the expected count from claim text
      const countMatch = claimText.match(/^(\d+)/);
      const expectedCount = countMatch ? parseInt(countMatch[1], 10) : null;

      // Calculate week end
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 5);

      // First resolve assignee_account_id from display name
      const { data: mappings } = await typedQuery('ph_user_mapping')
        .select('jira_account_id')
        .ilike('jira_display_name', `%${resourceName}%`);

      const accountIds = (mappings || []).map((m: any) => m.jira_account_id).filter(Boolean);

      // Build query
      let query = typedQuery('ph_issues')
        .select('issue_key, summary, status, status_category, issue_type, priority, project_key, jira_updated_at, parent_key')
        .gte('jira_updated_at', weekStart.toISOString())
        .lte('jira_updated_at', weekEnd.toISOString())
        .order('jira_updated_at', { ascending: false })
        .limit(50);

      // Filter by resource (assignee OR reporter)
      if (accountIds.length > 0) {
        query = query.or(
          `assignee_account_id.in.(${accountIds.join(',')}),reporter_account_id.in.(${accountIds.join(',')})`
        );
      } else {
        query = query.or(
          `assignee_display_name.ilike.%${resourceName}%,reporter_display_name.ilike.%${resourceName}%`
        );
      }

      // Apply status/type filter based on claim context
      if (targetStatus) {
        // Specific status target: "moved 1 item to 'Monitor'" → filter by that status
        query = query.ilike('status', targetStatus);
      } else if (isClosure) {
        query = query.eq('status_category', 'Done');
      } else if (isReopen) {
        query = query.neq('status_category', 'Done');
      } else if (isDefect) {
        query = query.in('issue_type', ['Bug', 'Defect']);
      }
      // For transitions/items/tickets — show all (no extra filter)

      const { data, error } = await query;
      if (error) {
        console.error('[ClaimDrillIn] Query error:', error);
        setTickets([]);
      } else {
        // If we have an expected count and more results, limit to expected count
        const results = data || [];
        if (expectedCount && results.length > expectedCount) {
          setTickets(results.slice(0, expectedCount));
        } else {
          setTickets(results);
        }
      }
    } catch (err) {
      console.error('[ClaimDrillIn] Error:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, top: 48,
          background: 'rgba(0,0,0,0.12)',
          zIndex: 600,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 48,
        width: 520, height: 'calc(100vh - 48px)',
        background: '#ffffff',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
        zIndex: 601,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--cp-font-body)',
        animation: 'slideInRight 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            {(() => {
              const url = avatarMap.get(resourceName.toLowerCase());
              if (url) {
                return <img src={url} alt={resourceName} style={{ width: 36, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
              }
              return (
                <div style={{ width: 36, height: 50, borderRadius: '50%', background: hashColor(resourceName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  {getInitials(resourceName)}
                </div>
              );
            })()}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 2 }}>
                DRILL-IN
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{resourceName}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>· {claimText}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 6,
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="#64748b" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No matching tickets found for this period.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginBottom: 12 }}>
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} found
              </div>
              {tickets.map((t) => {
                const sc = getStatusStyle(t.status_category);
                return (
                  <div key={t.issue_key} style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    marginBottom: 8,
                    background: '#fafbfc',
                    cursor: 'default',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <JiraIssueTypeIcon type={t.issue_type} size={16} />
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--cp-blue)' }}>
                        {t.issue_key}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 12,
                        background: sc.bg, color: sc.text,
                      }}>
                        {t.status}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} />
                        {t.jira_updated_at ? formatDistanceToNow(new Date(t.jira_updated_at), { addSuffix: true }) : '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', lineHeight: 1.4 }}>
                      {t.summary}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11, color: '#64748b' }}>
                      <span>{t.project_key}</span>
                      {t.priority && (
                        <>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span>{t.priority}</span>
                        </>
                      )}
                      {t.parent_key && (
                        <>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span>↑ {t.parent_key}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid #e2e8f0',
          fontSize: 11, color: '#94a3b8',
          flexShrink: 0,
        }}>
          Data from Jira sync · Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

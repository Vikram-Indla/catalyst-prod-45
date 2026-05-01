/**
 * SubTasksTab — Shows child work items of the current item with summary bar + progress.
 * Uses ph_issues table queried by parent_key.
 */
import { useState, useEffect } from 'react';
import { Loader2, ListTree } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { formatDistanceToNow } from 'date-fns';
import type { AllWorkItem } from '@/types/allwork.types';
import { normalizeWorkItem } from '@/types/allwork.types';

/* ── Status classification (mirrors StatusLozenge) ── */
function getStatusCategory(status: string): 'todo' | 'inprogress' | 'done' {
  const n = status.toLowerCase().replace(/[\s_-]+/g, '').trim();
  const doneP = ['done', 'closed', 'resolved', 'complete', 'completed', 'inproduction', 'inprod', 'released', 'shipped', 'deployed', 'verified', 'accepted', 'approved'];
  if (doneP.some(p => n.includes(p))) return 'done';
  const progP = ['inprogress', 'indevelopment', 'indev', 'inreview', 'testing', 'readyfordevelopment', 'readyfordev', 'readyforqa', 'development', 'review', 'active', 'started', 'reopened', 'open', 'ready', 'triage', 'onhold'];
  if (progP.some(p => n.includes(p))) return 'inprogress';
  return 'todo';
}

function formatRel(d: string | null): string {
  if (!d) return '—';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return '—'; }
}

/* ── Hook: fetch sub-tasks ── */
export function useSubTasks(parentKey: string | null) {
  const [data, setData] = useState<AllWorkItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentKey) { setData([]); return; }
    let cancelled = false;
    setLoading(true);

    supabase
      .from('ph_issues')
      .select('issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, parent_key, parent_summary, jira_created_at, jira_updated_at, description_text, story_points, labels, sprint_name, type_icon_url, due_date, project_key, reporter_display_name')
      .eq('parent_key', parentKey)
      .is('jira_removed_at', null)
      .is('archived_at', null)
      .order('jira_updated_at', { ascending: false })
      .limit(100)
      .then(({ data: rows }) => {
        if (!cancelled) {
          setData((rows || []).map(r => normalizeWorkItem({ ...r, _source: 'ph_issues', reporter_name: r.reporter_display_name })));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [parentKey]);

  return { subTasks: data, isLoading: loading };
}

/* ── Avatar ── */
const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1', '#13C2C2', '#2F54EB'];
function MiniAvatar({ name }: { name: string }) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div
      style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        backgroundColor: AVATAR_COLORS[hash % AVATAR_COLORS.length],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: 'var(--bg-app)',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ── Sub-task card ── */
function SubTaskCard({ item, onClick }: { item: AllWorkItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '12px 14px', width: '100%', textAlign: 'left',
        border: '1px solid #E4E4E7', borderRadius: 8,
        cursor: 'pointer', backgroundColor: 'var(--bg-app)',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FAFAFA'; e.currentTarget.style.borderColor = '#D4D4D8'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-app)'; e.currentTarget.style.borderColor = '#E4E4E7'; }}
    >
      {/* Row 1: Icon + Key + Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <JiraIssueTypeIcon type={item.issue_type} size={16} />
        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, fontWeight: 650, color: 'var(--cp-blue)', flexShrink: 0 }}>
          {item.issue_key}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 500, color: 'var(--fg-1)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          fontFamily: 'var(--cp-font-body)',
        }}>
          {item.summary}
        </span>
      </div>

      {/* Row 2: Status + Assignee + Priority + Updated */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 26 }}>
        <StatusLozenge status={item.status} />

        {item.assignee_display_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <MiniAvatar name={item.assignee_display_name} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)' }}>
              {item.assignee_display_name}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <PriorityIndicator priority={item.priority} fontSize={12} />
        </div>

        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)', marginLeft: 'auto', fontFamily: 'var(--cp-font-mono)' }}>
          {formatRel(item.jira_updated_at)}
        </span>
      </div>
    </button>
  );
}

/* ── Main tab component ── */
interface SubTasksTabProps {
  parentKey: string;
  onSubTaskClick: (item: AllWorkItem) => void;
}

export function SubTasksTab({ parentKey, onSubTaskClick }: SubTasksTabProps) {
  const { subTasks, isLoading } = useSubTasks(parentKey);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 8 }}>
        <Loader2 size={16} color="#71717A" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}>Loading sub-tasks…</span>
      </div>
    );
  }

  if (subTasks.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', textAlign: 'center', gap: 8,
      }}>
        <ListTree size={28} color="#A1A1AA" strokeWidth={1.5} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}>
          No sub-tasks found for this item.
        </span>
      </div>
    );
  }

  // Categorise
  const todoTasks = subTasks.filter(t => getStatusCategory(t.status) === 'todo');
  const progressTasks = subTasks.filter(t => getStatusCategory(t.status) === 'inprogress');
  const doneTasks = subTasks.filter(t => getStatusCategory(t.status) === 'done');
  const total = subTasks.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', backgroundColor: '#FAFAFA', borderRadius: 8, border: '1px solid #E4E4E7',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>
            {total} sub-task{total !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[
              { count: todoTasks.length, label: 'To Do', bg: 'var(--ds-border, #DFE1E6)', color: '#44546F' },
              { count: progressTasks.length, label: 'In Progress', bg: '#0C66E4', color: 'var(--bg-app)' },
              { count: doneTasks.length, label: 'Done', bg: '#1B7F37', color: 'var(--bg-app)' },
            ].map(s => (
              <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                  backgroundColor: s.bg, color: s.color, fontSize: 11, fontWeight: 700,
                }}>{s.count}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}>{s.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', width: 100, height: 5, borderRadius: 4, overflow: 'hidden', backgroundColor: 'var(--ds-border, #DFE1E6)' }}>
          {doneTasks.length > 0 && (
            <div style={{ width: `${(doneTasks.length / total) * 100}%`, backgroundColor: '#00875A', transition: 'width 0.3s ease' }} />
          )}
          {progressTasks.length > 0 && (
            <div style={{ width: `${(progressTasks.length / total) * 100}%`, backgroundColor: '#0065FF', transition: 'width 0.3s ease' }} />
          )}
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {subTasks.map(item => (
          <SubTaskCard key={item.issue_key} item={item} onClick={() => onSubTaskClick(item)} />
        ))}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

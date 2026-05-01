// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Filter, ArrowUpDown } from 'lucide-react';
import type { Incident } from '@/types/release';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface IncidentActivitySectionProps {
  incident: Incident;
}

type ActivityTab = 'all' | 'comments' | 'history';

interface ActivityEntry {
  id: string;
  type: 'history' | 'comment';
  author_name: string | null;
  occurred_at: string;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  content?: string | null;
}

const ACTIVITY_TABS: { id: ActivityTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'comments', label: 'Comments' },
  { id: 'history', label: 'History' },
];

function avatarColor(name: string) {
  const colors = ['bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]', 'bg-[#5243AA]', 'bg-[#00A3BF]', 'bg-[#FF8800]', 'bg-[#0052CC]'];
  return colors[(name?.charCodeAt(0) ?? 0) % colors.length];
}

function initials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatFieldName(field: string | null) {
  if (!field) return 'field';
  return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function IncidentActivitySection({ incident }: IncidentActivitySectionProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    const results: ActivityEntry[] = [];

    // 1. ph_activity_log — Catalyst-native field changes on this incident.
    //    work_item_id matches if the incident was created/tracked in ph_issues.
    const { data: activityRows } = await supabase
      .from('ph_activity_log')
      .select('id, action, field_name, old_value, new_value, created_at, user_id')
      .eq('work_item_id', incident.id)
      .order('created_at', { ascending: false })
      .limit(100);

    for (const row of activityRows ?? []) {
      results.push({
        id: row.id,
        type: 'history',
        author_name: null, // user_id → profile join can be added later
        occurred_at: row.created_at,
        field_name: row.field_name,
        old_value: row.old_value,
        new_value: row.new_value,
      });
    }

    // 2. jira_sync_changelog — historical Jira field changes (by jira_key if present).
    //    Kept during Jira transition; will be removed post-decommission.
    const { data: incidentRow } = await supabase
      .from('incidents')
      .select('jira_key')
      .eq('id', incident.id)
      .maybeSingle();

    if (incidentRow?.jira_key) {
      const { data: changelogRows } = await supabase
        .from('jira_sync_changelog')
        .select('id, field_name, from_string, to_string, jira_created_at, author_display_name')
        .eq('issue_key', incidentRow.jira_key)
        .order('jira_created_at', { ascending: false })
        .limit(100);

      for (const row of changelogRows ?? []) {
        results.push({
          id: `jira-${row.id}`,
          type: 'history',
          author_name: row.author_display_name,
          occurred_at: row.jira_created_at,
          field_name: row.field_name,
          old_value: row.from_string,
          new_value: row.to_string,
        });
      }
    }

    // 3. ph_comments keyed to this incident
    const { data: commentRows } = await supabase
      .from('ph_comments' as any)
      .select('id, body, created_at, author_display_name')
      .eq('work_item_id', incident.id)
      .order('created_at', { ascending: false })
      .limit(50);

    for (const row of commentRows ?? []) {
      results.push({
        id: `comment-${row.id}`,
        type: 'comment',
        author_name: row.author_display_name ?? null,
        occurred_at: row.created_at,
        content: row.body,
      });
    }

    // Sort merged results newest-first
    results.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    setEntries(results);
    setIsLoading(false);
  }, [incident.id]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ph_activity_log').insert({
      work_item_id: incident.id,
      user_id: user?.id ?? '00000000-0000-0000-0000-000000000000',
      action: 'commented',
      field_name: null,
      old_value: null,
      new_value: comment.trim(),
    });
    setComment('');
    setIsComposerExpanded(false);
    setIsSaving(false);
    fetchActivity();
  };

  const filtered = entries.filter(e => {
    if (activeTab === 'all') return true;
    if (activeTab === 'comments') return e.type === 'comment';
    if (activeTab === 'history') return e.type === 'history';
    return true;
  });

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-[var(--ds-text,var(--ds-text, #172B4D))]">Activity</h2>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F4F5F7))] text-[#42526E]">
            <Filter className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F4F5F7))] text-[#42526E]">
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {ACTIVITY_TABS.map(tab => (
          <button
            key={tab.id}
            className={cn(
              'px-3 py-1.5 rounded text-sm transition-colors border',
              activeTab === tab.id
                ? 'bg-[#E9F2FF] text-[#0052CC] border-[#0052CC]'
                : 'text-[#42526E] hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F4F5F7))] border-transparent',
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comment Composer */}
      <div className="flex gap-3 mb-5">
        <div className="w-8 h-8 shrink-0 rounded-full bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] text-white text-xs font-medium flex items-center justify-center">
          V
        </div>
        <div className="flex-1">
          {!isComposerExpanded ? (
            <div
              className="border border-[var(--ds-border,var(--ds-border, #DFE1E6))] rounded p-3 cursor-text hover:border-[#A5ADBA] text-sm text-[#A5ADBA]"
              onClick={() => setIsComposerExpanded(true)}
            >
              Add a comment...
            </div>
          ) : (
            <div>
              <textarea
                autoFocus
                className="w-full border-2 border-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] rounded p-3 text-sm text-[var(--ds-text,var(--ds-text, #172B4D))] outline-none min-h-[80px] resize-none"
                placeholder="Add a comment..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  className="px-3 h-8 rounded text-sm font-medium bg-[#0052CC] text-white hover:bg-[#0747A6] disabled:opacity-50"
                  onClick={handleSaveComment}
                  disabled={isSaving || !comment.trim()}
                >
                  Save
                </button>
                <button
                  className="px-3 h-8 rounded text-sm text-[var(--ds-text,var(--ds-text, #172B4D))] hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F4F5F7))]"
                  onClick={() => { setIsComposerExpanded(false); setComment(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 py-4 border-t border-[var(--ds-border,var(--ds-border, #DFE1E6))]">
              <div className="w-8 h-8 rounded-full bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F4F5F7))]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F4F5F7))] rounded w-1/3" />
                <div className="h-3 bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F4F5F7))] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #6B778C))]">
          No activity yet.
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map(entry => (
            <div key={entry.id} className="flex gap-3 py-4 border-t border-[var(--ds-border,var(--ds-border, #DFE1E6))] first:border-t-0">
              <div className={cn('w-8 h-8 shrink-0 rounded-full text-white text-xs font-medium flex items-center justify-center', avatarColor(entry.author_name ?? ''))}>
                {initials(entry.author_name)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-1.5 mb-0.5">
                  <span className="text-sm font-semibold text-[var(--ds-text,var(--ds-text, #172B4D))]">{entry.author_name ?? 'System'}</span>
                  {entry.type === 'history' && entry.field_name && (
                    <span className="text-sm text-[var(--ds-text,var(--ds-text, #172B4D))]">
                      changed <span className="font-medium">{formatFieldName(entry.field_name)}</span>
                    </span>
                  )}
                  {entry.type === 'comment' && (
                    <span className="text-sm text-[var(--ds-text,var(--ds-text, #172B4D))]">added a comment</span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #6B778C))] mb-1.5">
                  {formatDistanceToNow(new Date(entry.occurred_at), { addSuffix: true })}
                </div>
                {entry.type === 'history' && (entry.old_value || entry.new_value) && (
                  <div className="flex items-center gap-2 mt-1">
                    {entry.old_value && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-[var(--ds-border,var(--ds-border, #DFE1E6))] bg-white text-[var(--ds-text,var(--ds-text, #172B4D))]">
                        {entry.old_value}
                      </span>
                    )}
                    {entry.old_value && entry.new_value && <span className="text-[#A5ADBA]">→</span>}
                    {entry.new_value && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-[var(--ds-border,var(--ds-border, #DFE1E6))] bg-white text-[var(--ds-text,var(--ds-text, #172B4D))]">
                        {entry.new_value}
                      </span>
                    )}
                  </div>
                )}
                {entry.type === 'comment' && entry.content && (
                  <div className="text-sm text-[var(--ds-text,var(--ds-text, #172B4D))] leading-5 mt-1 whitespace-pre-wrap">
                    {entry.content}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

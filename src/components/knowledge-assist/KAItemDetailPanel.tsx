/**
 * KAItemDetailPanel — Slide-in detail panel for work items clicked in KA responses.
 * Fetches from ph_issues by issue_key, shows key fields + description + recent activity.
 */
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ExternalLink, Copy, Zap, Target, Layers, User, Calendar, Clock,
  Tag, GitBranch, MessageSquare, CornerDownLeft,
} from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { StatusLozenge } from '@/components/ui/StatusLozenge';

const T = {
  ink: 'var(--fg-1)', inkSecondary: 'var(--fg-1)', inkTertiary: 'var(--fg-2)',
  inkMuted: 'var(--fg-3)', border: 'var(--divider)', borderStrong: 'var(--divider)',
  surface: 'var(--bg-app)', surfaceSecondary: 'var(--bg-1)', surfaceTertiary: 'var(--bg-2)',
  primary: 'var(--cp-blue)', primaryBg: 'var(--cp-blue-wash)',
  danger: 'var(--sem-danger)', warning: 'var(--sem-warning)', teal: 'var(--sem-success)',
};

const F = {
  inter: "'Inter', -apple-system, sans-serif",
  sora: "'Sora', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

interface ItemData {
  issue_key: string;
  summary: string;
  status: string;
  priority: string;
  issue_type: string;
  project_key: string;
  project_name: string;
  assignee_display_name: string;
  reporter_display_name: string;
  description: string | null;
  jira_created_at: string;
  jira_updated_at: string;
  labels: string[] | null;
  fix_versions: string | null;
  components: string | null;
  sprint_name: string | null;
  story_points: number | null;
  parent_key: string | null;
  parent_summary: string | null;
}

interface ChangelogEntry {
  id: string;
  author_display_name: string;
  field_name: string;
  from_string: string | null;
  to_string: string | null;
  jira_created_at: string;
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PRI_LEVEL: Record<string, number> = {
  highest: 4, high: 3, medium: 2, low: 1, lowest: 0,
};

function PriorityBars({ label }: { label: string }) {
  const level = PRI_LEVEL[label?.toLowerCase()] ?? 2;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 5, height: 16, borderRadius: 1,
            background: i <= level ? T.inkMuted : T.border,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.ink, textTransform: 'capitalize' }}>{label || 'Medium'}</span>
    </div>
  );
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const ini = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const clr = [T.primary, T.teal, T.warning, T.danger, '#7C3AED'][ini.charCodeAt(0) % 5];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: clr, color: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>{ini}</div>
  );
}

function FieldRow({ icon, label, children, last }: { icon: React.ReactNode; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '140px 1fr',
      borderBottom: last ? 'none' : `1px solid ${T.border}`, minHeight: 38,
    }}>
      <div style={{
        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 11, fontWeight: 600, color: T.inkMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        background: T.surfaceSecondary, borderRight: `1px solid ${T.border}`,
      }}>
        <span style={{ display: 'flex', color: T.inkMuted }}>{icon}</span>{label}
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: T.ink }}>
        {children}
      </div>
    </div>
  );
}

interface KAItemDetailPanelProps {
  issueKey: string;
  onClose: () => void;
}

export function KAItemDetailPanel({ issueKey, onClose }: KAItemDetailPanelProps) {
  const [item, setItem] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      setItem(null);
      try {
        const { data, error } = await typedQuery('ph_issues')
          .select('issue_key, summary, status, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, description_text, jira_created_at, jira_updated_at, labels, fix_versions, components, sprint_name, story_points, parent_key, parent_summary')
          .eq('issue_key', issueKey.trim())
          .maybeSingle();
        if (error) console.error('KA detail fetch error:', error);
        if (data) {
          setItem({ ...data, description: data.description_text });
        } else {
          // Fallback: ilike match
          const { data: fallback } = await typedQuery('ph_issues')
            .select('issue_key, summary, status, priority, issue_type, project_key, project_name, assignee_display_name, reporter_display_name, description_text, jira_created_at, jira_updated_at, labels, fix_versions, components, sprint_name, story_points, parent_key, parent_summary')
            .ilike('issue_key', issueKey.trim())
            .maybeSingle();
          if (fallback) setItem({ ...fallback, description: fallback.description_text });
          else console.warn('KA detail: item not found for key:', issueKey);
        }
      } catch (e) { console.error('KA detail fetch error:', e); }
      finally { setLoading(false); }
    }
    fetchItem();
  }, [issueKey]);

  // Fetch changelog
  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data } = await typedQuery('jira_sync_changelog')
          .select('id, author_display_name, field_name, from_string, to_string, jira_created_at')
          .eq('issue_key', issueKey)
          .order('jira_created_at', { ascending: false })
          .limit(5);
        if (data) setChangelog(data);
      } catch (e) { /* silent */ }
    }
    fetchHistory();
  }, [issueKey]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: T.surface, display: 'flex', flexDirection: 'column',
      animation: 'ka-detail-in 200ms ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', borderBottom: `1px solid ${T.border}`,
        background: T.surfaceSecondary, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: T.inkTertiary,
            display: 'flex', padding: 4, borderRadius: 4,
          }}>
            <ArrowLeft size={18} />
          </button>
          <span style={{
            fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: T.primary,
            background: T.primaryBg, padding: '4px 12px', borderRadius: 4,
          }}>{issueKey}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(issueKey)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, display: 'flex', padding: 2 }}
          >
            <Copy size={13} />
          </button>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: T.primary, background: T.primaryBg,
          padding: '3px 8px', borderRadius: 4, fontFamily: F.mono,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>JIRA SYNC</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: T.primary,
                  animation: 'ka-dot-bounce 1.2s infinite', animationDelay: `${i * 150}ms`,
                }} />
              ))}
            </div>
          </div>
        ) : !item ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 6 }}>Item Not Found</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 20 }}>
              No item with key <span style={{ fontFamily: F.mono, fontWeight: 600, color: T.primary }}>{issueKey}</span> was found in the database.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px', borderRadius: 6, border: `1px solid ${T.border}`,
                background: T.surfaceSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: T.ink,
              }}
            >← Back to results</button>
          </div>
        ) : (
          <div>
            {/* Title */}
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ marginTop: 3 }}>
                  <JiraIssueTypeIcon issueType={item.issue_type} size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontFamily: F.sora, fontSize: 18, fontWeight: 700,
                    color: T.ink, letterSpacing: '-0.025em', lineHeight: 1.35, margin: 0,
                  }}>{item.summary}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    <StatusLozenge status={item.status} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: T.inkTertiary }}>{item.project_name || item.project_key}</span>
                    <span style={{ color: T.borderStrong }}>·</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: T.inkTertiary }}>
                      Updated {formatTimeAgo(item.jira_updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parent banner */}
            {item.parent_key && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                margin: '16px 24px 0', background: T.surfaceTertiary, borderRadius: 8,
                border: `1px solid ${T.border}`,
              }}>
                <CornerDownLeft size={14} style={{ color: T.inkMuted, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PARENT</span>
                <JiraIssueTypeIcon issueType="epic" size={14} />
                <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: T.primary }}>{item.parent_key}</span>
                {item.parent_summary && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.parent_summary}
                  </span>
                )}
              </div>
            )}

            {/* Field Grid */}
            <div style={{ margin: '16px 24px', border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <FieldRow icon={<Zap size={13} />} label="Status"><StatusLozenge status={item.status} /></FieldRow>
              <FieldRow icon={<Target size={13} />} label="Priority"><PriorityBars label={item.priority} /></FieldRow>
              <FieldRow icon={<Layers size={13} />} label="Project"><span style={{ fontWeight: 600 }}>{item.project_name || item.project_key}</span></FieldRow>
              <FieldRow icon={<Tag size={13} />} label="Type"><JiraIssueTypeIcon issueType={item.issue_type} size={14} /><span>{item.issue_type}</span></FieldRow>
              {item.sprint_name && (
                <FieldRow icon={<GitBranch size={13} />} label="Sprint"><span style={{ fontFamily: F.mono, fontSize: 12 }}>{item.sprint_name}</span></FieldRow>
              )}
              {item.labels && item.labels.length > 0 && (
                <FieldRow icon={<Tag size={13} />} label="Labels">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.labels.map(l => (
                      <span key={l} style={{ fontSize: 11, fontWeight: 600, color: T.inkSecondary, background: T.surfaceTertiary, padding: '2px 8px', borderRadius: 4 }}>{l}</span>
                    ))}
                  </div>
                </FieldRow>
              )}
              <div style={{ height: 2, background: T.surfaceTertiary }} />
              <FieldRow icon={<User size={13} />} label="Reporter">
                {item.reporter_display_name ? (<><Avatar name={item.reporter_display_name} size={22} /><span style={{ fontWeight: 500 }}>{item.reporter_display_name}</span></>) : <span style={{ color: T.inkMuted }}>—</span>}
              </FieldRow>
              <FieldRow icon={<User size={13} />} label="Assignee">
                {item.assignee_display_name ? (<><Avatar name={item.assignee_display_name} size={22} /><span style={{ fontWeight: 500 }}>{item.assignee_display_name}</span></>) : <span style={{ color: T.inkMuted }}>—</span>}
              </FieldRow>
              <div style={{ height: 2, background: T.surfaceTertiary }} />
              <FieldRow icon={<Calendar size={13} />} label="Created"><span style={{ fontWeight: 500 }}>{formatTimeAgo(item.jira_created_at)}</span></FieldRow>
              <FieldRow icon={<Clock size={13} />} label="Updated" last><span style={{ fontWeight: 500 }}>{formatTimeAgo(item.jira_updated_at)}</span></FieldRow>
            </div>

            {/* Description */}
            <div style={{ margin: '0 24px 16px' }}>
              <h3 style={{
                fontFamily: F.sora, fontSize: 14, fontWeight: 600, color: T.ink,
                paddingBottom: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 12,
              }}>Description</h3>
              <div style={{ fontSize: 13, color: T.inkSecondary, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {item.description || 'No description provided.'}
              </div>
            </div>

            {/* Recent Activity */}
            {changelog.length > 0 && (
              <div style={{ margin: '0 24px 24px' }}>
                <h3 style={{
                  fontFamily: F.sora, fontSize: 14, fontWeight: 600, color: T.ink,
                  paddingBottom: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <MessageSquare size={14} /> Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {changelog.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Avatar name={c.author_display_name || 'Unknown'} size={24} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: T.ink }}>
                          <span style={{ fontWeight: 600 }}>{c.author_display_name}</span>
                          <span style={{ color: T.inkMuted }}> {c.field_name === 'status' ? 'changed status' : `updated ${c.field_name}`}</span>
                          {c.from_string && <span style={{ color: T.inkMuted }}> from </span>}
                          {c.from_string && <span style={{ fontWeight: 500, color: T.inkTertiary }}>{c.from_string}</span>}
                          {c.to_string && <span style={{ color: T.inkMuted }}> → </span>}
                          {c.to_string && (
                            c.field_name === 'status'
                              ? <StatusLozenge status={c.to_string} />
                              : <span style={{ fontWeight: 500, color: T.ink }}>{c.to_string}</span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: T.inkMuted }}>{formatTimeAgo(c.jira_created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ka-detail-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

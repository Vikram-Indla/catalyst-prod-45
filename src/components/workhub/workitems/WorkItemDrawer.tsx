/**
 * WorkItemDrawer — Detail side panel for a Jira issue
 * Shows: parent, description, status, type, priority, assignee, dates, theme (editable), comments, history.
 * Theme is a Catalyst-only field, auto-saved to wh_issues.theme_id
 */

import { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Clock, User, Check, Palette } from 'lucide-react';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { useUpdateWorkItem } from '@/hooks/workhub/useWorkItems';
import { useWHThemes } from '@/hooks/workhub/useThemes';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface WorkItemDrawerProps {
  item: JiraIssue | null;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'var(--bg-1)' }}>
      <span className="text-[12px] font-medium shrink-0" style={{ width: '110px', color: 'var(--fg-4)' }}>
        {label}
      </span>
      <div className="flex-1 text-[13px]" style={{ color: 'var(--fg-1)' }}>{children}</div>
    </div>
  );
}

function formatDateFull(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy, HH:mm'); } catch { return '—'; }
}

/** Inline theme picker for the drawer */
function ThemeSelector({ issueKey, currentThemeId }: { issueKey: string; currentThemeId: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: themes } = useWHThemes();
  const updateItem = useUpdateWorkItem();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (themeId: string | null) => {
    updateItem.mutate(
      { issueKey, field: 'theme_id', value: themeId },
      {
        onSuccess: () => {
          toast.success(themeId ? 'Theme assigned' : 'Theme removed');
          setOpen(false);
        },
      }
    );
  };

  const current = themes?.find(t => t.id === currentThemeId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-50 transition-colors text-[13px]"
        style={{ color: 'var(--fg-1)' }}
      >
        {current ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: current.color || 'var(--fg-4)' }} />
            {current.name}
          </>
        ) : (
          <span className="italic text-[12px]" style={{ color: 'var(--fg-4)' }}>
            Assign theme…
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 bg-white rounded-lg border overflow-y-auto z-50"
          style={{
            minWidth: '220px',
            maxHeight: '240px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            borderColor: 'var(--divider)',
          }}
        >
          {/* None option */}
          <button
            onClick={() => handleSelect(null)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
            style={{ color: 'var(--fg-3)' }}
          >
            <span className="italic">None</span>
            {!currentThemeId && <Check className="w-3.5 h-3.5" style={{ color: 'var(--cp-blue)' }} />}
          </button>

          {(themes ?? []).map(t => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              style={{ color: 'var(--fg-1)' }}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || 'var(--fg-4)' }} />
                {t.name}
              </span>
              {currentThemeId === t.id && <Check className="w-3.5 h-3.5" style={{ color: 'var(--cp-blue)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkItemDrawer({ item, onClose }: WorkItemDrawerProps) {
  if (!item) return null;

  const comments = Array.isArray(item.comments) ? item.comments : [];
  const changelog = Array.isArray(item.changelog) ? item.changelog : [];

  // We need theme_id from the item — it may come via a separate query
  // For now we read it from the item object (will be populated after migration)
  const themeId = (item as any).theme_id ?? null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col bg-white shadow-2xl"
        style={{ width: '520px', fontFamily: 'var(--wh-font-sans)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--divider)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-sm font-bold"
              style={{ fontFamily: 'var(--wh-font-mono, monospace)', color: 'var(--cp-blue)' }}
            >
              {item.issue_key}
            </span>
            <span
              className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: 'var(--cp-primary-20)', color: 'var(--cp-blue)' }}
            >
              {item.status}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" style={{ color: 'var(--fg-3)' }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Title */}
            <h2 className="text-lg font-semibold leading-snug" style={{ color: 'var(--fg-1)' }}>
              {item.summary}
            </h2>

            {/* Parent */}
            {item.parent_key && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ borderColor: 'var(--divider)', backgroundColor: 'var(--bg-1)' }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-4)' }}>Parent</span>
                <span className="text-[12px] font-bold" style={{ fontFamily: 'var(--wh-font-mono, monospace)', color: 'var(--cp-blue)' }}>
                  {item.parent_key}
                </span>
                {item.parent_summary && (
                  <span className="text-[12px] truncate" style={{ color: 'var(--fg-2)' }}>— {item.parent_summary}</span>
                )}
              </div>
            )}

            {/* Detail fields */}
            <div>
              <DetailRow label="Type">{item.issue_type}</DetailRow>
              <DetailRow label="Priority">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{
                    backgroundColor: item.priority === 'Highest' ? 'var(--sem-danger)' :
                      item.priority === 'High' ? '#ea580c' :
                      item.priority === 'Medium' ? 'var(--sem-warning)' :
                      item.priority === 'Low' ? 'var(--cp-blue)' : 'var(--fg-3)'
                  }} />
                  {item.priority}
                </div>
              </DetailRow>
              <DetailRow label="Project">{item.project_key}</DetailRow>

              {/* Theme — editable, auto-saved to Catalyst DB */}
              <DetailRow label="Theme">
                <ThemeSelector issueKey={item.issue_key} currentThemeId={themeId} />
              </DetailRow>

              <DetailRow label="Assignee">
                <div className="flex items-center gap-1.5">
                  {item.assignee_display_name ? (
                    <>
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: '#6366f1' }}
                      >
                        {item.assignee_display_name[0]?.toUpperCase()}
                      </span>
                      {item.assignee_display_name}
                    </>
                  ) : '—'}
                </div>
              </DetailRow>
              <DetailRow label="Due Date">{item.due_date || '—'}</DetailRow>
              <DetailRow label="Created">{formatDateFull(item.jira_created_at)}</DetailRow>
              <DetailRow label="Updated">{formatDateFull(item.jira_updated_at)}</DetailRow>
              <DetailRow label="Synced">
                {item.synced_at ? formatDistanceToNow(new Date(item.synced_at), { addSuffix: true }) : '—'}
              </DetailRow>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-4)' }}>
                Description
              </h3>
              <div
                className="rounded-lg border p-3 text-[13px] leading-relaxed whitespace-pre-wrap overflow-y-auto"
                style={{
                  borderColor: 'var(--divider)', backgroundColor: 'var(--bg-1)',
                  color: 'var(--fg-1)', maxHeight: '300px', minHeight: '60px',
                }}
              >
                {item.description_text || (
                  <span className="italic" style={{ color: 'var(--fg-4)' }}>No description available</span>
                )}
              </div>
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--fg-4)' }}>
                <MessageSquare className="w-3.5 h-3.5" />
                Comments ({comments.length})
              </h3>
              {comments.length === 0 ? (
                <p className="text-[12px] italic" style={{ color: 'var(--fg-4)' }}>No comments synced yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
                  {comments.map((c, i) => (
                    <div key={c.id || i} className="rounded-lg border p-3" style={{ borderColor: 'var(--divider)', backgroundColor: 'var(--bg-1)' }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        {c.authorAvatar ? (
                          <img src={c.authorAvatar} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <User className="w-4 h-4" style={{ color: 'var(--fg-4)' }} />
                        )}
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-2)' }}>{c.author}</span>
                        <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
                          {c.created ? formatDistanceToNow(new Date(c.created), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--fg-2)' }}>{c.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Changelog */}
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--fg-4)' }}>
                <Clock className="w-3.5 h-3.5" />
                History ({changelog.length})
              </h3>
              {changelog.length === 0 ? (
                <p className="text-[12px] italic" style={{ color: 'var(--fg-4)' }}>No history synced yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {changelog.map((entry: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 border-b text-[11px]" style={{ borderColor: 'var(--bg-1)' }}>
                      <span className="font-medium shrink-0" style={{ color: 'var(--fg-2)' }}>{entry.author || 'System'}</span>
                      <span style={{ color: 'var(--fg-3)' }}>
                        changed <b>{entry.field}</b> from "{entry.from || '—'}" to "{entry.to || '—'}"
                      </span>
                      {entry.created && (
                        <span className="ml-auto shrink-0" style={{ color: 'var(--fg-4)' }}>
                          {formatDistanceToNow(new Date(entry.created), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * WorkItemDetailPanel — Split view detail panel
 * Stage D: Full Supabase wiring — children from useWorkItemChildren
 */
import React from 'react';
import { Eye, Share2, MoreHorizontal, ChevronRight, Plus } from 'lucide-react';
import { JiraStatusLozenge } from '@/components/ui/JiraStatusLozenge';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { useWorkItemChildren, useUpdateWorkItemStatus } from '@/hooks/useProjectListItems';
import type { WorkItem } from '@/types/workItem.types';

interface Props {
  item: WorkItem;
  allItems: WorkItem[];
  onNavigate: (id: string) => void;
  onClose: () => void;
}

export function WorkItemDetailPanel({ item, allItems, onNavigate }: Props) {
  const currentIdx = allItems.findIndex(i => i.id === item.id);
  const { data: children = [], isLoading: childrenLoading } = useWorkItemChildren(
    item.type === 'epic' ? item.id : undefined,
    item.type === 'epic'
  );
  const { mutate: updateStatus } = useUpdateWorkItemStatus();

  const doneChildren = children.filter(c => c.status === 'done').length;
  const pctDone = children.length > 0 ? Math.round(doneChildren / children.length * 100) : 0;
  const inprogChildren = children.filter(c => ['in_progress', 'in_dev', 'in_qa', 'ready_for_qa', 'in_uat', 'in_production'].includes(c.status)).length;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 16px 24px' }}>
        {/* Nav row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <WorkItemTypeIcon type={item.type} size={16} />
          <span style={{ fontSize: 13, color: 'var(--cp-text-tertiary)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
            {item.jiraKey}
          </span>
          <button disabled={currentIdx <= 0}
            onClick={() => currentIdx > 0 && onNavigate(allItems[currentIdx - 1].id)}
            style={{ width: 28, height: 28, border: '1px solid var(--cp-border-default)', borderRadius: 4, background: 'var(--cp-bg-page)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-text-secondary)', opacity: currentIdx <= 0 ? 0.3 : 1 }}>
            ∧
          </button>
          <button disabled={currentIdx >= allItems.length - 1}
            onClick={() => currentIdx < allItems.length - 1 && onNavigate(allItems[currentIdx + 1].id)}
            style={{ width: 28, height: 28, border: '1px solid var(--cp-border-default)', borderRadius: 4, background: 'var(--cp-bg-page)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-text-secondary)', opacity: currentIdx >= allItems.length - 1 ? 0.3 : 1 }}>
            ∨
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <button style={{ height: 32, padding: '0 10px', border: '1px solid var(--cp-primary)', borderRadius: 4, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: 'var(--cp-primary)', cursor: 'pointer', fontWeight: 500 }}>
              <Eye size={13} /> 1
            </button>
            <button className="ph-icon-btn"><Share2 size={14} /></button>
            <button className="ph-icon-btn"><MoreHorizontal size={14} /></button>
          </div>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 22, fontWeight: 650, lineHeight: 1.3, color: 'var(--cp-text-primary)', fontFamily: 'Sora, sans-serif', marginBottom: 12 }}>
          {item.summary}
        </h2>

        {/* Quick actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <JiraStatusLozenge
            status={item.status}
            interactive
            onStatusChange={(newStatus) => updateStatus({ id: item.id, status: newStatus })}
          />
          <button style={{ height: 32, padding: '0 10px', borderRadius: 4, border: '1px solid var(--cp-border-default)', background: 'var(--cp-bg-page)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, cursor: 'pointer', color: 'var(--cp-text-primary)', fontFamily: 'Inter, sans-serif' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#7C3AED"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
            AI Suggestions
          </button>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--cp-text-secondary)', cursor: 'pointer', padding: '4px 0', marginBottom: 8 }}>
            <ChevronRight size={14} />
            Description
          </div>
          <div style={{ fontSize: 14, color: item.description ? 'var(--cp-text-primary)' : 'var(--cp-text-tertiary)', paddingLeft: 20 }}>
            {item.description || 'No description added.'}
          </div>
        </div>

        {/* Child work items */}
        {item.type === 'epic' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--cp-text-primary)', cursor: 'pointer' }}>
                <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
                Child work items
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="ph-icon-btn" style={{ width: 24, height: 24 }}><MoreHorizontal size={13} /></button>
                <button className="ph-icon-btn" style={{ width: 24, height: 24 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
                </button>
                <button className="ph-icon-btn" style={{ width: 24, height: 24 }}><Plus size={13} /></button>
              </div>
            </div>

            {children.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden', display: 'flex' }}>
                  {pctDone > 0 && <div style={{ width: `${pctDone}%`, background: '#16A34A', borderRadius: '4px 0 0 4px' }} />}
                  {inprogChildren > 0 && <div style={{ width: `${Math.round(inprogChildren / children.length * 100)}%`, background: '#3B82F6' }} />}
                </div>
                <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)', whiteSpace: 'nowrap' }}>
                  {pctDone}% Done
                </span>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-text-tertiary)', padding: '0 8px', height: 32, textAlign: 'left', borderBottom: 'var(--ph-divider)', background: 'var(--cp-bg-sunken)' }}>
                    WORK
                  </th>
                  <th style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-text-tertiary)', padding: '0 8px', height: 32, textAlign: 'left', borderBottom: 'var(--ph-divider)', background: 'var(--cp-bg-sunken)', width: 140 }}>
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {childrenLoading ? (
                  <tr><td colSpan={2} style={{ textAlign: 'center', padding: 16, color: 'var(--cp-text-tertiary)', fontSize: 13 }}>Loading…</td></tr>
                ) : children.length === 0 ? (
                  <tr><td colSpan={2} style={{ textAlign: 'center', padding: 16, color: 'var(--cp-text-tertiary)', fontSize: 13 }}>No child items yet</td></tr>
                ) : children.map(child => (
                  <tr key={child.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--cp-bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '0 8px', height: 36, borderBottom: 'var(--ph-divider)', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <WorkItemTypeIcon type={child.type} size={14} />
                        <a className="ph-iss-key" style={{ fontSize: 13 }} href="#">{child.jiraKey}</a>
                        <span style={{ fontSize: 13, color: 'var(--cp-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.summary}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0 8px', height: 36, borderBottom: 'var(--ph-divider)', verticalAlign: 'middle' }}>
                      <JiraStatusLozenge status={child.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{ width: 'var(--ph-sidebar-w, 240px)', flexShrink: 0, borderLeft: 'var(--ph-divider)', overflowY: 'auto', padding: '12px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cp-text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <ChevronRight size={13} style={{ transform: 'rotate(90deg)' }} /> Details
        </div>

        {[
          { label: 'Assignee', value: item.assignee?.name ?? 'Unassigned', extra: 'Assign to me' },
          { label: 'Priority', value: item.priority ?? 'Medium' },
          { label: 'Reporter', value: item.reporter?.name ?? '—' },
          { label: 'Fix Version', value: item.fixVersion ?? '—' },
        ].map(field => (
          <div key={field.label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cp-text-tertiary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {field.label}
            </div>
            <div style={{ fontSize: 14, color: 'var(--cp-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {field.value}
            </div>
            {field.extra && (
              <a style={{ fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}>
                {field.extra}
              </a>
            )}
          </div>
        ))}

        <div style={{ fontSize: 11, color: 'var(--cp-text-tertiary)', marginTop: 20, lineHeight: 1.8 }}>
          Created {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br />
          Updated {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

/**
 * ChildWorkItemRow — Single row in the child work items table.
 * Jira parity: type icon, key (clickable blue link), summary, assignee avatar + name,
 * status lozenge with inline dropdown chevron to change status, fix version, priority SVG.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  IssueIcon,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import {
  STATUS_OPTION_GROUPS,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import {
  getStatusCategory, getAvatarColor, getInitials,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

export interface ChildWorkItem {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  issue_type: string;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  priority: string | null;
  fix_versions: any | null;
}

export interface ChildColumnConfig {
  assignee: boolean;
  status: boolean;
  fixVersions: boolean;
  priority: boolean;
}

/** Jira-native priority SVG icons */
const PRIORITY_SVG: Record<string, React.ReactNode> = {
  Highest: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  High: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 10l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Medium: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/><path d="M3 10h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/></svg>,
  Low: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Lowest: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 4l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 8l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

/** Status lozenge colors by category */
function getLozengeColors(category: string): { bg: string; text: string } {
  if (category === 'done') return { bg: '#E3FCEF', text: '#006644' };
  if (category === 'in_progress') return { bg: '#DEEBFF', text: '#0747A6' };
  return { bg: '#DFE1E6', text: '#253858' };
}

interface ChildWorkItemRowProps {
  item: ChildWorkItem;
  columns: ChildColumnConfig;
  parentIssueKey: string;
  onOpenItem?: (itemId: string) => void;
}

export function ChildWorkItemRow({ item, columns, parentIssueKey, onOpenItem }: ChildWorkItemRowProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!showStatusDropdown) return;
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node))
        setShowStatusDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStatusDropdown]);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const cat = getStatusCategory(newStatus);
      await supabase.from('ph_issues').update({ status: newStatus, status_category: cat }).eq('id', item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-child-items', parentIssueKey] });
      setShowStatusDropdown(false);
    },
  });

  const isDone = item.status_category === 'done';
  const avatarColor = item.assignee_display_name ? getAvatarColor(item.assignee_display_name) : '#8993A4';
  const lozengeColors = getLozengeColors(item.status_category);

  const fixVersionNames: string[] = (() => {
    if (!item.fix_versions) return [];
    if (Array.isArray(item.fix_versions)) return item.fix_versions.map((v: any) => typeof v === 'string' ? v : v.name || '');
    if (typeof item.fix_versions === 'string') {
      try { const parsed = JSON.parse(item.fix_versions); return Array.isArray(parsed) ? parsed.map((v: any) => typeof v === 'string' ? v : v.name || '') : []; }
      catch { return [item.fix_versions]; }
    }
    return [];
  })();

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 12px',
        borderBottom: '1px solid #EBECF0', cursor: 'pointer',
        transition: 'background 80ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
      onClick={() => onOpenItem?.(item.id)}
    >
      {/* Type icon */}
      <div style={{ width: 20, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <IssueIcon type={item.issue_type} size={16} />
      </div>

      {/* Key */}
      <div style={{
        width: 80, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, fontWeight: 500, color: isDone ? '#97A0AF' : '#0052CC',
        paddingLeft: 4,
      }}>
        {item.issue_key}
      </div>

      {/* Summary — takes remaining space */}
      <div style={{
        flex: 1, minWidth: 120, fontSize: 14, color: isDone ? '#97A0AF' : '#292A2E',
        textDecoration: isDone ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        paddingRight: 16, paddingLeft: 8,
      }}>
        {item.summary}
      </div>

      {/* Assignee — avatar + name */}
      {columns.assignee && (
        <div style={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: avatarColor,
            color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, flexShrink: 0,
          }}>
            {item.assignee_display_name ? getInitials(item.assignee_display_name) : '?'}
          </div>
          <span style={{ fontSize: 13, color: '#292A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.assignee_display_name || 'Unassigned'}
          </span>
        </div>
      )}

      {/* Status — colored pill with dropdown chevron */}
      {columns.status && (
        <div ref={statusRef} style={{ width: 150, flexShrink: 0, position: 'relative' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); }}
            style={{
              background: lozengeColors.bg, color: lozengeColors.text,
              border: 'none', cursor: 'pointer', padding: '0 8px',
              height: 22, borderRadius: 3, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.03em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              lineHeight: 1, whiteSpace: 'nowrap',
            }}
          >
            {item.status}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showStatusDropdown && (
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', left: 0, top: '100%', marginTop: 4,
              background: '#FFFFFF', borderRadius: 4,
              boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
              padding: '4px 0', zIndex: 9999, minWidth: 200, maxHeight: 300, overflowY: 'auto',
            }}>
              {STATUS_OPTION_GROUPS.map(group => (
                <div key={group.category}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 12px 2px', marginTop: 2 }}>
                    {group.groupLabel}
                  </div>
                  {group.statuses.map(st => {
                    const isActive = item.status === st;
                    return (
                      <div key={st} onClick={() => updateStatusMutation.mutate(st)}
                        style={{ height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms' }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 13, color: '#292A2E' }}>{st}</span>
                        {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fix versions */}
      {columns.fixVersions && (
        <div style={{ width: 130, flexShrink: 0, fontSize: 12, color: '#5E6C84', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fixVersionNames.length > 0 ? fixVersionNames.join(', ') : 'None'}
        </div>
      )}

      {/* Priority — Jira SVG icons */}
      {columns.priority && (
        <div style={{ width: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={item.priority ?? 'Medium'}>
          {PRIORITY_SVG[item.priority ?? 'Medium'] ?? PRIORITY_SVG.Medium}
        </div>
      )}
    </div>
  );
}

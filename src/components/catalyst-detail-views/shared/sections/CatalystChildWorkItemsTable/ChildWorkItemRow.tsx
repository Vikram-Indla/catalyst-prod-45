/**
 * ChildWorkItemRow — Single row in the child work items table.
 * Jira parity: type icon, key (clickable), summary, assignee avatar,
 * status lozenge with inline dropdown to change status, fix version, priority icon.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  IssueIcon, StatusLozenge,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import {
  STATUS_OPTION_GROUPS, PRIORITY_COLORS,
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

  // Close dropdown on outside click
  useEffect(() => {
    if (!showStatusDropdown) return;
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node))
        setShowStatusDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStatusDropdown]);

  // Inline status update
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

  // Parse fix_versions
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
        display: 'flex', alignItems: 'center', height: 40, padding: '0 8px',
        borderBottom: '1px solid #F4F5F7', cursor: 'pointer',
        transition: 'background 80ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
      onClick={() => onOpenItem?.(item.id)}
    >
      {/* Type icon */}
      <div style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IssueIcon type={item.issue_type} size={14} />
      </div>

      {/* Key */}
      <div style={{
        width: 90, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 500, color: isDone ? '#97A0AF' : '#0052CC',
      }}>
        {item.issue_key}
      </div>

      {/* Summary */}
      <div style={{
        flex: 1, minWidth: 0, fontSize: 13, color: isDone ? '#97A0AF' : '#172B4D',
        textDecoration: isDone ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        paddingRight: 12,
      }}>
        {item.summary}
      </div>

      {/* Assignee */}
      {columns.assignee && (
        <div style={{ width: 120, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: avatarColor,
            color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, flexShrink: 0,
          }}>
            {item.assignee_display_name ? getInitials(item.assignee_display_name) : '?'}
          </div>
          <span style={{ fontSize: 12, color: '#5E6C84', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.assignee_display_name || ''}
          </span>
        </div>
      )}

      {/* Status — clickable dropdown */}
      {columns.status && (
        <div ref={statusRef} style={{ width: 140, flexShrink: 0, position: 'relative' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <StatusLozenge status={item.status} category={item.status_category} />
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: '#5E6C84' }}>
              <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showStatusDropdown && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', left: 0, top: '100%', marginTop: 4,
                background: '#FFFFFF', borderRadius: 4,
                boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                padding: '4px 0', zIndex: 9999, minWidth: 200, maxHeight: 300, overflowY: 'auto',
              }}
            >
              {STATUS_OPTION_GROUPS.map(group => (
                <div key={group.category}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase',
                    letterSpacing: '0.06em', padding: '6px 12px 2px', marginTop: 2,
                  }}>{group.groupLabel}</div>
                  {group.statuses.map(st => {
                    const isActive = item.status === st;
                    return (
                      <div key={st}
                        onClick={() => updateStatusMutation.mutate(st)}
                        style={{
                          height: 32, padding: '0 12px', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', cursor: 'pointer',
                          background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 13, color: '#172B4D' }}>{st}</span>
                        {isActive && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
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
        <div style={{ width: 120, flexShrink: 0, fontSize: 12, color: '#5E6C84', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fixVersionNames.length > 0 ? fixVersionNames.join(', ') : 'None'}
        </div>
      )}

      {/* Priority */}
      {columns.priority && (
        <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: PRIORITY_COLORS[item.priority ?? 'Medium'] ?? '#8993A4',
          }} title={item.priority ?? 'Medium'} />
        </div>
      )}
    </div>
  );
}

/**
 * CANONICAL — CatalystChildWorkItemsTable
 * Jira-parity child work items table with full CRUD.
 *
 * Features:
 *   - Collapsible section header with count
 *   - Segmented progress bar (green/blue/grey)
 *   - Configurable columns via column picker (Work, Assignee, Status, Fix versions, Priority)
 *   - Table header row
 *   - Child rows with clickable key, inline status change dropdown
 *   - Inline create: type selector, text input, Enter button
 *   - "Choose existing": search + link existing items
 *   - Add (+) button in section header
 *
 * Change here → updates all work item types that use child tables.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Settings2, Check } from 'lucide-react';
import { SegmentedProgressBar } from './SegmentedProgressBar';
import { ChildWorkItemRow, type ChildWorkItem, type ChildColumnConfig } from './ChildWorkItemRow';
import { InlineCreateWithTypeSelector } from './InlineCreateWithTypeSelector';

interface CatalystChildWorkItemsTableProps {
  /** Parent issue key (e.g. "BAU-4466") — used to query children */
  parentIssueKey: string;
  /** Project key (e.g. "BAU") — used for inline create */
  projectKey: string;
  /** Callback when clicking a child item key/row */
  onOpenItem?: (itemId: string) => void;
}

const DEFAULT_COLUMNS: ChildColumnConfig = {
  assignee: true,
  status: true,
  fixVersions: true,
  priority: true,
};

const COLUMN_OPTIONS: { key: keyof ChildColumnConfig; label: string }[] = [
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'fixVersions', label: 'Fix versions' },
  { key: 'priority', label: 'Priority' },
];

export function CatalystChildWorkItemsTable({
  parentIssueKey, projectKey, onOpenItem,
}: CatalystChildWorkItemsTableProps) {
  const [expanded, setExpanded] = useState(true);
  const [columns, setColumns] = useState<ChildColumnConfig>(DEFAULT_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showCreateRow, setShowCreateRow] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close column picker on outside click
  useEffect(() => {
    if (!showColumnPicker) return;
    const h = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node))
        setShowColumnPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showColumnPicker]);

  // Query child issues
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['cv-child-items', parentIssueKey],
    enabled: !!parentIssueKey,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type, assignee_account_id, assignee_display_name, priority, fix_versions')
        .eq('parent_key', parentIssueKey)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      return (data || []) as ChildWorkItem[];
    },
  });

  const total = children.length;
  const doneCount = children.filter(c => {
    const cat = (c.status_category || '').toLowerCase();
    return cat === 'done' || cat === 'complete' || cat === 'completed' || cat === 'closed';
  }).length;
  const inProgressCount = children.filter(c => {
    const cat = (c.status_category || '').toLowerCase();
    return cat === 'in_progress' || cat === 'inprogress' || cat === 'in progress';
  }).length;

  const invalidateChildren = () =>
    queryClient.invalidateQueries({ queryKey: ['cv-child-items', parentIssueKey] });

  return (
    <div style={{ marginBottom: 24 }}>
      {/* ── Section header ────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: expanded ? 4 : 0, userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
          {expanded ? <ChevronDown size={16} color="#42526E" /> : <ChevronRight size={16} color="#42526E" />}
          <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>Child work items</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#5E6C84', background: '#F4F5F7',
            padding: '1px 6px', borderRadius: 3, marginLeft: 2,
          }}>{total}</span>
        </div>

        {expanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* More menu stub */}
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5E6C84', display: 'flex', borderRadius: 3 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            ><MoreHorizontal size={16} /></button>

            {/* Column picker */}
            <div ref={columnPickerRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5E6C84', display: 'flex', borderRadius: 3 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
                title="Configure columns"
              ><Settings2 size={16} /></button>

              {showColumnPicker && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: '#FFFFFF', borderRadius: 6, border: '1px solid #DFE1E6',
                  boxShadow: '0 8px 16px rgba(9,30,66,0.15)', zIndex: 100, width: 200,
                  overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
                    Visible columns
                  </div>
                  {COLUMN_OPTIONS.map(col => (
                    <div
                      key={col.key}
                      onClick={() => setColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', transition: 'background 80ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                        border: `1.5px solid ${columns[col.key] ? '#2563EB' : '#C1C7D0'}`,
                        background: columns[col.key] ? '#2563EB' : '#FFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 120ms, border-color 120ms',
                      }}>
                        {columns[col.key] && <Check size={10} color="#FFF" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 13, color: '#172B4D' }}>{col.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add child button */}
            <button
              onClick={() => { setShowCreateRow(true); setExpanded(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5E6C84', display: 'flex', borderRadius: 3 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
              title="Add child issue"
            ><Plus size={16} /></button>
          </div>
        )}
      </div>

      {/* ── Expanded content ──────────────────── */}
      {expanded && (
        <>
          {/* Progress bar */}
          <SegmentedProgressBar total={total} doneCount={doneCount} inProgressCount={inProgressCount} />

          {/* Table header — widths match ChildWorkItemRow */}
          {total > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', height: 32, padding: '0 12px',
              borderBottom: '1px solid #EBECF0', borderTop: '1px solid #EBECF0',
            }}>
              {/* Type icon spacer + Key */}
              <div style={{ width: 104, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Work
              </div>
              {/* Summary spacer */}
              <div style={{ flex: 1, minWidth: 120 }} />
              {columns.assignee && (
                <div style={{ width: 140, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Assignee
                </div>
              )}
              {columns.status && (
                <div style={{ width: 150, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Status
                </div>
              )}
              {columns.fixVersions && (
                <div style={{ width: 130, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Fix versions
                </div>
              )}
              {columns.priority && (
                <div style={{ width: 28, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                  P
                </div>
              )}
            </div>
          )}

          {/* Table rows */}
          {children.map(child => (
            <ChildWorkItemRow
              key={child.id}
              item={child}
              columns={columns}
              parentIssueKey={parentIssueKey}
              onOpenItem={onOpenItem}
            />
          ))}

          {/* Loading state */}
          {isLoading && total === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>
              Loading child items…
            </div>
          )}

          {/* Empty state */}
          {!isLoading && total === 0 && !showCreateRow && (
            <div style={{ padding: '16px 12px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>
              No child work items yet
            </div>
          )}

          {/* Inline create row */}
          {(showCreateRow || total > 0) && (
            <InlineCreateWithTypeSelector
              parentIssueKey={parentIssueKey}
              projectKey={projectKey}
              onCreated={invalidateChildren}
            />
          )}
        </>
      )}
    </div>
  );
}

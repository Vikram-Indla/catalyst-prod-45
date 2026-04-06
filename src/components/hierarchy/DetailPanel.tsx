/**
 * DetailPanel — Enriched right-side detail view for selected work item
 * F1: Status dropdown  F2: Priority dropdown  F3: Assignee dropdown  F4: Title editing
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight, Plus } from 'lucide-react';

function useIsDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}
import type { WorkItem } from '@/types/hierarchy';
import { HIERARCHY_LEVELS, canBeParentOf } from '@/types/hierarchy';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusBadge } from './StatusBadge';
import { StatusDropdown } from './StatusDropdown';
import { PriorityDropdown } from './PriorityDropdown';
import { AssigneeDropdown, type AssigneeOption } from './AssigneeDropdown';
import { InlineEditTitle } from './InlineEditTitle';
import { useUpdateIssueField } from '@/hooks/useUpdateIssueField';
import { toast } from 'sonner';

interface DetailPanelProps {
  item: WorkItem | null;
  allItems?: WorkItem[];
  onClose?: () => void;
  onSelectItem?: (item: WorkItem) => void;
  onAddChild?: (parentItem: WorkItem) => void;
  projectKey?: string;
  allStatuses?: string[];
}

/* ── Skeleton ── */
export function DetailPanelSkeleton() {
  const dk = useIsDark();
  const shimmerBg = dk ? 'rgba(255,255,255,0.08)' : var(--bg-2, '#F1F5F9');
  return (
    <div style={{ background: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 8, position: 'sticky', top: 24 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ padding: '8px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ width: 60, height: 10, borderRadius: 4, background: shimmerBg, marginBottom: 6 }} className="hi-shimmer" />
          <div style={{ width: '60%', height: 12, borderRadius: 4, background: shimmerBg }} className="hi-shimmer" />
        </div>
      ))}
      <style>{`
        @keyframes hi-shimmer-anim { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .hi-shimmer { animation: hi-shimmer-anim 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function PriorityBars({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ width: 12, height: 4, borderRadius: 1, background: i <= level ? 'var(--fg-3)' : 'var(--divider)' }} />
      ))}
    </div>
  );
}

function priorityToLevel(name?: string): number {
  if (!name) return 0;
  const n = name.toLowerCase();
  if (n === 'critical') return 4;
  if (n === 'high') return 3;
  if (n === 'medium') return 2;
  if (n === 'low') return 1;
  return 0;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const dk = useIsDark();
  return (
    <div style={{ padding: '8px 20px', borderBottom: `1px solid ${dk ? 'rgba(255,255,255,0.06)' : var(--bg-2, '#F1F5F9')}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em', marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: "'Inter', sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

function EmptyValue() {
  return <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}>—</span>;
}

function Section({ title, count, defaultOpen = true, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const dk = useIsDark();
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
          background: 'none', border: 'none', borderBottom: '1px solid var(--divider)', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
        }}
      >
        {open ? <ChevronDown size={14} color="var(--fg-3)" /> : <ChevronRight size={14} color="var(--fg-3)" />}
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em' }}>{title}</span>
        {count !== undefined && (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', background: dk ? 'rgba(255,255,255,0.08)' : var(--bg-2, '#F1F5F9'), borderRadius: 9999, padding: '1px 6px' }}>{count}</span>
        )}
      </button>
      {open && children}
    </div>
  );
}

function findParentItem(items: WorkItem[], targetId: string): WorkItem | null {
  for (const item of items) {
    for (const child of item.children) {
      if (child.id === targetId) return item;
    }
    const found = findParentItem(item.children, targetId);
    if (found) return found;
  }
  return null;
}

function collectAssignees(items: WorkItem[]): AssigneeOption[] {
  const map = new Map<string, AssigneeOption>();
  function walk(nodes: WorkItem[]) {
    for (const n of nodes) {
      if (n.assignee && !map.has(n.assignee.displayName)) {
        map.set(n.assignee.displayName, { displayName: n.assignee.displayName, email: n.assignee.email, accountId: n.assignee.id });
      }
      walk(n.children);
    }
  }
  walk(items);
  return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

type ActiveDropdown = 'status' | 'priority' | 'assignee' | null;

export function DetailPanel({ item, allItems = [], onClose, onSelectItem, onAddChild, projectKey, allStatuses = [] }: DetailPanelProps) {
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const updateField = useUpdateIssueField(projectKey);
  const allAssignees = useMemo(() => collectAssignees(allItems), [allItems]);
  const dk = useIsDark();

  if (!item) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200,
        background: 'var(--bg-1)', border: '1px dashed var(--divider)', borderRadius: 8,
        color: 'var(--fg-3)', fontSize: 13, fontFamily: "'Inter', sans-serif",
      }}>
        Select a work item to view details
      </div>
    );
  }

  const parentItem = findParentItem(allItems, item.id);
  const childLevel = HIERARCHY_LEVELS.find((l) => canBeParentOf(item.hierarchyLevel, l.id));
  const pct = item.stats.totalDescendants > 0
    ? Math.round((item.stats.completedCount / item.stats.totalDescendants) * 100)
    : 0;

  const handleStatusChange = (newStatus: string) => {
    updateField.mutate({ issueKey: item.key, fields: { status: newStatus } });
    setActiveDropdown(null);
    toast.success(`Status updated to ${newStatus}`);
  };

  const handlePriorityChange = (newPriority: string) => {
    updateField.mutate({ issueKey: item.key, fields: { priority: newPriority === 'None' ? null : newPriority } });
    setActiveDropdown(null);
    toast.success(`Priority updated to ${newPriority}`);
  };

  const handleAssigneeChange = (assignee: AssigneeOption | null) => {
    updateField.mutate({
      issueKey: item.key,
      fields: {
        assignee_display_name: assignee?.displayName || null,
        assignee_email: assignee?.email || null,
        assignee_account_id: assignee?.accountId || null,
      },
    });
    setActiveDropdown(null);
    toast.success(assignee ? `Assigned to ${assignee.displayName}` : 'Unassigned');
  };

  const handleTitleSave = (newTitle: string) => {
    updateField.mutate({ issueKey: item.key, fields: { summary: newTitle } });
    toast.success('Title updated');
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        style={{
          background: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 8,
          position: 'sticky', top: 16, fontFamily: "'Inter', sans-serif",
          maxHeight: 'calc(100vh - 200px)', overflowY: 'auto',
        }}
      >
        {/* A. Header with breadcrumb */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 6, position: 'sticky', top: 0, background: 'var(--bg-app)', zIndex: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
            {parentItem && (
              <>
                {parentItem.issueType && <JiraIssueTypeIcon type={parentItem.issueType} size={14} />}
                <span
                  onClick={() => onSelectItem?.(parentItem)}
                  style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)', cursor: 'pointer', flexShrink: 0 }}
                >
                  {parentItem.key}
                </span>
                <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>/</span>
              </>
            )}
            {item.issueType && <JiraIssueTypeIcon type={item.issueType} size={14} />}
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)' }}>{item.key}</span>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <X size={16} color="var(--fg-3)" />
            </button>
          )}
        </div>

        {/* B. Status + Type bar */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <StatusBadge
            status={item.status.name}
            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }}
          />
          {activeDropdown === 'status' && (
            <StatusDropdown
              currentStatus={item.status.name}
              availableStatuses={allStatuses}
              onSelect={handleStatusChange}
              onClose={() => setActiveDropdown(null)}
            />
          )}
          <span style={{ color: dk ? '#A1A1A1' : '#CBD5E1' }}>·</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: item.hierarchyColorText }}>{item.hierarchyName}</span>
        </div>

        {/* C. Title + Description */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
          <InlineEditTitle
            value={item.title}
            onSave={handleTitleSave}
            fontSize={18}
            fontWeight={700}
            style={{ display: 'block', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35' }}
          />
          <p style={{ fontSize: 13, color: 'var(--fg-4)', margin: '8px 0 0', fontStyle: 'italic' }}>
            No description
          </p>
        </div>

        {/* D. Key Details */}
        <Section title="Key Details" defaultOpen={true}>
          <FieldRow label="Status">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <StatusBadge
                status={item.status.name}
                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }}
              />
            </div>
          </FieldRow>

          <FieldRow label="Priority">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
              >
                <PriorityBars level={priorityToLevel(item.priority?.name)} />
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{item.priority?.name || 'None'}</span>
                <span style={{ fontSize: 8, color: 'var(--fg-4)' }}>▾</span>
              </div>
              {activeDropdown === 'priority' && (
                <PriorityDropdown
                  currentPriority={item.priority?.name}
                  onSelect={handlePriorityChange}
                  onClose={() => setActiveDropdown(null)}
                />
              )}
            </div>
          </FieldRow>

          <FieldRow label="Assignee">
            <div style={{ position: 'relative' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee')}
              >
                {item.assignee ? (
                  <>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--cp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF' }}>
                        {item.assignee.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span>{item.assignee.displayName}</span>
                  </>
                ) : <EmptyValue />}
                <span style={{ fontSize: 8, color: 'var(--fg-4)' }}>▾</span>
              </div>
              {activeDropdown === 'assignee' && (
                <AssigneeDropdown
                  currentAssignee={item.assignee?.displayName}
                  availableAssignees={allAssignees}
                  onSelect={handleAssigneeChange}
                  onClose={() => setActiveDropdown(null)}
                />
              )}
            </div>
          </FieldRow>

          <FieldRow label="Reporter">
            <span style={{ color: 'var(--fg-4)', fontStyle: 'italic' }}>—</span>
          </FieldRow>

          {item.fixVersion && (
            <FieldRow label="Fix Versions">
              <span style={{
                height: 20, padding: '0 8px', fontSize: 10, fontWeight: 600, color: '#0F766E',
                background: '#CCFBF1', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 9999,
                display: 'inline-flex', alignItems: 'center',
              }}>
                {item.fixVersion.name}
              </span>
            </FieldRow>
          )}

          <FieldRow label="Due Date">
            {item.dueDate ? <span>{new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span> : <EmptyValue />}
          </FieldRow>

          <FieldRow label="Created">
            <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>
              {item.createdAt ? new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </FieldRow>

          <FieldRow label="Updated">
            <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>
              {item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </FieldRow>

          {item.stats.totalDescendants > 0 && (
            <FieldRow label="Progress">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 6, background: dk ? 'rgba(255,255,255,0.08)' : var(--bg-2, '#F1F5F9'), borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--sem-success)' : 'var(--cp-blue)', borderRadius: 4, transition: 'width 300ms ease' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
                  {item.stats.completedCount}/{item.stats.totalDescendants}
                </span>
              </div>
            </FieldRow>
          )}
        </Section>

        {/* E. Subtasks/Children */}
        <Section title="Subtasks" count={item.children.length} defaultOpen={item.children.length > 0}>
          {item.children.length > 0 ? (
            <div>
              {item.children.map(child => (
                <div
                  key={child.id}
                  onClick={() => onSelectItem?.(child)}
                  style={{
                    height: 36, display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 20px', borderBottom: `1px solid ${dk ? 'rgba(255,255,255,0.06)' : var(--bg-2, '#F1F5F9')}`, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.03)' : 'var(--bg-1, #F8FAFC)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {child.issueType && <JiraIssueTypeIcon type={child.issueType} size={12} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', flexShrink: 0 }}>{child.key}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.title}</span>
                  <StatusBadge status={child.status.name} mini />
                  {child.assignee && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--cp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#FFFFFF' }}>
                        {child.assignee.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>
              No subtasks
            </div>
          )}
          {childLevel && (
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--divider)' }}>
              <button
                onClick={() => onAddChild?.(item)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 12, color: 'var(--fg-3)', fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px dashed var(--divider)',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--cp-blue)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-3)')}
              >
                <Plus size={12} /> Add subtask
              </button>
            </div>
          )}
        </Section>

        {/* F. Linked Work Items placeholder */}
        <Section title="Linked Work Items" defaultOpen={false}>
          <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>
            No linked work items
          </div>
        </Section>

        {/* G. Activity placeholder */}
        <Section title="Activity" defaultOpen={false}>
          <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['All', 'Comments', 'History'].map((tab, i) => (
                <button key={tab} style={{
                  background: 'none', border: 'none', borderBottom: i === 0 ? '2px solid var(--cp-blue)' : '2px solid transparent',
                  padding: '4px 0', fontSize: 12, fontWeight: i === 0 ? 600 : 400,
                  color: i === 0 ? 'var(--cp-blue)' : 'var(--fg-3)', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}>
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: dk ? 'rgba(255,255,255,0.08)' : var(--bg-2, '#F1F5F9'), flexShrink: 0 }} />
              <textarea
                placeholder="Add a comment..."
                rows={2}
                style={{
                  flex: 1, padding: 8, fontSize: 13, fontFamily: "'Inter', sans-serif",
                  border: '1px solid var(--divider)', borderRadius: 6, outline: 'none', resize: 'none',
                }}
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--fg-4)', margin: '8px 0 0', textAlign: 'center' }}>
              Comments and activity will appear here.
            </p>
          </div>
        </Section>
      </motion.div>
    </AnimatePresence>
  );
}

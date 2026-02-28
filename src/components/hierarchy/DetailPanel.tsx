/**
 * DetailPanel — Right-side detail view for selected work item
 * Stage E: Skeleton, null handling, transitions, design compliance
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { WorkItem } from '@/types/hierarchy';
import { HIERARCHY_LEVELS, canBeParentOf } from '@/types/hierarchy';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface DetailPanelProps {
  item: WorkItem | null;
  onAddChild?: (parentItem: WorkItem) => void;
}

/* ── Skeleton for detail panel ── */
export function DetailPanelSkeleton() {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, position: 'sticky', top: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E2E8F0' }} className="hi-shimmer" />
        <div style={{ width: 56, height: 12, borderRadius: 4, background: '#E2E8F0' }} className="hi-shimmer" />
      </div>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ width: '80%', height: 16, borderRadius: 4, background: '#F1F5F9' }} className="hi-shimmer" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ padding: '8px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ width: 60, height: 10, borderRadius: 4, background: '#F1F5F9', marginBottom: 6 }} className="hi-shimmer" />
          <div style={{ width: '60%', height: 12, borderRadius: 4, background: '#F1F5F9' }} className="hi-shimmer" />
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
        <div key={i} style={{ width: 12, height: 4, borderRadius: 1, background: i <= level ? '#64748B' : '#E2E8F0' }} />
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
  return (
    <div style={{ padding: '8px 20px', borderBottom: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

function EmptyValue() {
  return <span style={{ color: '#64748B', fontWeight: 400 }}>—</span>;
}

export function DetailPanel({ item, onAddChild }: DetailPanelProps) {
  if (!item) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200,
        background: '#F8FAFC', border: '1px dashed #E2E8F0', borderRadius: 8,
        color: '#64748B', fontSize: 13, fontFamily: "'Inter', sans-serif",
      }}>
        Select a work item to view details
      </div>
    );
  }

  const pct = item.stats.totalDescendants > 0
    ? Math.round((item.stats.completedCount / item.stats.totalDescendants) * 100)
    : 0;
  const isComplete = pct === 100;
  const fillColor = isComplete ? '#16A34A' : '#2563EB';
  const childLevel = HIERARCHY_LEVELS.find((l) => canBeParentOf(item.hierarchyLevel, l.id));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
          position: 'sticky', top: 24, fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.issueType ? (
            <JiraIssueTypeIcon type={item.issueType} size={16} />
          ) : (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.hierarchyColor, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>{item.key}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: item.hierarchyColorText }}>{item.hierarchyName}</span>
        </div>

        {/* Title — full text, wraps */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontSize: 16, fontWeight: 700, color: '#0F172A', lineHeight: 1.35, wordBreak: 'break-word' }}>
          {item.title}
        </div>

        {/* Fields */}
        <FieldRow label="Status">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px',
            borderRadius: 9999, background: `${item.status.color}14`, border: `1px solid ${item.status.color}33`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.status.color }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: item.status.colorText }}>{item.status.name}</span>
          </span>
        </FieldRow>

        {item.priority ? (
          <FieldRow label="Priority">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PriorityBars level={priorityToLevel(item.priority.name)} />
              <span style={{ fontSize: 12, color: '#64748B' }}>{item.priority.name}</span>
            </div>
          </FieldRow>
        ) : null}

        <FieldRow label="Assignee">
          {item.assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: '#FFFFFF' }}>
                  {item.assignee.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span>{item.assignee.displayName}</span>
            </div>
          ) : (
            <EmptyValue />
          )}
        </FieldRow>

        {item.fixVersion ? (
          <FieldRow label="Release">
            <span style={{
              height: 20, padding: '0 8px', fontSize: 10, fontWeight: 600, color: '#7C3AED',
              background: '#F5F3FF', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 9999,
              display: 'inline-flex', alignItems: 'center',
            }}>
              {item.fixVersion.name}
            </span>
          </FieldRow>
        ) : null}

        {item.stats.totalDescendants > 0 ? (
          <FieldRow label="Progress">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: fillColor, borderRadius: 3, transition: 'width 300ms ease' }} />
              </div>
              <span style={{ fontSize: 12, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                {item.stats.completedCount}/{item.stats.totalDescendants}
              </span>
            </div>
          </FieldRow>
        ) : null}

        <FieldRow label="Due Date">
          {item.dueDate ? <span>{new Date(item.dueDate).toLocaleDateString()}</span> : <EmptyValue />}
        </FieldRow>

        {/* Add child button */}
        {childLevel && (
          <div style={{ padding: '12px 20px' }}>
            <button
              onClick={() => onAddChild?.(item)}
              className="hi-add-child-btn"
              style={{
                width: '100%', height: 32, border: '2px dashed #E2E8F0', borderRadius: 6,
                background: 'transparent', fontSize: 13, fontWeight: 600, color: '#64748B',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 150ms ease',
              }}
            >
              + Add {childLevel.name}
            </button>
          </div>
        )}

        <style>{`
          .hi-add-child-btn:hover { border-color: #2563EB !important; color: #2563EB !important; background: #EFF6FF !important; }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

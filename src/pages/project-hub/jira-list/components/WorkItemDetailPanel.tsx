/**
 * WorkItemDetailPanel — 3-column split: Left (list) + Center (body) + Right (details)
 * The LEFT panel is rendered by the parent; this component renders CENTER + RIGHT.
 */
import React, { useState } from 'react';
import { Eye, Share2, MoreHorizontal, ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
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

const isRTL = (text: string) => /[\u0600-\u06FF]/.test(text);

/* ── Tokens ── */
const V = {
  textPrimary: '#172B4D',
  textSecondary: '#505258',
  textMuted: '#6B778C',
  border: '#DFE1E6',
  borderSubtle: '#F0F1F2',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFC',
  keyColor: '#0C66E4',
  brand: '#2563EB',
  progressGreen: '#2D7A2D',
  progressBlue: '#3B82F6',
  avatarPurple: '#6554C0',
  avatarBlue: '#0C66E4',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Center Panel: Body ── */
function CenterBody({ item, children: childItems, childrenLoading }: {
  item: WorkItem;
  children: WorkItem[];
  childrenLoading: boolean;
}) {
  const { mutate: updateStatus } = useUpdateWorkItemStatus();
  const isEpic = item.type === 'epic';
  const summaryRtl = isRTL(item.summary);

  const doneCount = childItems.filter(c => c.status === 'done').length;
  const pctDone = childItems.length > 0 ? Math.round(doneCount / childItems.length * 100) : 0;
  const inprogCount = childItems.filter(c => ['in_progress', 'in_dev', 'in_qa', 'ready_for_qa', 'in_uat', 'in_production'].includes(c.status)).length;
  const inprogPct = childItems.length > 0 ? Math.round(inprogCount / childItems.length * 100) : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: `1px solid ${V.border}` }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 30px' }}>
        {/* Header row: key + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <WorkItemTypeIcon type={item.type} size={18} />
            <span style={{ fontSize: 12, color: V.textMuted, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
              {item.jiraKey}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <SmallBtn>▴</SmallBtn>
            <SmallBtn>▾</SmallBtn>
          </div>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#42526E', flexShrink: 0 }} />
          <h2
            dir={summaryRtl ? 'rtl' : 'ltr'}
            style={{
              margin: 0, fontSize: 28, fontWeight: 700, color: V.textPrimary,
              fontFamily: 'Sora, sans-serif', lineHeight: 1.25,
            }}
          >
            {item.summary || '(No title)'}
          </h2>
        </div>

        {/* Description section */}
        <div style={{ borderTop: `1px solid ${V.borderSubtle}`, paddingTop: 14, marginTop: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: V.textPrimary, marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>
            Description
          </div>
          <div
            dir={item.description && isRTL(item.description) ? 'rtl' : 'ltr'}
            style={{
              fontSize: 14, color: item.description ? V.textPrimary : V.textMuted,
              fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
            }}
          >
            {item.description || <span style={{ color: V.textMuted }}>—</span>}
          </div>
        </div>

        {/* Child work items */}
        {isEpic && (
          <div style={{ borderTop: `1px solid ${V.borderSubtle}`, paddingTop: 14, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: V.textPrimary, fontFamily: 'Inter, sans-serif' }}>
                Child work items
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <IconBtn><MoreHorizontal size={14} /></IconBtn>
                <IconBtn><Trash2 size={14} /></IconBtn>
                <IconBtn><Plus size={14} /></IconBtn>
              </div>
            </div>

            {/* Progress bar */}
            {childItems.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
                <div style={{
                  height: 8, background: V.borderSubtle, borderRadius: 999, width: 220,
                  overflow: 'hidden', border: `1px solid #E6E8EA`, display: 'flex',
                }}>
                  {pctDone > 0 && <div style={{ width: `${pctDone}%`, background: V.progressGreen }} />}
                  {inprogPct > 0 && <div style={{ width: `${inprogPct}%`, background: V.progressBlue }} />}
                </div>
                <span style={{ fontSize: 12, color: V.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                  {pctDone}% Done
                </span>
              </div>
            )}

            {/* Children table */}
            <div style={{ border: `1px solid ${V.border}`, borderRadius: 10, overflow: 'hidden', background: V.surface }}>
              <div style={{
                padding: '10px 12px', fontWeight: 700, borderBottom: `1px solid ${V.border}`,
                background: V.surfaceAlt, color: V.textPrimary, fontSize: 13, fontFamily: 'Inter, sans-serif',
              }}>
                Work
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {childrenLoading ? (
                    <tr><td style={{ padding: 16, textAlign: 'center', color: V.textMuted, fontSize: 13 }}>Loading…</td></tr>
                  ) : childItems.length === 0 ? (
                    <tr><td style={{ padding: 16, textAlign: 'center', color: V.textMuted, fontSize: 13 }}>No child items yet</td></tr>
                  ) : childItems.map(child => (
                    <tr
                      key={child.id}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F7F8F9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ width: 34, textAlign: 'center', color: V.textMuted, borderBottom: `1px solid ${V.borderSubtle}`, padding: '10px 4px' }}>
                        <WorkItemTypeIcon type={child.type} size={14} />
                      </td>
                      <td style={{ width: 90, borderBottom: `1px solid ${V.borderSubtle}`, padding: '10px 4px' }}>
                        <a href="#" onClick={e => e.preventDefault()} style={{ color: V.keyColor, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
                          {child.jiraKey}
                        </a>
                      </td>
                      <td style={{ borderBottom: `1px solid ${V.borderSubtle}`, padding: '10px 8px', color: V.textPrimary, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                        {child.summary || '(No title)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Right Panel: Details Accordion ── */
function RightDetails({ item }: { item: WorkItem }) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { mutate: updateStatus } = useUpdateWorkItemStatus();

  const initials = item.assignee?.initials || 'NA';
  const reporterInitials = item.reporter?.name
    ? item.reporter.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'VK';

  return (
    <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: V.surface }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 12, borderBottom: `1px solid ${V.border}`, background: V.surface,
      }}>
        <button style={{ ...headerBtnStyle }}>
          <Eye size={14} />
        </button>
        <JiraStatusLozenge
          status={item.status}
          interactive
          onStatusChange={(newStatus) => updateStatus({ id: item.id, status: newStatus })}
        />
        <button style={{ ...headerBtnStyle, marginLeft: 'auto', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
          Improve Epic
        </button>
      </div>

      {/* Scrollable accordion body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 18px' }}>
        {/* Details section */}
        <AccordionSection title="Details" open={detailsOpen} onToggle={() => setDetailsOpen(v => !v)}>
          <KVRow label="Assignee">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...avatarStyle, background: V.avatarPurple }}>{initials}</div>
                <span style={{ color: V.textPrimary, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
                  {item.assignee?.name ?? 'Unassigned'}
                </span>
              </div>
              <a href="#" onClick={e => e.preventDefault()} style={{ display: 'block', marginTop: 6, color: V.keyColor, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
                Assign to me
              </a>
            </div>
          </KVRow>
          <KVRow label="Priority">
            <span style={{ fontSize: 14, color: V.textPrimary }}>{capitalize(item.priority)}</span>
          </KVRow>
          <KVRow label="Reporter">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <div style={{ ...avatarStyle, background: V.avatarBlue }}>{reporterInitials}</div>
              <span style={{ color: V.textPrimary, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
                {item.reporter?.name ?? '—'}
              </span>
            </div>
          </KVRow>
          <KVRow label="MDT Ref">
            <span style={{ fontSize: 14, color: V.textMuted }}>Add text</span>
          </KVRow>
          <KVRow label="Actual start">
            <span style={{ fontSize: 14, color: V.textPrimary }}>None</span>
          </KVRow>
          <KVRow label="Actual end">
            <span style={{ fontSize: 14, color: V.textPrimary }}>None</span>
          </KVRow>
        </AccordionSection>

        {/* Development section */}
        <AccordionSection title="Development" open={devOpen} onToggle={() => setDevOpen(v => !v)}>
          <div style={{ padding: 12, color: V.textMuted, fontSize: 13 }}>Development content…</div>
        </AccordionSection>

        {/* More fields */}
        <AccordionSection title="More fields" open={moreOpen} onToggle={() => setMoreOpen(v => !v)}>
          <div style={{ padding: 12, color: V.textMuted, fontSize: 13 }}>More fields…</div>
        </AccordionSection>

        {/* Audit trail */}
        <div style={{ marginTop: 10, color: V.textMuted, fontSize: 12, lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace" }}>
          Created {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}<br />
          Updated {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

/* ── Accordion Section ── */
function AccordionSection({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ border: `1px solid ${V.border}`, borderRadius: 10, marginBottom: 10, background: V.surface }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', background: V.surface, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 12, fontWeight: 800, color: V.textPrimary, fontSize: 14, fontFamily: 'Inter, sans-serif',
          borderRadius: 10,
        }}
      >
        {title}
        {open ? <ChevronDown size={16} style={{ opacity: 0.7 }} /> : <ChevronRight size={16} style={{ opacity: 0.7 }} />}
      </button>
      {open && <div style={{ padding: '0 12px 12px' }}>{children}</div>}
    </div>
  );
}

/* ── KV Row ── */
function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12,
      padding: '10px 0', borderTop: `1px solid ${V.borderSubtle}`,
    }}>
      <span style={{ color: V.textMuted, fontWeight: 700, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

/* ── Helpers ── */
function SmallBtn({ children }: { children: React.ReactNode }) {
  return (
    <button style={{
      border: `1px solid ${V.border}`, background: V.surface, borderRadius: 8,
      padding: '6px 10px', cursor: 'pointer', fontSize: 12, color: V.textMuted,
    }}>
      {children}
    </button>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        border: `1px solid transparent`, background: 'transparent', cursor: 'pointer',
        padding: '6px 8px', borderRadius: 8, color: V.textMuted, display: 'flex', alignItems: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.borderColor = V.border; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}

const headerBtnStyle: React.CSSProperties = {
  border: `1px solid #DFE1E6`, background: '#FFFFFF', borderRadius: 8,
  padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
};

const avatarStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center',
  fontWeight: 900, fontSize: 12, color: '#fff',
};

/* ── Main Export: CENTER + RIGHT combined ── */
export function WorkItemDetailPanel({ item, allItems, onNavigate, onClose }: Props) {
  const isEpic = item.type === 'epic';
  const { data: children = [], isLoading: childrenLoading } = useWorkItemChildren(
    isEpic ? item.jiraKey : undefined,
    isEpic,
  );

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
      <CenterBody item={item} children={children} childrenLoading={childrenLoading} />
      <RightDetails item={item} />
    </div>
  );
}

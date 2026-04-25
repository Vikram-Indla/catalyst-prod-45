/**
 * @deprecated 2026-04-18 — Replaced by CatalystDetailRouter in ProjectAllWorkView.
 *   Kept temporarily so any in-flight branches that import this type still
 *   compile. Safe to delete once no callers reference it. Run:
 *     grep -rn "WorkItemDetailPanel" src/ --include="*.tsx" --include="*.ts"
 *   and confirm zero matches outside this file before deleting.
 *
 * WorkItemDetailPanel — Jira-parity 3-column split: Center (body) + Right (details)
 * Left panel is rendered by parent. This renders CENTER + RIGHT.
 *
 * Design tokens calibrated against live Jira on 2026-04-18
 * (digital-transformation.atlassian.net, BAU-5419):
 *   text.primary   #292A2E   (was #172B4D — old ADG3)
 *   text.subtle    #505258   (was #44546F — old ADG3)
 *   Title H1       20px / weight 653 / line-height 24px (was 24/600)
 *   Issue key      Atlassian Sans / 14px / 400 / #505258 (was JetBrains Mono 500)
 *   Description    16px / weight 653
 *   Details        16px / weight 500 (section heading)
 *   Field label    14px / 500 / #505258
 *   Field value    14px / 400 / #292A2E  (LEFT-aligned, not right)
 *   Status pill    sentence case, weight 500 (NOT uppercase/700)
 */
import React, { useState } from 'react';
import { Eye, Plus, Settings, MoreHorizontal, Trash2, ChevronDown, ChevronRight, Zap } from 'lucide-react';
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

/* Priority icons (Jira-native SVGs) */
const PRIORITY_ICON: Record<string, React.ReactNode> = {
  highest: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  high: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 10l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  medium: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/><path d="M3 10h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/></svg>,
  low: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  lowest: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 4l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 8l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Jira-strong status button (solid background, white text) ── */
function JiraStrongStatus({ status, onStatusChange }: { status: string; onStatusChange: (s: string) => void }) {
  // Jira's status transition button (measured live on BAU-5419 2026-04-18):
  //   Backlog/To Do → bg: rgba(5,21,36,0.06) (soft gray overlay), color: #292A2E
  //   In Progress   → bg: soft blue overlay
  //   Done          → bg: soft green overlay
  // Sentence case, weight 500, height 32, padding-left 10, border-radius 3.
  const isD = status === 'done' || status === 'closed' || status === 'in_production';
  const isP = status.includes('progress') || status.includes('dev') || status.includes('qa') || status.includes('uat');
  const bg = isD ? 'rgba(34, 163, 89, 0.18)' : isP ? 'rgba(12, 102, 228, 0.18)' : 'rgba(5, 21, 36, 0.06)';
  const fg = isD ? '#1F845A' : isP ? '#0055CC' : '#292A2E';
  // Sentence case: "In Progress", "To Do", "Backlog" — NOT "IN PROGRESS"
  const label = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    // Fix common acronyms that should stay upper
    .replace(/\bQa\b/, 'QA').replace(/\bUat\b/, 'UAT');
  return (
    <button
      onClick={() => {
        const cycle: Record<string, string> = { backlog: 'in_progress', in_progress: 'done', done: 'backlog', in_dev: 'in_progress', in_qa: 'done', in_uat: 'done', closed: 'backlog', in_production: 'done', ready_for_qa: 'in_qa', in_requirements: 'in_progress' };
        onStatusChange(cycle[status] ?? 'in_progress');
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 32, padding: '0 10px', borderRadius: 3, border: 'none',
        background: bg, color: fg, fontSize: 14, fontWeight: 500,
        cursor: 'pointer',
        fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        textTransform: 'none', letterSpacing: 'normal',
      }}
    >
      {label}
      <ChevronDown size={14} />
    </button>
  );
}

/* ── CENTER BODY ── */
function CenterBody({ item, childItems, childrenLoading }: {
  item: WorkItem; childItems: WorkItem[]; childrenLoading: boolean;
}) {
  const [descOpen, setDescOpen] = useState(true);
  const [childOpen, setChildOpen] = useState(true);
  const isEpic = item.type === 'epic';
  const summaryRtl = isRTL(item.summary);

  const doneCount = childItems.filter(c => c.status === 'done').length;
  const pctDone = childItems.length > 0 ? Math.round(doneCount / childItems.length * 100) : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid #DFE1E6' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 30px' }}>
        {/* Key + nav arrows — measured 2026-04-18: Atlassian Sans 14px/400/#505258 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <WorkItemTypeIcon type={item.type} size={18} />
          <a
            href="#"
            onClick={e => e.preventDefault()}
            style={{
              fontSize: 14, color: '#505258',
              fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 400, textDecoration: 'none',
            }}
          >
            {item.jiraKey}
          </a>
          <button style={navBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 10l4-4 4 4" fill="none" stroke="#626F86" strokeWidth="1.5"/></svg>
          </button>
          <button style={navBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" stroke="#626F86" strokeWidth="1.5"/></svg>
          </button>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 4, background: '#42526E', flexShrink: 0, marginTop: 4 }} />
          <h2
            dir={summaryRtl ? 'rtl' : 'ltr'}
            style={{
              // Live Jira (BAU-5419) H1: 20px / weight 653 / line-height 24px / #292A2E
              margin: 0, fontSize: 20, fontWeight: 653, color: '#292A2E',
              fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              lineHeight: '24px',
            }}
          >
            {item.summary || '(No title)'}
          </h2>
        </div>

        {/* Action buttons: + and ⚙ */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <ActionBtn><Plus size={16} /></ActionBtn>
          <ActionBtn><Settings size={16} /></ActionBtn>
        </div>

        {/* Description — flat collapsible */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setDescOpen(v => !v)}
            style={sectionHeaderStyle}
          >
            {descOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span style={{ fontWeight: 700, fontSize: 14 }}>Description</span>
          </button>
          {descOpen && (
            <div
              dir={item.description && isRTL(item.description) ? 'rtl' : 'ltr'}
              style={{
                fontSize: 14, color: item.description ? '#172B4D' : '#626F86',
                fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
                lineHeight: 1.6, padding: '8px 0 0 24px',
              }}
            >
              {item.description || '—'}
            </div>
          )}
        </div>

        {/* Child work items — flat collapsible */}
        {isEpic && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => setChildOpen(v => !v)}
                style={sectionHeaderStyle}
              >
                {childOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span style={{ fontWeight: 700, fontSize: 14 }}>Child work items</span>
              </button>
              {childOpen && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <SmallIconBtn><MoreHorizontal size={16} /></SmallIconBtn>
                  <SmallIconBtn>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#626F86" strokeWidth="1.2"><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg>
                  </SmallIconBtn>
                  <SmallIconBtn><Plus size={16} /></SmallIconBtn>
                </div>
              )}
            </div>

            {childOpen && (
              <>
                {/* Progress bar */}
                {childItems.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 10px 24px' }}>
                    <div style={{
                      flex: '0 0 auto', width: 240, height: 6, background: '#DFE1E6', borderRadius: 999,
                      overflow: 'hidden', display: 'flex',
                    }}>
                      {pctDone > 0 && <div style={{ width: `${pctDone}%`, background: '#5B7F24', borderRadius: '999px 0 0 999px' }} />}
                    </div>
                    <span style={{ fontSize: 12, color: '#626F86', fontFamily: 'var(--ds-font-family-monospaced)' }}>
                      {pctDone}% Done
                    </span>
                  </div>
                )}

                {/* Children table */}
                <div style={{ marginLeft: 24 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 8px', fontSize: 12, fontWeight: 700, color: '#44546F', borderBottom: '2px solid #DFE1E6', fontFamily: 'var(--ds-font-family-body)' }}>
                          Work
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {childrenLoading ? (
                        <tr><td style={{ padding: 16, color: '#626F86', fontSize: 13 }}>Loading…</td></tr>
                      ) : childItems.length === 0 ? (
                        <tr><td style={{ padding: 16, color: '#626F86', fontSize: 13 }}>No child items yet</td></tr>
                      ) : childItems.map(child => (
                        <tr
                          key={child.id}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F1F2F4')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '8px 8px', borderBottom: '1px solid #F0F1F2', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <WorkItemTypeIcon type={child.type} size={16} />
                              <a href="#" onClick={e => e.preventDefault()} style={{
                                color: '#0C66E4', textDecoration: 'none', fontWeight: 600, fontSize: 13,
                                fontFamily: 'var(--ds-font-family-monospaced)',
                              }}>
                                {child.jiraKey}
                              </a>
                              <span style={{
                                fontSize: 14, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
                              }}>
                                {child.summary}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── RIGHT DETAILS PANEL (Jira flat accordion) ── */
function RightDetails({ item }: { item: WorkItem }) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { mutate: updateStatus } = useUpdateWorkItemStatus();

  const assigneeInitials = item.assignee?.initials || 'NA';
  const reporterInitials = item.reporter?.name
    ? item.reporter.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '—';

  return (
    <div style={{
      width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column',
      minHeight: 0, background: '#FFFFFF',
    }}>
      {/* Header: Strong status pill + ✓ Done + ⚡ + ✦ Improve Epic */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid #DFE1E6',
        flexWrap: 'wrap',
      }}>
        <JiraStrongStatus
          status={item.status}
          onStatusChange={(s) => updateStatus({ id: item.id, status: s })}
        />
        {item.status === 'done' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#1B845D', fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" fill="none" stroke="#1B845D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Done
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <ActionBtn title="Automation"><Zap size={16} /></ActionBtn>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 10px', border: '1px solid #DFE1E6', borderRadius: 4,
            background: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: '#172B4D', fontFamily: 'var(--ds-font-family-body)',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#7C3AED"><circle cx="4" cy="4" r="1.5"/><circle cx="8" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/></svg>
            Improve Epic
          </button>
        </div>
      </div>

      {/* Scrollable details body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
        {/* Details accordion — flat, no card border */}
        <button onClick={() => setDetailsOpen(v => !v)} style={flatAccordionHeaderStyle}>
          {detailsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Details</span>
        </button>

        {detailsOpen && (
          <div style={{ padding: '0 0 8px' }}>
            {/* Assignee */}
            <DetailRow label="Assignee">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={avatarStyle('#6554C0')}>{assigneeInitials}</div>
                  <span style={{ fontSize: 14, color: '#172B4D' }}>{item.assignee?.name ?? 'Unassigned'}</span>
                </div>
                <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 13, color: '#0C66E4', textDecoration: 'none', fontWeight: 500, marginTop: 4, display: 'inline-block' }}>
                  Assign to me
                </a>
              </div>
            </DetailRow>

            {/* Priority — icon + text */}
            <DetailRow label="Priority">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {PRIORITY_ICON[item.priority] || PRIORITY_ICON.medium}
                <span style={{ fontSize: 14, color: '#172B4D' }}>{capitalize(item.priority)}</span>
              </div>
            </DetailRow>

            {/* Reporter */}
            <DetailRow label="Reporter">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={avatarStyle('#0C66E4')}>{reporterInitials}</div>
                <span style={{ fontSize: 14, color: '#172B4D' }}>{item.reporter?.name ?? '—'}</span>
              </div>
            </DetailRow>

            {/* MDT Ref */}
            <DetailRow label="MDT Ref">
              <span style={{ fontSize: 14, color: '#626F86' }}>Add text</span>
            </DetailRow>

            {/* Actual start */}
            <DetailRow label="Actual start">
              <span style={{ fontSize: 14, color: '#172B4D' }}>None</span>
            </DetailRow>

            {/* Actual end */}
            <DetailRow label="Actual end">
              <span style={{ fontSize: 14, color: '#172B4D' }}>None</span>
            </DetailRow>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #EBECF0', margin: '4px 0' }} />

        {/* Development — flat accordion */}
        <button onClick={() => setDevOpen(v => !v)} style={flatAccordionHeaderStyle}>
          {devOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Development</span>
        </button>
        {devOpen && <div style={{ padding: '8px 0 8px 24px', color: '#626F86', fontSize: 13 }}>No development info</div>}

        <div style={{ borderTop: '1px solid #EBECF0', margin: '4px 0' }} />

        {/* More fields */}
        <button onClick={() => setMoreOpen(v => !v)} style={flatAccordionHeaderStyle}>
          {moreOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>More fields</span>
          {!moreOpen && (
            <span style={{ fontSize: 12, color: '#626F86', fontWeight: 400, marginLeft: 8 }}>
              Story Points, Original estimate, Time tracking, Fix versions
            </span>
          )}
        </button>
        {moreOpen && <div style={{ padding: '8px 0 8px 24px', color: '#626F86', fontSize: 13 }}>No additional fields</div>}

        <div style={{ borderTop: '1px solid #EBECF0', margin: '4px 0' }} />

        {/* Audit trail */}
        <div style={{
          marginTop: 12, color: '#626F86', fontSize: 12, lineHeight: 1.8,
          fontFamily: 'var(--ds-font-family-monospaced)',
        }}>
          Created {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}<br />
          Updated {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(item.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </div>
      </div>
    </div>
  );
}

/* ── Detail KV Row (flat, no card) ──
 * Live Jira (BAU-5419, 2026-04-18): row stride 44px, label 94px wide,
 * values LEFT-aligned to the right of the label, same font-size/family
 * as label but weight 400 and color #292A2E.
 */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      padding: '10px 0', minHeight: 44, gap: 12,
    }}>
      <span style={{
        fontSize: 14, color: '#505258', fontWeight: 500,
        fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
        flexShrink: 0, width: 94, lineHeight: '24px',
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, display: 'flex', justifyContent: 'flex-start',
        alignItems: 'flex-start', minWidth: 0,
        fontSize: 14, color: '#292A2E', fontWeight: 400,
        fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Style constants ── */
const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, border: '1px solid #DFE1E6', borderRadius: 4,
  background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center',
};

// Live Jira 2026-04-18: body section headings ("Description", "Child work items",
// "Subtasks", "Linked work items") are 16px / weight 653.
const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
  border: 'none', cursor: 'pointer', padding: '8px 0', color: '#292A2E',
  fontFamily: "'Atlassian Sans', -apple-system, sans-serif", fontSize: 16, fontWeight: 653,
  width: 'auto',
};

// Live Jira 2026-04-18: right-panel accordion headings ("Details",
// "Development", "Automation", "More fields") are 16px / weight 500 — lighter
// than the body section headings above.
const flatAccordionHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
  border: 'none', cursor: 'pointer', padding: '14px 0', color: '#292A2E',
  fontFamily: "'Atlassian Sans', -apple-system, sans-serif", fontSize: 16, fontWeight: 500,
  width: '100%', textAlign: 'left',
};

function avatarStyle(bg: string): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#FFFFFF',
    background: bg, flexShrink: 0,
  };
}

function ActionBtn({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <button
      title={title}
      style={{
        width: 32, height: 32, border: '1px solid #DFE1E6', borderRadius: 4,
        background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#626F86',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F1F2F4'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
    >
      {children}
    </button>
  );
}

function SmallIconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        width: 28, height: 28, border: 'none', background: 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#626F86', borderRadius: 4,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F1F2F4'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

/* ── Main Export ── */
export function WorkItemDetailPanel({ item, allItems, onNavigate, onClose }: Props) {
  const isEpic = item.type === 'epic';
  const { data: children = [], isLoading: childrenLoading } = useWorkItemChildren(
    isEpic ? item.jiraKey : undefined,
    isEpic,
  );

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
      <CenterBody item={item} childItems={children} childrenLoading={childrenLoading} />
      <RightDetails item={item} />
    </div>
  );
}

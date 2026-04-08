/**
 * StoryDetailSidebar — Right panel: status transition, details, metadata
 */
import React, { useState } from 'react';
import { Eye, Share2, MoreHorizontal, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { getInitials, STORY_STATUS_LOZENGE, getLozengeStyle } from '../../utils/backlog.utils';

// ─── Status groups & workflow ────────────────────────────────
const STATUS_GROUPS = [
  { label: 'TO DO', category: 'todo', statuses: ['In Requirements', 'In Design', 'Ready for Development', 'Technical Validation'] },
  { label: 'IN PROGRESS', category: 'in_progress', statuses: ['In Development', 'On Hold', 'In QA', 'In Entity Integration', 'In UAT', 'In BETA', 'End to End Testing'] },
  { label: 'DONE', category: 'done', statuses: ['Production Ready', 'Beta Ready', 'In Production'] },
];

function getStatusCategory(status: string): string {
  for (const g of STATUS_GROUPS) {
    if (g.statuses.includes(status)) return g.category;
  }
  return 'todo';
}

function getStatusLozengeColors(status: string): { bg: string; text: string; label: string } {
  const cat = getStatusCategory(status);
  if (cat === 'done') return { bg: '#E3FCEF', text: '#006644', label: status.toUpperCase() };
  if (cat === 'in_progress') return { bg: '#DEEBFF', text: '#0747A6', label: status.toUpperCase() };
  return { bg: '#DFE1E6', text: '#253858', label: status.toUpperCase() };
}

function formatFixVersions(fv: any): string {
  if (!fv) return 'None';
  try {
    const arr = Array.isArray(fv) ? fv : JSON.parse(fv);
    if (!arr.length) return 'None';
    return arr.map((v: any) => (typeof v === 'string' ? v : v?.name || v?.id || '')).filter(Boolean).join(', ');
  } catch { return 'None'; }
}

// ─── Types ───────────────────────────────────────────────────
interface SidebarProps {
  story: any;
  onUpdateField: (field: string, value: any) => void;
  isPending: boolean;
  teamMembers: any[];
  onDelete: () => void;
}

const LABEL: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#505258', textTransform: 'uppercase',
  letterSpacing: '0.03em', width: 120, flexShrink: 0, lineHeight: '32px',
};
const VALUE: React.CSSProperties = { fontSize: 14, color: '#292A2E', fontWeight: 400, lineHeight: '32px' };

export function StoryDetailSidebar({ story, onUpdateField, isPending, teamMembers, onDelete }: SidebarProps) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const statusColors = getStatusLozengeColors(story.status || '');

  return (
    <div style={{
      width: 360, maxWidth: 360, flexShrink: 0,
      borderLeft: '1px solid #E0E0E0', background: '#FFFFFF',
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* Action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 8, padding: '12px 24px', borderBottom: '1px solid #E0E0E0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#505258', fontSize: 13 }}>
          <Eye size={16} /> <span>0</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied!');
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#505258', fontSize: 13 }}
        >
          <Share2 size={16} /> Share
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <MoreHorizontal size={16} color="#505258" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 size={14} className="mr-2" /> Delete story
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status transition */}
      <div style={{ padding: '16px 24px' }}>
        <Popover>
          <PopoverTrigger asChild>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 32, padding: '4px 12px', borderRadius: 3,
              fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: statusColors.bg, color: statusColors.text,
            }}>
              {statusColors.label}
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" style={{ width: 280, padding: 0, background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 6, overflow: 'hidden' }}>
            {STATUS_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', padding: '8px 12px 4px' }}>
                  {group.label}
                </div>
                {group.statuses.map(s => {
                  const sc = getStatusLozengeColors(s);
                  const isCurrent = story.status === s;
                  return (
                    <button key={s} onClick={() => onUpdateField('status', s)} style={{
                      width: '100%', padding: '6px 12px', fontSize: 13, border: 'none',
                      textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      background: isCurrent ? 'rgba(37,99,235,0.08)' : 'transparent',
                      color: '#292A2E',
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: group.category === 'done' ? '#006644' : group.category === 'in_progress' ? '#0747A6' : '#94A3B8',
                      }} />
                      <span>{s}</span>
                      {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#2563EB' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Details section */}
      <div style={{ padding: '0 24px' }}>
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#505258',
            textTransform: 'uppercase', letterSpacing: '0.03em', padding: '8px 0', width: '100%',
          }}
        >
          {detailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Details
        </button>

        {detailsOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Fix versions */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={LABEL}>Fix versions</span>
              <span style={{ ...VALUE, color: formatFixVersions(story.fix_versions) === 'None' ? '#6B6E76' : '#292A2E' }}>
                {formatFixVersions(story.fix_versions)}
              </span>
            </div>

            {/* Assignee */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={LABEL}>Assignee</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                    {story.assignee_display_name ? (
                      <>
                        <div style={{
                          width: 16, height: 16, borderRadius: 2, background: '#E2E8F0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, fontWeight: 700, color: '#64748B', flexShrink: 0,
                        }}>
                          {getInitials(story.assignee_display_name)}
                        </div>
                        <span style={VALUE}>{story.assignee_display_name}</span>
                      </>
                    ) : (
                      <span style={{ ...VALUE, color: '#6B6E76', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" style={{ width: 260, padding: 0, maxHeight: 300, overflowY: 'auto' }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #E0E0E0', fontSize: 11, fontWeight: 600, color: '#505258', textTransform: 'uppercase' }}>
                    Select Assignee
                  </div>
                  <button
                    onClick={() => onUpdateField('assignee_display_name', null)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: '#6B6E76' }}
                  >Unassigned</button>
                  {teamMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => onUpdateField('assignee_display_name', m.display_name)}
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: 13, border: 'none',
                        background: story.assignee_display_name === m.display_name ? 'rgba(37,99,235,0.08)' : 'transparent',
                        textAlign: 'left', cursor: 'pointer', color: '#292A2E',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 2, background: '#E2E8F0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, color: '#64748B',
                      }}>
                        {getInitials(m.display_name)}
                      </div>
                      {m.display_name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            {/* Reporter */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={LABEL}>Reporter</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                    {story.reporter_display_name ? (
                      <>
                        <div style={{
                          width: 16, height: 16, borderRadius: 2, background: '#E2E8F0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, fontWeight: 700, color: '#64748B', flexShrink: 0,
                        }}>
                          {getInitials(story.reporter_display_name)}
                        </div>
                        <span style={VALUE}>{story.reporter_display_name}</span>
                      </>
                    ) : (
                      <span style={{ ...VALUE, color: '#6B6E76', fontStyle: 'italic' }}>None</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" style={{ width: 260, padding: 0, maxHeight: 300, overflowY: 'auto' }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #E0E0E0', fontSize: 11, fontWeight: 600, color: '#505258', textTransform: 'uppercase' }}>
                    Select Reporter
                  </div>
                  {teamMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => onUpdateField('reporter_display_name', m.display_name)}
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: 13, border: 'none',
                        background: story.reporter_display_name === m.display_name ? 'rgba(37,99,235,0.08)' : 'transparent',
                        textAlign: 'left', cursor: 'pointer', color: '#292A2E',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 2, background: '#E2E8F0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, color: '#64748B',
                      }}>
                        {getInitials(m.display_name)}
                      </div>
                      {m.display_name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      {/* Metadata footer */}
      <div style={{ marginTop: 'auto', padding: '16px 24px', borderTop: '1px solid #E0E0E0' }}>
        <div style={{ fontSize: 12, color: '#6B6E76', marginBottom: 4 }}>
          Created {story.jira_created_at ? formatDistanceToNow(new Date(story.jira_created_at), { addSuffix: true }) : '—'}
        </div>
        <div style={{ fontSize: 12, color: '#6B6E76' }}>
          Updated {story.jira_updated_at ? formatDistanceToNow(new Date(story.jira_updated_at), { addSuffix: true }) : '—'}
        </div>
      </div>
    </div>
  );
}

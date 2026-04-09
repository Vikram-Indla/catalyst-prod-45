/**
 * StoryDetailSidebar — Right panel matching Jira layout
 * Action bar (watchers, share, more) → Status lozenge → Details (collapsible) → Metadata
 */
import React, { useState } from 'react';
import { Eye, Share2, MoreHorizontal, ChevronDown, ChevronRight, Trash2, Tag, X, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { format, formatDistanceToNow } from 'date-fns';
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

function formatFixVersions(fv: any): string[] {
  if (!fv) return [];
  try {
    const arr = Array.isArray(fv) ? fv : JSON.parse(fv);
    if (!arr.length) return [];
    return arr.map((v: any) => (typeof v === 'string' ? v : v?.name || v?.id || '')).filter(Boolean);
  } catch { return []; }
}

function formatLabels(labels: any): string[] {
  if (!labels) return [];
  try {
    const arr = Array.isArray(labels) ? labels : JSON.parse(labels);
    return arr.filter(Boolean);
  } catch { return []; }
}

interface SidebarProps {
  story: any;
  onUpdateField: (field: string, value: any) => void;
  isPending: boolean;
  teamMembers: any[];
  onDelete: () => void;
}

const SECTION_HEAD: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
  cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#505258',
  textTransform: 'uppercase', letterSpacing: '0.03em', padding: '8px 0', width: '100%',
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 650, color: '#64748B', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const FIELD_VALUE: React.CSSProperties = {
  fontSize: 14, color: '#292A2E', fontWeight: 400,
};

export function StoryDetailSidebar({ story, onUpdateField, isPending, teamMembers, onDelete }: SidebarProps) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [labelInputVisible, setLabelInputVisible] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const statusColors = getStatusLozengeColors(story.status || '');
  const labels = formatLabels(story.labels);
  const fixVersions = formatFixVersions(story.fix_versions);

  const handleStatusChange = (newStatus: string) => {
    onUpdateField('status', newStatus);
    setStatusPopoverOpen(false);
  };

  const handleAddLabel = () => {
    const trimmed = labelInput.trim();
    if (!trimmed) return;
    const updated = [...labels, trimmed];
    onUpdateField('labels', updated);
    setLabelInput('');
    setLabelInputVisible(false);
  };

  const handleRemoveLabel = (label: string) => {
    const updated = labels.filter(l => l !== label);
    onUpdateField('labels', updated);
  };

  const handleDueDateChange = (date: Date | undefined) => {
    onUpdateField('due_date', date ? format(date, 'yyyy-MM-dd') : null);
    setDueDateOpen(false);
  };

  const handleRemoveFixVersion = (version: string) => {
    const updated = fixVersions.filter(v => v !== version);
    onUpdateField('fix_versions', updated.length > 0 ? updated : null);
  };

  return (
    <div style={{
      width: 280, maxWidth: 280, flexShrink: 0,
      borderLeft: '1px solid #E2E8F0', background: '#FFFFFF',
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Action bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 4, padding: '12px 20px', borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#505258', fontSize: 13, padding: '4px 8px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
          <Eye size={14} /> <span>0</span>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#505258', fontSize: 13, padding: '4px 8px', borderRadius: 4, border: '1px solid #E2E8F0', background: 'none', cursor: 'pointer' }}>
          <Share2 size={14} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 4, border: '1px solid #E2E8F0', background: 'none', cursor: 'pointer' }}>
              <MoreHorizontal size={14} color="#505258" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 size={14} className="mr-2" /> Delete story
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Status transition lozenge ── */}
      <div style={{ padding: '16px 20px' }}>
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger asChild>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              width: '100%', height: 36, padding: '4px 12px', borderRadius: 4,
              fontSize: 13, fontWeight: 700, border: '1px solid #E2E8F0', cursor: 'pointer',
              background: '#FFFFFF', color: '#292A2E', textTransform: 'uppercase',
              letterSpacing: '0.03em', justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: statusColors.text,
                  flexShrink: 0,
                }} />
                {statusColors.label}
              </span>
              <ChevronDown size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" style={{ width: 280, padding: 0, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
            {STATUS_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', padding: '8px 12px 4px' }}>{group.label}</div>
                {group.statuses.map(s => {
                  const isCurrent = story.status === s;
                  return (
                    <button key={s} onClick={() => handleStatusChange(s)}
                      style={{ width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isCurrent ? 'rgba(37,99,235,0.08)' : 'transparent', color: '#292A2E' }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.category === 'done' ? '#006644' : group.category === 'in_progress' ? '#0747A6' : '#94A3B8' }} />
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

      {/* ── Details section (collapsible) ── */}
      <div style={{ padding: '0 20px' }}>

        {/* Fix versions */}
        <div style={{ marginBottom: 16 }}>
          <div style={FIELD_LABEL}>Fix versions</div>
          {fixVersions.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {fixVersions.map((v, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: 3, fontSize: 12, fontWeight: 500, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
                  {v}
                  <button onClick={() => handleRemoveFixVersion(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#94A3B8' }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ ...FIELD_VALUE, color: '#94A3B8', fontSize: 13 }}>None</div>
          )}
        </div>

        {/* Labels */}
        <div style={{ marginBottom: 16 }}>
          <div style={FIELD_LABEL}>Labels</div>
          {labels.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              {labels.map((l, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', borderRadius: 3, fontSize: 12, fontWeight: 500, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
                  <Tag size={10} /> {l}
                  <button onClick={() => handleRemoveLabel(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#94A3B8' }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            !labelInputVisible && <div style={{ ...FIELD_VALUE, color: '#94A3B8', fontSize: 13 }}>None</div>
          )}
          {labelInputVisible ? (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddLabel(); if (e.key === 'Escape') { setLabelInputVisible(false); setLabelInput(''); } }}
                autoFocus
                placeholder="Type label..."
                style={{ flex: 1, height: 28, padding: '0 8px', fontSize: 12, border: '1px solid #2563EB', borderRadius: 3, outline: 'none', color: '#292A2E' }}
              />
              <button onClick={handleAddLabel} style={{ height: 28, padding: '0 8px', fontSize: 12, fontWeight: 500, background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Add</button>
              <button onClick={() => { setLabelInputVisible(false); setLabelInput(''); }} style={{ height: 28, padding: '0 6px', fontSize: 12, background: 'none', border: '1px solid #E2E8F0', borderRadius: 3, cursor: 'pointer', color: '#505258' }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => setLabelInputVisible(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#2563EB', padding: '4px 0', marginTop: 4 }}>
              <Plus size={12} /> Add label
            </button>
          )}
        </div>

        {/* Due Date */}
        <div style={{ marginBottom: 16 }}>
          <div style={FIELD_LABEL}>Due date</div>
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger asChild>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: '1px solid #E2E8F0', borderRadius: 4,
                padding: '4px 10px', height: 32, cursor: 'pointer',
                fontSize: 13, color: story.due_date ? '#292A2E' : '#94A3B8',
              }}>
                <CalendarIcon size={14} />
                {story.due_date ? format(new Date(story.due_date), 'MMM d, yyyy') : 'Set date'}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6 }}>
              <Calendar
                mode="single"
                selected={story.due_date ? new Date(story.due_date) : undefined}
                onSelect={handleDueDateChange}
                initialFocus
              />
              {story.due_date && (
                <div style={{ padding: '0 12px 8px', borderTop: '1px solid #E2E8F0' }}>
                  <button onClick={() => handleDueDateChange(undefined)} style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>Clear date</button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12 }} />

      </div>

      {/* ── Metadata footer ── */}
      <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 12, color: '#6B6E76', marginBottom: 4 }}>
          Created {story.jira_created_at ? format(new Date(story.jira_created_at), "MMM d, yyyy, hh:mm a") : '—'}
        </div>
        <div style={{ fontSize: 12, color: '#6B6E76' }}>
          Updated {story.jira_updated_at ? format(new Date(story.jira_updated_at), "MMM d, yyyy, hh:mm a") : '—'}
        </div>
      </div>
    </div>
  );
}

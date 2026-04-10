import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, UserRound, ChevronsUp, ChevronUp, Minus, ChevronDown, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Defect } from '@/types/defects';
import { cn } from '@/lib/utils';

// ── Bug type icon (Jira canonical red rounded-square with dot) ──
function BugTypeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#FF5630" />
      <circle cx="8" cy="8" r="3" fill="#FFFFFF" />
    </svg>
  );
}

// ── Severity Lozenge (V12 bordered muted — intentional inline hex) ──
const SEVERITY_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'CRITICAL', bg: '#FFECEC', text: '#AE2A19', border: '#FFBDAD' },
  high:     { label: 'HIGH',     bg: '#FFF4EC', text: '#974F0C', border: '#FFD2A7' },
  medium:   { label: 'MEDIUM',   bg: '#F4F5F7', text: '#42526E', border: '#C1C7D0' },
  low:      { label: 'LOW',      bg: '#F4F5F7', text: '#6B778C', border: '#DFE1E6' },
};

function SeverityPill({ severity }: { severity: string }) {
  const s = SEVERITY_MAP[severity] || SEVERITY_MAP.medium;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: 20, padding: '0 6px', borderRadius: 3,
      backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: '20px',
    }}>
      {s.label}
    </span>
  );
}

// ── Status Lozenge (3-color guardrail — intentional inline hex) ──
const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  open:        { label: 'OPEN',        bg: '#DEEBFF', text: '#0747A6' },
  new:         { label: 'NEW',         bg: '#DEEBFF', text: '#0747A6' },
  in_progress: { label: 'IN PROGRESS', bg: '#DEEBFF', text: '#0747A6' },
  resolved:    { label: 'RESOLVED',    bg: '#E3FCEF', text: '#006644' },
  fixed:       { label: 'FIXED',       bg: '#E3FCEF', text: '#006644' },
  verified:    { label: 'VERIFIED',    bg: '#E3FCEF', text: '#006644' },
  closed:      { label: 'CLOSED',      bg: '#E3FCEF', text: '#006644' },
  reopened:    { label: 'REOPENED',    bg: '#FFFAE6', text: '#974F0C' },
  deferred:    { label: 'DEFERRED',    bg: '#DFE1E6', text: '#253858' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status.toUpperCase(), bg: '#DFE1E6', text: '#253858' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: 20, padding: '0 6px', borderRadius: 3,
      backgroundColor: s.bg, color: s.text,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: '20px',
    }}>
      {s.label}
    </span>
  );
}

// ── Priority chevron icon (matching ProjectHub) ──
const PRIORITY_ICONS: Record<string, { Icon: typeof ChevronsUp; color: string; label: string }> = {
  critical: { Icon: ChevronsUp, color: '#E5484D', label: 'Critical' },
  urgent:   { Icon: ChevronsUp, color: '#E5484D', label: 'Urgent' },
  high:     { Icon: ChevronUp,  color: '#F76B15', label: 'High' },
  medium:   { Icon: Minus,      color: '#6B778C', label: 'Medium' },
  low:      { Icon: ChevronDown, color: '#94A3B8', label: 'Low' },
};

function PriorityCell({ priority }: { priority: string | null }) {
  if (!priority) return <span style={{ fontSize: 13, color: '#94A3B8' }}>—</span>;
  const p = PRIORITY_ICONS[priority];
  if (!p) return <span style={{ fontSize: 13, color: '#94A3B8' }}>—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <p.Icon className="h-3.5 w-3.5" style={{ color: p.color }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{p.label}</span>
    </span>
  );
}

// ── Avatar colours (deterministic per name) ──
const AVATAR_COLOURS = [
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#FEE2E2', text: '#991B1B' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#E0E7FF', text: '#3730A3' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#CCFBF1', text: '#065F46' },
  { bg: '#F3E8FF', text: '#6B21A8' },
];

function getAvatarColour(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLOURS.length;
  return AVATAR_COLOURS[idx];
}

// ── Age formatter ──
function getRelativeAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(createdAt);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `${day} ${mon}`;
}

// ── Jira source badge ──
function JiraBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: 16, padding: '0 4px', borderRadius: 3,
      backgroundColor: '#DFE1E6', color: '#253858',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: '16px',
      marginLeft: 4,
    }}>
      JIRA
    </span>
  );
}

// ── Header cell style ──
const TH_STYLE: React.CSSProperties = {
  height: 40,
  padding: '0 12px',
  backgroundColor: '#F7F8F9',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#44546F',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  borderBottom: '2px solid #DFE1E6',
  fontFamily: 'Inter, sans-serif',
};

// ── Row cell style ──
const TD_STYLE: React.CSSProperties = {
  height: 40,
  maxHeight: 40,
  padding: '0 12px',
  fontSize: 14,
  fontWeight: 400,
  color: '#1E293B',
  borderBottom: '1px solid rgba(11, 18, 14, 0.08)',
  fontFamily: 'Inter, sans-serif',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

// ── Column definitions ──
type ColumnKey = 'SEVERITY' | 'PRIORITY' | 'STATUS' | 'ASSIGNEE' | 'AGE';

interface Props {
  defects: Defect[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDelete: (defect: Defect) => void;
  visibleColumns?: Set<ColumnKey>;
}

export function DefectTable({ defects, selectedIds, onSelectionChange, onDelete, visibleColumns }: Props) {
  const navigate = useNavigate();
  const cols = visibleColumns || new Set<ColumnKey>(['SEVERITY', 'PRIORITY', 'STATUS', 'ASSIGNEE', 'AGE']);

  const toggleAll = () => {
    onSelectionChange(selectedIds.size === defects.length ? new Set() : new Set(defects.map(d => d.id)));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    onSelectionChange(s);
  };
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ border: '1px solid rgba(11, 18, 14, 0.14)', borderRadius: 8, overflow: 'hidden', background: '#FFFFFF' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 40 }} />
          <col style={{ width: 32 }} />
          <col style={{ width: 32 }} />
          <col style={{ width: 120 }} />
          <col />
          {cols.has('SEVERITY') && <col style={{ width: 100 }} />}
          {cols.has('PRIORITY') && <col style={{ width: 100 }} />}
          {cols.has('STATUS') && <col style={{ width: 120 }} />}
          {cols.has('ASSIGNEE') && <col style={{ width: 160 }} />}
          {cols.has('AGE') && <col style={{ width: 90 }} />}
          <col style={{ width: 40 }} />
        </colgroup>

        <thead>
          <tr>
            <th style={{ ...TH_STYLE, width: 40 }}>
              <Checkbox
                checked={defects.length > 0 && selectedIds.size === defects.length}
                onCheckedChange={toggleAll}
              />
            </th>
            <th style={{ ...TH_STYLE, width: 32 }}>
              {/* Star column — no header */}
            </th>
            <th style={{ ...TH_STYLE, width: 32 }}>Type</th>
            <th style={TH_STYLE}>Key</th>
            <th style={TH_STYLE}>Title</th>
            {cols.has('SEVERITY') && <th style={TH_STYLE}>Severity</th>}
            {cols.has('PRIORITY') && <th style={TH_STYLE}>Priority</th>}
            {cols.has('STATUS') && <th style={TH_STYLE}>Status</th>}
            {cols.has('ASSIGNEE') && <th style={TH_STYLE}>Assignee</th>}
            {cols.has('AGE') && <th style={TH_STYLE}>Age</th>}
            <th style={{ ...TH_STYLE, width: 40 }} />
          </tr>
        </thead>

        <tbody>
          {defects.map(d => {
            const keyText = d.displayKey || d.defect_key;
            const isJira = d.isJiraSource ?? d.jira_source;
            const isSelected = selectedIds.has(d.id);

            return (
              <tr
                key={d.id}
                className="group"
                style={{
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(37,99,235,0.08)' : '#FFFFFF',
                  transition: 'background-color 80ms ease',
                  borderLeft: isSelected ? '2px solid #2563EB' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.04)'); }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.backgroundColor = '#FFFFFF'); }}
                onClick={() => navigate(`/testhub/defects/${d.id}`)}
              >
                {/* Checkbox */}
                <td style={{ ...TD_STYLE, width: 40 }} onClick={e => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(d.id)} />
                </td>

                {/* Star */}
                <td style={{ ...TD_STYLE, width: 32 }} onClick={e => e.stopPropagation()}>
                  <Star size={14} style={{ color: '#C1C7D0' }} />
                </td>

                {/* Type icon */}
                <td style={{ ...TD_STYLE, width: 32 }}>
                  <BugTypeIcon />
                </td>

                {/* Key */}
                <td style={TD_STYLE}>
                  <div className="flex items-center gap-1">
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#2563EB',
                    }}>
                      {keyText}
                    </span>
                    {isJira && <JiraBadge />}
                    {isJira && d.external_url && (
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ marginLeft: 2, padding: 2, borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer' }}
                        title="Open in Jira"
                        onClick={e => { e.stopPropagation(); window.open(d.external_url!, '_blank'); }}
                      >
                        <ExternalLink size={13} style={{ color: '#94A3B8' }} />
                      </button>
                    )}
                  </div>
                </td>

                {/* Title */}
                <td style={{ ...TD_STYLE, fontWeight: 500 }}>{d.title}</td>

                {/* Severity */}
                {cols.has('SEVERITY') && <td style={TD_STYLE}><SeverityPill severity={d.severity} /></td>}

                {/* Priority */}
                {cols.has('PRIORITY') && <td style={TD_STYLE}><PriorityCell priority={d.priority} /></td>}

                {/* Status */}
                {cols.has('STATUS') && <td style={TD_STYLE}><StatusPill status={d.status} /></td>}

                {/* Assignee */}
                {cols.has('ASSIGNEE') && (
                  <td style={TD_STYLE}>
                    {d.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarFallback
                            style={{
                              fontSize: 10, fontWeight: 700,
                              backgroundColor: getAvatarColour(d.assignee.full_name).bg,
                              color: getAvatarColour(d.assignee.full_name).text,
                            }}
                          >
                            {initials(d.assignee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }} className="truncate">
                          {d.assigneeName || d.assignee.full_name}
                        </span>
                      </div>
                    ) : d.assigneeName && d.assigneeName !== 'Unassigned' ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarFallback
                            style={{
                              fontSize: 10, fontWeight: 700,
                              backgroundColor: getAvatarColour(d.assigneeName).bg,
                              color: getAvatarColour(d.assigneeName).text,
                            }}
                          >
                            {initials(d.assigneeName)}
                          </AvatarFallback>
                        </Avatar>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }} className="truncate">
                          {d.assigneeName}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#F1F5F9', border: '1px solid rgba(15,23,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <UserRound size={12} style={{ color: '#94A3B8' }} />
                        </div>
                        <span style={{ fontSize: 13, color: '#94A3B8' }}>Unassigned</span>
                      </div>
                    )}
                  </td>
                )}

                {/* Age */}
                {cols.has('AGE') && (
                  <td style={{ ...TD_STYLE, fontSize: 12, color: '#64748B' }}>
                    {getRelativeAge(d.created_at)}
                  </td>
                )}

                {/* Actions */}
                <td style={{ ...TD_STYLE, width: 40 }} onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ height: 28, width: 28, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <MoreHorizontal size={16} style={{ color: '#64748B' }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/testhub/defects/${d.id}`)}>View Details</DropdownMenuItem>
                      {d.external_url && (
                        <DropdownMenuItem onClick={() => window.open(d.external_url!, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />Open External
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(d)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

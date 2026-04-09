import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, UserRound, ChevronsUp, ChevronUp, Minus, ChevronDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Defect } from '@/types/defects';
import { cn } from '@/lib/utils';

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

// ── Priority chevron icon (matching ProjectHub) — null = no priority ──
const PRIORITY_ICONS: Record<string, { Icon: typeof ChevronsUp; color: string; label: string }> = {
  critical: { Icon: ChevronsUp, color: '#E5484D', label: 'Critical' },
  urgent:   { Icon: ChevronsUp, color: '#E5484D', label: 'Urgent' },
  high:     { Icon: ChevronUp,  color: '#F76B15', label: 'High' },
  medium:   { Icon: Minus,      color: '#6B778C', label: 'Medium' },
  low:      { Icon: ChevronDown, color: '#94A3B8', label: 'Low' },
};

function PriorityCell({ priority }: { priority: string | null }) {
  if (!priority) {
    return <span className="text-[13px] text-slate-400">—</span>;
  }
  const p = PRIORITY_ICONS[priority];
  if (!p) {
    return <span className="text-[13px] text-slate-400">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <p.Icon className="h-3.5 w-3.5" style={{ color: p.color }} />
      <span className="text-[13px] font-medium text-slate-700">{p.label}</span>
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
    <Table>
      <TableHeader>
        <TableRow className="h-9 bg-slate-50">
          <TableHead className="w-10 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Checkbox checked={defects.length > 0 && selectedIds.size === defects.length} onCheckedChange={toggleAll} />
          </TableHead>
          <TableHead className="w-28 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</TableHead>
          <TableHead className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</TableHead>
          {cols.has('SEVERITY') && <TableHead className="w-24 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</TableHead>}
          {cols.has('PRIORITY') && <TableHead className="w-24 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</TableHead>}
          {cols.has('STATUS') && <TableHead className="w-28 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>}
          {cols.has('ASSIGNEE') && <TableHead className="w-36 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</TableHead>}
          {cols.has('AGE') && <TableHead className="w-24 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Age</TableHead>}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {defects.map(d => {
          const keyText = d.displayKey || d.defect_key;
          const isJira = d.isJiraSource ?? d.jira_source;

          return (
            <TableRow
              key={d.id}
              className={cn('group cursor-pointer hover:bg-slate-50 transition-colors', selectedIds.has(d.id) && 'bg-blue-600/[0.08]')}
              style={{ height: 36, maxHeight: 36 }}
              onClick={() => navigate(`/testhub/defects/${d.id}`)}
            >
              {/* Checkbox */}
              <TableCell className="px-3 py-2" onClick={e => e.stopPropagation()}>
                <Checkbox checked={selectedIds.has(d.id)} onCheckedChange={() => toggleOne(d.id)} />
              </TableCell>

              {/* Key — plain text, no Jira link. Jira badge if source. External icon on hover. */}
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[13px] text-slate-900">{keyText}</span>
                  {isJira && <JiraBadge />}
                  {isJira && d.external_url && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-0.5 p-0.5 rounded hover:bg-slate-900/[0.06]"
                      title="Open in Jira"
                      onClick={e => { e.stopPropagation(); window.open(d.external_url!, '_blank'); }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              </TableCell>

              {/* Title */}
              <TableCell className="px-3 py-2 text-sm font-medium text-slate-900 max-w-md truncate">{d.title}</TableCell>

              {/* Severity */}
              {cols.has('SEVERITY') && <TableCell className="px-3 py-2"><SeverityPill severity={d.severity} /></TableCell>}

              {/* Priority */}
              {cols.has('PRIORITY') && <TableCell className="px-3 py-2"><PriorityCell priority={d.priority} /></TableCell>}

              {/* Status */}
              {cols.has('STATUS') && <TableCell className="px-3 py-2"><StatusPill status={d.status} /></TableCell>}

              {/* Assignee — uses assigneeName for display, avatar for Catalyst profiles */}
              {cols.has('ASSIGNEE') && (
                <TableCell className="px-3 py-2">
                  {d.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-[10px] font-bold"
                          style={{
                            backgroundColor: getAvatarColour(d.assignee.full_name).bg,
                            color: getAvatarColour(d.assignee.full_name).text,
                          }}
                        >
                          {initials(d.assignee.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] font-medium text-slate-900 truncate">{d.assigneeName || d.assignee.full_name}</span>
                    </div>
                  ) : d.assigneeName && d.assigneeName !== 'Unassigned' ? (
                    /* Jira-only assignee — no profile, just name */
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-[10px] font-bold"
                          style={{
                            backgroundColor: getAvatarColour(d.assigneeName).bg,
                            color: getAvatarColour(d.assigneeName).text,
                          }}
                        >
                          {initials(d.assigneeName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] font-medium text-slate-900 truncate">{d.assigneeName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-900/[0.12] flex items-center justify-center flex-shrink-0">
                        <UserRound className="h-3 w-3 text-slate-400" />
                      </div>
                      <span className="text-[13px] text-slate-400">Unassigned</span>
                    </div>
                  )}
                </TableCell>
              )}

              {/* Age */}
              {cols.has('AGE') && <TableCell className="px-3 py-2 text-xs text-slate-500">{getRelativeAge(d.created_at)}</TableCell>}

              {/* Actions */}
              <TableCell className="px-3 py-2" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 h-7 w-7 rounded inline-flex items-center justify-center hover:bg-slate-900/[0.06]">
                      <MoreHorizontal className="h-4 w-4 text-slate-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/testhub/defects/${d.id}`)}>View Details</DropdownMenuItem>
                    {d.external_url && <DropdownMenuItem onClick={() => window.open(d.external_url!, '_blank')}><ExternalLink className="h-4 w-4 mr-2" />Open External</DropdownMenuItem>}
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(d)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, UserRound } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Defect } from '@/types/defects';
import { cn } from '@/lib/utils';

// ── Severity Lozenge (V12 bordered muted) ──
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
      fontFamily: 'Inter, sans-serif',
    }}>
      {s.label}
    </span>
  );
}

// ── Status Lozenge (3-color guardrail + reopened) ──
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
      fontFamily: 'Inter, sans-serif',
    }}>
      {s.label}
    </span>
  );
}

// ── Priority dot + text ──
const PRIORITY_DOT: Record<string, string> = {
  critical: '#E5484D',
  urgent: '#E5484D',
  high: '#F76B15',
  medium: '#F5A623',
  low: '#8993A4',
};

function PriorityCell({ priority }: { priority: string }) {
  const dot = PRIORITY_DOT[priority] || PRIORITY_DOT.medium;
  const label = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dot, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: '#172B4D', fontFamily: 'Inter, sans-serif' }}>{label}</span>
    </div>
  );
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

interface Props {
  defects: Defect[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDelete: (defect: Defect) => void;
}

const TH_STYLE = { fontSize: '10.5px', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: '#64748B' };

export function DefectTable({ defects, selectedIds, onSelectionChange, onDelete }: Props) {
  const navigate = useNavigate();

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
        <TableRow className="h-9" style={{ backgroundColor: '#F8FAFC' }}>
          <TableHead className="w-10" style={TH_STYLE}><Checkbox checked={defects.length > 0 && selectedIds.size === defects.length} onCheckedChange={toggleAll} /></TableHead>
          <TableHead className="w-28" style={TH_STYLE}>Key</TableHead>
          <TableHead style={TH_STYLE}>Title</TableHead>
          <TableHead className="w-24" style={TH_STYLE}>Severity</TableHead>
          <TableHead className="w-24" style={TH_STYLE}>Priority</TableHead>
          <TableHead className="w-28" style={TH_STYLE}>Status</TableHead>
          <TableHead className="w-36" style={TH_STYLE}>Assignee</TableHead>
          <TableHead className="w-24" style={TH_STYLE}>Age</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {defects.map(d => (
          <TableRow key={d.id} className={cn("group cursor-pointer hover:bg-muted/50", selectedIds.has(d.id) && "bg-primary/5")} style={{ height: 36, maxHeight: 36 }} onClick={() => navigate(`/testhub/defects/${d.id}`)}>
            <TableCell style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(d.id)} onCheckedChange={() => toggleOne(d.id)} /></TableCell>
            <TableCell style={{ padding: '8px 12px' }}>
              {d.jira_source && d.jira_key ? (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', borderRadius: 3, padding: '0 4px', lineHeight: '18px' }}>JIRA</span>
                    {d.external_url ? (
                      <a href={d.external_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#2563EB' }} className="hover:underline" onClick={e => e.stopPropagation()}>{d.jira_key}</a>
                    ) : (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#2563EB' }}>{d.jira_key}</span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B778C' }}>{d.defect_key}</span>
                </div>
              ) : (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#172B4D' }}>{d.defect_key}</span>
              )}
            </TableCell>
            <TableCell style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, color: '#172B4D', fontFamily: 'Inter, sans-serif' }} className="max-w-md truncate">{d.title}</TableCell>
            <TableCell style={{ padding: '8px 12px' }}><SeverityPill severity={d.severity} /></TableCell>
            <TableCell style={{ padding: '8px 12px' }}><PriorityCell priority={d.priority} /></TableCell>
            <TableCell style={{ padding: '8px 12px' }}><StatusPill status={d.status} /></TableCell>
            <TableCell style={{ padding: '8px 12px' }}>
              {d.assignee ? (
                <div className="flex items-center gap-2">
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', backgroundColor: '#DEEBFF', color: '#0747A6',
                    fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    {initials(d.assignee.full_name)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#172B4D', fontFamily: 'Inter, sans-serif' }} className="truncate">{d.assignee.full_name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', backgroundColor: '#F4F5F7', border: '1px solid #DFE1E6',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <UserRound style={{ width: 12, height: 12, color: '#8993A4' }} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#8993A4', fontFamily: 'Inter, sans-serif' }}>Unassigned</span>
                </div>
              )}
            </TableCell>
            <TableCell style={{ padding: '8px 12px', fontSize: 12, fontWeight: 400, color: '#6B778C', fontFamily: 'Inter, sans-serif' }}>{getRelativeAge(d.created_at)}</TableCell>
            <TableCell style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{
                      width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <MoreHorizontal style={{ width: 16, height: 16, color: '#6B778C' }} />
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
        ))}
      </TableBody>
    </Table>
  );
}

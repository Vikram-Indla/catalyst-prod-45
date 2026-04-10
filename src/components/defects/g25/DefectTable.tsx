import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, UserRound, ChevronsUp, ChevronUp, Minus, ChevronDown, Search, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import '@/styles/product-backlog.css';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { Defect } from '@/types/defects';
import { cn } from '@/lib/utils';
import { WorkItemStarButton } from '@/components/shared/WorkItemStarButton';
import { BulkActionBar } from '@/components/producthub/listing/BulkActionBar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EpicIcon, StoryIcon, TaskIcon, BugIcon } from '@/components/boards/WorkItemTypeIcons';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';

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

// ── Avatar colours (deterministic) ──
const AVATAR_COLOURS = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777', '#7C3AED', '#059669', '#D97706'];

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

// ── Status dot color for parent items ──
function getStatusDotColor(statusCategory: string | null): string {
  const cat = (statusCategory || '').toLowerCase();
  if (cat === 'done' || cat === 'closed' || cat === 'resolved') return '#36B37E';
  if (cat === 'in progress' || cat === 'indeterminate' || cat === 'active') return '#0065FF';
  return '#DFE1E6';
}

// ── Work item type icon component ──
function WorkItemIcon({ type, size = 16 }: { type: string; size?: number }) {
  const t = (type || '').toLowerCase();
  if (t.includes('epic')) return <EpicIcon size={size} />;
  if (t.includes('story')) return <StoryIcon size={size} />;
  if (t.includes('bug')) return <BugIcon size={size} />;
  return <TaskIcon size={size} />;
}

// ── Jira-style Parent Picker (two-line layout with canonical icons) ──
function ParentPickerCell({ defectId, currentParentKey, projectKey }: { defectId: string; currentParentKey: string | null; projectKey: string | null }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false);

  const { data: parentOptions = [] } = useQuery({
    queryKey: ['parent-issues-for-defects', projectKey],
    queryFn: async () => {
      let query = (supabase as any)
        .from('ph_issues')
        .select('issue_key, summary, issue_type, status, status_category, jira_updated_at, jira_created_at')
        .in('issue_type', ['Story', 'Epic', 'Feature', 'Task']);
      if (projectKey) {
        query = query.like('issue_key', `${projectKey}-%`);
      }
      const { data } = await query.order('jira_updated_at', { ascending: false }).limit(500);
      return (data || []).map((d: any) => ({
        key: d.issue_key,
        summary: d.summary || '',
        type: (d.issue_type || 'task').toLowerCase(),
        status: d.status || '',
        statusCategory: d.status_category || '',
      }));
    },
    staleTime: 60_000,
  });

  const filtered = parentOptions.filter(opt => {
    if (!showDone) {
      const cat = (opt.statusCategory || '').toLowerCase();
      if (cat === 'done' || cat === 'closed' || cat === 'resolved') return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return opt.key.toLowerCase().includes(q) || opt.summary.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSelect = async (parentKey: string | null) => {
    const { error } = await supabase
      .from('tm_defects')
      .update({ jira_parent_key: parentKey })
      .eq('id', defectId);
    if (error) {
      toast.error('Failed to update parent');
    } else {
      toast.success(parentKey ? `Parent set to ${parentKey}` : 'Parent removed');
    }
    setOpen(false);
    setSearch('');
  };

  const currentParent = currentParentKey ? parentOptions.find(p => p.key === currentParentKey) : null;

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="bg-transparent border-none cursor-pointer p-0 outline-none rounded text-left w-full"
        >
          {currentParentKey ? (
            <div className="flex items-center gap-1.5">
              <WorkItemIcon type={currentParent?.type || 'task'} size={14} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                {currentParentKey}
              </span>
            </div>
          ) : (
            <span className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[420px] p-0 bg-white border border-slate-200 rounded-lg shadow-lg"
        align="start"
        sideOffset={4}
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="border-b border-slate-100">
          <div className="flex items-center px-3 py-2.5 gap-2">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search parent issue..."
              className="flex-1 text-[13px] text-slate-900 placeholder:text-slate-400 bg-transparent outline-none border-none focus:ring-0 focus:outline-none"
              autoFocus
            />
            {currentParentKey && (
              <button
                onClick={e => { e.stopPropagation(); handleSelect(null); }}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0.5 rounded"
                title="Remove parent"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Show done toggle */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
          <Checkbox checked={showDone} onCheckedChange={(v) => setShowDone(!!v)} className="h-3.5 w-3.5" />
          <span className="text-[12px] text-slate-500">Show done work items</span>
        </div>

        {/* Results — Jira two-line style */}
        <div className="max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-slate-400">No matching items</div>
          ) : filtered.map(opt => {
            const isSelected = currentParentKey === opt.key;
            
            return (
              <button
                key={opt.key}
                onClick={() => handleSelect(opt.key)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-none cursor-pointer transition-colors block",
                  isSelected ? "bg-[#DEEBFF]" : "bg-white hover:bg-[#F4F5F7]"
                )}
              >
                <div className="flex items-center gap-2">
                  <WorkItemIcon type={opt.type} size={16} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: '#42526E' }}>
                    {opt.key}
                  </span>
                </div>
                <div className="ml-[24px] mt-0.5">
                  <span className="text-[13px] text-slate-900 font-medium leading-snug line-clamp-1">{opt.summary}</span>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Jira-style Assignee cell with face avatar ──
function AssigneeCell({ defect, nameAvatarMap }: { defect: Defect; nameAvatarMap: Map<string, string> }) {
  const assigneeName = defect.assigneeName || defect.assignee?.full_name;
  if (!assigneeName || assigneeName === 'Unassigned') {
    return (
      <div className="flex items-center gap-2.5">
        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#F1F5F9', border: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UserRound size={14} style={{ color: '#94A3B8' }} />
        </div>
        <span style={{ fontSize: 13, color: '#94A3B8' }}>Unassigned</span>
      </div>
    );
  }
  const avatarUrl = defect.assignee?.avatar_url || nameAvatarMap.get(assigneeName.toLowerCase());
  const ini = assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const clr = AVATAR_COLOURS[ini.charCodeAt(0) % AVATAR_COLOURS.length];
  return (
    <div className="flex items-center gap-2.5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={assigneeName}
          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(15,23,42,0.08)' }}
        />
      ) : (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: clr, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {ini}
        </div>
      )}
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {assigneeName}
      </span>
    </div>
  );
}

// ── Column definitions ──
type ColumnKey = 'SEVERITY' | 'PRIORITY' | 'STATUS' | 'ASSIGNEE' | 'AGE';

// ── Resizable column config for the dynamic portion ──
const DEFECT_COLUMNS: TColDef[] = [
  { key: 'checkbox', label: '', defaultWidth: 40, minWidth: 40, locked: true },
  { key: 'star', label: '', defaultWidth: 28, minWidth: 28, locked: true },
  { key: 'type', label: 'TYPE', defaultWidth: 32, minWidth: 32, locked: true },
  { key: 'key', label: 'KEY', defaultWidth: 140, minWidth: 80 },
  { key: 'title', label: 'TITLE', defaultWidth: 320, minWidth: 150 },
  { key: 'parent', label: 'PARENT', defaultWidth: 120, minWidth: 80 },
  { key: 'severity', label: 'SEVERITY', defaultWidth: 100, minWidth: 70 },
  { key: 'priority', label: 'PRIORITY', defaultWidth: 100, minWidth: 70 },
  { key: 'status', label: 'STATUS', defaultWidth: 130, minWidth: 80 },
  { key: 'assignee', label: 'ASSIGNEE', defaultWidth: 170, minWidth: 100 },
  { key: 'age', label: 'AGE', defaultWidth: 90, minWidth: 60 },
  { key: 'actions', label: '', defaultWidth: 40, minWidth: 40, locked: true },
];

const COL_KEY_MAP: Record<string, ColumnKey | null> = {
  severity: 'SEVERITY', priority: 'PRIORITY', status: 'STATUS', assignee: 'ASSIGNEE', age: 'AGE',
};

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
  const nameAvatarMap = useProfileAvatarsByName();
  const {
    orderedColumns, columnWidths, dragKey, dragOverKey,
    onResizeStart, onDragStart, onDragOver, onDragEnd,
  } = useTableColumns('defects', DEFECT_COLUMNS);

  // Filter out hidden optional columns
  const visibleOrderedCols = orderedColumns.filter(c => {
    const mappedKey = COL_KEY_MAP[c.key];
    if (mappedKey && !cols.has(mappedKey)) return false;
    return true;
  });

  const toggleAll = () => {
    onSelectionChange(selectedIds.size === defects.length ? new Set() : new Set(defects.map(d => d.id)));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    onSelectionChange(s);
  };

  const handleBulkAction = (action: string) => {
    toast.info(`${action} action for ${selectedIds.size} items — coming soon`);
  };

  // Cell renderer map
  const renderCell = (colKey: string, d: Defect, isSelected: boolean) => {
    const keyText = d.displayKey || d.defect_key;
    const isJira = d.isJiraSource ?? d.jira_source;
    switch (colKey) {
      case 'checkbox':
        return <td key={colKey} style={{ width: columnWidths.checkbox, textAlign: 'center' }} onClick={e => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={() => toggleOne(d.id)} /></td>;
      case 'star':
        return <td key={colKey} style={{ width: columnWidths.star, textAlign: 'center' }} onClick={e => e.stopPropagation()}><WorkItemStarButton itemId={d.id} itemType="defect" size="sm" showTooltip={false} alwaysVisibleWhenStarred /></td>;
      case 'type':
        return <td key={colKey} style={{ width: columnWidths.type, textAlign: 'center' }}><BugTypeIcon /></td>;
      case 'key':
        return (
          <td key={colKey} style={{ width: columnWidths.key }}>
            <div className="flex items-center gap-1">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#2563EB' }}>{keyText}</span>
              {isJira && <JiraBadge />}
              {isJira && d.external_url && (
                <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ marginLeft: 2, padding: 2, borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Open in Jira" onClick={e => { e.stopPropagation(); window.open(d.external_url!, '_blank'); }}>
                  <ExternalLink size={13} style={{ color: '#94A3B8' }} />
                </button>
              )}
            </div>
          </td>
        );
      case 'title':
        return <td key={colKey} style={{ fontWeight: 500, width: columnWidths.title }}>{d.title}</td>;
      case 'parent':
        return <td key={colKey} style={{ width: columnWidths.parent }} onClick={e => e.stopPropagation()}><ParentPickerCell defectId={d.id} currentParentKey={d.parent_key || null} projectKey={d.jira_project_key || null} /></td>;
      case 'severity':
        return <td key={colKey} style={{ width: columnWidths.severity }}><SeverityPill severity={d.severity} /></td>;
      case 'priority':
        return <td key={colKey} style={{ width: columnWidths.priority }}><PriorityCell priority={d.priority} /></td>;
      case 'status':
        return <td key={colKey} style={{ width: columnWidths.status }}><StatusBadge status={d.status} /></td>;
      case 'assignee':
        return <td key={colKey} style={{ width: columnWidths.assignee }}><AssigneeCell defect={d} nameAvatarMap={nameAvatarMap} /></td>;
      case 'age':
        return <td key={colKey} style={{ fontSize: 12, color: '#64748B', width: columnWidths.age }}>{getRelativeAge(d.created_at)}</td>;
      case 'actions':
        return (
          <td key={colKey} style={{ width: columnWidths.actions }} onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="pb-row-actions opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ height: 28, width: 28, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <MoreHorizontal size={16} style={{ color: '#64748B' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/testhub/defects/${d.id}`)}>View Details</DropdownMenuItem>
                {d.external_url && <DropdownMenuItem onClick={() => window.open(d.external_url!, '_blank')}><ExternalLink className="h-4 w-4 mr-2" />Open External</DropdownMenuItem>}
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(d)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        );
      default:
        return <td key={colKey} />;
    }
  };

  return (
    <div className="flex flex-col">
      <BulkActionBar selectedCount={selectedIds.size} onAction={handleBulkAction} onCancel={() => onSelectionChange(new Set())} />
      <div style={{ overflowX: 'auto' }}>
        <table className="pb-table" style={{ minWidth: 1200, tableLayout: 'fixed' }}>
          <colgroup>
            {visibleOrderedCols.map(c => (
              <col key={c.key} style={{ width: columnWidths[c.key] || c.defaultWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr className="group/thead">
              {visibleOrderedCols.map(c => {
                if (c.key === 'checkbox') {
                  return <th key={c.key} style={{ width: columnWidths.checkbox, textAlign: 'center' }}><Checkbox checked={defects.length > 0 && selectedIds.size === defects.length} onCheckedChange={toggleAll} /></th>;
                }
                return (
                  <ResizableTableHeader
                    key={c.key}
                    colKey={c.key}
                    label={c.label}
                    width={columnWidths[c.key] || c.defaultWidth}
                    locked={c.locked}
                    isDragging={dragKey === c.key}
                    isDragOver={dragOverKey === c.key}
                    onResizeStart={onResizeStart}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {defects.map(d => {
              const isSelected = selectedIds.has(d.id);
              return (
                <tr key={d.id} className={cn('group', isSelected && 'pb-row-selected')} style={{ cursor: 'pointer' }} onClick={() => navigate(`/testhub/defects/${d.id}`)}>
                  {visibleOrderedCols.map(c => renderCell(c.key, d, isSelected))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

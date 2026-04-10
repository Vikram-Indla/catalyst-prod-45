import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, UserRound, ChevronsUp, ChevronUp, Minus, ChevronDown, Search, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import '@/styles/product-backlog.css';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { Defect } from '@/types/defects';
import { cn } from '@/lib/utils';
import { WorkItemStarButton } from '@/components/shared/WorkItemStarButton';
import { BulkActionBar } from '@/components/producthub/listing/BulkActionBar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// ── Avatar colours (matching /for-you 5-color palette) ──
const AVATAR_COLOURS = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'];

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

// ── Work item type icons for parent picker ──
const PARENT_TYPE_ICONS: Record<string, { color: string; label: string }> = {
  story:   { color: '#36B37E', label: 'Story' },
  epic:    { color: '#6554C0', label: 'Epic' },
  feature: { color: '#2684FF', label: 'Feature' },
  task:    { color: '#4BADE8', label: 'Task' },
};

// ── Inline Parent Picker ──
function ParentPickerCell({ defectId, currentParentKey }: { defectId: string; currentParentKey: string | null }) {
  const [open, setOpen] = useState(false);

  // Fetch potential parent issues (stories, epics, features)
  const { data: parentOptions = [] } = useQuery({
    queryKey: ['parent-issues-for-defects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type')
        .in('issue_type', ['Story', 'Epic', 'Feature', 'Task', 'Bug'])
        .order('issue_key', { ascending: false })
        .limit(200);
      return (data || []).map(d => ({
        key: d.issue_key,
        summary: d.summary || '',
        type: (d.issue_type || 'task').toLowerCase(),
      }));
    },
    staleTime: 60_000,
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
  };

  const typeInfo = currentParentKey
    ? parentOptions.find(p => p.key === currentParentKey)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="bg-transparent border-none cursor-pointer p-0 outline-none rounded text-left w-full"
        >
          {currentParentKey ? (
            <div className="flex items-center gap-1.5">
              <span style={{
                width: 14, height: 14, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: PARENT_TYPE_ICONS[typeInfo?.type || 'task']?.color || '#4BADE8',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 8, color: '#FFFFFF', fontWeight: 700 }}>
                  {(typeInfo?.type || 'T')[0].toUpperCase()}
                </span>
              </span>
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
        className="w-[360px] p-0 bg-white border border-slate-900/[0.12] rounded-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]"
        align="start"
        sideOffset={4}
        onClick={e => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Search parent issue..." className="h-8 text-[13px]" />
          <CommandList className="max-h-[240px]">
            <CommandEmpty className="py-3 text-center text-[13px] text-slate-500">No results</CommandEmpty>
            {/* Clear parent */}
            {currentParentKey && (
              <CommandItem
                value="__clear__"
                onSelect={() => handleSelect(null)}
                className="h-8 px-3 text-[13px] text-slate-500 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3.5 flex-shrink-0" />
                  Remove parent
                </div>
              </CommandItem>
            )}
            {parentOptions.map(opt => {
              const isSelected = currentParentKey === opt.key;
              const ti = PARENT_TYPE_ICONS[opt.type] || PARENT_TYPE_ICONS.task;
              return (
                <CommandItem
                  key={opt.key}
                  value={`${opt.key} ${opt.summary}`}
                  onSelect={() => handleSelect(opt.key)}
                  className="h-9 px-3 text-[13px] text-slate-900 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full min-w-0">
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 flex-shrink-0" />
                    )}
                    <span style={{
                      width: 14, height: 14, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: ti?.color || '#4BADE8',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 8, color: '#FFFFFF', fontWeight: 700 }}>
                        {opt.type[0].toUpperCase()}
                      </span>
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#42526E', flexShrink: 0 }}>
                      {opt.key}
                    </span>
                    <span className="truncate text-[12px] text-slate-600">{opt.summary}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  const nameAvatarMap = useProfileAvatarsByName();

  const toggleAll = () => {
    onSelectionChange(selectedIds.size === defects.length ? new Set() : new Set(defects.map(d => d.id)));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    onSelectionChange(s);
  };
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleBulkAction = (action: string) => {
    toast.info(`${action} action for ${selectedIds.size} items — coming soon`);
  };

  return (
    <div className="flex flex-col">
      {/* Bulk action bar — appears when items selected */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onAction={handleBulkAction}
        onCancel={() => onSelectionChange(new Set())}
      />

      <div style={{ overflowX: 'auto' }}>
        <table className="pb-table" style={{ minWidth: 1200 }}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 28 }} />
            <col style={{ width: 32 }} />
            <col style={{ width: 140 }} />
            <col />
            <col style={{ width: 120 }} />
            {cols.has('SEVERITY') && <col style={{ width: 100 }} />}
            {cols.has('PRIORITY') && <col style={{ width: 100 }} />}
            {cols.has('STATUS') && <col style={{ width: 130 }} />}
            {cols.has('ASSIGNEE') && <col style={{ width: 170 }} />}
            {cols.has('AGE') && <col style={{ width: 90 }} />}
            <col style={{ width: 40 }} />
          </colgroup>

          <thead>
            <tr>
              <th><Checkbox checked={defects.length > 0 && selectedIds.size === defects.length} onCheckedChange={toggleAll} /></th>
              <th>{/* Star */}</th>
              <th>TYPE</th>
              <th>KEY</th>
              <th>TITLE</th>
              <th>PARENT</th>
              {cols.has('SEVERITY') && <th>SEVERITY</th>}
              {cols.has('PRIORITY') && <th>PRIORITY</th>}
              {cols.has('STATUS') && <th>STATUS</th>}
              {cols.has('ASSIGNEE') && <th>ASSIGNEE</th>}
              {cols.has('AGE') && <th>AGE</th>}
              <th />
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
                  className={cn('group', isSelected && 'pb-row-selected')}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/testhub/defects/${d.id}`)}
                >
                  {/* Checkbox */}
                  <td onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(d.id)} />
                  </td>

                  {/* Star */}
                  <td onClick={e => e.stopPropagation()}>
                    <WorkItemStarButton
                      itemId={d.id}
                      itemType="defect"
                      size="sm"
                      showTooltip={false}
                      alwaysVisibleWhenStarred
                    />
                  </td>

                  {/* Type icon */}
                  <td><BugTypeIcon /></td>

                  {/* Key */}
                  <td>
                    <div className="flex items-center gap-1">
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#2563EB' }}>
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
                  <td style={{ fontWeight: 500 }}>{d.title}</td>

                  {/* Parent — inline editable */}
                  <td onClick={e => e.stopPropagation()}>
                    <ParentPickerCell defectId={d.id} currentParentKey={d.parent_key || null} />
                  </td>

                  {/* Severity */}
                  {cols.has('SEVERITY') && <td><SeverityPill severity={d.severity} /></td>}

                  {/* Priority */}
                  {cols.has('PRIORITY') && <td><PriorityCell priority={d.priority} /></td>}

                  {/* Status */}
                  {cols.has('STATUS') && <td><StatusBadge status={d.status} /></td>}

                  {/* Assignee — matching /for-you avatar pattern */}
                  {cols.has('ASSIGNEE') && (
                    <td>
                      {(() => {
                        const assigneeName = d.assigneeName || d.assignee?.full_name;
                        if (!assigneeName || assigneeName === 'Unassigned') {
                          return (
                            <div className="flex items-center gap-2">
                              <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#F1F5F9', border: '1px solid rgba(15,23,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <UserRound size={12} style={{ color: '#94A3B8' }} />
                              </div>
                              <span style={{ fontSize: 13, color: '#94A3B8' }}>Unassigned</span>
                            </div>
                          );
                        }
                        const avatarUrl = d.assignee?.avatar_url || nameAvatarMap.get(assigneeName.toLowerCase());
                        const ini = initials(assigneeName);
                        const clr = AVATAR_COLOURS[ini.charCodeAt(0) % AVATAR_COLOURS.length];
                        return (
                          <div className="flex items-center gap-2">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={assigneeName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(15,23,42,0.12)' }} />
                            ) : (
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: clr, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                            )}
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {assigneeName}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                  )}

                  {/* Age */}
                  {cols.has('AGE') && (
                    <td style={{ fontSize: 12, color: '#64748B' }}>
                      {getRelativeAge(d.created_at)}
                    </td>
                  )}

                  {/* Actions */}
                  <td onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="pb-row-actions opacity-0 group-hover:opacity-100 transition-opacity duration-150"
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
    </div>
  );
}

/**
 * ViewTestCaseModal — V15 Rebuild (StoryDetailModal parity)
 * Two-column layout: scrollable left panel + right sidebar (280px)
 * Ghost header, accordion sections, no tabs.
 * Sidebar fields are inline-editable (Status, Priority, Assigned To, Owner, Type).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Edit2, Copy, ClipboardList, Paperclip, Link2, History, Play, Plus, Trash2, Bug, BookOpen, MessageSquare, Search, Loader2, GitBranch, ChevronRight, FileText, Settings2, Share2, MoreHorizontal, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';
import { EntityCommentsPanel } from '@/components/testhub/EntityCommentsPanel';
import { EntityAttachmentsPanel } from '@/components/testhub/EntityAttachmentsPanel';
import { formatDistanceToNow, format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TestCase {
  id: string;
  case_key: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  folder_id: string | null;
  priority_id: string | null;
  case_type_id: string | null;
  status: string;
  version: number;
  updated_at: string;
  created_at?: string;
  project_id?: string;
  automation_status?: string | null;
  test_format?: string | null;
}

interface Step {
  id: string;
  step_number: number;
  action: string;
  expected_result: string | null;
}

interface Link {
  id: string;
  link_type: string;
  linked_item_key: string;
  linked_item_title: string;
  _source: 'tm_requirement_tests' | 'tm_test_case_links' | 'tm_defect_links';
}

interface VersionHistory {
  id: string;
  version: number;
  changes: any;
  changed_at: string;
}

interface Execution {
  id: string;
  result: string;
  executed_at: string;
  tm_cycle_scope?: {
    id: string;
    tm_test_cycles?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface ViewTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCase: TestCase | null;
  onEdit: () => void;
  onClone: () => void;
}

// --- LINK TYPE CONFIG ---
type LinkTypeConfig = {
  value: string;
  label: string;
  icon: React.ElementType;
  table: string;
  keyField: string;
  nameField: string;
  searchFields: string[];
};

const LINK_TYPE_OPTIONS: LinkTypeConfig[] = [
  { value: 'requirement', label: 'Requirement', icon: GitBranch, table: 'tm_requirements', keyField: 'req_key',    nameField: 'title', searchFields: ['title', 'req_key'] },
  { value: 'defect',      label: 'Defect',      icon: Bug,       table: 'tm_defects',      keyField: 'defect_key', nameField: 'title', searchFields: ['title', 'defect_key'] },
  { value: 'story',       label: 'Story',       icon: BookOpen,  table: 'ph_issues',       keyField: 'issue_key',  nameField: 'summary', searchFields: ['summary', 'issue_key'] },
];

type SearchResult = { id: string; key: string; name: string };

// --- ANIMATIONS ---
const ANIM_STYLE_ID = 'vtcm-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes sdm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes sdm-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes vtcm-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

// --- STATUS BUTTON COLORS (full-width, matching WorkItemDetailModal sidebar) ---
const STATUS_BTN: Record<string, string> = {
  draft:      '#44546F',
  ready:      '#1B7F37',
  approved:   '#0C66E4',
  deprecated: '#44546F',
};

// --- STATUS PILL COLORS (kept for inline lozenge usage in dropdowns) ---
const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  draft:      { bg: '#DFE1E6', color: '#253858' },
  ready:      { bg: '#E3FCEF', color: '#006644' },
  approved:   { bg: '#DEEBFF', color: '#0747A6' },
  deprecated: { bg: '#DFE1E6', color: '#253858' },
};

// --- RESULT LOZENGE (3-colour guardrail) ---
const RESULT_LOZENGE: Record<string, { bg: string; color: string }> = {
  passed:  { bg: '#E3FCEF', color: '#006644' },
  failed:  { bg: '#FFEBE6', color: '#BF2600' },
  blocked: { bg: '#DFE1E6', color: '#253858' },
  skipped: { bg: '#DFE1E6', color: '#253858' },
};

// ═══════════════════════════════════════
// ACCORDION SECTION (CollapsibleSection parity)
// ═══════════════════════════════════════
function AccordionSection({
  label, count, defaultExpanded = false, children,
}: {
  label: string;
  count?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', textAlign: 'left', padding: '6px 0',
          border: 'none', background: 'transparent', cursor: 'pointer',
        }}
      >
        <ChevronRight
          style={{
            width: 14, height: 14, color: 'var(--fg-4)',
            flexShrink: 0,
            transition: 'transform 150ms ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', flex: 1 }}>{label}</span>
        {count != null && count > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            height: 18, minWidth: 18, padding: '0 6px', borderRadius: 9,
            fontSize: 10, fontWeight: 600,
            background: 'var(--cp-bd-zone)', color: 'var(--fg-3)',
          }}>{count}</span>
        )}
      </button>
      {expanded && (
        <div style={{ marginTop: 6 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ADD LINK MODAL (preserved exactly)
// ═══════════════════════════════════════
function AddLinkModal({
  isOpen,
  onClose,
  linkType: initialLinkType,
  projectId,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  linkType: 'requirement' | 'defect' | 'story';
  projectId?: string;
  onAdd: (item: SearchResult, linkType: string) => void;
}) {
  const [linkType, setLinkType] = useState(initialLinkType);
  const [search, setSearch] = useState('');

  useEffect(() => { if (isOpen) { setLinkType(initialLinkType); setSearch(''); } }, [isOpen, initialLinkType]);

  const config = LINK_TYPE_OPTIONS.find(o => o.value === linkType)!;

  const { data: results, isLoading } = useQuery({
    queryKey: ['tc-add-link-search', linkType, search, projectId],
    queryFn: async () => {
      let query = (supabase as any)
        .from(config.table)
        .select(`id, ${config.keyField}, ${config.nameField}`)
        .order(config.nameField, { ascending: true })
        .limit(20);

      if (search) {
        const orClause = config.searchFields.map(f => `${f}.ilike.%${search}%`).join(',');
        query = query.or(orClause);
      }

      if (projectId && ['tm_requirements', 'tm_defects'].includes(config.table)) {
        query = query.eq('project_id', projectId);
      }

      const { data } = await query;
      return ((data || []) as any[]).map(row => ({
        id: row.id,
        key: row[config.keyField] || '',
        name: row[config.nameField] || '',
      })) as SearchResult[];
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const Icon = config.icon;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '95vw', maxHeight: '80vh', backgroundColor: 'var(--cp-float)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>Add Link</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 6 }}>
            {LINK_TYPE_OPTIONS.map(opt => {
              const active = linkType === opt.value;
              return (
                <button key={opt.value} onClick={() => { setLinkType(opt.value as any); setSearch(''); }}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    border: active ? 'none' : '1px solid var(--divider)',
                    background: active ? 'var(--cp-blue)' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--fg-2)',
                  }}>
                  <opt.icon style={{ width: 14, height: 14 }} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--fg-4)' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}s...`}
              style={{ width: '100%', height: 40, padding: '8px 12px 8px 36px', fontSize: 14, fontFamily: "'Inter', sans-serif", border: '1.5px solid var(--divider)', borderRadius: 8, outline: 'none', boxSizing: 'border-box', background: 'var(--cp-float)', color: 'var(--fg-1)' }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px', maxHeight: 320 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <Loader2 style={{ width: 20, height: 20, animation: 'vtcm-spin 1s linear infinite', color: 'var(--fg-4)' }} />
            </div>
          ) : !results?.length ? (
            <p style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--fg-4)' }}>
              No {config.label.toLowerCase()}s found
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {results.map(item => (
                <button key={item.id} onClick={() => { onAdd(item, linkType); onClose(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Icon style={{ width: 16, height: 16, color: 'var(--fg-4)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)' }}>{item.key}</span>
                    {item.name !== item.key && (
                      <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--divider)' }}>
          <button onClick={onClose} style={{ height: 36, padding: '0 16px', backgroundColor: 'transparent', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--fg-3)', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// LINK ACCORDION SECTION (preserved exactly)
// ═══════════════════════════════════════
function LinkAccordionSection({
  label,
  icon: Icon,
  links,
  onAdd,
  onDelete,
}: {
  label: string;
  icon: React.ElementType;
  links: Link[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(links.length > 0);

  useEffect(() => {
    if (links.length > 0) setExpanded(true);
  }, [links.length]);

  return (
    <div style={{ borderRadius: 4, border: '0.75px solid var(--divider)', overflow: 'hidden' }}>
      {/* Section header */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
          background: 'var(--bg-1)', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <ChevronRight
          style={{
            width: 14, height: 14, color: 'var(--fg-4)', flexShrink: 0,
            transition: 'transform 150ms ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <Icon style={{ width: 14, height: 14, color: 'var(--fg-3)', flexShrink: 0 }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', flex: 1 }}>{label}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          height: 20, minWidth: 20, padding: '0 6px', borderRadius: 3,
          fontSize: 11, fontWeight: 700, background: '#DFE1E6', color: '#253858',
        }}>{links.length}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)',
            display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px',
          }}
        >
          <Plus style={{ width: 12, height: 12 }} /> Add
        </button>
      </div>

      {expanded && links.length > 0 && (
        <div>
          {links.map(link => (
            <div
              key={link.id}
              className="group"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 12px 0 36px',
                borderTop: '0.75px solid var(--divider)',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: 'var(--cp-blue)' }}>
                {link.linked_item_key}
              </span>
              <span style={{
                flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--fg-1)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {link.linked_item_title}
              </span>
              <button
                onClick={() => onDelete(link.id)}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', padding: 2,
                  color: 'var(--fg-4)', opacity: 0, transition: 'opacity 120ms',
                }}
                className="group-hover:!opacity-100"
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {expanded && links.length === 0 && (
        <div style={{ padding: '12px 36px', borderTop: '0.75px solid var(--divider)' }}>
          <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>No {label.toLowerCase()} linked</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export function ViewTestCaseModal({
  isOpen,
  onClose,
  testCase,
  onEdit,
  onClone,
}: ViewTestCaseModalProps) {
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState<Step[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [history, setHistory] = useState<VersionHistory[]>([]);
  const [runs, setRuns] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);

  // Editable sidebar state (local copies that update optimistically)
  const [localStatus, setLocalStatus] = useState(testCase?.status || 'draft');
  const [localPriorityId, setLocalPriorityId] = useState(testCase?.priority_id || null);
  const [localTypeId, setLocalTypeId] = useState(testCase?.case_type_id || null);
  const [localOwnerId, setLocalOwnerId] = useState<string | null>((testCase as any)?.created_by || null);
  const [localAssigneeId, setLocalAssigneeId] = useState<string | null>((testCase as any)?.assigned_to || null);

  // Resolved FK display names
  const [priorityName, setPriorityName] = useState<string>('—');
  const [typeName, setTypeName] = useState<string>('—');
  const [ownerName, setOwnerName] = useState<string>('—');
  const [assigneeName, setAssigneeName] = useState<string>('—');

  // Dropdown open state
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [addLinkType, setAddLinkType] = useState<'requirement' | 'defect' | 'story'>('requirement');

  // Lookup data for pickers
  const { data: priorities } = useQuery({
    queryKey: ['tm-case-priorities'],
    queryFn: async () => {
      const { data } = await typedQuery('tm_case_priorities').select('id, name').order('sort_order');
      return (data || []) as { id: string; name: string }[];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: caseTypes } = useQuery({
    queryKey: ['tm-case-types'],
    queryFn: async () => {
      const { data } = await typedQuery('tm_case_types').select('id, name').order('sort_order');
      return (data || []) as { id: string; name: string }[];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['tm-team-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return (data || []) as { id: string; full_name: string | null }[];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Sync local state when testCase changes
  useEffect(() => {
    if (testCase) {
      setLocalStatus(testCase.status);
      setLocalPriorityId(testCase.priority_id || null);
      setLocalTypeId(testCase.case_type_id || null);
      setLocalOwnerId((testCase as any)?.created_by || null);
      setLocalAssigneeId((testCase as any)?.assigned_to || null);
    }
  }, [testCase?.id]);

  // Close picker on outside mousedown (delayed to avoid race with same-click open)
  useEffect(() => {
    if (!openPicker) return;
    const handler = (e: MouseEvent) => {
      // Check if click is inside a picker dropdown
      const target = e.target as HTMLElement;
      if (target.closest('[data-picker-dropdown]')) return;
      setOpenPicker(null);
    };
    // Delay to next tick to avoid closing on the same click that opened
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [openPicker]);

  // Silent auto-save helper
  const updateField = useCallback(async (field: string, value: any) => {
    if (!testCase) return;
    const { error } = await typedQuery('tm_test_cases').update({ [field]: value }).eq('id', testCase.id);
    if (error) {
      console.error(`Failed to update ${field}:`, error);
      toast.error(`Failed to update ${field}`);
      return;
    }
    // Invalidate queries for refresh
    queryClient.invalidateQueries({ queryKey: ['tm-cases'] });
    queryClient.invalidateQueries({ queryKey: ['tm-case', testCase.id] });
  }, [testCase, queryClient]);

  useEffect(() => {
    if (isOpen && testCase) {
      fetchRelatedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, testCase?.id]);

  const fetchRelatedData = async () => {
    if (!testCase) return;
    setLoading(true);

    // Resolve FK display names (priority, type, owner, assignee) in parallel
    const fkPromises: Promise<void>[] = [];
    setPriorityName('—');
    setTypeName('—');
    setOwnerName('—');
    setAssigneeName('—');

    if (testCase.priority_id) {
      fkPromises.push(
        typedQuery('tm_case_priorities').select('name').eq('id', testCase.priority_id).maybeSingle()
          .then(({ data }: any) => { if (data?.name) setPriorityName(data.name); })
      );
    }
    if (testCase.case_type_id) {
      fkPromises.push(
        typedQuery('tm_case_types').select('name').eq('id', testCase.case_type_id).maybeSingle()
          .then(({ data }: any) => { if (data?.name) setTypeName(data.name); })
      );
    }
    const ownerId = (testCase as any).created_by;
    if (ownerId) {
      fkPromises.push(
        Promise.resolve(supabase.from('profiles').select('full_name').eq('id', ownerId).maybeSingle())
          .then(({ data }) => { if (data?.full_name) setOwnerName(data.full_name); })
      );
    }
    const assigneeId = (testCase as any).assigned_to;
    if (assigneeId && assigneeId !== ownerId) {
      fkPromises.push(
        Promise.resolve(supabase.from('profiles').select('full_name').eq('id', assigneeId).maybeSingle())
          .then(({ data }) => { if (data?.full_name) setAssigneeName(data.full_name); })
      );
    } else if (assigneeId && assigneeId === ownerId) {
      fkPromises.push(
        Promise.resolve(supabase.from('profiles').select('full_name').eq('id', assigneeId).maybeSingle())
          .then(({ data }) => { if (data?.full_name) setAssigneeName(data.full_name); })
      );
    }

    // Fire FK lookups (don't block main data)
    Promise.all(fkPromises).catch(() => {});

    try {
      const [stepsRes, reqLinksRes, storyLinksRes, defectLinksRes, historyRes, runsRes] = await Promise.allSettled([
        supabase.from('tm_test_steps').select('*').eq('test_case_id', testCase.id).order('step_number'),
        typedQuery('tm_requirement_tests').select('id, requirement_id').eq('test_case_id', testCase.id),
        typedQuery('tm_test_case_links').select('*').eq('test_case_id', testCase.id).eq('linked_item_type', 'story'),
        typedQuery('tm_defect_links').select('*, tm_defects!defect_id(defect_key)').eq('link_type', 'test_case').eq('linked_id', testCase.id),
        typedQuery('tm_test_case_versions').select('*').eq('test_case_id', testCase.id).order('version_number', { ascending: false }),
        typedQuery('th_test_executions').select(`*, tm_cycle_scope!cycle_scope_id(id, tm_test_cycles!test_cycle_id(id, name))`).eq('test_case_id', testCase.id).order('executed_at', { ascending: false }),
      ]);

      const stepsData = stepsRes.status === 'fulfilled' ? stepsRes.value.data || [] : [];
      const rawReqLinks = reqLinksRes.status === 'fulfilled' ? (reqLinksRes.value.data || []) as any[] : [];
      const rawStoryLinks = storyLinksRes.status === 'fulfilled' ? (storyLinksRes.value.data || []) as any[] : [];
      const defectLinksRaw = defectLinksRes.status === 'fulfilled' ? defectLinksRes.value.data || [] : [];
      const historyRaw = historyRes.status === 'fulfilled' ? historyRes.value.data || [] : [];
      const runsData = runsRes.status === 'fulfilled' ? runsRes.value.data || [] : [];

      setSteps(stepsData);

      const requirementLinks: Link[] = await Promise.all(
        rawReqLinks.map(async (l: any) => {
          let key = l.requirement_id || '';
          let title = '';
          const { data: req } = await typedQuery('tm_requirements').select('req_key, title').eq('id', l.requirement_id).maybeSingle();
          if (req) { key = req.req_key; title = req.title; }
          return {
            id: l.id,
            link_type: 'requirement',
            linked_item_key: key,
            linked_item_title: title,
            _source: 'tm_requirement_tests' as const,
          };
        })
      );

      const storyLinksResolved: Link[] = await Promise.all(
        rawStoryLinks.map(async (l: any) => {
          let key = l.linked_item_id || '';
          let title = '';
          const { data: issue } = await typedQuery('ph_issues').select('issue_key, summary').eq('id', l.linked_item_id).maybeSingle();
          if (issue) { key = issue.issue_key; title = issue.summary; }
          return {
            id: l.id,
            link_type: 'story',
            linked_item_key: key,
            linked_item_title: title,
            _source: 'tm_test_case_links' as const,
          };
        })
      );

      const defectLinksData: Link[] = (defectLinksRaw as any[]).map((l: any) => {
        const defectKey = l.tm_defects?.defect_key || '';
        const label = l.entity_label || 'Defect';
        const titlePart = label.includes(' — ') ? label.split(' — ').slice(1).join(' — ') : label;
        return {
          id: l.id,
          link_type: 'defect',
          linked_item_key: defectKey,
          linked_item_title: titlePart,
          _source: 'tm_defect_links' as const,
        };
      });

      setLinks([...requirementLinks, ...storyLinksResolved, ...defectLinksData]);

      const historyData = (historyRaw as any[]).map((v: any) => ({
        id: v.id,
        version: v.version_number,
        changes: v.change_summary || v.snapshot,
        changed_at: v.created_at,
      }));
      setHistory(historyData);
      setRuns(runsData as any[]);
    } catch (err) {
      console.error('Error fetching related data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (item: SearchResult, selectedLinkType: string) => {
    if (!testCase) return;
    const { data: { user } } = await supabase.auth.getUser();
    const entityLabel = item.key !== item.name ? `${item.key} — ${item.name}` : item.name;

    if (selectedLinkType === 'defect') {
      const { data, error } = await typedQuery('tm_defect_links').insert({
        defect_id: item.id,
        link_type: 'test_case',
        linked_id: testCase.id,
        entity_label: entityLabel,
        link_source: 'manual',
        created_by: user?.id || null,
      }).select().single();
      if (!error && data) {
        setLinks([...links, {
          id: data.id,
          link_type: 'defect',
          linked_item_key: item.key,
          linked_item_title: item.name,
          _source: 'tm_defect_links',
        }]);
      }
    } else if (selectedLinkType === 'requirement') {
      const { data, error } = await typedQuery('tm_requirement_tests').insert({
        test_case_id: testCase.id,
        requirement_id: item.id,
        created_by: user?.id || null,
      }).select().single();
      if (!error && data) {
        setLinks([...links, {
          id: data.id,
          link_type: 'requirement',
          linked_item_key: item.key,
          linked_item_title: item.name,
          _source: 'tm_requirement_tests',
        }]);
      }
    } else {
      const { data, error } = await typedQuery('tm_test_case_links').insert({
        test_case_id: testCase.id,
        linked_item_type: selectedLinkType,
        linked_item_id: item.id,
        linked_by: user?.id || null,
      }).select().single();
      if (!error && data) {
        setLinks([...links, {
          id: data.id,
          link_type: selectedLinkType,
          linked_item_key: item.key,
          linked_item_title: item.name,
          _source: 'tm_test_case_links',
        }]);
      }
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;

    if (link._source === 'tm_defect_links') {
      await typedQuery('tm_defect_links').delete().eq('id', linkId);
    } else if (link._source === 'tm_requirement_tests') {
      await typedQuery('tm_requirement_tests').delete().eq('id', linkId);
    } else {
      await typedQuery('tm_test_case_links').delete().eq('id', linkId);
    }
    setLinks(links.filter(l => l.id !== linkId));
  };

  if (!isOpen || !testCase) return null;

  const requirementLinks = links.filter(l => l.link_type === 'requirement');
  const defectLinks = links.filter(l => l.link_type === 'defect');
  const storyLinks = links.filter(l => l.link_type === 'story');

  const statusPill = STATUS_PILL[localStatus] || STATUS_PILL.draft;
  const statusBtnBg = STATUS_BTN[localStatus] || STATUS_BTN.draft;

  // Resolved display names from lookup data
  const resolvedPriorityName = priorities?.find(p => p.id === localPriorityId)?.name || priorityName;
  const resolvedTypeName = caseTypes?.find(t => t.id === localTypeId)?.name || typeName;
  const resolvedOwnerName = teamMembers?.find(m => m.id === localOwnerId)?.full_name || ownerName;
  const resolvedAssigneeName = teamMembers?.find(m => m.id === localAssigneeId)?.full_name || assigneeName;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(testCase.case_key);
    toast.success(`Copied ${testCase.case_key}`);
  };

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(9,30,66,0.54)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        animation: 'sdm-overlay-in 200ms ease',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 960, maxWidth: '95vw',
          maxHeight: '90vh',
          backgroundColor: 'var(--cp-float)',
          borderRadius: 12,
          boxShadow: '0 0 0 1px rgba(9,30,66,0.08), 0 2px 1px rgba(9,30,66,0.08), 0 0 20px -6px rgba(9,30,66,0.31)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'sdm-card-in 250ms ease',
        }}
      >
        {/* ── HEADER (52px, border-bottom — WorkItemDetailModal parity) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 52, flexShrink: 0,
          borderBottom: '1px solid var(--divider)',
        }}>
          {/* Left: type icon + case_key */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <ClipboardList style={{ width: 18, height: 18, color: 'var(--cp-blue)', flexShrink: 0 }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, fontWeight: 500, color: 'var(--fg-3)',
            }}>
              {testCase.case_key}
            </span>
          </div>
          {/* Right: ghost action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HeaderBtn title="Edit" onClick={onEdit}><Edit2 style={{ width: 15, height: 15 }} /></HeaderBtn>
            <HeaderBtn title="Copy key" onClick={handleCopyKey}><Copy style={{ width: 15, height: 15 }} /></HeaderBtn>
            <HeaderBtn title="Clone" onClick={onClone}><Share2 style={{ width: 15, height: 15 }} /></HeaderBtn>
            <HeaderBtn title="More"><MoreHorizontal style={{ width: 15, height: 15 }} /></HeaderBtn>
            <HeaderBtn title="Close" onClick={onClose} close><X style={{ width: 16, height: 16 }} /></HeaderBtn>
          </div>
        </div>

        {/* ── BODY: flex-row ── */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* ── LEFT PANEL ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 80px', minWidth: 0 }}>

            {/* Title */}
            <div style={{ padding: '20px 0 8px' }}>
              <h2
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 22, fontWeight: 600, color: 'var(--fg-1)',
                  margin: 0, lineHeight: '30px',
                  padding: '2px 4px',
                  borderRadius: 4,
                  border: '2px solid transparent',
                  transition: 'border-color 150ms',
                  cursor: 'text',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--divider)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
              >
                {testCase.title}
              </h2>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Loader2 style={{ width: 24, height: 24, animation: 'vtcm-spin 1s linear infinite', color: 'var(--fg-3)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* a. KEY DETAILS */}
                <AccordionSection label="Key Details" defaultExpanded={false}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                    {[
                      { label: 'Automation Status', value: testCase.automation_status || '—' },
                      { label: 'Test Format', value: (() => {
                        const fmt = testCase.test_format || 'classic';
                        if (fmt === 'bdd') return 'Gherkin / BDD';
                        return 'Steps';
                      })() },
                      { label: 'Version', value: testCase.version != null ? String(testCase.version) : '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-1)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </AccordionSection>

                {/* b. DESCRIPTION */}
                <AccordionSection label="Description" defaultExpanded>
                  <div
                    style={{
                      borderRadius: 6, padding: '8px 12px', minHeight: 60,
                      border: '1px solid transparent', cursor: 'text',
                      transition: 'border-color 150ms',
                      fontSize: 14, lineHeight: '22px',
                      color: testCase.description ? 'var(--fg-1)' : 'var(--fg-4)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--divider)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    {testCase.description || 'Add a description...'}
                  </div>
                </AccordionSection>

                {/* c. PRECONDITIONS */}
                <AccordionSection label="Preconditions" defaultExpanded>
                  <div
                    style={{
                      borderRadius: 6, padding: '8px 12px', minHeight: 60,
                      border: '1px solid transparent', cursor: 'text',
                      transition: 'border-color 150ms',
                      fontSize: 14, lineHeight: '22px', whiteSpace: 'pre-wrap',
                      color: testCase.preconditions ? 'var(--fg-1)' : 'var(--fg-4)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--divider)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    {testCase.preconditions || 'Add preconditions...'}
                  </div>
                </AccordionSection>

                {/* d. TEST STEPS */}
                <AccordionSection label="Test Steps" count={steps.length} defaultExpanded>
                  {steps.length === 0 ? (
                    <span style={{ fontSize: 14, color: 'var(--fg-4)' }}>No test steps yet.</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {steps.map(step => (
                        <div key={step.id} style={{
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                          minHeight: 36, padding: '8px 0',
                          borderBottom: '0.75px solid var(--divider)',
                        }}>
                          {/* Step number badge */}
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--cp-blue)', color: '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
                          }}>
                            {step.step_number}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ marginBottom: step.expected_result ? 6 : 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Action</span>
                              <p style={{ fontSize: 14, color: 'var(--fg-1)', margin: '2px 0 0', lineHeight: 1.5 }}>{step.action}</p>
                            </div>
                            {step.expected_result && (
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Expected Result</span>
                                <p style={{ fontSize: 14, color: 'var(--fg-1)', margin: '2px 0 0', lineHeight: 1.5 }}>{step.expected_result}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionSection>

                {/* e. ATTACHMENTS */}
                <AccordionSection label="Attachments" defaultExpanded={false}>
                  <EntityAttachmentsPanel entityType="test_case" entityId={testCase.id} />
                </AccordionSection>

                {/* f. LINKS */}
                <AccordionSection label="Links" count={links.length} defaultExpanded={false}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <LinkAccordionSection
                      label="Requirements"
                      icon={GitBranch}
                      links={requirementLinks}
                      onAdd={() => { setAddLinkType('requirement'); setAddLinkOpen(true); }}
                      onDelete={handleDeleteLink}
                    />
                    <LinkAccordionSection
                      label="Defects"
                      icon={Bug}
                      links={defectLinks}
                      onAdd={() => { setAddLinkType('defect'); setAddLinkOpen(true); }}
                      onDelete={handleDeleteLink}
                    />
                    <LinkAccordionSection
                      label="Stories"
                      icon={BookOpen}
                      links={storyLinks}
                      onAdd={() => { setAddLinkType('story'); setAddLinkOpen(true); }}
                      onDelete={handleDeleteLink}
                    />
                  </div>
                </AccordionSection>

                {/* g. HISTORY */}
                <AccordionSection label="History" defaultExpanded={false}>
                  {history.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--fg-4)', margin: 0 }}>No version history yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {history.map(h => (
                        <div key={h.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          height: 36, padding: '0 8px', borderRadius: 4,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Version {h.version}</span>
                          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{h.changed_at ? formatDistanceToNow(new Date(h.changed_at), { addSuffix: true }) : '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionSection>

                {/* h. RUNS */}
                <AccordionSection label="Runs" count={runs.length} defaultExpanded={false}>
                  {runs.length === 0 ? (
                    <span style={{ fontSize: 14, color: 'var(--fg-4)' }}>No runs yet.</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {runs.map(r => {
                        const resultStyle = RESULT_LOZENGE[r.result] || RESULT_LOZENGE.skipped;
                        return (
                          <div key={r.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            height: 36, padding: '0 8px', borderRadius: 4,
                          }}>
                            <span style={{ fontSize: 13, color: 'var(--fg-1)' }}>{(r as any).tm_cycle_scope?.tm_test_cycles?.name || 'Unknown cycle'}</span>
                            <span style={{
                              display: 'inline-block', height: 20, lineHeight: '20px',
                              fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                              letterSpacing: '0.03em', borderRadius: 3, padding: '0 6px',
                              background: resultStyle.bg, color: resultStyle.color,
                            }}>
                              {r.result}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionSection>

                {/* i. COMMENTS */}
                <AccordionSection label="Comments" defaultExpanded>
                  <EntityCommentsPanel entityType="test_case" entityId={testCase.id} />
                </AccordionSection>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR (DetailRightSidebar parity) ── */}
          <div style={{
            width: 280, flexShrink: 0,
            borderLeft: '1px solid var(--divider)',
            overflowY: 'auto',
            padding: '14px 16px',
            background: 'var(--bg-1)',
          }}>
            {/* STATUS BUTTON — clickable dropdown */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenPicker(openPicker === 'status' ? null : 'status'); }}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 6, border: 'none',
                  background: statusBtnBg, color: '#FFFFFF',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em', textAlign: 'center', cursor: 'pointer',
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {localStatus}
              </button>
              {openPicker === 'status' && (
                <PickerDropdown>
                  {['draft', 'ready', 'approved', 'deprecated'].map(s => (
                    <PickerOption
                      key={s}
                      selected={localStatus === s}
                      onClick={() => {
                        setLocalStatus(s);
                        setOpenPicker(null);
                        updateField('status', s);
                      }}
                    >
                      <span style={{
                        display: 'inline-block', height: 20, lineHeight: '20px', fontSize: 11,
                        fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em',
                        borderRadius: 3, padding: '0 6px',
                        background: (STATUS_PILL[s] || STATUS_PILL.draft).bg,
                        color: (STATUS_PILL[s] || STATUS_PILL.draft).color,
                      }}>{s}</span>
                    </PickerOption>
                  ))}
                </PickerDropdown>
              )}
            </div>

            {/* PINNED FIELDS — all inline-editable */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 12 }}>

              {/* Owner */}
              <SidebarField label="Owner">
                <div style={{ position: 'relative' }}>
                  <ClickableField onClick={(e) => { e.stopPropagation(); setOpenPicker(openPicker === 'owner' ? null : 'owner'); }}>
                    {resolvedOwnerName !== '—' ? (
                      <><MiniAvatar name={resolvedOwnerName} size={22} /><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{resolvedOwnerName}</span></>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--fg-4)' }}>Unassigned</span>
                    )}
                  </ClickableField>
                  {openPicker === 'owner' && (
                    <PeoplePickerDropdown
                      members={teamMembers || []}
                      selectedId={localOwnerId}
                      onSelect={(id, name) => {
                        setLocalOwnerId(id);
                        setOwnerName(name || '—');
                        setOpenPicker(null);
                        updateField('created_by', id);
                      }}
                    />
                  )}
                </div>
              </SidebarField>

              {/* Assigned To */}
              <SidebarField label="Assigned To">
                <div style={{ position: 'relative' }}>
                  <ClickableField onClick={(e) => { e.stopPropagation(); setOpenPicker(openPicker === 'assignee' ? null : 'assignee'); }}>
                    {resolvedAssigneeName !== '—' ? (
                      <><MiniAvatar name={resolvedAssigneeName} size={22} /><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{resolvedAssigneeName}</span></>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--fg-4)' }}>Unassigned</span>
                    )}
                  </ClickableField>
                  {openPicker === 'assignee' && (
                    <PeoplePickerDropdown
                      members={teamMembers || []}
                      selectedId={localAssigneeId}
                      onSelect={(id, name) => {
                        setLocalAssigneeId(id);
                        setAssigneeName(name || '—');
                        setOpenPicker(null);
                        updateField('assigned_to', id);
                      }}
                    />
                  )}
                </div>
              </SidebarField>

              {/* Priority */}
              <SidebarField label="Priority">
                <div style={{ position: 'relative' }}>
                  <ClickableField onClick={(e) => { e.stopPropagation(); setOpenPicker(openPicker === 'priority' ? null : 'priority'); }}>
                    {resolvedPriorityName !== '—'
                      ? <PriorityIndicator priority={resolvedPriorityName} fontSize={12} />
                      : <span style={{ fontSize: 13, color: 'var(--fg-4)' }}>None</span>
                    }
                  </ClickableField>
                  {openPicker === 'priority' && (
                    <PickerDropdown>
                      {(priorities || []).map(p => (
                        <PickerOption
                          key={p.id}
                          selected={localPriorityId === p.id}
                          onClick={() => {
                            setLocalPriorityId(p.id);
                            setPriorityName(p.name);
                            setOpenPicker(null);
                            updateField('priority_id', p.id);
                          }}
                        >
                          <PriorityIndicator priority={p.name} fontSize={12} />
                        </PickerOption>
                      ))}
                    </PickerDropdown>
                  )}
                </div>
              </SidebarField>

              {/* Type */}
              <SidebarField label="Type">
                <div style={{ position: 'relative' }}>
                  <ClickableField onClick={(e) => { e.stopPropagation(); setOpenPicker(openPicker === 'type' ? null : 'type'); }}>
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-1)' }}>{resolvedTypeName}</span>
                  </ClickableField>
                  {openPicker === 'type' && (
                    <PickerDropdown>
                      {(caseTypes || []).map(t => (
                        <PickerOption
                          key={t.id}
                          selected={localTypeId === t.id}
                          onClick={() => {
                            setLocalTypeId(t.id);
                            setTypeName(t.name);
                            setOpenPicker(null);
                            updateField('case_type_id', t.id);
                          }}
                        >
                          <span style={{ fontSize: 13, color: 'var(--fg-1)' }}>{t.name}</span>
                        </PickerOption>
                      ))}
                    </PickerDropdown>
                  )}
                </div>
              </SidebarField>
            </div>

            {/* CONTEXT SECTION */}
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 12 }}>Details</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SidebarField label="Case Key">
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: "'JetBrains Mono', monospace" }}>{testCase.case_key}</span>
                </SidebarField>

                <SidebarField label="Automation">
                  <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{testCase.automation_status || 'Manual'}</span>
                </SidebarField>

                <SidebarField label="Version">
                  <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{testCase.version != null ? String(testCase.version) : '—'}</span>
                </SidebarField>
              </div>
            </div>

            {/* METADATA — timestamps */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-4)', lineHeight: '18px' }}>
                Created {testCase.created_at ? new Date(testCase.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)', lineHeight: '18px' }}>
                Updated {testCase.updated_at ? formatDistanceToNow(new Date(testCase.updated_at), { addSuffix: true }) : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AddLinkModal */}
      <AddLinkModal isOpen={addLinkOpen} onClose={() => setAddLinkOpen(false)} linkType={addLinkType} projectId={testCase?.project_id} onAdd={handleAddLink} />
    </div>
  );
}

// ─── Primitives (WorkItemDetailModal parity) ─────────────────────────────
function HeaderBtn({ title, onClick, close, children }: { title: string; onClick?: () => void; close?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, border: 'none', borderRadius: 8,
        backgroundColor: 'transparent', color: 'var(--fg-4)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms',
      }}
      onMouseEnter={e => {
        if (close) { e.currentTarget.style.background = '#FFEBE6'; e.currentTarget.style.color = '#DE350B'; }
        else { e.currentTarget.style.background = 'var(--cp-bd-zone)'; }
      }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-4)'; }}
    >
      {children}
    </button>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>{label}</span>
      {children}
    </div>
  );
}

function MiniAvatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
      fontSize: size * 0.38,
      backgroundColor: colors[Math.abs(hash) % colors.length],
    }}>
      {initials}
    </div>
  );
}

// ─── Inline Picker Primitives ─────────────────────────────
function ClickableField({ onClick, children }: { onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 6px', borderRadius: 4, cursor: 'pointer',
        border: '1px solid transparent', transition: 'all 120ms',
        marginLeft: -6,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = 'var(--divider)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      {children}
    </div>
  );
}

function PickerDropdown({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
        marginTop: 4, backgroundColor: 'var(--cp-float, #FFFFFF)',
        border: '1px solid var(--divider)', borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: 4, maxHeight: 240, overflowY: 'auto',
        minWidth: 180,
      }}
    >
      {children}
    </div>
  );
}

function PickerOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '6px 8px', borderRadius: 4, cursor: 'pointer',
        background: selected ? 'rgba(37,99,235,0.08)' : 'transparent',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
      {selected && <Check style={{ width: 14, height: 14, color: '#2563EB', flexShrink: 0 }} />}
    </div>
  );
}

function PeoplePickerDropdown({ members, selectedId, onSelect }: {
  members: { id: string; full_name: string | null }[];
  selectedId: string | null;
  onSelect: (id: string | null, name: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = members.filter(m =>
    m.full_name && m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
        marginTop: 4, backgroundColor: 'var(--cp-float, #FFFFFF)',
        border: '1px solid var(--divider)', borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: 4, maxHeight: 280, display: 'flex', flexDirection: 'column',
        minWidth: 200,
      }}
    >
      <div style={{ padding: '4px 4px 6px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          autoFocus
          style={{
            width: '100%', height: 32, padding: '0 8px', fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            border: '1px solid var(--divider)', borderRadius: 6,
            outline: 'none', boxSizing: 'border-box',
            background: 'var(--cp-float, #FFFFFF)', color: 'var(--fg-1)',
          }}
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 200 }}>
        {/* Unassign option */}
        <PickerOption selected={!selectedId} onClick={() => onSelect(null, null)}>
          <span style={{ fontSize: 13, color: 'var(--fg-4)' }}>Unassigned</span>
        </PickerOption>
        {filtered.map(m => (
          <PickerOption key={m.id} selected={selectedId === m.id} onClick={() => onSelect(m.id, m.full_name)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MiniAvatar name={m.full_name || '?'} size={20} />
              <span style={{ fontSize: 13, color: 'var(--fg-1)' }}>{m.full_name}</span>
            </div>
          </PickerOption>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '12px 8px', fontSize: 12, color: 'var(--fg-4)', textAlign: 'center' }}>No results</div>
        )}
      </div>
    </div>
  );
}

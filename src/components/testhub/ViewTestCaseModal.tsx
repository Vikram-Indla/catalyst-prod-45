/**
 * ViewTestCaseModal — V15 Rebuild (StoryDetailModal parity)
 * Two-column layout: scrollable left panel + right sidebar (280px)
 * Ghost header, accordion sections, no tabs.
 */
import { useState, useEffect } from 'react';
import { X, Edit2, Copy, ClipboardList, Paperclip, Link2, History, Play, Plus, Trash2, Bug, BookOpen, MessageSquare, Search, Loader2, GitBranch, ChevronDown, ChevronRight, FileText, Settings2 } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { EntityCommentsPanel } from '@/components/testhub/EntityCommentsPanel';
import { EntityAttachmentsPanel } from '@/components/testhub/EntityAttachmentsPanel';
import { formatDistanceToNow, format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

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
  _source: 'tm_test_case_links' | 'tm_defect_links';
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
  { value: 'story',       label: 'Story',       icon: BookOpen,  table: 'ph_issues',       keyField: 'issue_key',  nameField: 'title', searchFields: ['title', 'issue_key'] },
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

// --- STATUS PILL COLORS (Jira-strong solid) ---
const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  draft:      { bg: '#6B778C', color: '#FFFFFF' },
  ready:      { bg: '#00875A', color: '#FFFFFF' },
  approved:   { bg: '#0052CC', color: '#FFFFFF' },
  deprecated: { bg: '#DE350B', color: '#FFFFFF' },
};

// --- RESULT LOZENGE (3-colour guardrail) ---
const RESULT_LOZENGE: Record<string, { bg: string; color: string }> = {
  passed:  { bg: '#E3FCEF', color: '#006644' },
  failed:  { bg: '#FFEBE6', color: '#BF2600' },
  blocked: { bg: '#DFE1E6', color: '#253858' },
  skipped: { bg: '#DFE1E6', color: '#253858' },
};

// ═══════════════════════════════════════
// ACCORDION SECTION (reusable)
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
    <div>
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 40, padding: '0 0', cursor: 'pointer', userSelect: 'none',
          borderBottom: '1px solid #EBECF0',
        }}
      >
        {expanded
          ? <ChevronDown style={{ width: 16, height: 16, color: '#5E6C84', flexShrink: 0 }} />
          : <ChevronRight style={{ width: 16, height: 16, color: '#5E6C84', flexShrink: 0 }} />
        }
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#172B4D', flex: 1 }}>{label}</span>
        {count !== undefined && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            height: 18, minWidth: 20, padding: '0 6px', borderRadius: 9,
            fontSize: 11, fontWeight: 700, background: '#DFE1E6', color: '#253858',
          }}>{count}</span>
        )}
      </div>
      {expanded && (
        <div style={{ padding: '16px 0' }}>
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
      if (projectId && config.table === 'ph_issues') {
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
      <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '95vw', maxHeight: '80vh', backgroundColor: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>Add Link</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    border: active ? 'none' : '1px solid #E2E8F0',
                    background: active ? '#2563EB' : 'transparent',
                    color: active ? '#FFFFFF' : '#475569',
                  }}>
                  <opt.icon style={{ width: 14, height: 14 }} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94A3B8' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}s...`}
              style={{ width: '100%', height: 40, padding: '8px 12px 8px 36px', fontSize: 14, fontFamily: "'Inter', sans-serif", border: '1.5px solid #E2E8F0', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px', maxHeight: 320 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <Loader2 style={{ width: 20, height: 20, animation: 'vtcm-spin 1s linear infinite', color: '#94A3B8' }} />
            </div>
          ) : !results?.length ? (
            <p style={{ textAlign: 'center', padding: 24, fontSize: 13, color: '#94A3B8' }}>
              No {config.label.toLowerCase()}s found
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {results.map(item => (
                <button key={item.id} onClick={() => { onAdd(item, linkType); onClose(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Icon style={{ width: 16, height: 16, color: '#94A3B8', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#2563EB' }}>{item.key}</span>
                    {item.name !== item.key && (
                      <p style={{ fontSize: 13, color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid #E2E8F0' }}>
          <button onClick={onClose} style={{ height: 36, padding: '0 16px', backgroundColor: 'transparent', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#64748B', cursor: 'pointer' }}>Cancel</button>
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
    <div style={{ borderRadius: 4, border: '0.75px solid #EBECF0', overflow: 'hidden' }}>
      {/* Section header */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
          background: '#F7F8F9', cursor: 'pointer', userSelect: 'none',
        }}
      >
        {expanded
          ? <ChevronDown style={{ width: 14, height: 14, color: '#64748B', flexShrink: 0 }} />
          : <ChevronRight style={{ width: 14, height: 14, color: '#64748B', flexShrink: 0 }} />
        }
        <Icon style={{ width: 14, height: 14, color: '#64748B', flexShrink: 0 }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: '#475569', flex: 1 }}>{label}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          height: 20, minWidth: 20, padding: '0 6px', borderRadius: 3,
          fontSize: 11, fontWeight: 700, background: '#DFE1E6', color: '#253858',
        }}>{links.length}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, color: '#2563EB',
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
                borderTop: '0.75px solid #EBECF0',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: '#2563EB' }}>
                {link.linked_item_key}
              </span>
              <span style={{
                flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: '#172B4D',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {link.linked_item_title}
              </span>
              <button
                onClick={() => onDelete(link.id)}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', padding: 2,
                  color: '#94A3B8', opacity: 0, transition: 'opacity 120ms',
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
        <div style={{ padding: '12px 36px', borderTop: '0.75px solid #EBECF0' }}>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>No {label.toLowerCase()} linked</span>
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
  const [steps, setSteps] = useState<Step[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [history, setHistory] = useState<VersionHistory[]>([]);
  const [runs, setRuns] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);

  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [addLinkType, setAddLinkType] = useState<'requirement' | 'defect' | 'story'>('requirement');

  useEffect(() => {
    if (isOpen && testCase) {
      fetchRelatedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, testCase?.id]);

  const fetchRelatedData = async () => {
    if (!testCase) return;
    setLoading(true);

    try {
      const [stepsRes, reqStoryLinksRes, defectLinksRes, historyRes, runsRes] = await Promise.all([
        supabase.from('tm_test_steps').select('*').eq('test_case_id', testCase.id).order('step_number'),
        typedQuery('tm_test_case_links').select('*').eq('test_case_id', testCase.id).in('linked_item_type', ['requirement', 'story']),
        typedQuery('tm_defect_links').select('*').eq('link_type', 'test_case').eq('linked_id', testCase.id),
        typedQuery('tm_test_case_versions').select('*').eq('test_case_id', testCase.id).order('version_number', { ascending: false }),
        typedQuery('th_test_executions').select(`*, tm_cycle_scope!cycle_scope_id(id, tm_test_cycles!test_cycle_id(id, name))`).eq('test_case_id', testCase.id).order('executed_at', { ascending: false }),
      ]);

      setSteps(stepsRes.data || []);

      const reqStoryLinks: Link[] = (reqStoryLinksRes.data || []).map((l: any) => ({
        id: l.id,
        link_type: l.linked_item_type || '',
        linked_item_key: l.linked_item_key || l.linked_item_id || '',
        linked_item_title: l.linked_item_title || '',
        _source: 'tm_test_case_links' as const,
      }));

      const defectLinksData: Link[] = (defectLinksRes.data || []).map((l: any) => ({
        id: l.id,
        link_type: 'defect',
        linked_item_key: l.defect_id || '',
        linked_item_title: l.entity_label || 'Defect',
        _source: 'tm_defect_links' as const,
      }));

      setLinks([...reqStoryLinks, ...defectLinksData]);

      const historyData = (historyRes.data || []).map((v: any) => ({
        id: v.id,
        version: v.version_number,
        changes: v.change_summary || v.snapshot,
        changed_at: v.created_at,
      }));
      setHistory(historyData);
      setRuns(runsRes.data || []);
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
    } else {
      const { data, error } = await typedQuery('tm_test_case_links').insert({
        test_case_id: testCase.id,
        linked_item_type: selectedLinkType,
        linked_item_id: item.id,
        linked_item_key: item.key,
        linked_item_title: item.name,
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
    } else {
      await typedQuery('tm_test_case_links').delete().eq('id', linkId);
    }
    setLinks(links.filter(l => l.id !== linkId));
  };

  if (!isOpen || !testCase) return null;

  const requirementLinks = links.filter(l => l.link_type === 'requirement');
  const defectLinks = links.filter(l => l.link_type === 'defect');
  const storyLinks = links.filter(l => l.link_type === 'story');

  const statusPill = STATUS_PILL[testCase.status] || STATUS_PILL.draft;

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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 1100, maxWidth: '95vw',
          minHeight: 600,
          maxHeight: 'calc(100vh - 80px)',
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(9,30,66,0.25)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'sdm-card-in 250ms ease',
        }}
      >
        {/* ── GHOST HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', flexShrink: 0,
        }}>
          {/* Left: case_key */}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, fontWeight: 500, color: '#5E6C84',
          }}>
            {testCase.case_key}
          </span>
          {/* Right: ghost buttons */}
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { icon: Edit2, title: 'Edit', onClick: onEdit },
              { icon: Copy, title: 'Clone', onClick: onClone },
            ].map(({ icon: Ic, title, onClick }) => (
              <button
                key={title}
                onClick={onClick}
                title={title}
                style={{
                  width: 32, height: 32, border: 'none', borderRadius: 4,
                  backgroundColor: 'transparent', color: '#5E6C84',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Ic style={{ width: 16, height: 16 }} />
              </button>
            ))}
            {/* Close — red hover */}
            <button
              onClick={onClose}
              title="Close"
              style={{
                width: 32, height: 32, border: 'none', borderRadius: 4,
                backgroundColor: 'transparent', color: '#5E6C84',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FFEBE6'; e.currentTarget.style.color = '#DE350B'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5E6C84'; }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* ── BODY: flex-row ── */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* ── LEFT PANEL ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', minWidth: 0 }}>

            {/* Title */}
            <h2 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 22, fontWeight: 700, color: '#172B4D',
              margin: '0 0 12px 0', lineHeight: 1.3,
            }}>
              {testCase.title}
            </h2>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Loader2 style={{ width: 24, height: 24, animation: 'vtcm-spin 1s linear infinite', color: '#5E6C84' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* a. KEY DETAILS */}
                <AccordionSection label="Key Details" defaultExpanded={false}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                    {[
                      { label: 'Automation Status', value: testCase.automation_status || '—' },
                      { label: 'Test Format', value: testCase.test_format || '—' },
                      { label: 'Version', value: testCase.version != null ? String(testCase.version) : '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#5E6C84', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 400, color: '#172B4D' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </AccordionSection>

                {/* b. DESCRIPTION */}
                <AccordionSection label="Description" defaultExpanded>
                  {testCase.description ? (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6, color: '#172B4D', margin: 0 }}>{testCase.description}</p>
                  ) : (
                    <span style={{ fontSize: 14, color: '#5E6C84' }}>—</span>
                  )}
                </AccordionSection>

                {/* c. PRECONDITIONS */}
                <AccordionSection label="Preconditions" defaultExpanded>
                  {testCase.preconditions ? (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6, color: '#172B4D', margin: 0, whiteSpace: 'pre-wrap' }}>{testCase.preconditions}</p>
                  ) : (
                    <span style={{ fontSize: 14, color: '#5E6C84' }}>—</span>
                  )}
                </AccordionSection>

                {/* d. TEST STEPS */}
                <AccordionSection label="Test Steps" count={steps.length} defaultExpanded>
                  {steps.length === 0 ? (
                    <span style={{ fontSize: 14, color: '#5E6C84' }}>—</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {steps.map(step => (
                        <div key={step.id} style={{
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                          minHeight: 36, padding: '8px 0',
                          borderBottom: '0.75px solid #EBECF0',
                        }}>
                          {/* Step number badge */}
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: '#2563EB', color: '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
                          }}>
                            {step.step_number}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ marginBottom: step.expected_result ? 6 : 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#5E6C84', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Action</span>
                              <p style={{ fontSize: 14, color: '#172B4D', margin: '2px 0 0', lineHeight: 1.5 }}>{step.action}</p>
                            </div>
                            {step.expected_result && (
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#5E6C84', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Expected Result</span>
                                <p style={{ fontSize: 14, color: '#172B4D', margin: '2px 0 0', lineHeight: 1.5 }}>{step.expected_result}</p>
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
                    <span style={{ fontSize: 14, color: '#5E6C84' }}>—</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {history.map(h => (
                        <div key={h.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          height: 36, padding: '0 8px', borderRadius: 4,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#172B4D' }}>Version {h.version}</span>
                          <span style={{ fontSize: 12, color: '#5E6C84' }}>{h.changed_at ? formatDistanceToNow(new Date(h.changed_at), { addSuffix: true }) : '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionSection>

                {/* h. RUNS */}
                <AccordionSection label="Runs" count={runs.length} defaultExpanded={false}>
                  {runs.length === 0 ? (
                    <span style={{ fontSize: 14, color: '#5E6C84' }}>—</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {runs.map(r => {
                        const resultStyle = RESULT_LOZENGE[r.result] || RESULT_LOZENGE.skipped;
                        return (
                          <div key={r.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            height: 36, padding: '0 8px', borderRadius: 4,
                          }}>
                            <span style={{ fontSize: 13, color: '#172B4D' }}>{(r as any).tm_cycle_scope?.tm_test_cycles?.name || 'Unknown cycle'}</span>
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

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{
            width: 280, flexShrink: 0,
            borderLeft: '1px solid #EBECF0',
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {/* Status pill */}
            <button
              style={{
                width: '100%', height: 32, borderRadius: 4,
                border: 'none', cursor: 'default',
                background: statusPill.bg, color: statusPill.color,
                fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const,
                letterSpacing: '0.03em',
                fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {testCase.status}
            </button>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Case Key', value: testCase.case_key, mono: true },
                { label: 'Version', value: testCase.version != null ? String(testCase.version) : '—' },
                { label: 'Format', value: testCase.test_format || '—' },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  height: 32, borderBottom: '1px solid #EBECF0',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#5E6C84' }}>{label}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 400, color: '#172B4D',
                    fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
                  }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#5E6C84' }}>Created</span>
                <span style={{ fontSize: 11, color: '#5E6C84' }}>{fmtDate(testCase.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#5E6C84' }}>Updated</span>
                <span style={{ fontSize: 11, color: '#5E6C84' }}>{fmtDate(testCase.updated_at)}</span>
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

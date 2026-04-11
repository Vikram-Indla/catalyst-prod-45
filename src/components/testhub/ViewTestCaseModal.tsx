import { useState, useEffect, useCallback } from 'react';
import { X, Edit2, Copy, FileText, ClipboardList, Paperclip, Link2, History, Play, Plus, Trash2, Bug, BookOpen, MessageSquare, Search, Loader2, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { EntityCommentsPanel } from '@/components/testhub/EntityCommentsPanel';
import { EntityAttachmentsPanel } from '@/components/testhub/EntityAttachmentsPanel';
import { formatDistanceToNow } from 'date-fns';
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
  project_id?: string;
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

type TabKey = 'details' | 'steps' | 'attachments' | 'links' | 'history' | 'runs' | 'comments';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'var(--cp-bd-zone)', color: 'var(--fg-3)' },
  ready: { bg: '#DCFCE7', color: 'var(--sem-success)' },
  approved: { bg: '#DBEAFE', color: 'var(--cp-blue)' },
  deprecated: { bg: '#FEE2E2', color: 'var(--sem-danger)' },
};

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

// --- ADD LINK MODAL (searchable, entity-resolving) ---
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '95vw', maxHeight: '80vh', backgroundColor: 'var(--cp-float, #fff)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--divider, #E2E8F0)' }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--fg-1, #0F172A)', margin: 0 }}>Add Link</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: 'var(--fg-4, #94A3B8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    border: active ? 'none' : '1px solid var(--divider, #E2E8F0)',
                    background: active ? '#2563EB' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--fg-2, #475569)',
                  }}>
                  <opt.icon style={{ width: 14, height: 14 }} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--fg-4, #94A3B8)' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}s...`}
              style={{ width: '100%', height: 40, padding: '8px 12px 8px 36px', fontSize: 14, fontFamily: 'Inter, sans-serif', border: '1.5px solid var(--divider, #E2E8F0)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px', maxHeight: 320 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', color: 'var(--fg-4, #94A3B8)' }} />
            </div>
          ) : !results?.length ? (
            <p style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--fg-4, #94A3B8)' }}>
              No {config.label.toLowerCase()}s found
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {results.map(item => (
                <button key={item.id} onClick={() => { onAdd(item, linkType); onClose(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-interact-hover, rgba(0,0,0,0.04))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Icon style={{ width: 16, height: 16, color: 'var(--fg-4, #94A3B8)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#2563EB' }}>{item.key}</span>
                    {item.name !== item.key && (
                      <p style={{ fontSize: 13, color: 'var(--fg-2, #475569)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--divider, #E2E8F0)' }}>
          <button onClick={onClose} style={{ height: 36, padding: '0 16px', backgroundColor: 'transparent', border: '1.5px solid var(--divider, #E2E8F0)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--fg-3, #64748B)', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// --- LINK ACCORDION SECTION ---
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
    <div style={{ borderRadius: 4, border: '0.75px solid var(--divider, #E2E8F0)', overflow: 'hidden' }}>
      {/* Section header */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
          background: 'var(--bg-1, #F8F9FA)', cursor: 'pointer', userSelect: 'none',
        }}
      >
        {expanded
          ? <ChevronDown style={{ width: 14, height: 14, color: 'var(--fg-3, #64748B)', flexShrink: 0 }} />
          : <ChevronRight style={{ width: 14, height: 14, color: 'var(--fg-3, #64748B)', flexShrink: 0 }} />
        }
        <Icon style={{ width: 14, height: 14, color: 'var(--fg-3, #64748B)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: 'var(--fg-2, #475569)', flex: 1 }}>{label}</span>
        {/* Count badge — grey lozenge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          height: 20, minWidth: 20, padding: '0 6px', borderRadius: 3,
          fontSize: 11, fontWeight: 700, background: '#DFE1E6', color: '#253858',
        }}>{links.length}</span>
        {/* + Add button */}
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

      {/* Expanded content */}
      {expanded && links.length > 0 && (
        <div>
          {links.map(link => (
            <div
              key={link.id}
              className="group"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 12px 0 36px',
                borderTop: '0.75px solid var(--divider, #E2E8F0)',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-interact-hover, rgba(0,0,0,0.04))')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: '#2563EB' }}>
                {link.linked_item_key}
              </span>
              <span style={{
                flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 400, color: 'var(--fg-1, #0F172A)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {link.linked_item_title}
              </span>
              <button
                onClick={() => onDelete(link.id)}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', padding: 2,
                  color: 'var(--fg-4, #94A3B8)', opacity: 0, transition: 'opacity 120ms',
                }}
                className="group-hover:!opacity-100"
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty expanded state */}
      {expanded && links.length === 0 && (
        <div style={{ padding: '12px 36px', borderTop: '0.75px solid var(--divider, #E2E8F0)' }}>
          <span style={{ fontSize: 12, color: 'var(--fg-4, #94A3B8)' }}>No {label.toLowerCase()} linked</span>
        </div>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---
export function ViewTestCaseModal({
  isOpen,
  onClose,
  testCase,
  onEdit,
  onClone,
}: ViewTestCaseModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [steps, setSteps] = useState<Step[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [history, setHistory] = useState<VersionHistory[]>([]);
  const [runs, setRuns] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);

  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [addLinkType, setAddLinkType] = useState<'requirement' | 'defect' | 'story'>('requirement');

  useEffect(() => {
    if (isOpen && testCase) {
      setActiveTab('details');
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

      // Map requirement/story links from tm_test_case_links
      const reqStoryLinks: Link[] = (reqStoryLinksRes.data || []).map((l: any) => ({
        id: l.id,
        link_type: l.linked_item_type || '',
        linked_item_key: l.linked_item_key || l.linked_item_id || '',
        linked_item_title: l.linked_item_title || '',
        _source: 'tm_test_case_links' as const,
      }));

      // Map defect links from tm_defect_links
      const defectLinks: Link[] = (defectLinksRes.data || []).map((l: any) => ({
        id: l.id,
        link_type: 'defect',
        linked_item_key: l.defect_id || '',
        linked_item_title: l.entity_label || 'Defect',
        _source: 'tm_defect_links' as const,
      }));

      setLinks([...reqStoryLinks, ...defectLinks]);

      // Map tm_test_case_versions to expected shape
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
      // Write to tm_defect_links
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
      // Write requirement/story to tm_test_case_links
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

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'details', label: 'Details', icon: FileText },
    { key: 'steps', label: 'Steps', icon: ClipboardList, count: steps.length },
    { key: 'attachments', label: 'Attachments', icon: Paperclip },
    { key: 'links', label: 'Links', icon: Link2, count: links.length },
    { key: 'history', label: 'History', icon: History },
    { key: 'runs', label: 'Runs', icon: Play, count: runs.length },
    { key: 'comments', label: 'Comments', icon: MessageSquare },
  ];

  const statusStyle = STATUS_STYLES[testCase.status] || STATUS_STYLES.draft;

  const renderTabContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--divider)', borderTopColor: 'var(--cp-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      );
    }

    switch (activeTab) {
      case 'details':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</h4>
              {testCase.description ? (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6 }}>{testCase.description}</p>
              ) : (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-4)' }}>No description defined</p>
              )}
            </div>
            <div>
              <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preconditions</h4>
              {testCase.preconditions ? (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{testCase.preconditions}</p>
              ) : (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-4)' }}>No preconditions defined</p>
              )}
            </div>
          </div>
        );

      case 'steps':
        return steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>No steps defined</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {steps.map((step) => (
              <div key={step.id} style={{ display: 'flex', gap: 16, padding: 16, backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
                <div style={{ width: 32, height: 32, backgroundColor: 'var(--cp-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-float)', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {step.step_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase' }}>Action</span>
                    <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)', marginTop: 4 }}>{step.action}</p>
                  </div>
                  {step.expected_result && (
                    <div>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase' }}>Expected Result</span>
                      <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)', marginTop: 4 }}>{step.expected_result}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'attachments':
        return <EntityAttachmentsPanel entityType="test_case" entityId={testCase.id} />;

      case 'links':
        return (
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
            <AddLinkModal isOpen={addLinkOpen} onClose={() => setAddLinkOpen(false)} linkType={addLinkType} projectId={testCase?.project_id} onAdd={handleAddLink} />
          </div>
        );

      case 'history':
        return history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>No version history</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(h => (
              <div key={h.id} style={{ padding: '12px 16px', backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>Version {h.version}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>{h.changed_at ? formatDistanceToNow(new Date(h.changed_at), { addSuffix: true }) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'runs':
        return runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>No execution runs</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runs.map(r => (
              <div key={r.id} style={{ padding: '12px 16px', backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{(r as any).tm_cycle_scope?.tm_test_cycles?.name || 'Unknown cycle'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: r.result === 'passed' ? 'var(--sem-success)' : r.result === 'failed' ? 'var(--sem-danger)' : 'var(--fg-3)' }}>{r.result}</span>
              </div>
            ))}
          </div>
        );

      case 'comments':
        return <EntityCommentsPanel entityType="test_case" entityId={testCase.id} />;

      default:
        return null;
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 1100, maxWidth: '95vw', minHeight: 600, maxHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--cp-float)', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '4px 10px', borderRadius: 6 }}>{testCase.case_key}</span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, backgroundColor: statusStyle.bg, color: statusStyle.color, textTransform: 'capitalize' }}>{testCase.status}</span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0, lineHeight: 1.3 }}>{testCase.title}</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
              <button onClick={onEdit} title="Edit" style={{ width: 36, height: 50, border: '1px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 style={{ width: 16, height: 16 }} /></button>
              <button onClick={onClone} title="Clone" style={{ width: 36, height: 50, border: '1px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Copy style={{ width: 16, height: 16 }} /></button>
              <button onClick={onClose} title="Close" style={{ width: 36, height: 50, border: '1px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', border: 'none', backgroundColor: 'transparent', borderBottom: isActive ? '2px solid var(--cp-blue)' : '2px solid transparent', color: isActive ? 'var(--cp-blue)' : 'var(--fg-3)', fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer' }}>
                <Icon style={{ width: 14, height: 14 }} />
                {tab.label}
                {tab.count !== undefined && <span style={{ fontSize: 11, backgroundColor: isActive ? 'color-mix(in srgb, var(--cp-blue) 12%, transparent)' : 'var(--bg-1)', padding: '1px 6px', borderRadius: 12, fontWeight: 600 }}>{tab.count}</span>}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {renderTabContent()}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

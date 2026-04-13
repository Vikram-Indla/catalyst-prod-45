/**
 * CreateStoryModal — Jira Cloud parity "Create" dialog.
 * Fields: Space, Work type, Status, Summary, Parent, MDT Ref, Priority, Description,
 *         Target Release, Assignee, Reporter.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createPortal } from 'react-dom';
import {
  X, Maximize2, Minus, MoreHorizontal, ChevronDown, Bold, Italic, List,
  ListOrdered, Code2, Link2, Undo, Redo, ExternalLink,
} from 'lucide-react';
import {
  useCreateStoryForm, useProjects, useTeamMembers,
  useProjectReleases, useParentCandidates, useCreateStoryMutation,
} from './useCreateStory';
import { useAuth } from '@/hooks/useAuth';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import './create-story.css';

// ── Helpers ──
const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

const STATUSES = [
  'In Requirements', 'To Do', 'In Design', 'Ready for Development',
  'In Development', 'In QA', 'In UAT', 'In Beta', 'Done',
];

const WORK_TYPES = [
  'Epic', 'Feature', 'Story', 'Business Gap', 'QA Bug',
  'Production Incident', 'Change Request', 'Task', 'API Requirement',
];

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

function PriorityIcon({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  let color = '#F79232';
  if (p === 'highest') color = '#EF4444';
  else if (p === 'high') color = '#F97316';
  else if (p === 'low') color = '#3B82F6';
  else if (p === 'lowest') color = '#60A5FA';

  if (p === 'highest' || p === 'high') {
    return <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 13l5-10 5 10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
  if (p === 'low' || p === 'lowest') {
    return <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l5 10 5-10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
  return <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="2" rx="1" fill={color}/><rect x="2" y="9" width="12" height="2" rx="1" fill={color}/></svg>;
}

// ── Project icon (small colored square with first letter) ──
function ProjectIcon({ name }: { name: string }) {
  return (
    <span className="csProjectIcon">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ── Select Dropdown ──
function SelectField({ label, required, value, options, onChange, placeholder, renderOption, disabled, helpText, helpLink, helpLinkText }: {
  label: string;
  required?: boolean;
  value: string;
  options: { value: string; label: string; icon?: React.ReactNode; sublabel?: string }[];
  onChange: (val: string) => void;
  placeholder?: string;
  renderOption?: (opt: any) => React.ReactNode;
  disabled?: boolean;
  helpText?: string;
  helpLink?: string;
  helpLinkText?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div className="csField" ref={ref}>
      <label className="csLabel">{label}{required && <span className="csRequired"> *</span>}</label>
      <button
        type="button"
        className={`csSelect ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className="csSelectText">
          {selected?.icon}{selected?.label ?? placeholder ?? `Select ${label.toLowerCase()}`}
        </span>
        <ChevronDown className="csSelectChevron" />
      </button>
      {helpLink && (
        <a href={helpLink} target="_blank" rel="noopener noreferrer" className="csLearnLink">
          {helpLinkText || 'Learn more'} <ExternalLink size={12} />
        </a>
      )}
      {helpText && <div className="csHelpText">{helpText}</div>}
      {open && (
        <div className="csDropdown">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`csDropdownItem ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {renderOption ? renderOption(opt) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {opt.icon}{opt.label}
                </span>
              )}
            </button>
          ))}
          {options.length === 0 && <div className="csDropdownEmpty">No options</div>}
        </div>
      )}
    </div>
  );
}

// ── Parent Picker (Jira-parity — mirrors StoryDetailView's ParentFieldPicker) ──
const EpicIconInline = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
    <rect fill="#6554C0" width="16" height="16" rx="2"/>
    <path fill="#FFF" d="M8.39 2L4.5 9h3.11v5L11.5 7H8.39V2z"/>
  </svg>
);

function ParentPicker({ label, required, projectId, projectKey, value, onChange, helpText }: {
  label: string;
  required?: boolean;
  projectId: string;
  projectKey: string;
  value: string | null;
  onChange: (parentId: string | null, parentKey: string | null) => void;
  helpText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live search epics from ph_issues (same as detail view)
  const { data: searchResults = [] } = useQuery({
    queryKey: ['create-story-parent-search', projectKey, search, showDone],
    queryFn: async () => {
      if (!projectKey) return [];
      let query = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', projectKey).eq('issue_type', 'Epic')
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false }).limit(20);
      if (!showDone) {
        query = query.neq('status_category', 'done');
      }
      if (search.trim()) {
        query = query.or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as any[];
    },
    enabled: open && !!projectKey,
  });

  // Resolve current parent display
  const { data: currentParent } = useQuery({
    queryKey: ['create-story-current-parent', value],
    queryFn: async () => {
      if (!value) return null;
      const { data, error } = await supabase.from('catalyst_issues')
        .select('id, issue_key, title, issue_type')
        .eq('id', value).single();
      if (error) return null;
      return data;
    },
    enabled: !!value,
  });

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const handleSelect = (result: any) => {
    // Map ph_issues id to catalyst_issues — use the id directly
    onChange(result.id, result.issue_key);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const [hovered, setHovered] = useState(false);

  return (
    <div className="csField" ref={ref}>
      <label className="csLabel">{label}{required && <span className="csRequired"> *</span>}</label>
      {/* Trigger */}
      <div
        className="csSelect"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {currentParent ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
            <EpicIconInline />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
              {currentParent.issue_key} {currentParent.title}
            </span>
            <button type="button" onClick={handleClear} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, borderRadius: '50%', border: 'none',
              background: '#DFE1E6', cursor: 'pointer', color: '#42526E', flexShrink: 0,
              opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
            }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </span>
        ) : (
          <span className="csSelectText">Select parent</span>
        )}
        <ChevronDown className="csSelectChevron" />
      </div>
      {helpText && <div className="csHelpText">{helpText}</div>}

      {/* Dropdown — Jira parity: search, show done, two-line results */}
      {open && (
        <div className="csDropdown" style={{ width: '100%', minWidth: 420, maxHeight: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search epics..."
              onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }}
              style={{
                width: '100%', height: 36, padding: '0 12px',
                border: '2px solid #4C9AFF', borderRadius: 3,
                fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#172B4D',
                background: '#fff',
              }}
            />
          </div>
          {/* Show done */}
          <div style={{ padding: '6px 12px', borderBottom: '1px solid #F4F5F7' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#172B4D' }}>
              <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#0052CC', cursor: 'pointer' }} />
              Show done work items
            </label>
          </div>
          {/* Results */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {searchResults.map(result => {
              const isActive = result.id === value;
              return (
                <div
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  style={{
                    padding: '10px 12px', cursor: 'pointer',
                    borderBottom: '1px solid #F4F5F7',
                    background: isActive ? '#DEEBFF' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? '#DEEBFF' : 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <EpicIconInline />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#6B778C', fontSize: 12 }}>{result.issue_key}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#172B4D', paddingLeft: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.summary}
                  </div>
                </div>
              );
            })}
            {searchResults.length === 0 && search && (
              <div style={{ padding: 16, fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No epics found for "{search}"</div>
            )}
            {searchResults.length === 0 && !search && (
              <div style={{ padding: 16, fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No epics available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── User Picker ──
function UserPicker({ label, required, value, members, onChange, showAssignToMe, onAssignToMe }: {
  label: string;
  required?: boolean;
  value: string | null;
  members: any[];
  onChange: (id: string | null) => void;
  showAssignToMe?: boolean;
  onAssignToMe?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filtered = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = members.find(m => m.id === value);

  return (
    <div className="csField" ref={ref}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label className="csLabel">{label}{required && <span className="csRequired"> *</span>}</label>
        {showAssignToMe && (
          <button type="button" className="csAssignToMe" onClick={onAssignToMe}>Assign to me</button>
        )}
      </div>
      <button type="button" className="csSelect csSelectFull" onClick={() => setOpen(o => !o)}>
        <span className="csSelectText">
          {selected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selected.avatar_url
                ? <img src={selected.avatar_url} alt="" className="csAvatarImg" />
                : <span className="csAvatarCircle" style={{ background: avatarBg(selected.full_name ?? '') }}>{initials(selected.full_name ?? '')}</span>
              }
              {selected.full_name}
            </span>
          ) : 'Automatic'}
        </span>
        <ChevronDown className="csSelectChevron" />
      </button>
      {open && (
        <div className="csDropdown csDropdownWide">
          <div className="csDropdownSearch">
            <input ref={inputRef} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="button" className="csDropdownItem" onClick={() => { onChange(null); setOpen(false); setSearch(''); }}>
            <span style={{ color: '#6B778C' }}>Automatic</span>
          </button>
          {filtered.map(m => (
            <button key={m.id} type="button" className={`csDropdownItem ${m.id === value ? 'selected' : ''}`}
              onClick={() => { onChange(m.id); setOpen(false); setSearch(''); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {m.avatar_url
                  ? <img src={m.avatar_url} alt="" className="csAvatarImg" />
                  : <span className="csAvatarCircle" style={{ background: avatarBg(m.full_name ?? '') }}>{initials(m.full_name ?? '')}</span>
                }
                {m.full_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rich Text Editor (TipTap) ──
function DescriptionEditor({ onChange }: { onChange: (html: string, json: any) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TipTapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: '' }),
    ],
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML(), ed.getJSON());
    },
  });

  if (!editor) return null;

  return (
    <div className="csEditorWrap">
      <div className="csEditorToolbar">
        <button type="button" className={`csEditorBtn ${editor.isActive('bold') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></button>
        <button type="button" className={`csEditorBtn ${editor.isActive('italic') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
        <span className="csEditorSep" />
        <button type="button" className={`csEditorBtn ${editor.isActive('bulletList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></button>
        <button type="button" className={`csEditorBtn ${editor.isActive('orderedList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
        <span className="csEditorSep" />
        <button type="button" className={`csEditorBtn ${editor.isActive('codeBlock') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={16} /></button>
        <button type="button" className="csEditorBtn" onClick={() => {
          const url = window.prompt('URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}><Link2 size={16} /></button>
        <span className="csEditorSep" />
        <button type="button" className="csEditorBtn" onClick={() => editor.chain().focus().undo().run()}><Undo size={16} /></button>
        <button type="button" className="csEditorBtn" onClick={() => editor.chain().focus().redo().run()}><Redo size={16} /></button>
      </div>
      <EditorContent editor={editor} className="csEditorContent" />
    </div>
  );
}

// ── Main Modal ──
interface CreateStoryModalProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  projectKey?: string;
  onSuccess?: (issueKey: string) => void;
}

export function CreateStoryModal({ open, onClose, projectId, projectKey, onSuccess }: CreateStoryModalProps) {
  const { user } = useAuth();
  const { form, updateField, reset } = useCreateStoryForm(projectId);
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useTeamMembers();
  const { data: releases = [] } = useProjectReleases(form.projectId);
  const { data: parentCandidates = [] } = useParentCandidates(form.projectId);
  const createMutation = useCreateStoryMutation();
  const [createAnother, setCreateAnother] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [workType, setWorkType] = useState('Story');
  const [isExpanded, setIsExpanded] = useState(false);
  const summaryRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Set reporter to current user on mount
  useEffect(() => {
    if (user?.id && !form.reporterId) {
      updateField('reporterId', user.id);
    }
  }, [user?.id]);

  // Set project if provided (by id or key)
  useEffect(() => {
    if (form.projectId) return;
    if (projectId) { updateField('projectId', projectId); return; }
    if (projectKey && projects.length > 0) {
      const match = projects.find(p => p.key === projectKey);
      if (match) updateField('projectId', match.id);
    }
  }, [projectId, projectKey, projects, form.projectId]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Focus summary on open
  useEffect(() => {
    if (open) setTimeout(() => summaryRef.current?.focus(), 100);
  }, [open]);

  const currentProject = projects.find(p => p.id === form.projectId);
  const resolvedKey = currentProject?.key ?? projectKey ?? '';

  const handleSubmit = useCallback(async () => {
    if (!form.summary.trim()) {
      setSummaryError('Summary is required');
      summaryRef.current?.focus();
      return;
    }
    setSummaryError('');

    try {
      const result = await createMutation.mutateAsync({ form, projectKey: resolvedKey, issueType: workType });
      onSuccess?.(result.issue_key);

      if (createAnother) {
        reset(true);
        setSummaryError('');
        setTimeout(() => summaryRef.current?.focus(), 100);
      } else {
        onClose();
        reset();
      }
    } catch (err: any) {
      setSummaryError(err?.message ?? 'Failed to create');
    }
  }, [form, resolvedKey, createMutation, createAnother, onSuccess, onClose, reset, workType]);

  if (!open) return null;

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: `${p.name} (${p.key})`,
    icon: <ProjectIcon name={p.name} />,
    sublabel: p.key,
  }));

  const workTypeOptions = WORK_TYPES.map(t => ({
    value: t,
    label: t,
    icon: <JiraIssueTypeIcon type={t} size={16} />,
  }));

  const parentOptions = parentCandidates.map((p: any) => ({
    value: p.id,
    label: `${p.issue_key}  ${p.title}`,
    icon: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="csParentBadge">{resolvedKey}</span>
        <JiraIssueTypeIcon type={p.issue_type} size={16} />
      </span>
    ),
    issueKey: p.issue_key,
    title: p.title,
    projectKey: resolvedKey,
  }));

  const releaseOptions = releases.map((r: any) => ({ value: r.id, label: r.name }));

  const priorityOptions = PRIORITIES.map(p => ({
    value: p,
    label: p,
    icon: <PriorityIcon priority={p} />,
  }));

  const statusOptions = STATUSES.map(s => ({
    value: s,
    label: s,
    icon: <span className="csStatusDot" />,
  }));

  return createPortal(
    <div className="csOverlay" onClick={onClose}>
      <div className={`csModal ${isExpanded ? 'csModal--expanded' : ''}`} ref={modalRef} onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="csModalHeader">
          <h2 className="csModalTitle">Create Story</h2>
          <div className="csModalHeaderActions">
            <button type="button" className="csHeaderBtn" title="Minimize"><Minus size={16} /></button>
            <button type="button" className="csHeaderBtn" title="Full screen" onClick={() => setIsExpanded(e => !e)}><Maximize2 size={16} /></button>
            <button type="button" className="csHeaderBtn" title="More actions"><MoreHorizontal size={16} /></button>
            <button type="button" className="csHeaderBtn" onClick={onClose} title="Close"><X size={18} /></button>
          </div>
        </div>

        {/* Required fields note */}
        <div className="csRequiredNote">Required fields are marked with an asterisk <span className="csRequired">*</span></div>

        {/* ── Body (scrollable) ── */}
        <div className="csModalBody">
          {/* Project */}
          <SelectField
            label="Project"
            required
            value={form.projectId}
            options={projectOptions}
            onChange={v => updateField('projectId', v)}
            placeholder="Select project"
          />

          {/* Work type */}
          <SelectField
            label="Work type"
            required
            value={workType}
            options={workTypeOptions}
            onChange={setWorkType}
          />

          {/* Divider */}
          <div className="csDivider" />

          {/* Status */}
          <SelectField
            label="Status"
            value={form.status}
            options={statusOptions}
            onChange={v => updateField('status', v)}
          />
          <div className="csHelpText">This is the initial status upon creation</div>

          {/* Summary */}
          <div className="csField">
            <label className="csLabel">Summary<span className="csRequired"> *</span></label>
            <input
              ref={summaryRef}
              className={`csInput csInputBordered ${summaryError ? 'error' : ''}`}
              placeholder=""
              value={form.summary}
              maxLength={200}
              onChange={e => { updateField('summary', e.target.value); if (summaryError) setSummaryError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            />
            {summaryError && (
              <div className="csErrorText">
                <span className="csErrorIcon">◆</span> {summaryError}
              </div>
            )}
          </div>

          {/* Parent */}
          <ParentPicker
            label="Parent"
            projectId={form.projectId}
            projectKey={resolvedKey}
            value={form.parentId ?? null}
            onChange={(parentId) => updateField('parentId', parentId)}
            helpText="Your work type hierarchy determines the work items you can select here."
          />

          {/* Priority */}
          <SelectField
            label="Priority"
            value={form.priority}
            options={priorityOptions}
            onChange={v => updateField('priority', v)}
          />

          {/* Description */}
          <div className="csField">
            <label className="csLabel">Description</label>
            <DescriptionEditor onChange={(html, json) => {
              updateField('description', html);
              updateField('descriptionAdf', json);
            }} />
          </div>

          {/* Target Release */}
          <SelectField
            label="Target Release"
            value={form.releaseId ?? ''}
            options={[{ value: '', label: 'Select release' }, ...releaseOptions]}
            onChange={v => updateField('releaseId', v || null)}
            placeholder="Select release"
          />

          {/* Assignee */}
          <UserPicker
            label="Assignee"
            value={form.assigneeId}
            members={members}
            onChange={id => updateField('assigneeId', id)}
            showAssignToMe
            onAssignToMe={() => { if (user?.id) updateField('assigneeId', user.id); }}
          />

          {/* Reporter */}
          <UserPicker
            label="Reporter"
            required
            value={form.reporterId}
            members={members}
            onChange={id => updateField('reporterId', id)}
          />
        </div>

        {/* ── Footer (sticky) ── */}
        <div className="csModalFooter">
          <label className="csCreateAnother">
            <input
              type="checkbox"
              checked={createAnother}
              onChange={e => setCreateAnother(e.target.checked)}
            />
            Create another
          </label>
          <div className="csFooterActions">
            <button type="button" className="csBtn csCancel" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="csBtn csCreate"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CreateStoryModal;

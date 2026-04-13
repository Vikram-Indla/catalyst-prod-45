/**
 * CreateStoryModal — Jira Cloud parity "Create" dialog.
 * Fields: Space, Work type, Status, Summary, Parent, MDT Ref, Priority, Description,
 *         Target Release, Assignee, Reporter.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
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

// ── Searchable Parent Picker ──
function ParentPicker({ label, required, value, options, onChange, helpText }: {
  label: string;
  required?: boolean;
  value: string;
  options: { value: string; label: string; icon?: React.ReactNode; projectKey?: string; issueKey?: string; title?: string }[];
  onChange: (val: string) => void;
  helpText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filtered = options.filter(o =>
    !search || o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find(o => o.value === value);

  return (
    <div className="csField" ref={ref}>
      <label className="csLabel">{label}{required && <span className="csRequired"> *</span>}</label>
      <button type="button" className="csSelect" onClick={() => setOpen(o => !o)}>
        <span className="csSelectText">
          {selected ? selected.label : 'Select parent'}
        </span>
        <ChevronDown className="csSelectChevron" />
      </button>
      {helpText && <div className="csHelpText">{helpText}</div>}
      {open && (
        <div className="csDropdown csDropdownWide csParentDropdown">
          <div className="csDropdownSearch">
            <input ref={inputRef} placeholder="Search by key or title..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <label className="csShowDoneLabel">
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
            Show everything marked as done
          </label>
          {filtered.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`csDropdownItem ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {opt.icon}{opt.label}
              </span>
            </button>
          ))}
          {filtered.length === 0 && <div className="csDropdownEmpty">No matching items</div>}
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

  return (
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
            value={form.parentId ?? ''}
            options={parentOptions}
            onChange={v => updateField('parentId', v || null)}
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
    </div>
  );
}

export default CreateStoryModal;

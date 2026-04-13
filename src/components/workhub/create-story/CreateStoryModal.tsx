/**
 * CreateStoryModal — Full Jira Cloud parity with Atlassian DS tokens.
 * All fields from the Jira "Create" dialog: Space, Work type, Status,
 * Summary, Parent, MDT Ref, Priority, Labels, Story Points, Description,
 * Target Release, Assignee, Reporter.
 * Face avatars with gradient ring.
 */
import { useState, useEffect, useRef, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  X, Maximize2, Minus, MoreHorizontal, ChevronDown, Bold, Italic, List,
  ListOrdered, Code2, Link2, Undo, Redo, ExternalLink, Search,
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
const AVATAR_COLORS = ['#0C66E4', '#E56910', '#216E4E', '#AE2E24', '#5E4DB2'];
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
  if (p === 'highest') return <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8l5-6 5 6" fill="none" stroke="#CF1322" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 13l5-6 5 6" fill="none" stroke="#CF1322" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (p === 'high') return <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 12l5-8 5 8" fill="none" stroke="#E2483D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (p === 'medium') return <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="2" rx="1" fill="#E2711D"/><rect x="2" y="9" width="12" height="2" rx="1" fill="#E2711D"/></svg>;
  if (p === 'low') return <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 4l5 8 5-8" fill="none" stroke="#388BFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l5 6 5-6" fill="none" stroke="#388BFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 8l5 6 5-6" fill="none" stroke="#388BFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// ── Project icon ──
function ProjectIcon({ name }: { name: string }) {
  return <span className="csProjectIcon">{name.charAt(0).toUpperCase()}</span>;
}

// ── Face Avatar with ring ──
function FaceAvatar({ src, name, size = 28 }: { src?: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <span className="csAvatarRing" style={{ width: size, height: size }}>
        <img src={src} alt={name} />
      </span>
    );
  }
  return (
    <span className="csAvatarCircle" style={{ width: size, height: size, background: avatarBg(name) }}>
      {initials(name)}
    </span>
  );
}

// ── Select Dropdown ──
function SelectField({ label, required, value, options, onChange, placeholder, disabled, helpLink, helpLinkText }: {
  label: string;
  required?: boolean;
  value: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
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
      {open && (
        <div className="csDropdown">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`csDropdownItem ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {opt.icon}{opt.label}
              </span>
            </button>
          ))}
          {options.length === 0 && <div className="csDropdownEmpty">No options</div>}
        </div>
      )}
    </div>
  );
}

// ── Searchable Parent Picker ──
function ParentPicker({ label, value, options, onChange, helpText }: {
  label: string;
  value: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
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

  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => o.value === value);

  return (
    <div className="csField" ref={ref}>
      <label className="csLabel">Parent</label>
      <button type="button" className="csSelect" onClick={() => setOpen(o => !o)}>
        <span className="csSelectText">{selected ? selected.label : 'Select parent'}</span>
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
            <button key={opt.value} type="button"
              className={`csDropdownItem ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{opt.icon}{opt.label}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="csDropdownEmpty">No matching items</div>}
        </div>
      )}
    </div>
  );
}

// ── User Picker with face avatars ──
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
        {showAssignToMe && <button type="button" className="csAssignToMe" onClick={onAssignToMe}>Assign to me</button>}
      </div>
      <button type="button" className="csSelect csSelectFull" onClick={() => setOpen(o => !o)}>
        <span className="csSelectText">
          {selected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaceAvatar src={selected.avatar_url} name={selected.full_name ?? ''} />
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
            <span style={{ color: 'var(--ds-text-subtlest)' }}>Automatic</span>
          </button>
          {filtered.map(m => (
            <button key={m.id} type="button" className={`csDropdownItem ${m.id === value ? 'selected' : ''}`}
              onClick={() => { onChange(m.id); setOpen(false); setSearch(''); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaceAvatar src={m.avatar_url} name={m.full_name ?? ''} />
                {m.full_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Labels (multi-tag with create-on-type) ──
function LabelsField({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  };

  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag));

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addTag(input); }
    if (e.key === 'Backspace' && !input && value.length > 0) removeTag(value[value.length - 1]);
  };

  return (
    <div className="csField">
      <label className="csLabel">Labels</label>
      <div className="csLabelsWrap" onClick={() => inputRef.current?.focus()}
        style={{ border: '2px solid var(--ds-border-subtle)', borderRadius: 'var(--ds-radius-100)', padding: '4px 8px', minHeight: 36, background: 'var(--ds-background-input)', cursor: 'text' }}>
        {value.map(tag => (
          <span key={tag} className="csLabelTag">
            {tag}
            <button type="button" className="csLabelTagRemove" onClick={() => removeTag(tag)}>
              <X size={10} />
            </button>
          </span>
        ))}
        <input ref={inputRef} className="csLabelsInput" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown} placeholder={value.length === 0 ? 'Type and press Enter' : ''} />
      </div>
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
    onUpdate: ({ editor: ed }) => { onChange(ed.getHTML(), ed.getJSON()); },
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

// ════════════════════════════════════════════════════
// ── MAIN MODAL ──
// ════════════════════════════════════════════════════
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
  const [mdtRef, setMdtRef] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const summaryRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user?.id && !form.reporterId) updateField('reporterId', user.id); }, [user?.id]);

  useEffect(() => {
    if (form.projectId) return;
    if (projectId) { updateField('projectId', projectId); return; }
    if (projectKey && projects.length > 0) {
      const match = projects.find(p => p.key === projectKey);
      if (match) updateField('projectId', match.id);
    }
  }, [projectId, projectKey, projects, form.projectId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => { if (open) setTimeout(() => summaryRef.current?.focus(), 100); }, [open]);

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
        reset(true); setSummaryError(''); setMdtRef(''); setStoryPoints('');
        setTimeout(() => summaryRef.current?.focus(), 100);
      } else { onClose(); reset(); }
    } catch (err: any) {
      setSummaryError(err?.message ?? 'Failed to create');
    }
  }, [form, resolvedKey, createMutation, createAnother, onSuccess, onClose, reset, workType]);

  if (!open) return null;

  const projectOptions = projects.map(p => ({
    value: p.id, label: `${p.name} (${p.key})`, icon: <ProjectIcon name={p.name} />,
  }));
  const workTypeOptions = WORK_TYPES.map(t => ({
    value: t, label: t, icon: <JiraIssueTypeIcon type={t} size={16} />,
  }));
  const parentOptions = parentCandidates.map((p: any) => ({
    value: p.id,
    label: `${p.issue_key}  ${p.title}`,
    icon: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="csParentBadge">{resolvedKey}</span>
      <JiraIssueTypeIcon type={p.issue_type} size={16} />
    </span>,
  }));
  const releaseOptions = releases.map((r: any) => ({ value: r.id, label: r.name }));
  const priorityOptions = PRIORITIES.map(p => ({
    value: p, label: p, icon: <PriorityIcon priority={p} />,
  }));
  const statusOptions = STATUSES.map(s => ({
    value: s, label: s, icon: <span className="csStatusDot" />,
  }));

  return (
    <div className="csOverlay" onClick={onClose}>
      <div className="csModal" ref={modalRef} onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="csModalHeader">
          <h2 className="csModalTitle">Create Story</h2>
          <div className="csModalHeaderActions">
            <button type="button" className="csHeaderBtn" title="Minimize"><Minus size={16} /></button>
            <button type="button" className="csHeaderBtn" title="Full screen"><Maximize2 size={16} /></button>
            <button type="button" className="csHeaderBtn" title="More actions"><MoreHorizontal size={16} /></button>
            <button type="button" className="csHeaderBtn" onClick={onClose} title="Close"><X size={18} /></button>
          </div>
        </div>

        <div className="csRequiredNote">Required fields are marked with an asterisk <span className="csRequired">*</span></div>

        {/* ── Body ── */}
        <div className="csModalBody">
          {/* Space */}
          <SelectField label="Space" required value={form.projectId} options={projectOptions}
            onChange={v => updateField('projectId', v)} placeholder="Select space" />

          {/* Work type */}
          <SelectField label="Work type" required value={workType} options={workTypeOptions}
            onChange={setWorkType} helpLink="#" helpLinkText="Learn about work types" />

          <div className="csDivider" />

          {/* Status */}
          <SelectField label="Status" value={form.status} options={statusOptions}
            onChange={v => updateField('status', v)} />
          <div className="csHelpText">This is the initial status upon creation</div>

          {/* Summary */}
          <div className="csField">
            <label className="csLabel">Summary<span className="csRequired"> *</span></label>
            <input ref={summaryRef} className={`csInput ${summaryError ? 'error' : ''}`}
              value={form.summary} maxLength={255}
              onChange={e => { updateField('summary', e.target.value); if (summaryError) setSummaryError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} />
            {summaryError && <div className="csErrorText"><span className="csErrorIcon">◆</span> {summaryError}</div>}
          </div>

          {/* Parent */}
          <ParentPicker label="Parent" value={form.parentId ?? ''} options={parentOptions}
            onChange={v => updateField('parentId', v || null)}
            helpText="Your work type hierarchy determines the work items you can select here." />

          {/* MDT Ref */}
          <div className="csField">
            <label className="csLabel">MDT Ref</label>
            <input className="csInput" value={mdtRef} onChange={e => setMdtRef(e.target.value)} />
          </div>

          {/* Priority */}
          <SelectField label="Priority" value={form.priority} options={priorityOptions}
            onChange={v => updateField('priority', v)} helpLink="#" helpLinkText="Learn about priority levels" />

          {/* Labels */}
          <LabelsField value={form.tags} onChange={tags => updateField('tags', tags)} />

          {/* Story Points */}
          <div className="csField">
            <label className="csLabel">Story points</label>
            <input className="csInput csStoryPoints" type="number" min="0" step="1"
              value={storyPoints} onChange={e => setStoryPoints(e.target.value)}
              placeholder="" />
          </div>

          {/* Description */}
          <div className="csField">
            <label className="csLabel">Description</label>
            <DescriptionEditor onChange={(html, json) => {
              updateField('description', html);
              updateField('descriptionAdf', json);
            }} />
          </div>

          {/* Target Release */}
          <SelectField label="Target Release" value={form.releaseId ?? ''}
            options={[{ value: '', label: 'Select release' }, ...releaseOptions]}
            onChange={v => updateField('releaseId', v || null)} placeholder="Select release" />

          {/* Assignee */}
          <UserPicker label="Assignee" value={form.assigneeId} members={members}
            onChange={id => updateField('assigneeId', id)} showAssignToMe
            onAssignToMe={() => { if (user?.id) updateField('assigneeId', user.id); }} />

          {/* Reporter */}
          <UserPicker label="Reporter" required value={form.reporterId} members={members}
            onChange={id => updateField('reporterId', id)} />
        </div>

        {/* ── Footer ── */}
        <div className="csModalFooter">
          <label className="csCreateAnother">
            <input type="checkbox" checked={createAnother} onChange={e => setCreateAnother(e.target.checked)} />
            Create another
          </label>
          <div className="csFooterActions">
            <button type="button" className="csBtn csCancel" onClick={onClose}>Cancel</button>
            <button type="button" className="csBtn csCreate" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateStoryModal;

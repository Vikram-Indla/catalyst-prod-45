/**
 * CreateStoryModal — Jira-parity "Create Story" dialog.
 * Pixel-perfect match to Jira Cloud's create issue experience.
 * Metadata-driven fields, rich-text description, full CRUD to catalyst_issues.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Maximize2, ChevronDown, Bold, Italic, List, ListOrdered,
  Code2, Link2, Undo, Redo,
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
import './create-story.css';

// ── Helpers ──
const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

const STATUSES = [
  'In Requirements', 'To Do', 'In Design', 'Ready for Development',
  'In Development', 'In QA', 'In UAT', 'In Beta', 'Done',
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

// ── Select Dropdown ──
function SelectField({ label, required, value, options, onChange, placeholder, renderOption, disabled }: {
  label: string;
  required?: boolean;
  value: string;
  options: { value: string; label: string; icon?: React.ReactNode; sublabel?: string }[];
  onChange: (val: string) => void;
  placeholder?: string;
  renderOption?: (opt: any) => React.ReactNode;
  disabled?: boolean;
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
      setSummaryError('You must specify a summary of the issue.');
      summaryRef.current?.focus();
      return;
    }
    setSummaryError('');

    try {
      const result = await createMutation.mutateAsync({ form, projectKey: resolvedKey });
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
      setSummaryError(err?.message ?? 'Failed to create story');
    }
  }, [form, resolvedKey, createMutation, createAnother, onSuccess, onClose, reset]);

  if (!open) return null;

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name, sublabel: p.key }));
  const parentOptions = parentCandidates.map((p: any) => ({
    value: p.id,
    label: `${p.issue_key} ${p.title}`,
    icon: <span className="csParentType">{p.issue_type?.charAt(0)}</span>,
  }));
  const releaseOptions = releases.map((r: any) => ({ value: r.id, label: r.name }));
  const priorityOptions = PRIORITIES.map(p => ({
    value: p,
    label: p,
    icon: <PriorityIcon priority={p} />,
  }));
  const statusOptions = STATUSES.map(s => ({
    value: s,
    label: s.toUpperCase(),
    icon: <span className="csStatusDot" />,
  }));

  return (
    <div className="csOverlay" onClick={onClose}>
      <div className="csModal" ref={modalRef} onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="csModalHeader">
          <h2 className="csModalTitle">Create Story</h2>
          <div className="csModalHeaderActions">
            <button type="button" className="csHeaderBtn"><Maximize2 size={16} /></button>
            <button type="button" className="csHeaderBtn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="csModalBody">
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
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="csLabel">Summary<span className="csRequired"> *</span></label>
              <span className="csCharCount">{form.summary.length}/200</span>
            </div>
            <input
              ref={summaryRef}
              className={`csInput ${summaryError ? 'error' : ''}`}
              placeholder="What needs to be done?"
              value={form.summary}
              maxLength={200}
              onChange={e => { updateField('summary', e.target.value); if (summaryError) setSummaryError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            />
            {summaryError && <div className="csErrorText">{summaryError}</div>}
          </div>

          {/* Parent */}
          <SelectField
            label="Parent"
            required
            value={form.parentId ?? ''}
            options={[{ value: '', label: 'Select parent' }, ...parentOptions]}
            onChange={v => updateField('parentId', v || null)}
            placeholder="Select parent"
          />
          <div className="csHelpText">Your work type hierarchy determines the work items you can select here.</div>

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
              {createMutation.isPending ? 'Creating...' : 'Create Story'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateStoryModal;

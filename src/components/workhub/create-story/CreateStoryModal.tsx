/**
 * CreateStoryModal — Jira Cloud parity "Create" dialog.
 * Fields: Space, Work type, Status, Summary, Parent, Priority, Description,
 *         Fix versions, Assignee, Reporter, Labels.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createPortal } from 'react-dom';
import {
  X, Maximize2, Minus, MoreHorizontal, ChevronDown, ChevronRight,
  Bold, Italic, List, ListOrdered, Code2, Link2, Undo, Redo, ExternalLink, Check,
} from 'lucide-react';
import {
  useCreateStoryForm, useProjects, useTeamMembers,
  useProjectReleases, useCreateStoryMutation,
} from './useCreateStory';
import { useAuth } from '@/hooks/useAuth';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useFixVersions } from '@/modules/project-work-hub/hooks/useFixVersions';
import { StoryRichTextEditor } from '@/modules/project-work-hub/components/story-detail/StoryRichTextEditor';
import './create-story.css';

// ── Helpers ──
const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1', '#2F54EB', '#13C2C2', '#FA541C'];
function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const STATUSES = [
  'In Requirements', 'To Do', 'In Design', 'Ready for Development',
  'In Development', 'In QA', 'In UAT', 'In Beta', 'Done',
];

const WORK_TYPES = [
  'Epic', 'Feature', 'Story', 'Business Gap', 'QA Bug',
  'Production Incident', 'Change Request', 'Task', 'API Requirement',
];

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

/** Jira-native priority SVGs — canonical (from StoryDetailView) */
const PRIORITY_SVG: Record<string, React.ReactNode> = {
  Highest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 8l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 12l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  High: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 10l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Medium: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 6h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 10h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Low: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 6l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Lowest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 4l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 8l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/** Atlassian checkmark */
const CheckmarkSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/** Atlassian-spec dropdown styles */
const ATLASSIAN_DROPDOWN: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 4, border: 'none',
  boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
  padding: '4px 0', zIndex: 9999,
};

/** Avatar — real image or initials fallback (canonical) */
function AvatarCircle({ userId, name, avatarUrl, size = 28 }: { userId: string; name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(userId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.39), fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
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

// ── CreateParentPicker — Canonical from View Story modal (local state, no DB mutation) ──
function CreateParentPicker({ projectKey, value, onChange }: {
  projectKey: string;
  value: string | null;
  onChange: (parentId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Resolve current parent display
  const { data: currentParent } = useQuery({
    queryKey: ['create-story-parent-resolve', value],
    queryFn: async () => {
      if (!value) return null;
      const { data, error } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('id', value).is('deleted_at', null).single();
      if (error) return null;
      return data;
    },
    enabled: !!value,
  });

  // Search epics
  const { data: searchResults = [] } = useQuery({
    queryKey: ['create-story-parent-search-canon', projectKey, search, showDone],
    queryFn: async () => {
      if (!projectKey) return [];
      let query = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', projectKey).eq('issue_type', 'Epic')
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false }).limit(20);
      if (!showDone) query = query.neq('status_category', 'done');
      if (search.trim()) query = query.or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as any[];
    },
    enabled: open && !!projectKey,
  });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchInputRef.current?.focus(), 50); }, [open]);

  const handleSelect = (result: any) => { onChange(result.id); setOpen(false); setSearch(''); };
  const handleClear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(null); };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      {/* Trigger — Jira click-to-edit style (no border when idle) */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        minHeight: 32, padding: '4px 8px',
        border: 'none', borderRadius: 3, cursor: 'pointer', background: 'transparent',
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; setHovered(true); }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; setHovered(false); }}
      >
        {value && currentParent ? (
          <>
            <EpicIconInline />
            <span style={{ flex: 1, fontSize: 14, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentParent.issue_key} {currentParent.summary}
            </span>
            <button type="button" onClick={handleClear} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: '50%', border: 'none',
              background: '#DFE1E6', cursor: 'pointer', color: '#42526E', flexShrink: 0,
              opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#C1C7D0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#DFE1E6')}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B778C" strokeWidth="2" style={{ flexShrink: 0, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}><path d="M6 9l6 6 6-6"/></svg>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 14, color: '#6B778C' }}>None</span>
        )}
      </div>

      {/* Dropdown — Jira parity */}
      {open && (
        <div style={{
          ...ATLASSIAN_DROPDOWN, position: 'absolute', top: '100%', left: 0, marginTop: 4,
          width: Math.max(containerRef.current?.offsetWidth ?? 420, 420),
          maxHeight: 440, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search epics..."
              onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }}
              style={{
                width: '100%', height: 40, padding: '0 12px',
                border: '2px solid #4C9AFF', borderRadius: 3,
                fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#172B4D',
              }} />
          </div>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid #F4F5F7' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#172B4D' }}>
              <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#0052CC', cursor: 'pointer' }} />
              Show done work items
            </label>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {searchResults.map((result: any) => {
              const isActive = result.id === value;
              return (
                <div key={result.id} onClick={() => handleSelect(result)}
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

// ── CreatePriorityPicker — Canonical from View Story modal (local state, no DB mutation) ──
function CreatePriorityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      {/* Jira-style trigger — SVG icon + dark text, no pencil, no colored text */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        padding: '4px 6px', borderRadius: 4, transition: 'background .12s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ display: 'flex', flexShrink: 0 }}>{PRIORITY_SVG[value] ?? PRIORITY_SVG.Medium}</span>
        <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{value}</span>
      </div>
      {open && (
        <div style={{ ...ATLASSIAN_DROPDOWN, position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 200, overflow: 'hidden' }}>
          {PRIORITIES.map(p => (
            <div key={p} onClick={() => { onChange(p); setOpen(false); }}
              style={{
                height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 14, fontWeight: 400, color: '#172B4D',
                background: p === value ? '#DEEBFF' : 'transparent',
              }}
              onMouseEnter={e => { if (p !== value) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (p !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ display: 'flex', flexShrink: 0 }}>{PRIORITY_SVG[p]}</span>
              <span style={{ flex: 1 }}>{p}</span>
              {p === value && <CheckmarkSVG />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
              <AvatarCircle userId={selected.id} name={selected.full_name ?? ''} avatarUrl={selected.avatar_url} size={24} />
              <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{selected.full_name}</span>
            </span>
          ) : 'Automatic'}
        </span>
        <ChevronDown className="csSelectChevron" />
      </button>
      {open && (
        <div className="csDropdown" style={{ ...ATLASSIAN_DROPDOWN, position: 'absolute', width: '100%', minWidth: 280, maxHeight: 340, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input ref={inputRef} placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }}
              style={{
                width: '100%', height: 36, padding: '0 10px',
                border: '2px solid #4C9AFF', borderRadius: 3,
                fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#172B4D',
              }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Unassigned / Automatic */}
            <div onClick={() => { onChange(null); setOpen(false); setSearch(''); }} style={{
              height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', borderBottom: '1px solid #F4F5F7',
              background: !value ? '#DEEBFF' : 'transparent',
            }}
              onMouseEnter={e => { if (value) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = !value ? '#DEEBFF' : 'transparent'; }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: '1px dashed #C1C7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#C1C7D0' }}>?</div>
              <span style={{ fontSize: 14, color: '#6B778C', flex: 1 }}>Automatic</span>
              {!value && <CheckmarkSVG />}
            </div>
            {filtered.map(m => (
              <div key={m.id} onClick={() => { onChange(m.id); setOpen(false); setSearch(''); }}
                style={{
                  height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', background: m.id === value ? '#DEEBFF' : 'transparent',
                }}
                onMouseEnter={e => { if (m.id !== value) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = m.id === value ? '#DEEBFF' : 'transparent'; }}
              >
                <AvatarCircle userId={m.id} name={m.full_name ?? ''} avatarUrl={m.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 400, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</div>
                </div>
                {m.id === value && <CheckmarkSVG />}
              </div>
            ))}
          </div>
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
  const currentProject = projects.find(p => p.id === form.projectId);
  const resolvedKey = currentProject?.key ?? projectKey ?? '';
  const { unreleased: unreleasedVersions, released: releasedVersions, isLoading: versionsLoading } = useFixVersions(resolvedKey || null);

  const [fixVersionSearch, setFixVersionSearch] = useState('');
  const [showFixVersionDropdown, setShowFixVersionDropdown] = useState(false);
  const fixVersionDropdownRef = useRef<HTMLDivElement>(null);
  const createMutation = useCreateStoryMutation();
  const [createAnother, setCreateAnother] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [workType, setWorkType] = useState('Story');
  const [isExpanded, setIsExpanded] = useState(false);
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const summaryRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Set reporter to current user on mount
  useEffect(() => {
    if (user?.id && !form.reporterId) {
      updateField('reporterId', user.id);
    }
  }, [user?.id]);

  // Close fix version dropdown on outside click
  useEffect(() => {
    if (!showFixVersionDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (fixVersionDropdownRef.current && !fixVersionDropdownRef.current.contains(e.target as Node)) {
        setShowFixVersionDropdown(false);
        setFixVersionSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFixVersionDropdown]);

  const handleToggleFixVersion = useCallback((name: string) => {
    const current = form.fixVersions ?? [];
    const updated = current.includes(name) ? current.filter(v => v !== name) : [...current, name];
    updateField('fixVersions', updated);
  }, [form.fixVersions, updateField]);

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

  // currentProject and resolvedKey already defined above

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


  const releaseOptions = releases.map((r: any) => ({ value: r.id, label: r.name }));

  const priorityOptions = PRIORITIES.map(p => ({
    value: p,
    label: p,
    icon: <span style={{ display: 'flex', flexShrink: 0 }}>{PRIORITY_SVG[p]}</span>,
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

          {/* ── KEY DETAILS — collapsible, matches View Story modal ── */}
          <div style={{ marginBottom: 8 }}>
            <div onClick={() => setKeyDetailsOpen(!keyDetailsOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginBottom: 14, padding: '2px 0' }}>
              <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#5E6C84', transition: 'transform 0.2s', transform: keyDetailsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', flexShrink: 0 }}>
                <ChevronDown size={14} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Key details</span>
            </div>
            {keyDetailsOpen && (
              <div>
                {/* Parent — canonical from View Story modal */}
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, minHeight: 28 }}>
                  <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>Parent</span>
                  <div style={{ flex: 1, fontSize: 13, color: '#172B4D' }}>
                    <CreateParentPicker
                      projectKey={resolvedKey}
                      value={form.parentId ?? null}
                      onChange={(parentId) => updateField('parentId', parentId)}
                    />
                  </div>
                </div>

                {/* Priority — canonical from View Story modal */}
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, minHeight: 28 }}>
                  <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>Priority</span>
                  <div style={{ flex: 1 }}>
                    <CreatePriorityPicker value={form.priority} onChange={v => updateField('priority', v)} />
                  </div>
                </div>

                {/* Description — canonical StoryRichTextEditor from View Story modal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 4px 0' }}>
                  <h2 style={{ fontSize: 14, fontWeight: 500, color: 'rgb(80, 82, 88)', lineHeight: '18.67px', margin: 0, padding: 0, fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' }}>Description</h2>
                </div>
                <StoryRichTextEditor
                  content=""
                  workItemId="create-new"
                  onSave={(html) => {
                    updateField('description', html);
                  }}
                  onCancel={() => {}}
                  placeholder="Add a description..."
                  minHeight={150}
                  aiLabel="Improve description"
                />
              </div>
            )}
          </div>

          {/* Fix versions — Jira-parity: multi-select with DEEBFF pills, Unreleased/Released sections */}
          <div className="csField" ref={fixVersionDropdownRef} style={{ position: 'relative' }}>
            <label className="csLabel">Fix versions</label>
            <div
              onClick={() => setShowFixVersionDropdown(!showFixVersionDropdown)}
              style={{
                display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
                padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                minHeight: 36, transition: 'background 0.12s',
                border: showFixVersionDropdown ? '2px solid #4C9AFF' : '2px solid #DFE1E6',
                background: showFixVersionDropdown ? '#FFFFFF' : '#FAFBFC',
              }}
              onMouseEnter={e => { if (!showFixVersionDropdown) e.currentTarget.style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (!showFixVersionDropdown) e.currentTarget.style.background = '#FAFBFC'; }}
            >
              {(form.fixVersions ?? []).length > 0 ? (
                (form.fixVersions ?? []).map((v: string, i: number) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 3,
                    background: '#DEEBFF', color: '#0747A6',
                  }}>
                    {v}
                    <button type="button" onClick={e => { e.stopPropagation(); handleToggleFixVersion(v); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#0747A6' }}>
                      <X size={10} />
                    </button>
                  </span>
                ))
              ) : (
                <span style={{ color: '#6B778C', fontSize: 14 }}>None</span>
              )}
            </div>

            {showFixVersionDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999,
                maxHeight: 320, overflow: 'hidden', marginTop: 2,
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
                  <input
                    autoFocus
                    value={fixVersionSearch}
                    onChange={e => setFixVersionSearch(e.target.value)}
                    placeholder="Search versions..."
                    style={{
                      width: '100%', border: '1px solid #DFE1E6', borderRadius: 4,
                      padding: '6px 10px', fontSize: 13, color: '#172B4D', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#4C9AFF'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#DFE1E6'; }}
                  />
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {versionsLoading && <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>Loading...</div>}

                  {/* Unreleased */}
                  {(() => {
                    const filtered = unreleasedVersions.filter(v => v.name.toLowerCase().includes(fixVersionSearch.toLowerCase()));
                    if (filtered.length === 0) return null;
                    return (
                      <>
                        <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Unreleased</div>
                        {filtered.map(v => {
                          const isSelected = (form.fixVersions ?? []).includes(v.name);
                          return (
                            <div
                              key={v.name}
                              onClick={() => handleToggleFixVersion(v.name)}
                              style={{
                                padding: '8px 16px', fontSize: 14, color: '#172B4D',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: isSelected ? '#DEEBFF' : 'transparent',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? '#DEEBFF' : 'transparent'; }}
                            >
                              <span>{v.name}</span>
                              {isSelected && <Check size={14} color="#0747A6" />}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}

                  {/* Released */}
                  {(() => {
                    const filtered = releasedVersions.filter(v => v.name.toLowerCase().includes(fixVersionSearch.toLowerCase()));
                    if (filtered.length === 0) return null;
                    return (
                      <>
                        <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em', borderTop: '1px solid #F4F5F7' }}>Released</div>
                        {filtered.map(v => {
                          const isSelected = (form.fixVersions ?? []).includes(v.name);
                          return (
                            <div
                              key={v.name}
                              onClick={() => handleToggleFixVersion(v.name)}
                              style={{
                                padding: '8px 16px', fontSize: 14, color: '#172B4D',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: isSelected ? '#DEEBFF' : 'transparent',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? '#DEEBFF' : 'transparent'; }}
                            >
                              <span>{v.name}</span>
                              {isSelected && <Check size={14} color="#0747A6" />}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}

                  {!versionsLoading && unreleasedVersions.length === 0 && releasedVersions.length === 0 && (
                    <div style={{ padding: '16px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No versions found for this project</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Assignee — Jira-parity sidebar style: 12px bold label, 28px avatar */}
          <UserPicker
            label="Assignee"
            value={form.assigneeId}
            members={members}
            onChange={id => updateField('assigneeId', id)}
            showAssignToMe
            onAssignToMe={() => { if (user?.id) updateField('assigneeId', user.id); }}
          />

          {/* Reporter — Jira-parity sidebar style */}
          <UserPicker
            label="Reporter"
            required
            value={form.reporterId}
            members={members}
            onChange={id => updateField('reporterId', id)}
          />

          {/* Labels */}
          <div className="csField">
            <label className="csLabel">Labels</label>
            <div style={{ color: '#6B778C', fontSize: 14, padding: '4px 0' }}>None</div>
          </div>
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

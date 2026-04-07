import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectLabel,
  SelectGroup,
} from '@/components/ui/select';
import { catalystToast as toast } from '@/lib/catalystToast';
import {
  Loader2,
  ChevronsUp,
  ChevronUp,
  Minus,
  ChevronDown,
  ChevronsDown,
  User,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code2,
  Link2,
  Undo2,
  Redo2,
  Search,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

// ─── Priority Config (Jira icons + colors — FIX 6: Medium is ORANGE) ─
const PRIORITIES = [
  { value: 'highest', label: 'Highest', icon: ChevronsUp, color: '#CF2600' },
  { value: 'high',    label: 'High',    icon: ChevronUp,  color: '#E56910' },
  { value: 'medium',  label: 'Medium',  icon: Minus,      color: '#CF7B00' },
  { value: 'low',     label: 'Low',     icon: ChevronDown, color: '#1868DB' },
  { value: 'lowest',  label: 'Lowest',  icon: ChevronsDown, color: '#1868DB' },
] as const;

// ─── Status category dot colors ──────────────────────────
const CAT_DOT: Record<string, string> = {
  todo: '#A5ADBA',
  to_do: '#A5ADBA',
  in_progress: '#0C66E4',
  done: '#1B7F37',
};

// ─── Parent type icons (Epic + Feature) ─────────────────
const PARENT_TYPE_ICONS: Record<string, { symbol: string; color: string }> = {
  Epic:    { symbol: '◆', color: '#7C3AED' },
  Feature: { symbol: '▲', color: '#2563EB' },
};

// ─── Avatar Helper (FIX 8: validate URL, 16px rounded-square) ─
const AVATAR_COLORS = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A', '#0284C7', '#BE123C'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return (name || '').split(' ').map(w => w?.[0] || '').join('').slice(0, 2).toUpperCase();
}
function isValidUrl(str?: string | null): boolean {
  if (!str) return false;
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('data:image');
}

function UserAvatar({ name, url, size = 16 }: { name: string; url?: string | null; size?: number }) {
  if (isValidUrl(url)) {
    return (
      <img
        src={url!}
        alt={name}
        className="shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius: 2 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  const initials = getInitials(name);
  return (
    <div
      className="flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, borderRadius: 2, backgroundColor: getAvatarColor(name), fontSize: size * 0.5 }}
    >
      {initials}
    </div>
  );
}

// ─── Mini Rich Text Editor (FIX 2) ──────────────────────
function DescriptionEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Add a description...' }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[109px] max-h-[200px] overflow-y-auto px-3 py-2 text-[14px] leading-relaxed',
        style: 'color: #292A2E;',
      },
    },
  });

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center justify-center transition-colors"
      style={{
        width: 28, height: 28, borderRadius: 4,
        background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
        color: active ? '#1868DB' : '#505258',
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ border: '1px solid #E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2" style={{ height: 32, borderBottom: '1px solid #E0E0E0', background: '#FFFFFF' }}>
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic size={14} />
        </ToolBtn>
        <div style={{ width: 1, height: 16, background: '#E0E0E0', margin: '0 4px' }} />
        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List size={14} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered size={14} />
        </ToolBtn>
        <div style={{ width: 1, height: 16, background: '#E0E0E0', margin: '0 4px' }} />
        <ToolBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">
          <Code2 size={14} />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('link')}
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run();
            } else {
              const url = window.prompt('URL');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          title="Link"
        >
          <Link2 size={14} />
        </ToolBtn>
        <div style={{ width: 1, height: 16, background: '#E0E0E0', margin: '0 4px' }} />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo2 size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo2 size={14} />
        </ToolBtn>
      </div>
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────
interface WorkflowStatus {
  id: string;
  name: string;
  category?: string;
  position?: number;
  is_default?: boolean | null;
}

interface CreateStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  projectId: string;
}

export const CreateStoryDialog: React.FC<CreateStoryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [showDoneParents, setShowDoneParents] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [statusId, setStatusId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [reporterId, setReporterId] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [createAnother, setCreateAnother] = useState(false);

  useEffect(() => {
    if (isOpen) setTimeout(() => titleRef.current?.focus(), 150);
  }, [isOpen]);

  // ─── Resolve project key + ph_projects ID ──
  // The projectId prop comes from the `projects` table. We need:
  // - projectKey (e.g. "BAU") for querying ph_issues
  // - phProjectId (UUID) for querying ph_workflow_statuses + ph_work_items
  const { data: projectLookup } = useQuery({
    queryKey: ['project-lookup-for-dialog', projectId],
    queryFn: async () => {
      // Get key from projects table
      const { data: proj } = await supabase
        .from('projects')
        .select('key')
        .eq('id', projectId)
        .maybeSingle();
      const key = proj?.key?.toUpperCase() || '';

      // Find ph_projects ID by key
      let phId = projectId;
      if (key) {
        const { data: phProj } = await supabase
          .from('ph_projects')
          .select('id')
          .eq('key', key)
          .maybeSingle();
        if (phProj) phId = phProj.id;
      }
      return { key, phId };
    },
    enabled: isOpen && !!projectId,
  });

  const projectKey = projectLookup?.key || '';
  const resolvedProjectId = projectLookup?.phId || projectId;

  // ─── Data Queries ────────────────────────────────────────

  // Parent items: Epics + Features from ph_issues (same source as Epic Backlog)
  const { data: parentItems, isLoading: parentsLoading } = useQuery({
    queryKey: ['parent-items-for-story', projectKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, issue_type, summary, status, status_category')
        .eq('project_key', projectKey)
        .in('issue_type', ['Epic', 'Feature'])
        .is('jira_removed_at', null)
        .order('issue_key');
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        key: d.issue_key,
        type: d.issue_type,
        title: d.summary,
        status: d.status,
        statusCategory: d.status_category,
      }));
    },
    enabled: isOpen && !!projectKey,
  });

  const allParents = parentItems || [];

  // Filter parents by search + done toggle
  const filteredParents = React.useMemo(() => {
    let items = allParents;
    if (!showDoneParents) {
      items = items.filter(p => p.statusCategory !== 'done' && p.statusCategory !== 'Done');
    }
    if (parentSearch.trim()) {
      const q = parentSearch.toLowerCase();
      items = items.filter(p =>
        p.key?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allParents, showDoneParents, parentSearch]);

  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-story'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles').select('id, full_name, avatar_url').order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    enabled: isOpen,
  });

  // Try ph_workflow_statuses first (by ph_projects.id), fall back to ph_issues distinct statuses
  const { data: workflowStatuses } = useQuery({
    queryKey: ['workflow-statuses-for-dialog', resolvedProjectId, projectKey],
    queryFn: async () => {
      // 1. Try ph_workflow_statuses with resolved ph_projects ID
      const { data: wfData } = await supabase
        .from('ph_workflow_statuses')
        .select('id, name, category, position, is_default')
        .eq('project_id', resolvedProjectId)
        .order('position');
      if (wfData && wfData.length > 0) {
        return wfData as WorkflowStatus[];
      }

      // 2. Fallback: derive statuses from ph_issues for this project
      if (projectKey) {
        const { data: issueStatuses } = await supabase
          .from('ph_issues')
          .select('status, status_category')
          .eq('project_key', projectKey)
          .is('jira_removed_at', null);
        if (issueStatuses && issueStatuses.length > 0) {
          // Deduplicate
          const seen = new Map<string, { name: string; category: string }>();
          for (const s of issueStatuses) {
            if (s.status && !seen.has(s.status)) {
              seen.set(s.status, { name: s.status, category: s.status_category || 'todo' });
            }
          }
          return Array.from(seen.entries()).map(([name, v], i) => ({
            id: `derived-${name}`,
            name: v.name,
            category: v.category?.toLowerCase().replace(/\s+/g, '_') || 'todo',
            position: i,
            is_default: v.name.toUpperCase().includes('REQUIREMENTS'),
          })) as WorkflowStatus[];
        }
      }
      return [] as WorkflowStatus[];
    },
    enabled: isOpen && (!!resolvedProjectId || !!projectKey),
  });

  const { data: releases } = useQuery({
    queryKey: ['releases-for-story', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases').select('id, name, status').order('release_date');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (currentUser?.id && !reporterId) setReporterId(currentUser.id);
  }, [currentUser?.id, reporterId]);

  useEffect(() => {
    if (workflowStatuses && workflowStatuses.length > 0 && !statusId) {
      const inReq = workflowStatuses.find(s =>
        s.name?.toUpperCase().replace(/\s+/g, ' ').trim() === 'IN REQUIREMENTS'
      );
      if (inReq) setStatusId(inReq.id);
      else {
        const firstTodo = workflowStatuses.find(s => s.category === 'todo');
        setStatusId(firstTodo?.id || workflowStatuses[0].id);
      }
    }
  }, [workflowStatuses, statusId]);

  const groupedStatuses = React.useMemo(() => {
    if (!workflowStatuses) return { todo: [], in_progress: [], done: [] };
    const groups: Record<string, WorkflowStatus[]> = { todo: [], in_progress: [], done: [] };
    for (const s of workflowStatuses) {
      const cat = s.category || 'todo';
      if (groups[cat]) groups[cat].push(s);
      else groups.todo.push(s);
    }
    return groups;
  }, [workflowStatuses]);

  // ─── Mutation ────────────────────────────────────────────

  const createStory = useMutation({
    mutationFn: async (d: { title: string; name: string; description?: string; feature_id: string; parent_id?: string; priority?: string; assignee_id?: string; owner_id?: string }) => {
      const { data, error } = await supabase
        .from('stories')
        .insert({ title: d.title, name: d.name, description: d.description || null, feature_id: d.feature_id, priority: d.priority || 'medium', assignee_id: d.assignee_id || null, owner_id: d.owner_id || null, status: 'todo' })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      toast.success('Story created', 'The story has been created successfully.');
      if (createAnother) { resetForm(); setTimeout(() => titleRef.current?.focus(), 100); }
      else { resetForm(); onClose(); onSuccess?.(); }
    },
    onError: (error: any) => { toast.error('Failed to create story', error.message); },
  });

  const resetForm = () => {
    setTitle(''); setParentId(''); setParentSearch(''); setDescription(''); setPriority('medium');
    setStatusId(''); setAssigneeId(''); setReporterId(currentUser?.id || ''); setReleaseId('');
  };

  const handleSubmit = () => {
    if (!title.trim() || !parentId || !reporterId) return;
    createStory.mutate({
      title: title.trim(), name: title.trim(), description: description || undefined,
      feature_id: parentId, parent_id: parentId, priority: priority || 'medium',
      assignee_id: assigneeId && assigneeId !== '__none__' ? assigneeId : undefined,
      owner_id: reporterId && reporterId !== '__none__' ? reporterId : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
  };

  const handleClose = () => { resetForm(); onClose(); };
  const isValid = title.trim().length >= 3 && parentId && reporterId;
  const findProfile = (id: string) => profiles?.find(p => p.id === id);
  const selectedReporter = findProfile(reporterId);
  const selectedAssignee = findProfile(assigneeId);
  const selectedStatus = workflowStatuses?.find(s => s.id === statusId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        size="xl"
        className="!max-w-[800px] !rounded-[3px] !bg-white max-h-[90vh] overflow-hidden flex flex-col !p-0"
        style={{ boxShadow: 'rgba(30,31,33,0.15) 0px 8px 12px 0px, rgba(30,31,33,0.31) 0px 0px 1px 0px' }}
        onKeyDown={handleKeyDown}
      >
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <DialogTitle className="text-[20px] tracking-[-0.01em]" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 653, color: '#292A2E' }}>
            Create Story
          </DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ROW 1: Status lozenge */}
            <div>
              <Label className="text-[12px] font-semibold mb-1 block" style={{ color: '#505258' }}>Status</Label>
              <Select value={statusId} onValueChange={setStatusId} disabled={createStory.isPending}>
                <SelectTrigger className="h-8 w-auto min-w-[180px] inline-flex border-0" style={{ background: 'rgba(5,21,36,0.06)', borderRadius: 3, fontSize: 14, fontWeight: 500, color: '#292A2E' }}>
                  <SelectValue placeholder="Select status">
                    {selectedStatus && (
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CAT_DOT[selectedStatus.category || 'todo'] || '#A5ADBA' }} />
                        <span>{selectedStatus.name?.toUpperCase()}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[280px] max-h-[400px]">
                  {/* TO DO category */}
                  {groupedStatuses.todo.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: '#505258' }}>To Do</SelectLabel>
                      {groupedStatuses.todo.map(s => (
                        <SelectItem key={s.id} value={s.id} className="!py-2.5 !pl-4">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#A5ADBA' }} />
                            <span className="text-[14px] font-medium" style={{ color: '#292A2E' }}>{s.name?.toUpperCase()}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {/* IN PROGRESS category */}
                  {groupedStatuses.in_progress.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: '#505258' }}>In Progress</SelectLabel>
                      {groupedStatuses.in_progress.map(s => (
                        <SelectItem key={s.id} value={s.id} className="!py-2.5 !pl-4">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#0C66E4' }} />
                            <span className="text-[14px] font-medium" style={{ color: '#292A2E' }}>{s.name?.toUpperCase()}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {/* DONE category */}
                  {groupedStatuses.done.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: '#505258' }}>Done</SelectLabel>
                      {groupedStatuses.done.map(s => (
                        <SelectItem key={s.id} value={s.id} className="!py-2.5 !pl-4">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#1B7F37' }} />
                            <span className="text-[14px] font-medium" style={{ color: '#292A2E' }}>{s.name?.toUpperCase()}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[12px] mt-1" style={{ color: '#6B6E76' }}>This is the initial status upon creation</p>
            </div>

            {/* ROW 2: Summary */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[12px] font-semibold" style={{ color: '#505258' }}>Summary <span style={{ color: '#AE2E24' }}>*</span></Label>
                <span className="text-[12px]" style={{ color: '#6B6E76' }}>{title.length}/200</span>
              </div>
              <Input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value.slice(0, 200))} placeholder="What needs to be done?" disabled={createStory.isPending} className="!border-t-0 !border-l-0 !border-r-0 !rounded-none !rounded-b-[3px] !bg-transparent focus:!ring-0" style={{ height: 36, borderBottom: '0.5px solid #8C8F97', fontSize: 14, color: '#292A2E' }} />
              {title.length > 0 && title.length < 3 && <p className="text-[12px] mt-1" style={{ color: '#AE2E24' }}>Title must be at least 3 characters</p>}
            </div>

            {/* ROW 3: Parent (Epic or Feature) */}
            <div>
              <Label className="text-[12px] font-semibold mb-1 block" style={{ color: '#505258' }}>Parent <span style={{ color: '#AE2E24' }}>*</span></Label>
              <Select value={parentId} onValueChange={setParentId} disabled={parentsLoading || createStory.isPending}>
                <SelectTrigger style={{ width: 350, height: 40, border: '1px solid #8C8F97', borderRadius: 3 }}>
                  <SelectValue placeholder={parentsLoading ? 'Loading...' : 'Select parent'}>
                    {parentId && (() => {
                      const sel = allParents.find(p => p.id === parentId);
                      if (!sel) return null;
                      const ti = PARENT_TYPE_ICONS[sel.type] || PARENT_TYPE_ICONS.Feature;
                      const projPrefix = sel.key?.split('-')[0] || '';
                      return (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0 text-[8px] font-bold uppercase px-1 rounded" style={{ backgroundColor: '#F1F5F9', color: '#505258' }}>{projPrefix}</span>
                          <span style={{ color: ti.color, fontSize: 11 }}>{ti.symbol}</span>
                          <span className="truncate text-[13px]">{sel.key} · {sel.title}</span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {/* Search */}
                  <div className="px-2 py-1.5 border-b" style={{ borderColor: '#E0E0E0' }}>
                    <div className="relative">
                      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        placeholder="Search by key or title..."
                        className="w-full pl-7 pr-2 py-1.5 text-[13px] rounded border focus:outline-none focus:ring-1 focus:ring-[#1868DB] bg-transparent"
                        style={{ borderColor: '#E0E0E0', height: 30, color: '#292A2E' }}
                      />
                    </div>
                  </div>
                  {/* Show done toggle */}
                  <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: '#E0E0E0' }}>
                    <Checkbox
                      id="show-done-parents"
                      checked={showDoneParents}
                      onCheckedChange={(c) => setShowDoneParents(c === true)}
                      className="w-3.5 h-3.5"
                    />
                    <label htmlFor="show-done-parents" className="text-[13px] cursor-pointer select-none" style={{ color: '#292A2E' }}>
                      Show everything marked as done
                    </label>
                  </div>
                  {/* Items */}
                  {filteredParents.length === 0 && (
                    <div className="px-3 py-4 text-[13px] text-center text-muted-foreground">No matching items found.</div>
                  )}
                  {filteredParents.map((p) => {
                    const ti = PARENT_TYPE_ICONS[p.type] || PARENT_TYPE_ICONS.Feature;
                    const projPrefix = p.key?.split('-')[0] || '';
                    return (
                      <SelectItem key={p.id} value={p.id} className="!py-2.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {/* Project badge */}
                            <span className="shrink-0 text-[9px] font-bold uppercase px-1 py-0.5 rounded" style={{ backgroundColor: '#F1F5F9', color: '#505258', letterSpacing: '0.04em' }}>
                              {projPrefix}
                            </span>
                            {/* Type icon */}
                            <span className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0" style={{ backgroundColor: ti.color }}>
                              <span className="text-white text-[9px] font-bold leading-none">{ti.symbol === '◆' ? '⚡' : '▲'}</span>
                            </span>
                            {/* Issue key */}
                            <span className="text-[12px] font-semibold" style={{ color: '#0C66E4' }}>{p.key}</span>
                          </div>
                          <span className="text-[13px] truncate max-w-[320px] pl-[1px]" style={{ color: '#292A2E' }}>{p.title}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[12px] mt-1" style={{ color: '#6B6E76' }}>Your work type hierarchy determines the work items you can select here.</p>
            </div>

            {/* ROW 4: Priority */}
            <div>
              <Label className="text-[12px] font-semibold mb-1 block" style={{ color: '#505258' }}>Priority</Label>
              <Select value={priority} onValueChange={setPriority} disabled={createStory.isPending}>
                <SelectTrigger style={{ width: 350, height: 40, border: '1px solid #8C8F97', borderRadius: 3 }}><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => { const Icon = p.icon; return (<SelectItem key={p.value} value={p.value}><div className="flex items-center gap-2"><Icon size={16} style={{ color: p.color }} /><span>{p.label}</span></div></SelectItem>); })}</SelectContent>
              </Select>
            </div>

            {/* ROW 5: Description (TipTap rich text) */}
            <div>
              <Label className="text-[12px] font-semibold mb-1 block" style={{ color: '#505258' }}>Description</Label>
              <DescriptionEditor value={description} onChange={setDescription} />
            </div>

            {/* ROW 6: Target Release */}
            <div>
              <Label className="text-[12px] font-semibold mb-1 block" style={{ color: '#505258' }}>Target Release</Label>
              <Select value={releaseId} onValueChange={setReleaseId} disabled={createStory.isPending}>
                <SelectTrigger style={{ width: 350, height: 40, border: '1px solid #8C8F97', borderRadius: 3 }}><SelectValue placeholder="Select release" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__"><span className="text-muted-foreground">None</span></SelectItem>{releases?.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>

            {/* ROW 7: Assignee */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[12px] font-semibold" style={{ color: '#505258' }}>Assignee</Label>
                {currentUser?.id && <button type="button" onClick={() => setAssigneeId(currentUser.id)} className="text-[13px] font-medium hover:underline" style={{ color: '#1868DB' }}>Assign to me</button>}
              </div>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={createStory.isPending}>
                <SelectTrigger style={{ height: 40, border: '1px solid #8C8F97', borderRadius: 3 }}>
                  <SelectValue placeholder="Automatic">
                    {selectedAssignee ? (<div className="flex items-center gap-2"><UserAvatar name={selectedAssignee.full_name} url={selectedAssignee.avatar_url} /><span>{selectedAssignee.full_name}</span></div>) : (<div className="flex items-center gap-2"><User size={16} className="text-muted-foreground" /><span>Automatic</span></div>)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__"><div className="flex items-center gap-2"><User size={16} className="text-muted-foreground" /><span>Unassigned</span></div></SelectItem>
                  {profiles?.map(p => (<SelectItem key={p.id} value={p.id}><div className="flex items-center gap-2"><UserAvatar name={p.full_name} url={p.avatar_url} /><span>{p.full_name}</span></div></SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* ROW 8: Reporter */}
            <div>
              <Label className="text-[12px] font-semibold mb-1 block" style={{ color: '#505258' }}>Reporter <span style={{ color: '#AE2E24' }}>*</span></Label>
              <Select value={reporterId} onValueChange={setReporterId} disabled={createStory.isPending}>
                <SelectTrigger style={{ width: 350, height: 40, border: '1px solid #8C8F97', borderRadius: 3 }}>
                  <SelectValue placeholder="Select reporter">{selectedReporter && (<div className="flex items-center gap-2"><UserAvatar name={selectedReporter.full_name} url={selectedReporter.avatar_url} /><span>{selectedReporter.full_name}</span></div>)}</SelectValue>
                </SelectTrigger>
                <SelectContent>{profiles?.map(p => (<SelectItem key={p.id} value={p.id}><div className="flex items-center gap-2"><UserAvatar name={p.full_name} url={p.avatar_url} /><span>{p.full_name}</span></div></SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2">
            <Checkbox id="create-another" checked={createAnother} onCheckedChange={(c) => setCreateAnother(c === true)} />
            <Label htmlFor="create-another" className="text-[14px] cursor-pointer select-none" style={{ color: '#292A2E' }}>Create another</Label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={createStory.isPending} style={{ color: '#505258', height: 32, borderRadius: 3, fontSize: 14, fontWeight: 500 }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isValid || createStory.isPending} className="hover:opacity-90" style={{ backgroundColor: '#1868DB', color: '#FFFFFF', height: 32, borderRadius: 3, fontSize: 14, fontWeight: 500 }}>
              {createStory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

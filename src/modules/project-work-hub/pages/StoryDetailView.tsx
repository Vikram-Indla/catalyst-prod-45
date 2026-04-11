/**
 * StoryDetailView — Full-page two-panel Jira-style story detail
 * Matches Jira's layout: Key Details, Description, Child Issues, Linked Items, Activity
 * Right sidebar: Status, Details (fix versions, assignee, reporter, labels), Metadata
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Minus, ChevronUp, ChevronsUp, ChevronsDown,
  Plus, MoreHorizontal, X, Search,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StoryDetailHeader } from '../components/story-detail/StoryDetailHeader';
import { StoryDetailSidebar } from '../components/story-detail/StoryDetailSidebar';
import { StoryActivitySection } from '../components/story-detail/StoryActivitySection';
import { StoryRichTextEditor } from '../components/story-detail/StoryRichTextEditor';
import { resolveDisplayHtml } from '../components/story-detail/adf-utils';
import {
  useStoryDetail, useStoryComments, useStoryHistory,
  useStorySiblings, useParentCandidates, useTeamMembers,
  useUpdateStoryField, useAddStoryComment, useDeleteStoryComment,
  useChildIssues, useLinkedIssues,
} from '../components/story-detail/useStoryDetailData';
import { getInitials, STORY_STATUS_LOZENGE, getLozengeStyle } from '../utils/backlog.utils';

// ─── Priority config ─────────────────────────────────────────
const PRIORITY_OPTIONS = [
  { value: 'Highest', label: 'Highest', color: '#CF2600', Icon: ChevronsUp },
  { value: 'High',    label: 'High',    color: '#E56910', Icon: ChevronUp },
  { value: 'Medium',  label: 'Medium',  color: '#CF7B00', Icon: Minus },
  { value: 'Low',     label: 'Low',     color: '#1868DB', Icon: ChevronDown },
  { value: 'Lowest',  label: 'Lowest',  color: '#1868DB', Icon: ChevronsDown },
];

// ─── Status lozenge helper ───────────────────────────────────
function getStatusBadge(status: string | null) {
  if (!status) return null;
  const cfg = STORY_STATUS_LOZENGE[status];
  if (cfg) {
    const s = getLozengeStyle(cfg.color);
    return { bg: s.bg, text: s.text, label: cfg.label };
  }
  return { bg: '#DFE1E6', text: '#42526E', label: status.toUpperCase() };
}

const SECTION_HEADING: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#505258', textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const FIELD_LABEL: React.CSSProperties = {
  width: 120, flexShrink: 0, fontSize: 13, fontWeight: 400, color: '#6B6E76',
};

// Deterministic epic color from issue_key
const EPIC_COLORS = ['#0052CC', '#6554C0', '#00875A', '#36B37E', '#FF8B00', '#FF5630', '#00B8D9', '#8777D9'];
function getEpicColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return EPIC_COLORS[Math.abs(hash) % EPIC_COLORS.length];
}

interface StoryDetailViewProps {
  projectId: string;
  projectKey: string;
  itemId: string;
}

export default function StoryDetailView({ projectId, projectKey, itemId }: StoryDetailViewProps) {
  const navigate = useNavigate();

  // ─── Data hooks ────────────────────────────────────────────
  const { data: story, isLoading, error } = useStoryDetail(itemId);
  const { data: comments = [], isLoading: commentsLoading } = useStoryComments(story?.issue_key || null);
  const { data: history = [], isLoading: historyLoading } = useStoryHistory(story?.issue_key || null);
  const { data: siblings = [] } = useStorySiblings(projectId);
  const { data: parentCandidates = [] } = useParentCandidates(projectKey);
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: childIssues = [] } = useChildIssues(story?.issue_key || null);
  const { data: linkedIssues = [] } = useLinkedIssues(story?.issue_key || null);
  const updateField = useUpdateStoryField(itemId);
  const addComment = useAddStoryComment(story?.issue_key || null);
  const deleteComment = useDeleteStoryComment(story?.issue_key || null);

  // ─── Local state ───────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingAC, setEditingAC] = useState(false);
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [linkedOpen, setLinkedOpen] = useState(true);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [showDoneParents, setShowDoneParents] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ─── Prev/Next navigation ─────────────────────────────────
  const currentIndex = useMemo(() => siblings.findIndex(s => s.id === itemId), [siblings, itemId]);
  const handlePrev = currentIndex > 0
    ? () => navigate(`/project-hub/${projectKey}/story/${siblings[currentIndex - 1].id}`)
    : null;
  const handleNext = currentIndex >= 0 && currentIndex < siblings.length - 1
    ? () => navigate(`/project-hub/${projectKey}/story/${siblings[currentIndex + 1].id}`)
    : null;

  // ─── Handlers ──────────────────────────────────────────────
  const handleUpdateField = useCallback((field: string, value: any) => {
    updateField.mutate({ field, value });
  }, [updateField]);

  const handleTitleSave = useCallback(() => {
    if (titleValue.trim() && titleValue !== story?.summary) {
      handleUpdateField('summary', titleValue.trim());
    }
    setEditingTitle(false);
  }, [titleValue, story?.summary, handleUpdateField]);

  const handleStartTitleEdit = useCallback(() => {
    setTitleValue(story?.summary || '');
    setEditingTitle(true);
  }, [story?.summary]);

  const handleDescSave = useCallback((adfJson: string) => {
    handleUpdateField('description_text', adfJson);
    setEditingDesc(false);
  }, [handleUpdateField]);

  const handleACSave = useCallback((adfJson: string) => {
    handleUpdateField('acceptance_criteria', adfJson);
    setEditingAC(false);
  }, [handleUpdateField]);

  const handleAddComment = useCallback((body: string) => {
    addComment.mutate({ body, authorName: 'Current User' });
  }, [addComment]);

  const handleDeleteComment = useCallback((id: string) => {
    deleteComment.mutate(id);
  }, [deleteComment]);

  const confirmDelete = useCallback(async () => {
    handleUpdateField('status', 'Cancelled');
    setDeleteDialogOpen(false);
    navigate(`/project-hub/${projectKey}/story-backlog`);
  }, [handleUpdateField, navigate, projectKey]);

  // ─── Priority helpers ──────────────────────────────────────
  const currentPriority = PRIORITY_OPTIONS.find(
    p => p.value.toLowerCase() === (story?.priority || '').toLowerCase()
  ) || PRIORITY_OPTIONS[2];

  // ─── Subtask progress ─────────────────────────────────────
  const subtasksDone = childIssues.filter(c => c.status_category === 'Done' || c.status_category === 'done').length;
  const subtasksTotal = childIssues.length;
  const subtasksPct = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  // ─── Loading / Error states ────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E0E0E0', borderTopColor: '#1868DB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <span style={{ color: '#6B6E76', fontSize: 13 }}>Loading story...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#DC2626', fontSize: 14, marginBottom: 12 }}>Failed to load story</p>
          <button onClick={() => navigate(`/project-hub/${projectKey}/story-backlog`)}
            style={{ fontSize: 13, color: '#1868DB', background: 'none', border: 'none', cursor: 'pointer' }}>
            Back to backlog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Header */}
      <StoryDetailHeader
        projectKey={projectKey}
        issueKey={story.issue_key}
        issueType={story.issue_type}
        parentEpic={story.parentEpic}
        parentCandidates={parentCandidates}
        onPrev={handlePrev}
        onNext={handleNext}
        onAddParent={() => setParentPickerOpen(true)}
        onSelectParent={(key) => handleUpdateField('parent_key', key)}
      />

      {/* Two-panel layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div style={{ flex: 1, minWidth: 500, overflowY: 'auto', background: '#FFFFFF' }}>

          {/* ── Title (inline editable) ── */}
          <div style={{ padding: '24px 32px 8px' }}>
            {editingTitle ? (
              <input value={titleValue} onChange={e => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                autoFocus
                style={{ width: '100%', fontSize: 24, fontWeight: 600, color: '#292A2E', border: '2px solid #1868DB', borderRadius: 4, padding: '4px 8px', outline: 'none', fontFamily: "'Sora', sans-serif", lineHeight: 1.2 }}
              />
            ) : (
              <h1 onClick={handleStartTitleEdit}
                style={{ fontSize: 24, fontWeight: 600, color: '#292A2E', lineHeight: 1.2, margin: 0, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
                {story.summary || <span style={{ fontStyle: 'italic', color: '#6B6E76' }}>Click to add title...</span>}
              </h1>
            )}
          </div>

          {/* ── Key Details (collapsible) ── */}
          <div style={{ padding: '8px 32px 0' }}>
            <button onClick={() => setKeyDetailsOpen(!keyDetailsOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', ...SECTION_HEADING, padding: '4px 0' }}>
              {keyDetailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Key details
            </button>

            {keyDetailsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0 20px' }}>
                {/* Parent */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={FIELD_LABEL}>Parent</span>
                  <Popover open={parentPickerOpen} onOpenChange={(o) => { setParentPickerOpen(o); if (!o) { setParentSearch(''); } }}>
                    <PopoverTrigger asChild>
                      <button style={{
                        background: 'none', border: '1px solid transparent', borderRadius: 4, cursor: 'pointer',
                        fontSize: 14, color: story.parentEpic ? '#172B4D' : '#6B6E76', padding: '4px 8px', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
                        transition: 'border-color 150ms',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#DFE1E6')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                      >
                        {story.parentEpic ? (
                          <>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: getEpicColor(story.parentEpic.epic_key), flexShrink: 0 }} />
                            <JiraIssueTypeIcon type="epic" size={16} />
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#172B4D', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties}>
                              {story.parentEpic.epic_key} {story.parentEpic.name}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpdateField('parent_key', null); }}
                              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6B6E76', flexShrink: 0 }}
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <span style={{ color: '#6B6E76' }}>None</span>
                        )}
                        <ChevronDown size={14} style={{ marginLeft: story.parentEpic ? 0 : 'auto', color: '#6B6E76', flexShrink: 0 }} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" style={{ width: 420, padding: 0, maxHeight: 400, display: 'flex', flexDirection: 'column' }} sideOffset={4}>
                      {/* Search */}
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #E0E0E0', position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                          placeholder="Search epics..."
                          value={parentSearch}
                          onChange={e => setParentSearch(e.target.value)}
                          autoFocus
                          style={{
                            width: '100%', height: 32, paddingLeft: 30, paddingRight: 8, border: '2px solid #2563EB',
                            borderRadius: 4, fontSize: 13, outline: 'none', background: '#FFFFFF', color: '#172B4D',
                          }}
                        />
                      </div>
                      {/* Show done filter */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, color: '#505258', cursor: 'pointer', borderBottom: '1px solid #F0F0F0' }}>
                        <input type="checkbox" checked={showDoneParents} onChange={e => setShowDoneParents(e.target.checked)} style={{ accentColor: '#2563EB' }} />
                        Show done work items
                      </label>
                      {/* List */}
                      <div style={{ overflowY: 'auto', maxHeight: 300 }}>
                        {parentCandidates
                          .filter(p => {
                            const matchesSearch = !parentSearch || p.summary?.toLowerCase().includes(parentSearch.toLowerCase()) || p.issue_key?.toLowerCase().includes(parentSearch.toLowerCase());
                            const isDone = p.status_category?.toLowerCase() === 'done';
                            return matchesSearch && (showDoneParents || !isDone);
                          })
                          .map(p => {
                            const isSelected = story.parent_key === p.issue_key;
                            return (
                              <button
                                key={p.id}
                                onClick={() => { handleUpdateField('parent_key', p.issue_key); setParentPickerOpen(false); setParentSearch(''); }}
                                style={{
                                  width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                  background: isSelected ? '#DEEBFF' : 'transparent', display: 'flex', alignItems: 'flex-start', gap: 8,
                                }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F4F5F7'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                              >
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: getEpicColor(p.issue_key), flexShrink: 0, marginTop: 4 }} />
                                <JiraIssueTypeIcon type="epic" size={16} />
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#505258' }}>{p.issue_key}</span>
                                  <span style={{ fontSize: 13, color: '#172B4D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.summary}</span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Priority */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={FIELD_LABEL}>Priority</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 14, color: '#292A2E' }}>
                        <currentPriority.Icon size={16} color={currentPriority.color} />
                        {currentPriority.label}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" style={{ width: 200, padding: 4 }}>
                      {PRIORITY_OPTIONS.map(p => (
                        <button key={p.value} onClick={() => handleUpdateField('priority', p.value)}
                          style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: (story.priority || '').toLowerCase() === p.value.toLowerCase() ? 'rgba(37,99,235,0.08)' : 'transparent', color: '#292A2E', borderRadius: 3 }}>
                          <p.Icon size={16} color={p.color} /> {p.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* ── Description (ADF editor) ── */}
          <div style={{ padding: '0 32px 24px' }}>
            <div style={{ ...SECTION_HEADING, marginBottom: 8 }}>Description</div>
            {editingDesc ? (
              <StoryRichTextEditor
                content={story.description_text || ''}
                onSave={handleDescSave}
                onCancel={() => setEditingDesc(false)}
                placeholder="Add a description..."
              />
            ) : (
              <div onClick={() => setEditingDesc(true)}
                style={{ fontSize: 14, lineHeight: 1.6, color: story.description_text ? '#292A2E' : '#6B6E76', fontStyle: story.description_text ? 'normal' : 'italic', cursor: 'text', minHeight: 40, padding: '8px 0' }}>
                {story.description_text ? (
                  <div dangerouslySetInnerHTML={{ __html: resolveDisplayHtml(story.description_text) }} />
                ) : 'Add a description...'}
              </div>
            )}
          </div>

          {/* ── Acceptance Criteria (ADF editor) ── */}
          <div style={{ padding: '0 32px 24px' }}>
            <div style={{ ...SECTION_HEADING, marginBottom: 8 }}>Acceptance Criteria</div>
            {editingAC ? (
              <StoryRichTextEditor
                content={(story as any).acceptance_criteria || ''}
                onSave={handleACSave}
                onCancel={() => setEditingAC(false)}
                placeholder="Add acceptance criteria..."
                minHeight={120}
              />
            ) : (
              <div onClick={() => setEditingAC(true)}
                style={{ fontSize: 14, lineHeight: 1.6, color: (story as any).acceptance_criteria ? '#292A2E' : '#6B6E76', fontStyle: (story as any).acceptance_criteria ? 'normal' : 'italic', cursor: 'text', minHeight: 40, padding: '8px 0' }}>
                {(story as any).acceptance_criteria ? (
                  <div dangerouslySetInnerHTML={{ __html: resolveDisplayHtml((story as any).acceptance_criteria) }} />
                ) : 'Add acceptance criteria...'}
              </div>
            )}
          </div>

          {/* ── Subtasks / Child Issues ── */}
          {childIssues.length > 0 && (
            <div style={{ padding: '0 32px 24px' }}>
              <button onClick={() => setSubtasksOpen(!subtasksOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', ...SECTION_HEADING, padding: '4px 0', marginBottom: 8, width: '100%' }}>
                {subtasksOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Subtasks
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MoreHorizontal size={14} color="#94A3B8" />
                  <Plus size={14} color="#94A3B8" />
                </span>
              </button>

              {subtasksOpen && (
                <>
                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${subtasksPct}%`, height: '100%', background: subtasksPct === 100 ? '#22C55E' : '#2563EB', borderRadius: 3, transition: 'width 300ms' }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#505258', fontWeight: 500, whiteSpace: 'nowrap' }}>{subtasksPct}% Done</span>
                  </div>

                  {/* Subtask table */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', height: 32, padding: '0 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                      <div style={{ flex: 1 }}>Work</div>
                      <div style={{ width: 70 }}>Priority</div>
                      <div style={{ width: 80 }}>Points</div>
                      <div style={{ width: 100 }}>Assignee</div>
                      <div style={{ width: 120 }}>Status</div>
                    </div>
                    {/* Rows */}
                    {childIssues.map(child => {
                      const badge = getStatusBadge(child.status);
                      const childPriority = PRIORITY_OPTIONS.find(p => p.value.toLowerCase() === (child.priority || '').toLowerCase());
                      return (
                        <div key={child.id}
                          onClick={() => navigate(`/project-hub/${projectKey}/story/${child.id}`)}
                          className="group"
                          style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 12px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', fontSize: 13 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                            <JiraIssueTypeIcon type={child.issue_type || 'subtask'} size={16} />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#1868DB', fontWeight: 500 }}>{child.issue_key}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#292A2E' }}>{child.summary}</span>
                          </div>
                          <div style={{ width: 70, display: 'flex', alignItems: 'center' }}>
                            {childPriority && <childPriority.Icon size={14} color={childPriority.color} />}
                          </div>
                          <div style={{ width: 80, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#505258' }}>
                            {child.story_points ?? '—'}
                          </div>
                          <div style={{ width: 100, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
                              {getInitials(child.assignee_display_name)}
                            </div>
                            <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#505258' }}>
                              {child.assignee_display_name ? child.assignee_display_name.split(' ')[0]?.[0] + '..' : '—'}
                            </span>
                          </div>
                          <div style={{ width: 120 }}>
                            {badge && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: badge.bg, color: badge.text }}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Linked Work Items ── */}
          {linkedIssues.length > 0 && (
            <div style={{ padding: '0 32px 24px' }}>
              <button onClick={() => setLinkedOpen(!linkedOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', ...SECTION_HEADING, padding: '4px 0', marginBottom: 8, width: '100%' }}>
                {linkedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Linked work items
                <Plus size={14} color="#94A3B8" style={{ marginLeft: 'auto' }} />
              </button>

              {linkedOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {linkedIssues.map((link: any) => {
                    const target = link.target;
                    if (!target) return null;
                    const badge = getStatusBadge(target.status);
                    return (
                      <div key={link.id}
                        onClick={() => navigate(`/project-hub/${projectKey}/story/${target.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <span style={{ fontSize: 12, color: '#6B6E76', minWidth: 120 }}>{link.link_type || 'is linked to'}</span>
                        <JiraIssueTypeIcon type={target.issue_type || 'story'} size={16} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#1868DB', fontWeight: 500 }}>{target.issue_key}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#292A2E' }}>{target.summary}</span>
                        {badge && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: badge.bg, color: badge.text }}>
                            {badge.label}
                          </span>
                        )}
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#64748B' }}>
                          {getInitials(target.assignee_display_name)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Activity (Comments + History) ── */}
          <StoryActivitySection
            comments={comments}
            history={history}
            commentsLoading={commentsLoading}
            historyLoading={historyLoading}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            addCommentPending={addComment.isPending}
          />
        </div>

        {/* ═══════════ RIGHT SIDEBAR ═══════════ */}
        <StoryDetailSidebar
          story={story}
          onUpdateField={handleUpdateField}
          isPending={updateField.isPending}
          teamMembers={teamMembers}
          onDelete={() => setDeleteDialogOpen(true)}
        />
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent style={{ maxWidth: 420, borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#292A2E', margin: '0 0 8px' }}>Delete story?</h3>
          <p style={{ fontSize: 14, color: '#505258', margin: '0 0 20px' }}>This will mark the story as cancelled. Are you sure?</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteDialogOpen(false)}
              style={{ height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, background: 'transparent', color: '#505258', border: '1px solid #E0E0E0', cursor: 'pointer' }}>Cancel</button>
            <button onClick={confirmDelete}
              style={{ height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, background: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}>Delete</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

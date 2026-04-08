/**
 * StoryDetailView — Full-page two-panel Jira-style story detail
 * Left: Title (inline edit), Key Details, Description (TipTap), Activity (Comments/History)
 * Right: Status transition, Details (fix versions, assignee, reporter), Metadata
 * All fields wired to ph_issues via Supabase + Jira write-back queue
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Minus, ChevronUp, ChevronsUp, ChevronsDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StoryDetailHeader } from '../components/story-detail/StoryDetailHeader';
import { StoryDetailSidebar } from '../components/story-detail/StoryDetailSidebar';
import { StoryActivitySection } from '../components/story-detail/StoryActivitySection';
import { StoryRichTextEditor } from '../components/story-detail/StoryRichTextEditor';
import {
  useStoryDetail, useStoryComments, useStoryHistory,
  useStorySiblings, useParentCandidates, useTeamMembers,
  useUpdateStoryField, useAddStoryComment, useDeleteStoryComment,
} from '../components/story-detail/useStoryDetailData';
import { getPriorityColor } from '../utils/backlog.utils';

// ─── Priority config ─────────────────────────────────────────
const PRIORITY_OPTIONS = [
  { value: 'Highest', label: 'Highest', color: '#CF2600', Icon: ChevronsUp },
  { value: 'High',    label: 'High',    color: '#E56910', Icon: ChevronUp },
  { value: 'Medium',  label: 'Medium',  color: '#CF7B00', Icon: Minus },
  { value: 'Low',     label: 'Low',     color: '#1868DB', Icon: ChevronDown },
  { value: 'Lowest',  label: 'Lowest',  color: '#1868DB', Icon: ChevronsDown },
];

interface StoryDetailViewProps {
  projectId: string;
  projectKey: string;
  itemId: string;
}

export function StoryDetailView({ projectId, projectKey, itemId }: StoryDetailViewProps) {
  const navigate = useNavigate();

  // ─── Data hooks ────────────────────────────────────────────
  const { data: story, isLoading, error } = useStoryDetail(itemId);
  const { data: comments = [], isLoading: commentsLoading } = useStoryComments(story?.issue_key || null);
  const { data: history = [], isLoading: historyLoading } = useStoryHistory(story?.issue_key || null);
  const { data: siblings = [] } = useStorySiblings(projectId);
  const { data: parentCandidates = [] } = useParentCandidates(projectId);
  const { data: teamMembers = [] } = useTeamMembers();
  const updateField = useUpdateStoryField(itemId);
  const addComment = useAddStoryComment(story?.issue_key || null);
  const deleteComment = useDeleteStoryComment(story?.issue_key || null);

  // ─── Local state ───────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
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

  const handleDescSave = useCallback((html: string) => {
    handleUpdateField('description_text', html);
    setEditingDesc(false);
  }, [handleUpdateField]);

  const handleAddComment = useCallback((body: string) => {
    addComment.mutate({ body, authorName: 'Current User' });
  }, [addComment]);

  const handleDeleteComment = useCallback((id: string) => {
    deleteComment.mutate(id);
  }, [deleteComment]);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    handleUpdateField('status', 'Cancelled');
    setDeleteDialogOpen(false);
    navigate(`/project-hub/${projectKey}/story-backlog`);
  }, [handleUpdateField, navigate, projectKey]);

  // ─── Priority helpers ──────────────────────────────────────
  const currentPriority = PRIORITY_OPTIONS.find(
    p => p.value.toLowerCase() === (story?.priority || '').toLowerCase()
  ) || PRIORITY_OPTIONS[2]; // default Medium

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
          <button
            onClick={() => navigate(`/project-hub/${projectKey}/story-backlog`)}
            style={{ fontSize: 13, color: '#1868DB', background: 'none', border: 'none', cursor: 'pointer' }}
          >Back to backlog</button>
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
        onPrev={handlePrev}
        onNext={handleNext}
        onAddParent={() => setParentPickerOpen(true)}
      />

      {/* Two-panel layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ═══ LEFT PANEL ═══ */}
        <div style={{ flex: 1, minWidth: 500, overflowY: 'auto', background: '#FFFFFF' }}>

          {/* Inline editable title */}
          <div style={{ padding: '24px 24px 8px' }}>
            {editingTitle ? (
              <input
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                autoFocus
                style={{
                  width: '100%', fontSize: 24, fontWeight: 600, color: '#292A2E',
                  border: '2px solid #1868DB', borderRadius: 4, padding: '4px 8px',
                  outline: 'none', fontFamily: "'Sora', sans-serif", lineHeight: 1.2,
                }}
              />
            ) : (
              <h1
                onClick={handleStartTitleEdit}
                style={{
                  fontSize: 24, fontWeight: 600, color: '#292A2E', lineHeight: 1.2,
                  margin: 0, cursor: 'pointer', fontFamily: "'Sora', sans-serif",
                }}
              >
                {story.summary || <span style={{ fontStyle: 'italic', color: '#6B6E76' }}>Click to add title...</span>}
              </h1>
            )}
          </div>

          {/* Key details (collapsible) */}
          <div style={{ padding: '8px 24px 0' }}>
            <button
              onClick={() => setKeyDetailsOpen(!keyDetailsOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#505258',
                textTransform: 'uppercase', letterSpacing: '0.03em', padding: '4px 0',
              }}
            >
              {keyDetailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Key details
            </button>

            {keyDetailsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0 16px' }}>
                {/* Parent */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: 120, fontSize: 12, fontWeight: 600, color: '#505258', flexShrink: 0 }}>Parent</span>
                  <Popover open={parentPickerOpen} onOpenChange={setParentPickerOpen}>
                    <PopoverTrigger asChild>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: story.parentEpic ? '#292A2E' : '#6B6E76', padding: 0, textAlign: 'left' }}>
                        {story.parentEpic ? `${story.parentEpic.epic_key || ''} ${story.parentEpic.name}`.trim() : 'None'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" style={{ width: 320, padding: 0, maxHeight: 300, overflowY: 'auto' }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #E0E0E0', fontSize: 11, fontWeight: 600, color: '#505258', textTransform: 'uppercase' }}>
                        Select Parent
                      </div>
                      <button
                        onClick={() => { handleUpdateField('parent_key', null); setParentPickerOpen(false); }}
                        style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: '#6B6E76' }}
                      >None</button>
                      {parentCandidates.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { handleUpdateField('parent_key', p.issue_key); setParentPickerOpen(false); }}
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 13, border: 'none',
                            background: story.parent_key === p.issue_key ? 'rgba(37,99,235,0.08)' : 'transparent',
                            textAlign: 'left', cursor: 'pointer', color: '#292A2E',
                          }}
                        >
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#505258', marginRight: 8 }}>
                            {p.issue_key}
                          </span>
                          {p.summary}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Priority */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: 120, fontSize: 12, fontWeight: 600, color: '#505258', flexShrink: 0 }}>Priority</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button style={{
                        background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 6, padding: 0, fontSize: 14, color: '#292A2E',
                      }}>
                        <currentPriority.Icon size={16} color={currentPriority.color} />
                        {currentPriority.label}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" style={{ width: 200, padding: 4 }}>
                      {PRIORITY_OPTIONS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => handleUpdateField('priority', p.value)}
                          style={{
                            width: '100%', padding: '6px 10px', fontSize: 13, border: 'none',
                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                            background: (story.priority || '').toLowerCase() === p.value.toLowerCase() ? 'rgba(37,99,235,0.08)' : 'transparent',
                            color: '#292A2E', borderRadius: 3,
                          }}
                        >
                          <p.Icon size={16} color={p.color} />
                          {p.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#505258', textTransform: 'uppercase',
              letterSpacing: '0.03em', marginBottom: 8,
            }}>
              Description
            </div>
            {editingDesc ? (
              <StoryRichTextEditor
                content={story.description_text || ''}
                onSave={handleDescSave}
                onCancel={() => setEditingDesc(false)}
                placeholder="Add a description..."
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                style={{
                  fontSize: 14, lineHeight: 1.6, color: story.description_text ? '#292A2E' : '#6B6E76',
                  fontStyle: story.description_text ? 'normal' : 'italic',
                  cursor: 'text', minHeight: 40, whiteSpace: 'pre-wrap',
                  padding: '8px 0',
                }}
              >
                {story.description_text ? (
                  <div dangerouslySetInnerHTML={{ __html: story.description_text }} />
                ) : (
                  'Add a description...'
                )}
              </div>
            )}
          </div>

          {/* Activity (Comments + History) */}
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

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <StoryDetailSidebar
          story={story}
          onUpdateField={handleUpdateField}
          isPending={updateField.isPending}
          teamMembers={teamMembers}
          onDelete={handleDelete}
        />
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent style={{ maxWidth: 420, borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#292A2E', margin: '0 0 8px' }}>Delete story?</h3>
          <p style={{ fontSize: 14, color: '#505258', margin: '0 0 20px' }}>
            This will mark the story as cancelled. Are you sure?
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setDeleteDialogOpen(false)}
              style={{ height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, background: 'transparent', color: '#505258', border: '1px solid #E0E0E0', cursor: 'pointer' }}
            >Cancel</button>
            <button
              onClick={confirmDelete}
              style={{ height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, background: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
            >Delete</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react';
import { EditStoryDialog } from '../dialogs/EditStoryDialog';
import { ParentEpicChip } from '../shared/ParentEpicChip';
import { getLozengeStyle, STORY_STATUS_LOZENGE, formatDueDate, getPriorityLabel, getPriorityColor, getInitials } from '../../utils/backlog.utils';

interface StoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string | null;
  projectId: string;
}

export const StoryDetailDrawer: React.FC<StoryDetailDrawerProps> = ({ isOpen, onClose, storyId, projectId }) => {
  const [showEdit, setShowEdit] = useState(false);

  const { data: story, refetch } = useQuery({
    queryKey: ['story-drawer-detail', storyId],
    queryFn: async () => {
      if (!storyId) return null;
      const { data, error } = await supabase
        .from('stories')
        .select('id, story_key, title, name, description, status, feature_id, assignee_id, start_date, priority, acceptance_criteria')
        .eq('id', storyId)
        .single();
      if (error) throw error;

      // Fetch feature + epic for parent chip
      let featureData: any = null;
      if (data.feature_id) {
        const { data: feat } = await supabase
          .from('features')
          .select('id, display_id, name, epic_id')
          .eq('id', data.feature_id)
          .single();
        if (feat?.epic_id) {
          const { data: epic } = await supabase
            .from('epics')
            .select('id, epic_key, name')
            .eq('id', feat.epic_id)
            .single();
          featureData = { ...feat, epic };
        } else {
          featureData = feat;
        }
      }

      return { ...data, feature: featureData };
    },
    enabled: !!storyId && isOpen,
  });

  if (!storyId) return null;

  const statusConfig = story?.status ? STORY_STATUS_LOZENGE[story.status] : null;
  const lozengeStyle = statusConfig ? getLozengeStyle(statusConfig.color) : null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent style={{ width: 480, maxWidth: '100vw' }} className="p-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {story?.story_key && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2563EB', fontSize: 13, fontWeight: 600 }}>
                    {story.story_key}
                  </span>
                )}
                {statusConfig && lozengeStyle && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
                    borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.03em', background: lozengeStyle.bg, color: lozengeStyle.text,
                  }}>
                    {statusConfig.label}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
            <SheetTitle className="text-base font-semibold mt-2" style={{ fontWeight: 650 }}>{story?.title || 'Loading...'}</SheetTitle>
          </SheetHeader>

          <div className="px-6 py-4 space-y-4">
            {/* Parent epic chip */}
            {story?.feature?.epic && (
              <div>
                <ParentEpicChip
                  epicId={story.feature.epic.id}
                  epicKey={story.feature.epic.epic_key}
                  epicName={story.feature.epic.name}
                />
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-6 text-sm" style={{ color: '#64748B' }}>
              <div className="flex items-center gap-2">
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B' }}>
                  {getInitials(null)}
                </div>
                <span>Unassigned</span>
              </div>
              <span style={{ color: '#6B7280' }}>{formatDueDate(story?.start_date || null)}</span>
              <span style={{ color: getPriorityColor(story?.priority || null) }}>{getPriorityLabel(story?.priority || null)}</span>
            </div>

            {/* Description */}
            {story?.description && (
              <div>
                <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: '#64748B', letterSpacing: '0.05em' }}>Description</h4>
                <div className="text-sm leading-relaxed" style={{ color: '#334155' }}>{story.description}</div>
              </div>
            )}

            {/* Acceptance criteria */}
            {story?.acceptance_criteria && (
              <div>
                <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: '#64748B', letterSpacing: '0.05em' }}>Acceptance Criteria</h4>
                <div className="text-sm leading-relaxed" style={{ color: '#334155' }}>{story.acceptance_criteria}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#E2E8F0' }}>
              <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {showEdit && storyId && (
        <EditStoryDialog
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          storyId={storyId}
          projectId={projectId}
          onSuccess={() => { refetch(); }}
        />
      )}
    </>
  );
};

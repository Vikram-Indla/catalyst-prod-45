import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Bot,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DraftDetailsDrawer } from '@/components/ai-assist/DraftDetailsDrawer';
import { DeleteDraftModal } from '@/components/ai-assist/DeleteDraftModal';
import { DraftCard } from '@/components/ai-assist/DraftCard';
import { useAIAssistDrafts, useCreateDraft, useDeleteDraft, type AIAssistDraft, type DraftStatus } from '@/hooks/useAIAssistDrafts';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string }> = {
  draft: { label: 'Draft' },
  in_progress: { label: 'In Progress' },
  review: { label: 'Review' },
  approved: { label: 'Approved' },
  published: { label: 'Published' },
  archived: { label: 'Archived' },
};

export default function AIAssistDraftsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [selectedDraft, setSelectedDraft] = useState<AIAssistDraft | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<AIAssistDraft | null>(null);

  const { data: drafts = [], isLoading } = useAIAssistDrafts();
  const createDraft = useCreateDraft();
  const deleteDraft = useDeleteDraft();

  const filteredDrafts = drafts.filter((draft) => {
    const matchesSearch = 
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.draft_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || draft.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count drafts by status
  const statusCounts = drafts.reduce((acc, draft) => {
    acc[draft.status] = (acc[draft.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleOpenWizard = (draftId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/product/ai-assist/${draftId}`);
  };

  const handleDeleteClick = (draft: AIAssistDraft, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftToDelete(draft);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!draftToDelete) return;
    await deleteDraft.mutateAsync({ 
      id: draftToDelete.id, 
      draftKey: draftToDelete.draft_key 
    });
    setDeleteModalOpen(false);
    setDraftToDelete(null);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-6 border-b border-border bg-background">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">AI Assist Drafts</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Transform requirements into structured epics
              </p>
            </div>
            <Button 
              onClick={() => createDraft.mutate({ title: 'New Draft' }, { onSuccess: (d) => navigate(`/product/ai-assist/${d.id}`) })}
              disabled={createDraft.isPending}
              className="gap-2"
            >
              {createDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Draft
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 flex items-center gap-4 px-6 py-3 border-b border-border bg-muted/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 placeholder:text-foreground/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {(['all', 'draft', 'in_progress', 'review', 'approved'] as const).map((status) => {
                const count = status === 'all' ? drafts.length : (statusCounts[status] || 0);
                return (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter(status as DraftStatus | 'all')}
                    className="text-xs gap-1.5"
                  >
                    {status === 'all' ? 'All' : (STATUS_CONFIG[status]?.label || status)}
                    {count > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                        statusFilter === status 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No drafts yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                Create your first AI Assist draft to start transforming requirements into structured BRDs.
              </p>
              <Button 
                onClick={() => createDraft.mutate({ title: 'New Draft' }, { onSuccess: (d) => navigate(`/product/ai-assist/${d.id}`) })}
                disabled={createDraft.isPending}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Draft
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl">
              {filteredDrafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={{
                    id: draft.id,
                    draft_key: draft.draft_key,
                    title: draft.title,
                    language: draft.language,
                    status: draft.status,
                    current_step: draft.current_step || 1,
                    compliance_verdict: draft.compliance_verdict,
                    quality_score: draft.quality_score,
                    updated_at: draft.updated_at,
                  }}
                  onOpen={handleOpenWizard}
                  onDelete={(e) => handleDeleteClick(draft, e)}
                  onClick={() => { setSelectedDraft(draft); setDrawerOpen(true); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Drawer for draft details */}
        <DraftDetailsDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          draft={selectedDraft}
        />

        {/* Delete confirmation modal */}
        <DeleteDraftModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          draftKey={draftToDelete?.draft_key || ''}
          onConfirm={handleDeleteConfirm}
          isPending={deleteDraft.isPending}
        />
      </div>
    </TooltipProvider>
  );
}

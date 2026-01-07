import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Bot,
  Loader2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DraftDetailsDrawer } from '@/components/ai-assist/DraftDetailsDrawer';
import { DeleteDraftModal } from '@/components/ai-assist/DeleteDraftModal';
import { DraftCardAward } from '@/components/ai-assist/drafts/DraftCardAward';
import { SummaryMetrics } from '@/components/ai-assist/drafts/SummaryMetrics';
import { useAIAssistDrafts, useCreateDraft, useDeleteDraft, type AIAssistDraft, type DraftStatus } from '@/hooks/useAIAssistDrafts';
import { cn } from '@/lib/utils';

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

  // Group drafts by attention needed
  const needsAttention = filteredDrafts.filter(d => d.title === 'New Draft' || !d.title);
  const inProgress = filteredDrafts.filter(d => d.title !== 'New Draft' && d.title && d.status !== 'published');

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
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
        {/* Subtle background pattern */}
        <div className="fixed inset-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.1) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Header */}
        <div className="relative flex-shrink-0 px-6 py-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Assist</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Transform requirements documents into structured epics with AI-powered analysis
              </p>
            </div>
            <Button 
              onClick={() => createDraft.mutate({ title: 'New Draft' }, { onSuccess: (d) => navigate(`/product/ai-assist/${d.id}`) })}
              disabled={createDraft.isPending}
              className="gap-2 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
            >
              {createDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Draft
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center mb-6">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No drafts yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                Create your first AI Assist draft to start transforming requirements into structured BRDs.
              </p>
              <Button 
                onClick={() => createDraft.mutate({ title: 'New Draft' }, { onSuccess: (d) => navigate(`/product/ai-assist/${d.id}`) })}
                disabled={createDraft.isPending}
                className="gap-2 shadow-lg shadow-primary/30"
              >
                <Plus className="h-4 w-4" />
                Create First Draft
              </Button>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {/* Summary Metrics — CLICKABLE FILTERS */}
              <SummaryMetrics
                totalDrafts={drafts.length}
                draftCount={statusCounts['draft'] || 0}
                inProgressCount={statusCounts['in_progress'] || 0}
                reviewCount={statusCounts['review'] || 0}
                publishedCount={statusCounts['published'] || 0}
                activeFilter={statusFilter}
                onFilterChange={(filter) => setStatusFilter(filter as DraftStatus | 'all')}
              />

              {/* Search */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search drafts by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-11 rounded-xl border-2 border-border focus:border-primary"
                  />
                </div>
              </div>

              {/* Needs Attention Section */}
              {needsAttention.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-[hsl(var(--warning))]" />
                    <h2 className="text-lg font-semibold text-foreground">Needs Attention</h2>
                    <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] text-xs font-semibold">
                      {needsAttention.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {needsAttention.map((draft) => (
                      <DraftCardAward
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
                </div>
              )}

              {/* In Progress Section */}
              {inProgress.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">In Progress</h2>
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                      {inProgress.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {inProgress.map((draft) => (
                      <DraftCardAward
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
                </div>
              )}

              {/* Empty filtered state */}
              {filteredDrafts.length === 0 && drafts.length > 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mb-6">
                    <Search className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No drafts found</h3>
                  <p className="text-muted-foreground mb-6">
                    Try a different search term or filter
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
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

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </TooltipProvider>
  );
}

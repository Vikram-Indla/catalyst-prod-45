import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronRight,
  Bot,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Play,
  Trash2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DraftDetailsDrawer } from '@/components/ai-assist/DraftDetailsDrawer';
import { DeleteDraftModal } from '@/components/ai-assist/DeleteDraftModal';
import { useAIAssistDrafts, useCreateDraft, useDeleteDraft, type AIAssistDraft, type DraftStatus } from '@/hooks/useAIAssistDrafts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Wizard steps for reference
const WIZARD_STEPS = [
  { id: 1, name: 'Document Capture', key: 'capture' },
  { id: 2, name: 'AI Analysis', key: 'analysis' },
  { id: 3, name: 'FR Processing', key: 'fr' },
  { id: 4, name: 'Compliance Gate', key: 'compliance' },
  { id: 5, name: 'Clarification', key: 'clarification' },
  { id: 6, name: 'BRD Generation', key: 'brd' },
  { id: 7, name: 'BR Linking', key: 'linking' },
  { id: 8, name: 'Epic Publishing', key: 'publish' },
];

const STATUS_CONFIG: Record<string, { label: string; emoji: string; className: string }> = {
  draft: { label: 'Draft', emoji: '📝', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  in_progress: { label: 'In Progress', emoji: '🔄', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  review: { label: 'Review', emoji: '👁️', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Approved', emoji: '✅', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  published: { label: 'Published', emoji: '🚀', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  archived: { label: 'Archived', emoji: '📦', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const VERDICT_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pass: { label: 'Compliant', icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'text-[hsl(var(--success))]' },
  pending: { label: 'Pending', icon: <Clock className="h-3.5 w-3.5" />, className: 'text-[hsl(var(--warning))]' },
  fail: { label: 'Failed', icon: <XCircle className="h-3.5 w-3.5" />, className: 'text-[hsl(var(--danger))]' },
  na: { label: 'N/A', icon: <AlertCircle className="h-3.5 w-3.5" />, className: 'text-muted-foreground' },
};

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAbsoluteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

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

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success('Draft ID copied');
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
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Product</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">AI Assist</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Drafts</span>
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

        {/* Table */}
        <div className="flex-1 overflow-auto">
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
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b border-border z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Draft ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Document</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Lang</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Progress</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Pack</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Compliance</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Quality</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Updated</th>
                  <th className="text-right px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => {
                  const statusConfig = STATUS_CONFIG[draft.status] || STATUS_CONFIG.draft;
                  const verdictConfig = draft.compliance_verdict ? VERDICT_CONFIG[draft.compliance_verdict] : null;
                  const currentStep = draft.current_step || 1;
                  const completedSteps = Math.max(0, currentStep - 1);
                  const currentStepName = WIZARD_STEPS.find(s => s.id === currentStep)?.name || 'Unknown';

                  return (
                    <tr
                      key={draft.id}
                      onClick={() => { setSelectedDraft(draft); setDrawerOpen(true); }}
                      className="border-b border-border hover:bg-accent/50 cursor-pointer transition-colors group"
                    >
                      {/* Draft ID with copy */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <code className="text-xs font-mono text-foreground">{draft.draft_key}</code>
                          <button
                            onClick={(e) => handleCopyId(draft.draft_key, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </td>

                      {/* Document/Title */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="flex items-center gap-3">
                          {draft.title === 'New Draft' || !draft.title ? (
                            <>
                              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">Untitled Draft</div>
                                <div className="text-xs text-amber-600 dark:text-amber-400 truncate">⚠️ No document uploaded</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{draft.title}</div>
                                <div className="text-xs text-muted-foreground truncate">Document attached</div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Language with flag */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{draft.language === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
                          <span className="text-xs text-muted-foreground">{draft.language === 'ar' ? 'Arabic' : 'English'}</span>
                        </div>
                      </td>

                      {/* Status with emoji */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "gap-1 text-xs font-medium rounded-full shadow-sm ring-1 ring-border/40",
                            statusConfig.className
                          )}
                        >
                          <span>{statusConfig.emoji}</span>
                          {statusConfig.label}
                        </Badge>
                      </td>

                      {/* Progress with visual dots + bar */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full transition-all",
                                  i < completedSteps && "bg-[hsl(var(--success))]",
                                  i === completedSteps && "bg-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                                  i > completedSteps && "bg-muted-foreground/20"
                                )}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1.5 tabular-nums">
                              {completedSteps}/8
                            </span>
                          </div>
                          <div className="w-24 h-2 bg-muted-foreground/15 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[hsl(var(--success))] rounded-full transition-all"
                              style={{ width: `${(completedSteps / 8) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {currentStepName}
                          </div>
                        </div>
                      </td>

                      {/* Prompt Pack */}
                      <td className="px-4 py-3">
                        {draft.prompt_pack_version ? (
                          <code className="text-xs px-1.5 py-0.5 bg-muted rounded font-mono">
                            {draft.prompt_pack_version}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 italic">Not configured</span>
                        )}
                      </td>

                      {/* Compliance with score bar */}
                      <td className="px-4 py-3">
                        {verdictConfig ? (
                          <div className="flex items-center gap-1.5">
                            <span className={verdictConfig.className}>{verdictConfig.icon}</span>
                            <span className={cn("text-xs font-medium", verdictConfig.className)}>
                              {verdictConfig.label}
                            </span>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenWizard(draft.id, e); }}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Run analysis →
                          </button>
                        )}
                      </td>

                      {/* Quality with mini bar */}
                      <td className="px-4 py-3">
                        {draft.quality_score !== null ? (
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm font-semibold tabular-nums",
                              draft.quality_score >= 80 ? 'text-[hsl(var(--success))]' :
                              draft.quality_score >= 60 ? 'text-[hsl(var(--warning))]' :
                              'text-[hsl(var(--danger))]'
                            )}>
                              {draft.quality_score}
                            </span>
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  draft.quality_score >= 80 ? 'bg-[hsl(var(--success))]' :
                                  draft.quality_score >= 60 ? 'bg-[hsl(var(--warning))]' :
                                  'bg-[hsl(var(--danger))]'
                                )}
                                style={{ width: `${draft.quality_score}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenWizard(draft.id, e); }}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Run analysis →
                          </button>
                        )}
                      </td>

                      {/* Updated - relative time */}
                      <td className="px-4 py-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground cursor-default">
                              {formatRelativeTime(draft.updated_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatAbsoluteDate(draft.updated_at)}
                          </TooltipContent>
                        </Tooltip>
                      </td>

                      {/* Actions - Play + Delete only */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handleOpenWizard(draft.id, e)}
                              >
                                <Play className="h-4 w-4 text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open Wizard</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handleDeleteClick(draft, e)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Draft</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
